import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
} from '@nocobase/app-server/router';
import type { Hono } from 'hono';
import { companySignalsToken } from '../providers/crm/company-signals.js';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { crmToken } from '../providers/crm/index.js';
import { AI_WORK_ACTION } from '../providers/crm-agents/actions.js';
import {
  deliverCompanyProfile,
  deliverSignalCheck,
} from '../providers/crm-agents/ai-work-news.js';
import { assistantWake } from '../providers/crm-agents/assistant.js';
import { runCommand, runConversationOf, type CrmEnv } from './context.js';
import {
  CompanyProfile,
  CompanyProfileInput,
  CompanySignals,
  CompanySignalsQuery,
  DecideSignalInput,
  Signal,
  SignalCheck,
  SignalCheckStarted,
  WatchCompanyInput,
} from './schemas/signals.js';

// A company's signals (company-signals.ts): read by whoever may read the
// company; watched, checked at once and dismissed by
// whoever may edit it.
export function registerSignalRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const signals = () => app.container.resolve(companySignalsToken);
  const tags = ['Companies'];
  router.post(
    '/companies/capture',
    describeRoute({
      tags,
      summary: 'Look a new company up on the web',
      operationId: 'captureCompany',
      description:
        "New company with the AI: searches the web for the company named and returns the form's values found, the fields it was unsure of, the pages it read and the companies the reader may see by that name. Saves nothing. Needs the right to create companies and the Company research agent's model (without one, 400 FAILED_PRECONDITION with reason SIGNALS_UNAVAILABLE); a failed search is 503 UNAVAILABLE with reason SIGNALS_FAILED.",
      responses: {
        '200': dataResponse(CompanyProfile),
        ...apiErrorResponses,
        '503': apiErrorResponse(503),
      },
    }),
    apiValidator('json', CompanyProfileInput),
    async (c) =>
      c.json({
        data: await signals().profile(c.get('actor'), c.req.valid('json')),
      }),
  );
  // The same look-up asked by an agent about to create the company:
  // answered at once, the search going on, and what it finds told back to
  // the conversation that asked (crm-agents/ai-work-news.ts), for the agent
  // to propose the company with it. Saves nothing.
  router.post(
    '/companies/lookUp',
    describeRoute({
      tags,
      summary: 'Start looking a new company up on the web',
      operationId: 'lookUpCompany',
      description:
        "The Company research agent searches the web for the company named, in the background, as New company with the AI does; asked from a conversation, the form's values found, the fields it was unsure of, the pages it read and the companies by that name already in the CRM are told back to it. Saves nothing. Needs the right to create companies and a model service that searches (else 400 FAILED_PRECONDITION with reason SIGNALS_UNAVAILABLE).",
      ...runCommand(AI_WORK_ACTION, { command: 'companies look-up' }),
      responses: {
        '202': dataResponse(
          SignalCheckStarted,
          'Started; what it finds comes to the conversation.',
        ),
        ...apiErrorResponses,
      },
    }),
    apiValidator('json', CompanyProfileInput),
    async (c) => {
      const input = c.req.valid('json');
      const { done } = await signals().startProfile(c.get('actor'), input);
      const conversationId = await runConversationOf(app, c.get('auth'));
      const tell = (outcome: Parameters<typeof deliverCompanyProfile>[4]) =>
        conversationId && app.container.has(agentsToken)
          ? deliverCompanyProfile(
              app.container.resolve(agentsToken),
              assistantWake(
                app,
                app.container.resolve(crmToken),
                app.container.resolve(agentsToken),
              ),
              conversationId,
              input.name.trim(),
              outcome,
            )
          : Promise.resolve();
      void done
        .then(
          (profile) => tell(profile),
          (error: unknown) => tell({ error }),
        )
        .catch(() => undefined);
      return c.json({ data: { started: true } }, 202);
    },
  );
  router.get(
    '/companies/:companyId/signals',
    describeRoute({
      tags,
      summary: "List a company's signals",
      operationId: 'listCompanySignals',
      description:
        'A page of them, those not dismissed first and the newest events first, with how many there are (all, not dismissed, new), whether the company is checked daily and when it was last checked. `until` widens the first page to reach that signal.',
      responses: {
        '200': dataResponse(CompanySignals),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('query', CompanySignalsQuery),
    async (c) =>
      c.json({
        data: await signals().of(
          c.get('actor'),
          c.req.param('companyId'),
          c.req.valid('query'),
        ),
      }),
  );
  router.put(
    '/companies/:companyId/signals/watch',
    describeRoute({
      tags,
      summary: 'Watch a company for signals',
      operationId: 'watchCompanySignals',
      description:
        'Switches the daily check of a company without an open deal on or off. Needs edit access to the company.',
      responses: {
        '200': dataResponse(CompanySignals),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('json', WatchCompanyInput),
    async (c) =>
      c.json({
        data: await signals().watch(
          c.get('actor'),
          c.req.param('companyId'),
          c.req.valid('json').watched,
        ),
      }),
  );
  router.post(
    '/companies/:companyId/signals/check',
    describeRoute({
      tags,
      summary: 'Check a company for signals now',
      operationId: 'checkCompanySignals',
      description:
        'Searches the web for the company now and keeps the new signals found. Needs edit access to the company and the Qwen model service (without it, 400 FAILED_PRECONDITION with reason SIGNALS_UNAVAILABLE); a failed search is 503 UNAVAILABLE with reason SIGNALS_FAILED.',
      responses: {
        '200': dataResponse(SignalCheck),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
        '503': apiErrorResponse(503),
      },
    }),
    async (c) =>
      c.json({
        data: await signals().checkNow(
          c.get('actor'),
          c.req.param('companyId'),
        ),
      }),
  );
  // The same check asked by an agent: answered at once, the web search
  // going on in the background, and what it finds told back to the
  // conversation that asked (crm-agents/ai-work-news.ts) as well as kept on
  // the Signals tab.
  router.post(
    '/companies/:companyId/signals/request',
    describeRoute({
      tags,
      summary: 'Start a check of a company for signals',
      operationId: 'requestCompanySignals',
      description:
        'The Company research agent searches the web for the company in the background and keeps the new signals found; asked from a conversation, what it finds is told back to it. Needs edit access to the company and a model service that searches (else 400 FAILED_PRECONDITION with reason SIGNALS_UNAVAILABLE).',
      ...runCommand(AI_WORK_ACTION, { command: 'companies check-signals' }),
      responses: {
        '202': dataResponse(
          SignalCheckStarted,
          'Started; its signals follow on the Signals tab.',
        ),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    async (c) => {
      const companyId = c.req.param('companyId');
      const { done } = await signals().startCheck(c.get('actor'), companyId);
      const conversationId = await runConversationOf(app, c.get('auth'));
      const tell = (outcome: Parameters<typeof deliverSignalCheck>[4]) =>
        conversationId && app.container.has(agentsToken)
          ? deliverSignalCheck(
              app.container.resolve(agentsToken),
              app.container.resolve(crmToken),
              assistantWake(
                app,
                app.container.resolve(crmToken),
                app.container.resolve(agentsToken),
              ),
              { conversationId, companyId },
              outcome,
            )
          : Promise.resolve();
      void done
        .then(
          (result) => tell(result),
          (error: unknown) => tell({ error }),
        )
        .catch(() => undefined);
      return c.json({ data: { started: true } }, 202);
    },
  );
  router.patch(
    '/signals/:signalId',
    describeRoute({
      tags,
      summary: 'Dismiss a signal or undo it',
      operationId: 'decideSignal',
      description: 'Needs edit access to its company.',
      responses: {
        '200': dataResponse(Signal),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('json', DecideSignalInput),
    async (c) =>
      c.json({
        data: await signals().decide(
          c.get('actor'),
          c.req.param('signalId'),
          c.req.valid('json').status,
        ),
      }),
  );
}
