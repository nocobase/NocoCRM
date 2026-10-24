import {
  authenticationToken,
  type AuthEnv,
} from '@nocobase/app-plugin-authentication';
import {
  agentsToken,
  isReadingAction,
  runIdentityOf,
} from '@nocobase/app-plugin-agents/server/tokens';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import type { Application } from '@nocobase/app-server/application';
import {
  ApiError,
  apiErrorHandler,
  cliRoute,
  declaredRouteActionOf,
  type CliRouteOptions,
  type OpenAPIV3_1,
} from '@nocobase/app-server/router';
import { databaseManagerToken } from '@nocobase/db';
import type { ErrorHandler, MiddlewareHandler } from 'hono';
import type { Actor } from '../providers/crm/authorization.js';
import { leadEvaluatorToken } from '../providers/crm/lead-evaluation.js';
import { opportunityEvaluatorToken } from '../providers/crm/opportunity-evaluation.js';
import { approvalReviewerToken } from '../providers/crm/approval-review.js';
import { taskPreparerToken } from '../providers/crm/task-preparation.js';
import { CrmError } from '../providers/crm/schema.js';
import { CRM_ERROR_DOMAIN, toApiError } from './errors.js';
import {
  AI_WORK_ACTION,
  PLAN_ACTION,
} from '../providers/crm-agents/actions.js';
import { watchAiWork } from '../providers/crm/ai-watches.js';
import { crmToken } from '../providers/crm/index.js';
import { isDemoMode } from '../providers/crm/demo-mode.js';
import { DemoReadOnlyError } from '@nocobase/app-plugin-demo-mode/server';
import {
  ASSISTANT_SCHEME,
  assistantActions,
  assistantIdentityOf,
} from '../providers/crm-agents/assistant.js';

// What every CRM route shares: the signed-in user as the services' actor,
// and the CRM's errors in the standard body.

export type CrmEnv = {
  Variables: AuthEnv['Variables'] &
    AuthorizationEnv['Variables'] & { actor: Actor };
};

// The credentials a route an agent may call accepts: a person's session or
// API key, a runner agent's run token (the Agents plugin), and the
// credential of a command the assistant runs (crm-agents/assistant.ts).
// Every such route names its business action in `cliRoute({ action })`.
export const RUN_SECURITY: OpenAPIV3_1.SecurityRequirementObject[] = [
  { cookieAuth: [] },
  { apiKeyAuth: [] },
  { runToken: [] },
  { [ASSISTANT_SCHEME]: [] },
];

// What a route an agent's run may call declares: the credentials above and
// the command's business action (crm-agents/actions.ts), which the guard
// checks against what the run holds.
export const runCommand = (
  action: string,
  options: Omit<CliRouteOptions, 'action'> = {},
): {
  security: OpenAPIV3_1.SecurityRequirementObject[];
} & ReturnType<typeof cliRoute> => ({
  security: RUN_SECURITY,
  ...cliRoute({ ...options, action }),
});

