import { i18nToken } from '@nocobase/app-server/i18n';
import { notificationLocales } from '../../locales/crm-notifications/index.js';
import { asEntity, toText } from './schema.js';
import { resolveTitles } from './titles.js';
import type { Application } from '@nocobase/app-server/application';
import { databaseManagerToken } from '@nocobase/db';
import {
  createServiceToken,
  ServiceProvider,
  type ServiceToken,
} from '@nocobase/service-provider';
import { authorizationToken } from '@nocobase/app-plugin-authorization';
import { notificationServiceToken } from '@nocobase/app-plugin-notification/server';
import { schedulerServiceToken } from '@nocobase/app-plugin-scheduler/server/tokens';
import { isDemoMode } from './demo-mode.js';
import { scanLeadSignals } from './lead-signals.js';
import { sweepFiles } from './file-sweep.js';
import { sweepSearchAnswers } from '../crm-agents/search-answers.js';
import { driveManagerToken } from '@nocobase/app-server/drive';
import { isEndOfDay, DEFAULT_TIME_ZONE } from './zone-time.js';
import { scanDealSignals } from './deal-signals.js';
import { pick } from '../../locales/crm-ai/index.js';
import { scheduleTexts } from '../../locales/crm-ai/schedules.js';
import { jobExecutorServiceToken } from '@nocobase/app-server/jobs';
import type { JobExecutor } from '@nocobase/jobs';
import {
  createFollowUpJob,
  FOLLOW_UP_JOBS,
  oncePerCard,
  runningCards,
} from './follow-up-jobs.js';
import { CrmPlans, crmPlansToken } from './plans/engine.js';
import { MailTimeline, mailTimelineToken } from './mail-timeline.js';
import { WhatsAppService, whatsappToken } from './whatsapp/service.js';
import {
  mailProviderRegistryToken,
  mailServiceToken,
} from '@nocobase/app-plugin-mail/server';
import {
  DEMO_MAIL_ROW,
  createDemoMailProvider,
  demoMailLanguage,
  setDemoMailLanguage,
  type DemoMailStore,
} from './demo-mail.js';
import { demoLanguageOf } from './demo.js';
import {
  followUpAfterTask,
  followUpLead,
  followUpOpportunity,
  approvalsSettled,
} from './feedback.js';
import { agentOn } from './agents.js';
import { servedLocale } from './served-locale.js';
import {
  provisionCrm,
  registerCrmResources,
  type Actor,
  crmActor,
} from './authorization.js';
import { CrmService, array } from './service.js';
import { CrmError } from './schema.js';
import {
  aiStates,
  LeadEvaluator,
  leadEvaluatorToken,
} from './lead-evaluation.js';
import {
  OpportunityEvaluator,
  opportunityEvaluatorToken,
} from './opportunity-evaluation.js';
import { createCrmUserRoleScope } from './user-roles.js';
import { ApprovalReviewer, approvalReviewerToken } from './approval-review.js';
import {
  scanTaskPreparation,
  TaskPreparer,
  taskPreparerToken,
} from './task-preparation.js';
import { userRoleScopeRegistryToken } from '@nocobase/app-plugin-users/server/tokens';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { aiAvailable, crmModel } from './ai-model.js';
import { CompanySignals, companySignalsToken } from './company-signals.js';
import type { WebSearcher } from './web-research.js';
import type { CrmAiConfig } from '../../config/ai.js';
import { lifecycleRuntimeToken } from '../lifecycles.js';

// The Channel the CRM's notifications go through: the in-app inbox, named
// `inbox` in the notification configuration (`notification.channels.inbox`
// with `type: in-app`, the template's name for it).
export const CRM_INBOX_CHANNEL = 'inbox';

export const crmToken: ServiceToken<CrmService> =
  createServiceToken<CrmService>('crm/service');
