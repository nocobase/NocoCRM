import { statistics } from '../providers/crm/statistics.js';
import { toText } from '../providers/crm/schema.js';
import { subdivisions } from '../providers/crm/geography.js';
import { Readable } from 'node:stream';
import { authenticationToken } from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import { serverFileRepositoryManagerToken } from '@nocobase/app-plugin-file/server';
import { driveManagerToken } from '@nocobase/app-server/drive';
import type { Application } from '@nocobase/app-server/application';
import {
  defineApiRoutes,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { crmToken } from '../providers/crm/index.js';
import { crmSkillNotesToken } from '../providers/crm/skills.js';
import { captureLeads } from '../providers/crm/lead-capture.js';
import { organiseFeedback, recordOutcome } from '../providers/crm/feedback.js';
import {
  latestEvaluation,
  aiStates,
  leadEvaluatorToken,
  pendingDecisions,
} from '../providers/crm/lead-evaluation.js';
import {
  latestOpportunityEvaluation,
  opportunityEvaluatorToken,
} from '../providers/crm/opportunity-evaluation.js';
import { screenProposal } from '../ai/screen.js';
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
  type Entity,
} from '../providers/crm/schema.js';
import {
  array,
  RELATED_PAGE,
  type ListOptions,
} from '../providers/crm/service.js';
import { conversionPreview, convertLead } from '../providers/crm/conversion.js';
import {
  demoStatus,
  populateDemo,
  resetDemo,
  type DemoAccountCreator,
} from '../providers/crm/demo.js';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import {
  AGENDA_PAGE,
  agenda,
  agendaNames,
  allRecords,
  dashboard,
  type AgendaName,
} from '../providers/crm/dashboard.js';
import { resolveTitles } from '../providers/crm/titles.js';
import type { Row } from '@nocobase/db';

