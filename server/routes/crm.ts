import { statistics } from '../providers/crm/statistics.js';
import { toText } from '../providers/crm/schema.js';
import { subdivisions } from '../providers/crm/geography.js';
import { Readable } from 'node:stream';
import { authenticationToken } from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import { serverFileRepositoryManagerToken } from '@nocobase/app-plugin-file-repository/server';
import { driveManagerToken } from '@nocobase/app-server/drive';
import type { Application } from '@nocobase/app-server/application';
import {
  defineApiRoutes,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { crmToken, crmAiToken } from '../providers/crm/index.js';
import {
  capability,
  conditions,
  outputFields,
  type Actor,
} from '../providers/crm/authorization.js';
import {
  asEntity,
  CrmError,
  definitions,
  probabilities,
  entities,
  object,
} from '../providers/crm/schema.js';
import { type ListOptions } from '../providers/crm/service.js';
import { conversionPreview, convertLead } from '../providers/crm/conversion.js';
import { allRecords, dashboard } from '../providers/crm/dashboard.js';

type CrmEnv = { Variables: AuthorizationEnv['Variables'] & { actor: Actor } };
export const crmRoutes: AppApiRouteContribution<Application> = defineApiRoutes(
  (app) => {
    const router = new Hono();
    const routes = new Hono<CrmEnv>();
    const service = app.container.resolve(crmToken);
    const ai = app.container.resolve(crmAiToken);
    routes.use(
      '*',
      app.container.resolve(authenticationToken).required(),
      app.container.resolve(authorizationToken).middleware(),
    );
    routes.use(
      '*',
      bodyLimit({
        maxSize: 21 * 1024 * 1024,
        onError: (c) => c.json({ code: 'fileTooLarge' }, 413),
      }),
    );
    routes.use('*', async (c, next) => {
      const scope = c.get('authz');
      const id = scope.identity.principal?.id;
      if (!id) return c.json({ code: 'unauthorized' }, 401);
      await service.ensureActive(id);
      if (
        !['GET', 'HEAD'].includes(c.req.method) &&
        c.req.header('x-crm-request') !== '1'
      )
        return c.json({ code: 'forbidden' }, 403);
      c.set('actor', {
        id,
        scope,
        locale: c.req.header('accept-language')?.startsWith('zh')
          ? 'zh-CN'
          : 'en-US',
      });
      await next();
    });
    routes.onError((error, c) => {
      if (error instanceof CrmError)
        return c.json(
          { code: error.code, field: error.field, detail: error.detail },
          error.status as ContentfulStatusCode,
        );
      if (error instanceof SyntaxError)
        return c.json({ code: 'invalidInput' }, 400);
      console.error('[crm]', error);
      return c.json({ code: 'serverError' }, 500);
    });
    routes.get('/metadata', async (c) => {
      const actor = c.get('actor');
      await service.rememberLocale(actor);
      const permissions: Record<string, unknown> = {};
      for (const entity of entities) {
        const actions: Record<string, unknown> = {};
        for (const action of ['read', 'create', 'update', 'delete']) {
          try {
            const access = await conditions(actor, entity, action);
            actions[action] = {
              fields:
                action === 'read'
                  ? outputFields(entity, access)
                  : access.fields.input,
            };
          } catch {
            actions[action] = false;
          }
        }
        permissions[entity] = actions;
      }
      await conditions(actor, 'leads', 'read');
      const settings = await service.settings();
      const { aiInstructions: _instructions, ...publicSettings } = settings;
      return c.json({
        data: {
          definitions,
          // Stage → win probability, so the stage stepper can show the odds
          // each step carries.
          probabilities,
          permissions,
          settings: publicSettings,
          userId: actor.id,
          users: await service.users(actor),
          manage: await capability(actor, 'manage'),
          assign: await capability(actor, 'assign'),
          approve: await capability(actor, 'approve'),
          settingsAccess: await capability(actor, 'manage', 'settings'),
        },
      });
    });
    routes.get('/geography', (c) => {
      const chinese = c.get('actor').locale.startsWith('zh');
      return c.json({
        data: {
          subdivisions: subdivisions(toText(c.req.query('country'))).map(
            (s) => ({
              value: s.code,
              label: chinese ? (s.chineseName ?? s.name) : s.name,
            }),
          ),
        },
      });
    });
    routes.get('/dashboard', async (c) =>
      c.json({ data: await dashboard(service, c.get('actor'), c.req.query()) }),
    );
    routes.get('/settings', async (c) => {
      if (!(await capability(c.get('actor'), 'manage', 'settings')))
        throw new CrmError('forbidden', 403);
      return c.json({
        data: {
          settings: await service.settings(),
          users: await service.users(c.get('actor')),
          workload: await service.workload(c.get('actor')),
          models: await ai.models(),
        },
      });
    });
    routes.put('/settings', async (c) =>
      c.json({
        data: await service.saveSettings(c.get('actor'), await c.req.json()),
      }),
    );
    routes.put('/users/:id', async (c) => {
      await service.updateUser(
        c.get('actor'),
        c.req.param('id'),
        await c.req.json(),
      );
      return c.json({ data: true });
    });
    routes.get('/ai/history', async (c) => {
      await conditions(c.get('actor'), 'leads', 'read');
      return c.json({ data: await ai.history(c.get('actor')) });
    });
    routes.delete('/ai/history', async (c) =>
      c.json({ data: await ai.clearMessages(c.get('actor')) }),
    );
    routes.post('/ai/chat', async (c) => {
      await conditions(c.get('actor'), 'leads', 'read');
      const body = object(await c.req.json());
      // The panel asks for background: the question is written and the
      // reply reaches it by polling, so the request returns at once.
      return c.json({
        data: await ai.chat(c.get('actor'), body, {
          background: body.background === true,
        }),
      });
    });
    routes.post('/ai/messages/:id/cancel', async (c) =>
      c.json({ data: await ai.cancel(c.get('actor'), c.req.param('id')) }),
    );
    routes.post('/ai/messages/:id/retry', async (c) => {
      await conditions(c.get('actor'), 'leads', 'read');
      return c.json({
        data: await ai.retry(c.get('actor'), c.req.param('id')),
      });
    });
    routes.put('/ai/actions/:id', async (c) => {
      await ai.updateAction(
        c.get('actor'),
        c.req.param('id'),
        await c.req.json(),
      );
      return c.json({ data: true });
    });
    routes.post('/ai/actions/:id/execute', async (c) => {
      const body = object(await c.req.json());
      return c.json({
        data: await ai.execute(
          c.get('actor'),
          c.req.param('id'),
          body.confirmed,
          body.continue === true,
        ),
      });
    });
    routes.post('/files', async (c) => {
      const actor = c.get('actor');
      const entity = asEntity(c.req.query('entity') ?? 'leads');
      await conditions(actor, entity, 'create');
      const body = await c.req.parseBody({ all: true });
      const files = Array.isArray(body.file) ? body.file : [body.file];
      if (
        !files.length ||
        files.some(
          (file) => !(file instanceof File) || file.size > 20 * 1024 * 1024,
        )
      )
        throw new CrmError('invalidInput');
      const repository = app.container
        .resolve(serverFileRepositoryManagerToken)
        .repository('crmFiles', {
          connection: 'main',
          disk: 'local',
          accessPath: '/crm/files',
        });
      const uploaded = await repository.uploadMany({ files: files as File[] });
      for (const file of uploaded.records)
        await service.database
          .query()
          .insertInto('crmFileUploads')
          .values({ id: file.id, ownerId: actor.id })
          .execute();
      return c.json({
        data: uploaded.records.map((f) => ({
          id: f.id,
          filename: f.filename,
          contentUrl: `${toText(app.publicBasePath)}/api/crm/files/${toText(f.id)}`,
        })),
      });
    });
    // Attachments are stored as bare ids; a list needs their names in one call
    // rather than a request per file.
    routes.get('/files', async (c) => {
      const actor = c.get('actor');
      const ids = toText(c.req.query('ids'))
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);
      if (!ids.length) return c.json({ data: [] });
      const files = await service.database
        .query()
        .selectFrom('crmFiles')
        .select(['id', 'filename', 'createdAt'])
        .where('id', 'in', ids)
        .execute();
      const readable = [];
      for (const file of files)
        if (await service.canReadFile(actor, toText(file.id)))
          readable.push({
            id: toText(file.id),
            filename: toText(file.filename),
            createdAt: toText(file.createdAt),
            url: `${toText(app.publicBasePath)}/api/crm/files/${toText(encodeURIComponent(toText(file.id)))}`,
          });
      return c.json({ data: readable });
    });
    routes.get('/files/:id/link', (c) =>
      c.json({
        data: {
          url: `${app.publicBasePath}/api/crm/files/${encodeURIComponent(c.req.param('id'))}`,
        },
      }),
    );
    routes.get('/files/:id', async (c) => {
      const actor = c.get('actor');
      const id = c.req.param('id');
      if (!(await service.canReadFile(actor, id)))
        throw new CrmError('notFound', 404);
      const file = await service.database
        .query()
        .selectFrom('crmFiles')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      if (!file) throw new CrmError('notFound', 404);
      const stream = await app.container
        .resolve(driveManagerToken)
        .use(toText(file.disk))
        .getStream(toText(file.key));
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${toText(encodeURIComponent(toText(file.filename)))}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    });
    routes.get('/:entity/statistics', async (c) =>
      c.json({
        data: await statistics(
          service,
          c.get('actor'),
          asEntity(c.req.param('entity')),
          c.req.query(),
        ),
      }),
    );
    // The complete visible set, for name resolution on the client. Reads
    // stay within the caller's own access; only the CSV download is gated.
    routes.get('/:entity/lookup', async (c) =>
      c.json({
        data: await allRecords(
          service,
          c.get('actor'),
          asEntity(c.req.param('entity')),
          c.req.query(),
        ),
      }),
    );
    // Taking the data out of the system is a manager's call.
    routes.get('/:entity/export', async (c) => {
      if (!(await capability(c.get('actor'), 'manage')))
        throw new CrmError('forbidden', 403);
      return c.json({
        data: await allRecords(
          service,
          c.get('actor'),
          asEntity(c.req.param('entity')),
          c.req.query(),
        ),
      });
    });
    routes.post('/:entity/import', async (c) => {
      const rows = object(await c.req.json()).rows;
      if (!Array.isArray(rows) || !rows.length || rows.length > 500)
        throw new CrmError('importLimit');
      const entity = asEntity(c.req.param('entity'));
      const result = await service.mutate(
        c.get('actor'),
        async (actor, query) => {
          const created = [];
          for (let i = 0; i < rows.length; i++) {
            try {
              created.push(
                await service.save(actor, entity, rows[i], undefined, query),
              );
            } catch (error) {
              if (error instanceof CrmError)
                throw new CrmError(
                  error.code,
                  error.status,
                  `${toText(i + 1)}:${toText(error.field ?? '')}`,
                );
              throw error;
            }
          }
          return created;
        },
      );
      return c.json({ data: result }, 201);
    });
    routes.get('/leads/:id/conversion', async (c) =>
      c.json({
        data: await conversionPreview(
          service,
          c.get('actor'),
          c.req.param('id'),
        ),
      }),
    );
    routes.post('/leads/:id/convert', async (c) =>
      c.json({
        data: await convertLead(
          service,
          c.get('actor'),
          c.req.param('id'),
          await c.req.json(),
        ),
      }),
    );
    routes.post('/approvals/:id/:action', async (c) =>
      c.json({
        data: await service.approvalAction(
          c.get('actor'),
          c.req.param('id'),
          c.req.param('action'),
          toText(object(await c.req.json()).comment ?? ''),
        ),
      }),
    );
    routes.get('/:entity/:id', async (c) =>
      c.json({
        data: await service.detail(
          c.get('actor'),
          asEntity(c.req.param('entity')),
          c.req.param('id'),
        ),
      }),
    );
    routes.get('/:entity', async (c) => {
      const options: ListOptions = {
        ...c.req.query(),
        page: Number(c.req.query('page') ?? 1),
        pageSize: Number(c.req.query('pageSize') ?? 25),
      };
      if (
        ![options.page, options.pageSize].every(
          (n) => Number.isSafeInteger(n) && Number(n) > 0,
        )
      )
        throw new CrmError('invalidInput');
      return c.json(
        await service.list(
          c.get('actor'),
          asEntity(c.req.param('entity')),
          options,
        ),
      );
    });
    routes.post('/:entity', async (c) =>
      c.json(
        {
          data: await service.save(
            c.get('actor'),
            asEntity(c.req.param('entity')),
            await c.req.json(),
          ),
        },
        201,
      ),
    );
    routes.patch('/:entity/:id', async (c) =>
      c.json({
        data: await service.save(
          c.get('actor'),
          asEntity(c.req.param('entity')),
          await c.req.json(),
          c.req.param('id'),
        ),
      }),
    );
    routes.delete('/:entity/:id', async (c) => {
      await service.remove(
        c.get('actor'),
        asEntity(c.req.param('entity')),
        c.req.param('id'),
      );
      return c.json({ data: true });
    });
    router.route('/crm', routes);
    return router;
  },
);