export default class CrmProvider extends ServiceProvider<Application> {
  public readonly name: string = 'crm/provider';
  // The in-process passes' timers, cleared at shutdown.
  private timers: ReturnType<typeof setInterval>[] = [];
  private followUps?: JobExecutor;
  private unregisterRoleScope?: () => void;
  private reminding = false;
  private delivering = false;
  public override register(): void {
    this.app.container
      .resolve(i18nToken)
      .registry.register('crm-notifications', notificationLocales);
    this.app.container.singleton(
      crmToken,
      () =>
        new CrmService(
          this.app.container.resolve(databaseManagerToken),
          this.app.container.resolve(authorizationToken),
          this.app.container.resolve(lifecycleRuntimeToken),
          {
            defaultLocale: toText(
              this.app.config?.get<{ defaultLocale?: string }>('i18n')
                ?.defaultLocale ?? '',
            ),
          },
        ),
    );
    // Changes an agent proposes, carried out once a person confirms them
    // (plans/engine.ts); the AI's follow-ups a confirmed change starts are
    // resolved when it runs.
    this.app.container.singleton(
      crmPlansToken,
      () =>
        new CrmPlans(this.app.container.resolve(crmToken), {
          leads: () => this.app.container.resolve(leadEvaluatorToken),
          opportunities: () =>
            this.app.container.resolve(opportunityEvaluatorToken),
          tasks: () => this.app.container.resolve(taskPreparerToken),
          mail: () =>
            this.app.container.has(mailServiceToken)
              ? this.app.container.resolve(mailServiceToken)
              : undefined,
          mailSent: (userId) =>
            this.app.container.resolve(mailTimelineToken).syncUser(userId),
        }),
    );
    // New leads evaluated by the AI (lead-evaluation.ts).
    this.app.container.singleton(
      leadEvaluatorToken,
      () =>
        new LeadEvaluator(
          this.app.container.resolve(crmToken),
          this.app.container,
        ),
    );
    // Deals followed up by the AI (opportunity-evaluation.ts).
    this.app.container.singleton(
      opportunityEvaluatorToken,
      () =>
        new OpportunityEvaluator(
          this.app.container.resolve(crmToken),
          this.app.container,
        ),
    );
    // The mail each record's people exchanged with the team, brought into
    // its timeline (mail-timeline.ts).
    this.app.container.singleton(
      mailTimelineToken,
      () =>
        new MailTimeline(
          this.app.container.resolve(crmToken),
          this.app.container,
        ),
    );
    // The company's WhatsApp number (whatsapp/service.ts).
    this.app.container.singleton(
      whatsappToken,
      () =>
        new WhatsAppService(
          this.app.container.resolve(crmToken),
          this.app.container,
        ),
    );
    // Approval requests reviewed by the AI for their approvers
    // (approval-review.ts).
    this.app.container.singleton(
      approvalReviewerToken,
      () =>
        new ApprovalReviewer(
          this.app.container.resolve(crmToken),
          this.app.container,
        ),
    );
    // Tasks prepared by the AI for their owners (task-preparation.ts).
    this.app.container.singleton(
      taskPreparerToken,
      () =>
        new TaskPreparer(
          this.app.container.resolve(crmToken),
          this.app.container,
        ),
    );
    // The companies' news looked up on the web (company-signals.ts), with
    // the Company signals agent's model, whichever it is (web-research.ts).
    this.app.container.singleton(
      companySignalsToken,
      () =>
        new CompanySignals(
          this.app.container.resolve(crmToken),
          // With the Company signals agent's model (work-agents.ts): a Qwen
          // one of a configured service through DashScope's own API, a
          // DeepSeek one of a configured service through the gateway with
          // DeepSeek's Search API, any other through the gateway with its
          // provider's search; none while there is no model at all.
          async (): Promise<WebSearcher | null> => {
            const model = await crmModel(this.app.container, 'signals').catch(
              () => null,
            );
            if (!model) return null;
            const services =
              this.app.config?.get<CrmAiConfig['llmServices']>(
                'ai.llmServices',
              );
            const configured = services?.[model.modelService];
            const apiKey = configured?.options?.apiKey;
            if (
              configured?.provider === 'dashscope' &&
              typeof apiKey === 'string' &&
              apiKey
            )
              return {
                kind: 'dashscope',
                service: model.modelService,
                model: model.model,
                apiKey,
              };
            const agents = this.app.container.resolve(agentsToken);
            if (
              configured?.provider === 'deepseek' &&
              typeof apiKey === 'string' &&
              apiKey
            )
              return {
                kind: 'deepseek',
                service: model.modelService,
                model: model.model,
                apiKey,
                languageModel: () => agents.models.gateway.languageModel(model),
              };
            const provider =
              (await agents.models.services.list().catch(() => [])).find(
                (service) => service.name === model.modelService,
              )?.provider ?? 'unknown';
            return {
              kind: 'gateway',
              service: model.modelService,
              model: model.model,
              provider,
              languageModel: () => agents.models.gateway.languageModel(model),
            };
          },
          // A signal worth acting on reaches the company's open deals
          // through their daily pass (deal-signals.ts), not from the check.
          { container: this.app.container },
        ),
    );
    registerCrmResources(this.app.container.resolve(authorizationToken));
  }
  public override async boot(): Promise<void> {
    await provisionCrm(
      this.app.container.resolve(authorizationToken),
      this.app.container.resolve(databaseManagerToken),
    );
    // The demo dataset's mailboxes (demo-mail.ts), through the Mail plugin's
    // public provider registry; their messages are the import's.
    if (this.app.container.has(mailProviderRegistryToken)) {
      const service = this.app.container.resolve(crmToken);
      this.app.container.resolve(mailProviderRegistryToken).register(
        createDemoMailProvider(
          async (address) => {
            const row = await service.database
              .query()
              .selectFrom('crmSettings')
              .select('value')
              .where('id', '=', DEMO_MAIL_ROW)
              .executeTakeFirst();
            const value: unknown = row?.value;
            const store = (
              typeof value === 'string' ? JSON.parse(value) : (value ?? {})
            ) as DemoMailStore;
            return store[address.toLowerCase()] ?? [];
          },
          // The label in the demo's language, else the application's.
          () =>
            (
              demoMailLanguage() ??
              toText(
                this.app.config.get<{ defaultLocale?: string }>('i18n')
                  ?.defaultLocale ?? '',
              )
            ).startsWith('zh'),
        ),
      );
      setDemoMailLanguage(await demoLanguageOf(service));
    }
    // The CRM's AI runs while there is a model to ask on the Agents plugin.
    this.app.container.resolve(crmToken).aiCheck = () =>
      aiAvailable(this.app.container);
    // The daily look over the open leads for what has not happened
    // (lead-signals.ts): a scheduler task, so administrators see each pass,
    // what it started, and may switch it off on the scheduled tasks page.
    // At nine in the morning of the CRM's time zone as it stands at boot.
    if (
      !isDemoMode(this.app) &&
      this.app.container.has(schedulerServiceToken)
    ) {
      const scheduler = this.app.container.resolve(schedulerServiceToken);
      const service = this.app.container.resolve(crmToken);
      const settings = await service.settings();
      // The scheduled tasks page shows these as stored, untranslated: in the
      // CRM's working language, the AI's.
      const words = pick(scheduleTexts, settings.aiLanguage.startsWith('zh'));
      const timezone = settings.timeZone || DEFAULT_TIME_ZONE;
      const isObject = (config: unknown) =>
        config !== null && typeof config === 'object' && !Array.isArray(config)
          ? { valid: true as const }
          : { valid: false as const, reason: 'config-must-be-an-object' };
      scheduler.registerTarget({
        type: 'app.crm-lead-signals',
        title: words.leadTarget,
        validate: isObject,
        // Read on the scheduled tasks page in place of the type's name.
        // Disabled while the agent's daily trigger is off (agents.ts),
        // so its firings are skipped and the scheduled tasks page says why.
        describe: async () => ({
          targetLabel: words.leadTarget,
          description: words.leadTargetDescription,
          state: (await agentOn(service, 'leads', 'daily'))
            ? 'ready'
            : 'disabled',
        }),
        start: async () => {
          const pass = await scanLeadSignals(
            service,
            this.app.container.resolve(leadEvaluatorToken),
          );
          return {
            state: 'completed',
            outcome: 'succeeded',
            result: { checked: pass.checked, started: pass.started },
          };
        },
      });
      scheduler.defineSchedule({
        key: 'crm.lead-signals',
        title: words.leadTitle,
        description: words.leadDescription,
        schedule: { cron: '0 9 * * *', timezone },
        target: { type: 'app.crm-lead-signals', config: {} },
      });
      // The same look over the open deals (deal-signals.ts), at the same
      // hour.
      scheduler.registerTarget({
        type: 'app.crm-deal-signals',
        title: words.dealTarget,
        validate: isObject,
        // Disabled while the agent's daily trigger is off (agents.ts),
        // so its firings are skipped and the scheduled tasks page says why.
        describe: async () => ({
          targetLabel: words.dealTarget,
          description: words.dealTargetDescription,
          state: (await agentOn(service, 'opportunities', 'daily'))
            ? 'ready'
            : 'disabled',
        }),
        start: async () => {
          const pass = await scanDealSignals(
            service,
            this.app.container.resolve(opportunityEvaluatorToken),
          );
          return {
            state: 'completed',
            outcome: 'succeeded',
            result: { checked: pass.checked, started: pass.started },
          };
        },
      });
      scheduler.defineSchedule({
        key: 'crm.deal-signals',
        title: words.dealTitle,
        description: words.dealDescription,
        schedule: { cron: '0 9 * * *', timezone },
        target: { type: 'app.crm-deal-signals', config: {} },
      });
      // The attachments nothing uses any more, deleted (file-sweep.ts), at
      // three in the morning, away from the working day.
      scheduler.registerTarget({
        type: 'app.crm-file-sweep',
        title: words.fileTarget,
        validate: isObject,
        describe: async () => ({
          targetLabel: words.fileTarget,
          description: words.fileTargetDescription,
          state: 'ready',
        }),
        start: async () => {
          const pass = await sweepFiles(
            service,
            this.app.container.has(driveManagerToken)
              ? this.app.container.resolve(driveManagerToken)
              : undefined,
          );
          return {
            state: 'completed',
            outcome: 'succeeded',
            result: {
              checked: pass.checked,
              noticed: pass.noticed,
              deleted: pass.deleted,
            },
          };
        },
      });
      scheduler.defineSchedule({
        key: 'crm.file-sweep',
        title: words.fileTitle,
        description: words.fileDescription,
        schedule: { cron: '0 3 * * *', timezone },
        target: { type: 'app.crm-file-sweep', config: {} },
      });
      // The global search's AI answers nobody kept, left behind
      // (search-answers.ts), at the same hour.
      scheduler.registerTarget({
        type: 'app.crm-search-answer-sweep',
        title: words.searchTarget,
        validate: isObject,
        describe: async () => ({
          targetLabel: words.searchTarget,
          description: words.searchTargetDescription,
          state: 'ready',
        }),
        start: async () => {
          const pass = await sweepSearchAnswers(service);
          return {
            state: 'completed',
            outcome: 'succeeded',
            result: { deleted: pass.deleted },
          };
        },
      });
      scheduler.defineSchedule({
        key: 'crm.search-answer-sweep',
        title: words.searchTitle,
        description: words.searchDescription,
        schedule: { cron: '0 3 * * *', timezone },
        target: { type: 'app.crm-search-answer-sweep', config: {} },
      });
      // The day's timed tasks prepared for their owners
      // (task-preparation.ts), at the same hour.
      scheduler.registerTarget({
        type: 'app.crm-task-preparation',
        title: words.taskTarget,
        validate: isObject,
        // Disabled while the agent's daily trigger is off (agents.ts),
        // so its firings are skipped and the scheduled tasks page says why.
        describe: async () => ({
          targetLabel: words.taskTarget,
          description: words.taskTargetDescription,
          state: (await agentOn(service, 'tasks', 'daily'))
            ? 'ready'
            : 'disabled',
        }),
        start: async () => {
          const pass = await scanTaskPreparation(
            service,
            this.app.container.resolve(taskPreparerToken),
          );
          return {
            state: 'completed',
            outcome: 'succeeded',
            result: { checked: pass.checked, started: pass.started },
          };
        },
      });
      scheduler.defineSchedule({
        key: 'crm.task-preparation',
        title: words.taskTitle,
        description: words.taskDescription,
        schedule: { cron: '0 9 * * *', timezone },
        target: { type: 'app.crm-task-preparation', config: {} },
      });
      // The watched companies' news (company-signals.ts), half an hour
      // after the other checks, one company at a time.
      scheduler.registerTarget({
        type: 'app.crm-company-signals',
        title: words.signalTarget,
        validate: isObject,
        // Disabled while the agent's daily trigger is off (agents.ts),
        // so its firings are skipped and the scheduled tasks page says why.
        describe: async () => ({
          targetLabel: words.signalTarget,
          description: words.signalTargetDescription,
          state: (await agentOn(service, 'signals', 'daily'))
            ? 'ready'
            : 'disabled',
        }),
        start: async () => {
          const pass = await this.app.container
            .resolve(companySignalsToken)
            .scan();
          return {
            state: 'completed',
            outcome: 'succeeded',
            result: {
              available: pass.available,
              checked: pass.checked,
              found: pass.found,
              failed: pass.failed,
              // Out of time: the rest wait for tomorrow's pass, first.
              stopped: pass.stopped,
            },
          };
        },
      });
      scheduler.defineSchedule({
        key: 'crm.company-signals',
        title: words.signalTitle,
        description: words.signalDescription,
        schedule: { cron: '0 8 * * *', timezone },
        target: { type: 'app.crm-company-signals', config: {} },
      });
    }
    // The Users page shows and assigns the CRM's roles through this scope.
    if (this.app.container.has(userRoleScopeRegistryToken))
      this.unregisterRoleScope = this.app.container
        .resolve(userRoleScopeRegistryToken)
        .register(
          createCrmUserRoleScope(
            this.app.container.resolve(authorizationToken),
          ),
        );
  }
  public override async start(): Promise<void> {
    const evaluator = this.app.container.resolve(leadEvaluatorToken);
    // Each automatic start runs only while its agent runs on that trigger
    // (agents.ts); a person asking is never switched off.
    const crmService = this.app.container.resolve(crmToken);
    crmService.leadCreated = (by, leadId) =>
      void (async () => {
        if (await agentOn(crmService, 'leads', 'created'))
          await evaluator.request(by, leadId, undefined, 'created');
      })().catch(() => undefined);
    const deals = this.app.container.resolve(opportunityEvaluatorToken);
    const reviewer = this.app.container.resolve(approvalReviewerToken);
    const preparer = this.app.container.resolve(taskPreparerToken);
    const service = this.app.container.resolve(crmToken);
    // The follow-ups run as tasks of the jobs service (follow-up-jobs.ts):
    // kept across a restart, as many at once as `crmFollowUps` allows.
    if (
      !isDemoMode(this.app) &&
      this.app.container.has(jobExecutorServiceToken)
    ) {
      const executor = this.app.container
        .resolve(jobExecutorServiceToken)
        .getJobExecutor('crm', FOLLOW_UP_JOBS);
      const FollowUpJob = createFollowUpJob(
        oncePerCard((payload, signal) =>
          payload.entity === 'opportunities'
            ? deals.runEntry(payload.entryId, payload.language, signal)
            : payload.entity === 'approvals'
              ? reviewer.runEntry(payload.entryId, payload.language, signal)
              : payload.entity === 'tasks'
                ? preparer.runEntry(payload.entryId, payload.language, signal)
                : evaluator.runEntry(payload.entryId, payload.language, signal),
        ),
      );
      executor.registerJob(FollowUpJob);
      await executor.setup();
      this.followUps = executor;
      const dispatch = async (
        payload: ConstructorParameters<typeof FollowUpJob>[0],
      ): Promise<void> => {
        await executor.addJob(new FollowUpJob(payload));
      };
      evaluator.useJobs(dispatch);
      deals.useJobs(dispatch);
      reviewer.useJobs(dispatch);
      preparer.useJobs(dispatch);
      // The cards a shutdown cut short left running, queued again: only on
      // the memory queue, which this process alone holds; a shared one
      // (Redis) keeps its tasks through any exit, and another instance may
      // be running them.
      const adapter =
        this.app.config.get<Record<string, { adapter?: string } | undefined>>(
          'jobs',
        )?.[FOLLOW_UP_JOBS]?.adapter ?? 'memory';
      if (adapter === 'memory')
        void runningCards(service.database)
          .then(async (cards) => {
            for (const card of cards) await dispatch(card);
          })
          .catch(() => undefined);
    }
    service.opportunityOpened = (by, id) =>
      void (async () => {
        if (await agentOn(service, 'opportunities', 'opened'))
          await deals.request(by, id, undefined, 'opened');
      })().catch(() => undefined);
    // A task marked done its deal's, or else its lead's, follow-up;
    // a lead's company changed by a person, a follow-up that looks it up.
    service.taskCompleted = (by, task) =>
      void followUpAfterTask(
        service,
        { leads: evaluator, opportunities: deals },
        by,
        task,
      ).catch(() => undefined);
    // An approval submitted, reviewed by the AI for its approver.
    service.approvalSubmitted = (by, approval) =>
      void (async () => {
        if (await agentOn(service, 'approvals', 'submitted'))
          await reviewer.request(by, toText(approval.id));
      })().catch(() => undefined);
    // An approval decided (or withdrawn), its deal followed up again as its
    // owner, who acts on the decision: once, when the last of the approvals
    // submitted with it leaves the queue, and only if one of them was
    // decided rather than all withdrawn.
    service.approvalDecided = (_by, approval) =>
      void (async () => {
        const together = await approvalsSettled(service, approval);
        if (!together) return;
        const deal = await service.database
          .query()
          .selectFrom('crmOpportunities')
          .select(['id', 'ownerId'])
          .where('id', '=', toText(approval.opportunityId))
          .executeTakeFirst();
        if (!deal?.ownerId) return;
        const ownerId = toText(deal.ownerId);
        const owner = crmActor(service.authz, {
          id: ownerId,
          locale: await service.localeOf(ownerId),
        });
        await followUpOpportunity(
          service,
          deals,
          owner,
          toText(deal.id),
          'approvalDecided',
          together,
        );
      })().catch(() => undefined);
    service.leadCompanyChanged = (by, leadId) =>
      void (async () => {
        if (await agentOn(service, 'leads', 'companyChanged'))
          await evaluator.request(by, leadId, undefined, 'companyChanged');
      })().catch(() => undefined);
    // A customer wrote, by mail or on WhatsApp: the lead or the deal is
    // followed up as its owner, unless a card on it is waiting or being
    // worked on.
    const timeline = this.app.container.resolve(mailTimelineToken);
    const customerReplied = (target: { entity: string; id: string }): void =>
      void (async () => {
        const entity = target.entity === 'leads' ? 'leads' : 'opportunities';
        if ((await aiStates(service, [target.id], entity))[target.id]) return;
        const record = await service.database
          .query()
          .selectFrom(entity === 'leads' ? 'crmLeads' : 'crmOpportunities')
          .select('ownerId')
          .where('id', '=', target.id)
          .executeTakeFirst();
        if (!record?.ownerId) return;
        const ownerId = toText(record.ownerId);
        const owner = crmActor(service.authz, {
          id: ownerId,
          locale: await service.localeOf(ownerId),
        });
        if (entity === 'leads')
          await followUpLead(
            service,
            evaluator,
            owner,
            target.id,
            'customerReplied',
          );
        else
          await followUpOpportunity(
            service,
            deals,
            owner,
            target.id,
            'customerReplied',
          );
      })().catch(() => undefined);
    // A read-only demo site (Demo Mode) starts no follow-up: no work runs
    // there beyond what its data shows.
    timeline.customerReplied = (_mailboxOwnerId, target) =>
      isDemoMode(this.app) ? undefined : customerReplied(target);
    const whatsapp = this.app.container.resolve(whatsappToken);
    whatsapp.customerReplied = customerReplied;
    whatsapp.publicBasePath = toText(this.app.publicBasePath ?? '');
    service.whatsappRecords = {
      converted: (query, leadId, contactId) =>
        whatsapp.leadConverted(query, leadId, contactId),
      merged: (query, keptId, otherId) =>
        whatsapp.leadsMerged(query, keptId, otherId),
      removed: (query, entity, id) => whatsapp.recordRemoved(query, entity, id),
    };
    service.whatsappFileReadable = (actor, messageId) =>
      whatsapp
        .mediaFile(actor, messageId)
        .then(() => true)
        .catch(() => false);
    // Plain timers: @nocobase/cron, which ran these passes, was never
    // published to the public npm registry. Each pass skips a tick while
    // the previous one still runs.
    const every = (ms: number, tick: () => Promise<unknown>): void => {
      this.timers.push(
        setInterval(() => void tick().catch(() => undefined), ms),
      );
    };
    // On a read-only demo site (Demo Mode) too: the reminders and the
    // notifications its data queues reach the inbox, and its mailboxes' mail
    // reaches the records' timelines, which a record's Mail tab lists from
    // colleagues' mailboxes. Neither reaches outside the deployment.
    every(30_000, () => this.scan());
    // @temporary(nocobase-official): every mailbox read once a minute until
    // the Mail plugin publishes a server-side change event (mail-timeline.ts).
    every(60_000, () => timeline.syncAll());
    // Request write protection does not cover background work. A demo site
    // keeps WhatsApp's deliveries and media fetching off.
    if (isDemoMode(this.app)) return;
    // WhatsApp deliveries read, their media fetched within Meta's five
    // minutes, and the follow-ups of customers gone quiet started.
    every(10_000, () => whatsapp.process());
    // The records' WhatsApp lines a day there were until 2026-10-16, as
    // stretches of conversation; nothing to do once done.
    void whatsapp.upgradeTimeline().catch(() => undefined);
  }
  public override async shutdown(): Promise<void> {
    // A follow-up running is handed back, to run again at the next start.
    await this.followUps?.shutdown();
    this.unregisterRoleScope?.();
    this.unregisterRoleScope = undefined;
    for (const timer of this.timers.splice(0)) clearInterval(timer);
  }
  // Both recurring passes, every half minute.
  private async scan(): Promise<void> {
    await this.remindTasks();
    await this.deliverNotifications();
  }
  // Finds the tasks due at a time (not a date alone) about to come and
  // queues a reminder for each recipient; returns how many were queued
  // this pass.
  async remindTasks(): Promise<number> {
    if (this.reminding) return 0;
    this.reminding = true;
    let reminded = 0;
    try {
      const service = this.app.container.resolve(crmToken);
      const query = service.database.query();
      const settings = await service.settings();
      const now = new Date();
      const tasks = await query
        .selectFrom('crmTasks')
        .selectAll()
        .where('status', '=', 'open')
        .where('dueAt', '>=', now.toISOString())
        .where(
          'dueAt',
          '<=',
          new Date(
            now.getTime() + settings.taskReminderMinutes * 60000,
          ).toISOString(),
        )
        .execute();
      // Each reminder is keyed by the task, its start and the recipient,
      // so repeated scans of the same row queue nothing new.
      // A date alone has no hour to be reminded of.
      for (const task of tasks.filter(
        (t) => !isEndOfDay(new Date(toText(t.dueAt)), settings.timeZone),
      ))
        for (const user of new Set([
          task.ownerId,
          ...array(task.internalParticipants),
        ])) {
          if (await service.remindTask(task, toText(user))) reminded += 1;
        }
      return reminded;
    } finally {
      this.reminding = false;
    }
  }
  // Sends the queued messages as in-app notifications, in the recipient's
  // language and only what they may still see; returns the pass's counts.
  async deliverNotifications(): Promise<{ delivered: number; failed: number }> {
    if (this.delivering) return { delivered: 0, failed: 0 };
    this.delivering = true;
    let delivered = 0;
    let failed = 0;
    try {
      const service = this.app.container.resolve(crmToken);
      const query = service.database.query();
      const now = new Date();
      const pending = await query
        .selectFrom('crmOutbox')
        .selectAll()
        .where('status', '=', 'pending')
        .limit(50)
        .execute();
      for (const row of pending) {
        const claim = await query
          .updateTable('crmOutbox')
          .set({ status: 'sending', claimedAt: now.toISOString() })
          .where('id', '=', row.id)
          .where('status', '=', 'pending')
          .execute();
        if (!claim.updatedCount) continue;
        try {
          // A disabled account gets nothing: the row fails with the reason.
          const account = await query
            .selectFrom('user')
            .select('disabledAt')
            .where('id', '=', row.recipientId)
            .executeTakeFirst();
          if (account?.disabledAt != null) throw new CrmError('disabled', 403);
          const preference = await query
            .selectFrom('crmUserPreferences')
            .select('locale')
            .where('id', '=', row.recipientId)
            .executeTakeFirst();
          const recipient: Actor = {
            id: toText(row.recipientId),
            locale: servedLocale(preference?.locale),
            scope: service.authz.for({
              principal: { type: 'user', id: toText(row.recipientId) },
              subjects: [{ type: 'authenticated', id: '*' }],
            }),
          };
          const i18n = this.app.container.resolve(i18nToken);
          // A WhatsApp customer linked to no record yet: the conversation,
          // for someone who still has the WhatsApp page. Nothing queues
          // WhatsApp notices since 2026-10-16 (replies are made on WhatsApp,
          // so the CRM assigns no one); this and the record's `whatsapp`
          // event below deliver those queued before.
          if (row.entity === 'whatsapp') {
            if (
              !(await this.app.container
                .resolve(whatsappToken)
                .hasPage(recipient))
            )
              throw new CrmError('forbidden', 403);
            await i18n.ensureLocaleLoaded(recipient.locale);
            const t = i18n.getFixedT('crm-notifications', recipient.locale);
            const title = t(`titles.${toText(row.event)}`);
            const sent = await this.app.container
              .resolve(notificationServiceToken)
              .send({
                idempotencyKey: `crm:${toText(row.id)}`,
                source: { type: 'crm', referenceId: toText(row.id) },
                messages: {
                  [CRM_INBOX_CHANNEL]: {
                    to: toText(row.recipientId),
                    title,
                    body: t('body', { title, name: toText(row.name) }),
                    target: {
                      type: 'route',
                      path: `/whatsapp/${toText(row.recordId)}`,
                    },
                  },
                },
              });
            await query
              .updateTable('crmOutbox')
              .set({ status: 'submitted', notificationId: sent.notificationId })
              .where('id', '=', row.id)
              .execute();
            delivered += 1;
            continue;
          }
          const record = await service.get(
            recipient,
            asEntity(toText(row.entity)),
            toText(row.recordId),
          );
          await i18n.ensureLocaleLoaded(recipient.locale);
          const t = i18n.getFixedT('crm-notifications', recipient.locale);
          const title = t(`titles.${toText(row.event)}`, {
            entity: t(`entities.${toText(row.entity)}`),
            // Named inside a sentence: "a lead".
            record: t(`records.${toText(row.entity)}`),
          });
          // The record is named the way the pages name it (a lead by person
          // and company, a deal by company and name), not by its bare name.
          const entity = asEntity(toText(row.entity));
          const { titles } = await resolveTitles(service, recipient, {
            [entity]: [record],
          });
          const content = {
            title,
            body: t('body', {
              title,
              name: titles[toText(record.id)] ?? record.name ?? '',
            }),
          };
          const sent = await this.app.container
            .resolve(notificationServiceToken)
            .send({
              // One outbox row is one notification: a retry after a crash
              // is deduplicated by the service instead of sent twice.
              idempotencyKey: `crm:${toText(row.id)}`,
              source: { type: 'crm', referenceId: toText(row.id) },
              // The in-app Channel the configuration names `inbox`
              // (CRM_INBOX_CHANNEL); its message is addressed to the user and
              // links the record by an application route, without the
              // deployment prefix the router adds itself.
              messages: {
                [CRM_INBOX_CHANNEL]: {
                  to: toText(row.recipientId),
                  ...content,
                  target: {
                    type: 'route',
                    // A company's news opens its page with the whole list of
                    // its signals (the Signals card's dialog, which /signals
                    // opens).
                    path: `/${toText(row.entity)}/${toText(row.recordId)}${
                      row.event === 'signal'
                        ? '/signals'
                        : row.event === 'whatsapp'
                          ? '/whatsapp'
                          : ''
                    }`,
                  },
                },
              },
            });
          await query
            .updateTable('crmOutbox')
            .set({ status: 'submitted', notificationId: sent.notificationId })
            .where('id', '=', row.id)
            .execute();
          delivered += 1;
        } catch (error) {
          failed += 1;
          // The reason stays with the row: a failed delivery that says only
          // "failed" cannot be diagnosed later.
          await query
            .updateTable('crmOutbox')
            .set({
              status: 'failed',
              error: `notificationSubmissionFailed: ${
                error instanceof Error ? error.message : String(error)
              }`.slice(0, 500),
            })
            .where('id', '=', row.id)
            .execute();
        }
      }
      return { delivered, failed };
    } finally {
      this.delivering = false;
    }
  }
}