type CrmEnv = { Variables: AuthorizationEnv['Variables'] & { actor: Actor } };
export const crmRoutes: AppApiRouteContribution<Application> = defineApiRoutes(
  (app) => {
    const router = new Hono();
    const routes = new Hono<CrmEnv>();
    const service = app.container.resolve(crmToken);
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
                  : access.fields,
              // Whether the action reaches every record or only a scope
              // (one's own): the pages use it to offer a change on a
              // record the user does not own only to someone who may make
              // it, without a parallel notion of "manager".
              all: access.scope === true,
            };
          } catch {
            actions[action] = false;
          }
        }
        permissions[entity] = actions;
      }
      await conditions(actor, 'leads', 'read');
      const publicSettings = await service.settings();
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
          export: await capability(actor, 'export'),
          assign: await capability(actor, 'assign'),
          approve: await capability(actor, 'approve'),
          settingsAccess: await capability(actor, 'manage', 'settings'),
          // Whether the pages offer the assistant at all.
          assistant: await service.assistantEnabled(),
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
    routes.get('/dashboard', async (c) => {
      const data = await dashboard(service, c.get('actor'), c.req.query());
      const rows = (list: unknown): Row[] =>
        array(object(list).data).map(object);
      return c.json({
        data: {
          ...data,
          ...(await resolveTitles(service, c.get('actor'), {
            activities: [...rows(data.today), ...rows(data.overdue)],
            approvals: rows(data.approvals),
          })),
        },
      });
    });
    // The next page of one workspace list, for its card's "load more".
    routes.get('/dashboard/:list', async (c) => {
      const name = c.req.param('list');
      if (!agendaNames.includes(name as AgendaName))
        throw new CrmError('notFound', 404);
      const page = Number(c.req.query('page') ?? 1);
      const pageSize = Number(c.req.query('pageSize') ?? AGENDA_PAGE);
      if (
        ![page, pageSize].every((n) => Number.isSafeInteger(n) && n > 0) ||
        pageSize > 100
      )
        throw new CrmError('invalidInput');
      const result = await agenda(service, c.get('actor'), name as AgendaName, {
        scope: c.req.query('scope'),
        page,
        pageSize,
      });
      const entity: Entity = name === 'approvals' ? 'approvals' : 'activities';
      return c.json({
        ...result,
        ...(await resolveTitles(service, c.get('actor'), {
          [entity]: result.data,
        })),
      });
    });
    routes.get('/settings', async (c) => {
      if (!(await capability(c.get('actor'), 'manage', 'settings')))
        throw new CrmError('forbidden', 403);
      return c.json({
        data: {
          settings: await service.settings(),
          users: await service.users(c.get('actor')),
          demo: await demoStatus(service, c.get('actor')),
        },
      });
    });
    // The demo dataset creates its own accounts through the users plugin, so
    // they appear on the Users page like any account an administrator adds.
    const demoAccounts: DemoAccountCreator = {
      async create(input) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          const created = await app.container
            .resolve(userManagementServiceToken)
            .create({
              name: input.name,
              username: input.username,
              email: input.email,
              password: input.password,
              // The CRM's role scope is a multiple selection: the plugin
              // refuses a single value even for one role.
              roleScopes: { app: [input.role] },
            });
          return { id: created.id };
        } catch (error) {
          // The users plugin explains its refusal (a password rule, a taken
          // email); the notice shows that text under the CRM's own message.
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : undefined,
          );
        }
      },
      async resetPassword(id, password) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          await app.container
            .resolve(userManagementServiceToken)
            .resetPassword(id, password);
        } catch (error) {
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : toText(error),
          );
        }
      },
    };
    routes.post('/demo/populate', async (c) =>
      c.json({
        data: await populateDemo(
          service,
          service.authz,
          c.get('actor'),
          demoAccounts,
        ),
      }),
    );
    routes.post('/demo/reset', async (c) =>
      c.json({ data: await resetDemo(service, c.get('actor')) }),
    );
    // The CRM's AI skills and the company's notes on them (settings page).
    routes.get('/skills', async (c) =>
      c.json({
        data: await app.container
          .resolve(crmSkillNotesToken)
          .list(c.get('actor')),
      }),
    );
    routes.put('/skills/:name', async (c) =>
      c.json({
        data: await app.container
          .resolve(crmSkillNotesToken)
          .save(c.get('actor'), c.req.param('name'), await c.req.json()),
      }),
    );
    routes.put('/settings', async (c) =>
      c.json({
        data: await service.saveSettings(c.get('actor'), await c.req.json()),
      }),
    );
    // Whether the signed-in user could carry out a write the AI employee
    // proposed: the confirmation card asks before offering to confirm.
    routes.post('/ai/screen', async (c) => {
      const body = object(await c.req.json());
      return c.json({
        data: await screenProposal(
          service,
          c.get('actor'),
          toText(body.tool),
          body.input,
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
          // Only the upload path binds this; access was already checked
          // above against the CRM's own permissions, and reads go through
          // the CRM's file route rather than the plugin's.
          policy: { read: true, create: true, update: false, delete: false },
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
    // The stored type of a file, when it is one the browser may render on
    // its own from "?inline=1" (images, PDF, plain text, Markdown as text).
    // The preview dialog is the file plugin's, which decides what it can
    // show from the stored type and the extension and fetches the bytes
    // itself for Office documents, so the list carries the stored type.
    const previewType = (file: { mimeType?: unknown }): string | null => {
      const type = toText(file.mimeType ?? '').toLowerCase();
      return /^image\/(png|jpeg|gif|webp|svg\+xml|bmp|avif)$/.test(type) ||
        type === 'application/pdf' ||
        type === 'text/plain' ||
        type === 'text/markdown' ||
        type === 'text/x-markdown'
        ? type
        : null;
    };
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
        .select(['id', 'filename', 'createdAt', 'mimeType', 'size'])
        .where('id', 'in', ids)
        .execute();
      const readable = [];
      for (const file of files)
        if (await service.canReadFile(actor, toText(file.id)))
          readable.push({
            id: toText(file.id),
            filename: toText(file.filename),
            createdAt: toText(file.createdAt),
            mimeType: file.mimeType == null ? null : toText(file.mimeType),
            size: file.size == null ? null : Number(file.size),
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
      // "?inline=1" shows the file in the browser, for the preview dialog,
      // and only for types a browser renders safely on its own (images,
      // PDF, plain text); everything else stays a download whatever the
      // stored type says.
      const inline = c.req.query('inline') === '1' ? previewType(file) : null;
      const name = toText(encodeURIComponent(toText(file.filename)));
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          'Content-Type': inline ?? 'application/octet-stream',
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
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
    // Taking the data out of the system is a capability of its own.
    routes.get('/:entity/export', async (c) => {
      if (!(await capability(c.get('actor'), 'export')))
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
    // The AI's evaluation of a lead (lead-evaluation.ts): the newest one,
    // asking for another (as someone who may edit the lead), and the
    // owner's decision on a waiting one.
    const evaluator = () =>
      app.container.has(leadEvaluatorToken)
        ? app.container.resolve(leadEvaluatorToken)
        : undefined;
    // How many suggestions wait on the reader, for the menu's badge and the
    // browser tab.
    // And how many are still being worked on, so the badge can look again
    // soon rather than in half a minute.
    routes.get('/decisions/count', async (c) => {
      const decisions = await pendingDecisions(service, c.get('actor'), {
        pageSize: 1000,
      });
      return c.json({
        data: {
          count: decisions.pending,
          running: decisions.data.filter((entry) => entry.status === 'running')
            .length,
        },
      });
    });
    routes.get('/decisions', async (c) =>
      c.json(
        await pendingDecisions(service, c.get('actor'), {
          scope: c.req.query('scope'),
          state: c.req.query('state'),
          page: Number(c.req.query('page') ?? 1) || 1,
          pageSize: Number(c.req.query('pageSize') ?? 20) || 20,
        }),
      ),
    );
    routes.get('/leads/:id/evaluation', async (c) =>
      c.json({
        data: await latestEvaluation(
          service,
          c.get('actor'),
          c.req.param('id'),
        ),
      }),
    );
    routes.post('/leads/:id/evaluation', async (c) => {
      const actor = c.get('actor');
      await service.get(actor, 'leads', c.req.param('id'), undefined, 'update');
      // A body naming a waiting card (`revise`) and an `instruction` redoes
      // that card as the person asks.
      const body = object(await c.req.json().catch(() => ({})));
      const entry = await evaluator()?.request(
        actor,
        c.req.param('id'),
        body.revise
          ? { entryId: body.revise, instruction: body.instruction }
          : undefined,
      );
      if (!entry) throw new CrmError('assistantUnavailable', 409);
      return c.json({ data: entry }, 201);
    });
    // The web findings of an evaluation the person picked, into the lead.
    routes.post('/leads/:id/evaluation/:entryId/enrich', async (c) => {
      const run = evaluator();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      return c.json({
        data: await run.enrich(
          c.get('actor'),
          c.req.param('id'),
          c.req.param('entryId'),
          object(await c.req.json()).fields,
        ),
      });
    });
    // The same for a deal (opportunity-evaluation.ts): its newest follow-up,
    // asking for another or redoing a waiting one, and the decision on it.
    const dealEvaluator = () =>
      app.container.has(opportunityEvaluatorToken)
        ? app.container.resolve(opportunityEvaluatorToken)
        : undefined;
    routes.get('/opportunities/:id/evaluation', async (c) =>
      c.json({
        data: await latestOpportunityEvaluation(
          service,
          c.get('actor'),
          c.req.param('id'),
        ),
      }),
    );
    routes.post('/opportunities/:id/evaluation', async (c) => {
      const actor = c.get('actor');
      await service.get(
        actor,
        'opportunities',
        c.req.param('id'),
        undefined,
        'update',
      );
      const body = object(await c.req.json().catch(() => ({})));
      const entry = await dealEvaluator()?.request(
        actor,
        c.req.param('id'),
        body.revise
          ? { entryId: body.revise, instruction: body.instruction }
          : undefined,
      );
      if (!entry) throw new CrmError('assistantUnavailable', 409);
      return c.json({ data: entry }, 201);
    });
    routes.post('/opportunities/:id/evaluation/:entryId', async (c) => {
      const run = dealEvaluator();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const body = object(await c.req.json());
      return c.json({
        data: await run.decide(
          c.get('actor'),
          c.req.param('id'),
          c.req.param('entryId'),
          toText(body.decision) as 'accept',
          body.fields,
          body.activity,
        ),
      });
    });
    routes.post('/leads/:id/evaluation/:entryId', async (c) => {
      const run = evaluator();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const body = object(await c.req.json());
      return c.json({
        data: await run.decide(
          c.get('actor'),
          c.req.param('id'),
          c.req.param('entryId'),
          toText(body.decision) as 'accept',
          body.fields,
          body.activity,
        ),
      });
    });
    // New lead with the AI: pasted text in, prefilled lead forms out
    // (lead-capture.ts). Nothing is saved here; the form is.
    routes.post('/leads/capture', async (c) =>
      c.json({
        data: await captureLeads(
          service,
          app.container,
          c.get('actor'),
          await c.req.json(),
          (await service.settings()).timeZone || 'Asia/Shanghai',
        ),
      }),
    );
    // What came of an activity, jotted down, written up by the AI as its
    // feedback for the person to read and record (feedback.ts).
    routes.post('/activities/:id/feedback/organise', async (c) =>
      c.json({
        data: await organiseFeedback(
          service,
          app.container,
          c.get('actor'),
          c.req.param('id'),
          await c.req.json(),
        ),
      }),
    );
    // A planned activity's outcome, recorded, and, as asked, its lead
    // followed up anew (feedback.ts).
    routes.post('/activities/:id/outcome', async (c) =>
      c.json({
        data: await recordOutcome(
          service,
          { leads: evaluator(), opportunities: dealEvaluator() },
          c.get('actor'),
          c.req.param('id'),
          await c.req.json(),
        ),
      }),
    );
    routes.get('/leads/:id/conversion', async (c) => {
      const data = await conversionPreview(
        service,
        c.get('actor'),
        c.req.param('id'),
      );
      return c.json({
        data: {
          ...data,
          ...(await resolveTitles(service, c.get('actor'), {
            leads: [data.lead as Row],
            accounts: data.accounts as Row[],
            contacts: data.contacts as Row[],
            opportunities: data.opportunities as Row[],
          })),
        },
      });
    });
    routes.post('/leads/:id/convert', async (c) => {
      const body = object(await c.req.json());
      const lead = await convertLead(
        service,
        c.get('actor'),
        c.req.param('id'),
        body,
      );
      // The deal it opened is followed up by the AI at once, unless the
      // person converting unticked that (`followUp: false`).
      if (lead.convertedOpportunityId && body.followUp !== false)
        service.opportunityOpened?.(
          c.get('actor'),
          toText(lead.convertedOpportunityId),
        );
      return c.json({ data: lead });
    });
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
    // Further pages of a record's change history, named like the detail.
    routes.get('/:entity/:id/history', async (c) => {
      const entity = asEntity(c.req.param('entity'));
      const page = Number(c.req.query('page') ?? 1);
      const pageSize = Number(c.req.query('pageSize') ?? RELATED_PAGE);
      if (![page, pageSize].every((n) => Number.isSafeInteger(n) && n > 0))
        throw new CrmError('invalidInput');
      const result = await service.historyOf(
        c.get('actor'),
        entity,
        c.req.param('id'),
        {
          page,
          pageSize,
          source: c.req.query('source'),
          action: c.req.query('action'),
        },
      );
      return c.json({
        ...result,
        ...(await resolveTitles(service, c.get('actor'), {
          [entity]: result.data.map((event) => object(event.changes ?? {})),
        })),
      });
    });
    // Notes in a record's activity feed: added by anyone who may read the
    // record, changed or removed by their author (CrmService.addNote).
    // Registered before the record routes, which would take /notes/:id.
    routes.post('/:entity/:id/notes', async (c) =>
      c.json({
        data: await service.addNote(
          c.get('actor'),
          asEntity(c.req.param('entity')),
          c.req.param('id'),
          object(await c.req.json()).text,
        ),
      }),
    );
    routes.patch('/notes/:noteId', async (c) =>
      c.json({
        data: await service.editNote(
          c.get('actor'),
          c.req.param('noteId'),
          object(await c.req.json()).text,
        ),
      }),
    );
    routes.delete('/notes/:noteId', async (c) => {
      await service.removeNote(c.get('actor'), c.req.param('noteId'));
      return c.json({ data: { deleted: true } });
    });
    routes.get('/:entity/:id', async (c) => {
      const entity = asEntity(c.req.param('entity'));
      const data = await service.detail(
        c.get('actor'),
        entity,
        c.req.param('id'),
      );
      // The record, everything related to it, and the ids its history
      // mentions (a changed owner or account) all get their names.
      const rows: Partial<Record<Entity, Row[]>> = {};
      for (const [name, list] of Object.entries(object(data.related ?? {})))
        rows[name as Entity] = array(list).map(object);
      rows[entity] = [
        ...(rows[entity] ?? []),
        object(data.record),
        ...array(data.history).map((event) =>
          object(object(event).changes ?? {}),
        ),
      ];
      return c.json({
        data: {
          ...data,
          ...(await resolveTitles(service, c.get('actor'), rows)),
        },
      });
    });
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
      const entity = asEntity(c.req.param('entity'));
      const result = await service.list(c.get('actor'), entity, options);
      return c.json({
        ...result,
        ...(await resolveTitles(service, c.get('actor'), {
          [entity]: result.data,
        })),
        // Leads and deals the AI is following up or has a verdict waiting
        // on.
        ...(entity === 'leads' || entity === 'opportunities'
          ? {
              ai: await aiStates(
                service,
                result.data.map((record) => toText(record.id)),
                entity,
              ),
            }
          : {}),
      });
    });
    routes.post('/:entity', async (c) => {
      const entity = asEntity(c.req.param('entity'));
      // A lead the AI organised from pasted text and the user checked
      // (lead-capture.tsx) is recorded as organised by the AI. The mark
      // only labels the history entry; the write is the user's.
      const actor =
        entity === 'leads' && c.req.query('via') === 'capture'
          ? { ...c.get('actor'), via: 'capture' as const }
          : c.get('actor');
      const record = await service.save(actor, entity, await c.req.json());
      // A new lead is followed up by the AI in the background, unless the
      // person creating it unticked that (`followUp=0`); the lead is created
      // whether or not that can start.
      if (entity === 'leads' && c.req.query('followUp') !== '0')
        await evaluator()
          ?.request(actor, toText(record.id))
          .catch(() => undefined);
      return c.json({ data: record }, 201);
    });
    routes.patch('/:entity/:id', async (c) => {
      const actor = c.get('actor');
      const entity = asEntity(c.req.param('entity'));
      const id = c.req.param('id');
      // What the change is measured against: an activity marked done, a
      // lead's company changed.
      const before =
        entity === 'activities' || entity === 'leads'
          ? await service.get(actor, entity, id).catch(() => undefined)
          : undefined;
      const record = await service.save(actor, entity, await c.req.json(), id);
      if (
        entity === 'activities' &&
        before &&
        before.status !== 'completed' &&
        record.status === 'completed'
      )
        service.activityCompleted?.(actor, record);
      if (
        entity === 'leads' &&
        before &&
        ['new', 'working', 'nurturing'].includes(toText(record.status)) &&
        (['company', 'website'] as const).some(
          (key) =>
            toText(record[key] ?? '').trim() !== '' &&
            toText(record[key] ?? '').trim() !==
              toText(before[key] ?? '').trim(),
        )
      )
        service.leadCompanyChanged?.(actor, id);
      return c.json({ data: record });
    });
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
