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
import {
  provisionCrm,
  registerCrmResources,
  type Actor,
} from './authorization.js';
import { CrmService, array } from './service.js';
import { CrmError } from './schema.js';
import { createCrmUserRoleScope } from './user-roles.js';
import { CrmAiResources } from '../../ai/index.js';
import { LOGO_AVATAR_PATH } from '../../ai/employees/crm-assistant.js';
import { userRoleScopeRegistryToken } from '@nocobase/app-plugin-users/server/tokens';

export const crmToken: ServiceToken<CrmService> =
  createServiceToken<CrmService>('crm/service');
export default class CrmProvider extends ServiceProvider<Application> {
  public readonly name: string = 'crm/provider';
  private cron?: CronJobManager;
  private unregisterRoleScope?: () => void;
  private reminding = false;
  private delivering = false;
  public override register(): void {
    // The workflow run scripts under server/workflows run from the storage
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
      await new CrmAiResources(
        this.app.container.resolve(crmToken),
        this.app.container.resolve(authorizationToken),
        { avatar },
      ).registerAIResources(this.app.container.resolve(aiManagerToken));
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
    this.cron = createCronJobManager();
    this.cron.addJob({ cronTime: '*/30 * * * * *', onTick: () => this.scan() });
    this.cron.start();
  }
  public override async shutdown(): Promise<void> {
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
              to: { type: 'user', id: toText(row.recipientId) },
              channels: ['in-app'],
              content: {
                ...content,
                actionUrl: `${toText(this.app.publicBasePath)}/crm/${toText(row.entity)}/${toText(row.recordId)}`,
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
