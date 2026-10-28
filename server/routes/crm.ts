import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  defineApiRoutes,
  describeRoute,
  emptyResponse,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { Hono } from 'hono';
import { crmToken } from '../providers/crm/index.js';
import { entities } from '../providers/crm/schema.js';
import { crmErrorHandler, crmGuard, type CrmEnv } from './context.js';
import { registerOperationRoutes } from './operations.js';
import { registerPlanRoutes } from './plans.js';
import { registerRecordMailRoutes } from './record-mail.js';
import { registerRecordRoutes } from './records.js';
import { registerSignalRoutes } from './signals.js';
import { registerWhatsAppRoutes } from './whatsapp.js';
import { registerWorkspaceRoutes } from './workspace.js';
import { CRM_PATHS } from './crm-paths.js';
import { HistoryEntry } from './schemas/common.js';
import { CommentParams, UpdateCommentInput } from './schemas/comments.js';

// The CRM's routes at the application's root: the records (/leads,
// /companies, /contacts, /opportunities, /tasks, /approvals and
// /comments) and the workspace's own (CRM_PATHS). The guard is
// installed on exactly these paths, so nothing else under /api passes
// through it.
export const crmRoutes: AppApiRouteContribution<Application> = defineApiRoutes(
  (app) => {
    const router = new Hono<CrmEnv>();
    const service = app.container.resolve(crmToken);
    for (const path of CRM_PATHS) router.use(`/${path}/*`, ...crmGuard(app));
    router.onError(crmErrorHandler);

    registerWorkspaceRoutes(app, router);
    registerPlanRoutes(app, router);
    registerOperationRoutes(app, router);
    registerSignalRoutes(app, router);
    registerWhatsAppRoutes(app, router);
    registerRecordMailRoutes(app, router);
    for (const entity of entities) registerRecordRoutes(app, router, entity);

    // A comment, changed or removed by its author (CrmService.editComment).
    router.patch(
      '/comments/:commentId',
      describeRoute({
        tags: ['Comments'],
        summary: 'Edit a comment',
        operationId: 'updateComment',
        description:
          'Its author only. The colleagues it newly mentions are told.',
        responses: {
          '200': dataResponse(HistoryEntry, 'The comment as saved.'),
          ...apiErrorResponses,
          '404': apiErrorResponse(404),
        },
      }),
      apiValidator('param', CommentParams),
      apiValidator('json', UpdateCommentInput),
      async (c) => {
        const body = c.req.valid('json');
        return c.json({
          data: await service.editComment(
            c.get('actor'),
            c.req.valid('param').commentId,
            body.text,
            body.mentions,
            body.attachments,
          ),
        });
      },
    );
    router.delete(
      '/comments/:commentId',
      describeRoute({
        tags: ['Comments'],
        summary: 'Delete a comment',
        operationId: 'deleteComment',
        description: 'Its author only; the feed keeps that it was deleted.',
        responses: {
          '204': emptyResponse(),
          ...apiErrorResponses,
          '404': apiErrorResponse(404),
        },
      }),
      apiValidator('param', CommentParams),
      async (c) => {
        await service.removeComment(
          c.get('actor'),
          c.req.valid('param').commentId,
        );
        return c.body(null, 204);
      },
    );

    const outer = new Hono();
    outer.route('/', router);
    return outer;
  },
);