// Authentication, the authorization scope, and the actor the services take:
// the user with the scope and the language they read in.
export function crmGuard(app: Application) {
  const actor: MiddlewareHandler<CrmEnv> = async (c, next) => {
    const scope = c.get('authz');
    const id = scope.identity.principal?.id;
    if (!id) throw new CrmError('unauthorized', 401);
    // Refuse before uploads, outbound calls, AI work or queues can run. The
    // plugin remains responsible for SQL protection, including writes on GET.
    if (isDemoMode(app) && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      c.header('Server-Timing', 'demo-read-only');
      throw new DemoReadOnlyError([]);
    }
    c.set('actor', {
      id,
      scope,
      locale: c.req.header('accept-language')?.startsWith('zh')
        ? 'zh-CN'
        : 'en-US',
    });
    await next();
  };
  // An agent's run acts as the person who woke it, kept to the actions its
  // agent holds (crm-agents/gate.ts): the route's action is checked here,
  // since the router only filters the commands it offers. A run never writes:
  // every change it asks for is refused with PLAN_REQUIRED, and it proposes
  // the change as a plan the person confirms (migration step 2: every agent
  // starts at suggesting, guideline 3.5). Setting the CRM's AI agents to
  // work on a record is called directly: it changes no record, and what the
  // work suggests waits for the person.
  const run: MiddlewareHandler<CrmEnv> = async (c, next) => {
    const identity = runIdentityOf(c.get('auth'));
    const assistant = assistantIdentityOf(c.get('auth'));
    if (!identity && !assistant) return next();
    const action = declaredRouteActionOf(c);
    const allowed = !action
      ? new Set<string>()
      : assistant
        ? await assistantActions(
            app.container.resolve(crmToken),
            assistant.userId,
          )
        : identity && app.container.has(agentsToken)
          ? await app.container.resolve(agentsToken).gate.allowed(identity)
          : new Set<string>();
    if (!action || !allowed.has(action))
      throw new ApiError({
        status: 'PERMISSION_DENIED',
        reason: 'ACTION_NOT_ALLOWED',
        domain: CRM_ERROR_DOMAIN,
        message: `This agent may not ${action ?? 'call this route'}.`,
        metadata: { action: action ?? '' },
      });
    if (
      !isReadingAction(action) &&
      action !== PLAN_ACTION &&
      action !== AI_WORK_ACTION
    )
      throw new ApiError({
        status: 'FAILED_PRECONDITION',
        reason: 'PLAN_REQUIRED',
        domain: CRM_ERROR_DOMAIN,
        message:
          'An agent does not change records: propose the change as a plan for the person to confirm.',
        metadata: { reason: 'alwaysConfirm', action },
      });
    return next();
  };
  return [
    // A run's token and a scoped API key are scoped credentials: the CRM's
    // routes accept them, a run's only where a route's security lists it.
    app.container.resolve(authenticationToken).required({ scopedKeys: true }),
    app.container.resolve(authorizationToken).middleware(),
    actor,
    run,
  ] as const;
}

// The CRM's errors in the standard body (errors.ts); anything else is the
// application's to answer.
export const crmErrorHandler: ErrorHandler<CrmEnv> = (error, c) =>
  apiErrorHandler(toApiError(error), c);

// The AI's workers, absent while the AI Employee plugin is not registered
// (and in tests that do not provide them).
export function aiWorkers(app: Application) {
  const { container } = app;
  return {
    leads: () =>
      container.has(leadEvaluatorToken)
        ? container.resolve(leadEvaluatorToken)
        : undefined,
    opportunities: () =>
      container.has(opportunityEvaluatorToken)
        ? container.resolve(opportunityEvaluatorToken)
        : undefined,
    approvals: () =>
      container.has(approvalReviewerToken)
        ? container.resolve(approvalReviewerToken)
        : undefined,
    tasks: () =>
      container.has(taskPreparerToken)
        ? container.resolve(taskPreparerToken)
        : undefined,
  };
}

// The conversation a request comes from, when an agent makes it: the
// assistant's, or the one a runner agent's run's outcome goes back to (a
// consulted agent's, the asking one's).
export async function runConversationOf(
  app: Application,
  auth: AuthEnv['Variables']['auth'],
): Promise<string | null> {
  const assistant = assistantIdentityOf(auth);
  if (assistant) return assistant.conversationId || null;
  const run = runIdentityOf(auth);
  if (!run?.run || !app.container.has(agentsToken)) return null;
  const agents = app.container.resolve(agentsToken);
  const record = run.run.run;
  const home = await agents.conversations.homeOf(agents.tx.read(), {
    subject: { kind: record.subjectKind, id: record.subjectId },
    actorUserId: record.actorUserId,
    parentRunId: record.parentRunId,
  });
  return home?.id ?? null;
}

// AI work a run started on a record: noted, so its outcome goes back to the
// run's conversation once it finishes (crm-agents/ai-work-news.ts).
export async function watchRunWork(
  app: Application,
  c: {
    get(key: 'auth'): AuthEnv['Variables']['auth'];
    get(key: 'actor'): Actor;
  },
  entity: string,
  recordId: string,
  entryId: string,
): Promise<void> {
  const conversationId = await runConversationOf(app, c.get('auth'));
  if (!conversationId) return;
  await watchAiWork(app.container.resolve(databaseManagerToken), {
    id: entryId,
    entity,
    recordId,
    userId: c.get('actor').id,
    conversationId,
  });
}
