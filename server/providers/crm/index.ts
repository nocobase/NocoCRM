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
import { createCronJobManager, type CronJobManager } from '@nocobase/cron';
import { authorizationToken } from '@nocobase/app-plugin-authorization';
import { aiManagerToken } from '@nocobase/app-plugin-ai-employee/server';
import { notificationServiceToken } from '@nocobase/app-plugin-notification/server';
import { workflowServiceToken } from '@nocobase/app-plugin-workflow/server';
import { schedulerServiceToken } from '@nocobase/app-plugin-scheduler/server/tokens';
import { scanLeadSignals } from './lead-signals.js';
import { jobExecutorServiceToken } from '@nocobase/app-server/jobs';
import type { JobExecutor } from '@nocobase/jobs';
import { createFollowUpJob, FOLLOW_UP_JOBS } from './follow-up-jobs.js';
import { followUpAfterActivity, followUpOpportunity } from './feedback.js';
import { crmActor } from '../../ai/tools/crm-records.js';
import {
  provisionCrm,
  registerCrmResources,
  type Actor,
} from './authorization.js';
import { CrmService, array } from './service.js';
import { CrmError } from './schema.js';
import { CrmSkillNotes, crmSkillNotesToken } from './skills.js';
import { LeadEvaluator, leadEvaluatorToken } from './lead-evaluation.js';
import {
  OpportunityEvaluator,
  opportunityEvaluatorToken,
} from './opportunity-evaluation.js';
import { createCrmUserRoleScope } from './user-roles.js';
import { ApprovalReviewer, approvalReviewerToken } from './approval-review.js';
import { CrmAiResources } from '../../ai/index.js';
import {
  LOGO_AVATAR_PATH,
  registerCrmAssistant,
} from '../../ai/employees/crm-assistant.js';
import { userRoleScopeRegistryToken } from '@nocobase/app-plugin-users/server/tokens';

// The Channel the CRM's notifications go through: the in-app inbox, named
// `inbox` in the notification configuration (`notification.channels.inbox`
// with `provider: in-app`, the template's name for it).
export const CRM_INBOX_CHANNEL = 'inbox';

export const crmToken: ServiceToken<CrmService> =
  createServiceToken<CrmService>('crm/service');
export default class CrmProvider extends ServiceProvider<Application> {
  public readonly name: string = 'crm/provider';
  private cron?: CronJobManager;
  private followUps?: JobExecutor;
  private unregisterRoleScope?: () => void;
  private reminding = false;
  private delivering = false;
  public override register(): void {
    // The workflow run scripts under workflows/ run from the storage
    // disk, where they can neither import this application nor share a
    // package instance with it; they reach the database through this
    // process-wide handle (the same symbol is spelled out in each package's
    // server/queue.ts).
    (globalThis as Record<symbol, unknown>)[Symbol.for('nococrm.database')] =
      this.app.container.resolve(databaseManagerToken);
    this.app.container
      .resolve(i18nToken)
      .registry.register('crm-notifications', notificationLocales);
    this.app.container.singleton(
      crmToken,
      () =>
        new CrmService(
          this.app.container.resolve(databaseManagerToken),
          this.app.container.resolve(authorizationToken),
          () =>
            this.app.container.has(workflowServiceToken)
              ? this.app.container.resolve(workflowServiceToken)
              : undefined,
        ),
    );
    // The CRM's AI skills with the company's notes (skills.ts).
    this.app.container.singleton(
      crmSkillNotesToken,
      () =>
        new CrmSkillNotes(
          this.app.container.resolve(databaseManagerToken),
          this.app.container.has(aiManagerToken)
            ? this.app.container.resolve(aiManagerToken).skillsManager
            : undefined,
        ),
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
    registerCrmResources(this.app.container.resolve(authorizationToken));
  }
  public override async boot(): Promise<void> {
    await provisionCrm(
      this.app.container.resolve(authorizationToken),
      this.app.container.resolve(databaseManagerToken),
    );
    // The CRM assistant employee and its tools, for the AI Employee
    // plugin's chat (server/ai). Registered here, after every provider has
    // registered its services and before the plugin serves conversations.
    if (this.app.container.has(aiManagerToken)) {
      // The employee's avatar is the application's mark: an absolute URL
      // when the public origin is configured (APP_PUBLIC_ORIGIN), so the
      // plugin's own settings pages show it too.
      const identity = this.app.config.get<{ publicOrigin?: string }>('app');
      const origin = toText(identity?.publicOrigin ?? '').replace(/\/+$/, '');
      const avatar = origin
        ? `${origin}${this.app.publicBasePath.replace(/\/+$/, '')}${LOGO_AVATAR_PATH}`
        : LOGO_AVATAR_PATH;
      const service = this.app.container.resolve(crmToken);
      const ai = this.app.container.resolve(aiManagerToken);
      await new CrmAiResources(
        service,
        this.app.container.resolve(authorizationToken),
        { avatar, language: (await service.settings()).aiLanguage },
      ).registerAIResources(ai);
      // The prompt follows the AI language setting: registered again, the
      // plugin upserting by username, whenever the settings are saved.
      service.settingsSaved = (settings) =>
        void registerCrmAssistant(ai, {
          avatar,
          language: settings.aiLanguage,
        }).catch(() => undefined);
    }
    // The daily look over the open leads for what has not happened
    // (lead-signals.ts): a scheduler task, so administrators see each pass,
    // what it started, and may switch it off on the scheduled tasks page.
    // At nine in the morning of the CRM's time zone as it stands at boot.
    if (this.app.container.has(schedulerServiceToken)) {
      const scheduler = this.app.container.resolve(schedulerServiceToken);
      const service = this.app.container.resolve(crmToken);
      scheduler.registerTarget({
        type: 'app.crm-lead-signals',
        title: 'Lead signal check',
        validate: (config) =>
          config !== null &&
          typeof config === 'object' &&
          !Array.isArray(config)
            ? { valid: true }
            : { valid: false, reason: 'config-must-be-an-object' },
        // Read on the scheduled tasks page in place of the type's name.
        describe: async () => ({
          targetLabel: 'Lead signal check',
          description:
            'The AI follows up leads left uncontacted, gone quiet or due for a nurture review',
          state: 'ready',
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
        title: 'Daily lead check',
        description:
          'Every day, the open leads are checked: a new lead uncontacted for 2 days, a working one with no activity for 14 days, a nurtured one due for review. The AI follows each up once, and the result waits on its owner.',
        schedule: {
          cron: '0 9 * * *',
          timezone: (await service.settings()).timeZone || 'Asia/Shanghai',
        },
        target: { type: 'app.crm-lead-signals', config: {} },
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
    // Every provider has booted, so the AI plugin has loaded the skill files.
    await this.app.container.resolve(crmSkillNotesToken).start();
    const evaluator = this.app.container.resolve(leadEvaluatorToken);
    this.app.container.resolve(crmToken).leadCreated = (by, leadId) =>
      void evaluator.request(by, leadId).catch(() => undefined);
    const deals = this.app.container.resolve(opportunityEvaluatorToken);
    const reviewer = this.app.container.resolve(approvalReviewerToken);
    const service = this.app.container.resolve(crmToken);
    // The follow-ups run as tasks of the jobs service (follow-up-jobs.ts):
    // kept across a restart, as many at once as `crmFollowUps` allows.
    if (this.app.container.has(jobExecutorServiceToken)) {
      const executor = this.app.container
        .resolve(jobExecutorServiceToken)
        .getJobExecutor('crm', FOLLOW_UP_JOBS);
      const FollowUpJob = createFollowUpJob((payload, signal) =>
        payload.entity === 'opportunities'
          ? deals.runEntry(payload.entryId, payload.language, signal)
          : payload.entity === 'approvals'
            ? reviewer.runEntry(payload.entryId, payload.language, signal)
            : evaluator.runEntry(payload.entryId, payload.language, signal),
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
    }
    service.opportunityOpened = (by, id) =>
      void deals.request(by, id).catch(() => undefined);
    // An activity marked done its deal's, or else its lead's, follow-up;
    // a lead's company changed by a person, a follow-up that looks it up.
    service.activityCompleted = (by, activity) =>
      void followUpAfterActivity(
        service,
        { leads: evaluator, opportunities: deals },
        by,
        activity,
      ).catch(() => undefined);
    // An approval submitted, reviewed by the AI for its approver.
    service.approvalSubmitted = (by, approval) =>
      void reviewer.request(by, toText(approval.id)).catch(() => undefined);
    // An approval decided, its deal followed up again as its owner, who
    // acts on the decision.
    service.approvalDecided = (_by, approval) =>
      void (async () => {
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
        );
      })().catch(() => undefined);
    service.leadCompanyChanged = (by, leadId) =>
      void evaluator
        .request(by, leadId, undefined, 'companyChanged')
        .catch(() => undefined);
    this.cron = createCronJobManager();
    this.cron.addJob({ cronTime: '*/30 * * * * *', onTick: () => this.scan() });
    this.cron.start();
  }
  public override async shutdown(): Promise<void> {
    // A follow-up running is handed back, to run again at the next start.
    await this.followUps?.shutdown();
    this.unregisterRoleScope?.();
    this.unregisterRoleScope = undefined;
    this.cron?.close();
  }
  // Both recurring passes, every half minute.
  private async scan(): Promise<void> {
    await this.remindActivities();
    await this.deliverNotifications();
  }
  // Finds the activities about to start and starts one activity-reminder
  // workflow run per recipient; returns how many were started this pass.
  async remindActivities(): Promise<number> {
    if (this.reminding) return 0;
    this.reminding = true;
    let reminded = 0;
    try {
      const service = this.app.container.resolve(crmToken);
      const query = service.database.query();
      const settings = await service.settings();
      const now = new Date();
      const activities = await query
        .selectFrom('crmActivities')
        .selectAll()
        .where('status', '=', 'planned')
        .where('startAt', '>=', now.toISOString())
        .where(
          'startAt',
          '<=',
          new Date(
            now.getTime() + settings.activityReminderMinutes * 60000,
          ).toISOString(),
        )
        .execute();
      // Each reminder is an activity-reminder workflow run, keyed by the
      // activity, its start and the recipient, so repeated scans of the
      // same row start nothing new.
      for (const activity of activities)
        for (const user of new Set([
          activity.ownerId,
          ...array(activity.internalParticipants),
        ])) {
          await service.remindActivity(activity, toText(user));
          reminded += 1;
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
            locale: preference?.locale === 'zh-CN' ? 'zh-CN' : 'en-US',
            scope: service.authz.for({
              principal: { type: 'user', id: toText(row.recipientId) },
              subjects: [{ type: 'authenticated', id: '*' }],
            }),
          };
          const record = await service.get(
            recipient,
            asEntity(toText(row.entity)),
            toText(row.recordId),
          );
          const i18n = this.app.container.resolve(i18nToken);
          await i18n.ensureLocaleLoaded(recipient.locale);
          const t = i18n.getFixedT('crm-notifications', recipient.locale);
          const title = t(`titles.${toText(row.event)}`, {
            entity: t(`entities.${toText(row.entity)}`),
          });
          // The record is named the way the pages name it (a lead by person
          // and company, a deal by account and name), not by its bare name.
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
                    path: `/crm/${toText(row.entity)}/${toText(row.recordId)}`,
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
