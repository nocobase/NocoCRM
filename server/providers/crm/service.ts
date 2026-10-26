import { normalizePhone } from './phone.js';
import { LIST_LIMIT, LONG_TEXT_LIMIT, lengthLimit } from './limits.js';
import { decodeRow, encodeRow, jsonValue } from './values.js';
import {
  DATABASE_ORDERS,
  ORDER_IN_MEMORY_LIMIT,
  orderKey,
  orderKind,
  orderRecords,
} from './list-order.js';
import { resolveTitles } from './titles.js';
import { servedLocale } from './served-locale.js';
import { doesTask } from './task-participants.js';
import {
  hasCurrency,
  summarizeRows,
  SUMMARY_ROW_LIMIT,
  validateSummary,
  type Summary,
  type SummaryRequest,
} from './summary.js';
import { asEntity, toText } from './schema.js';
import { isCountry, isSubdivision, subdivisionCode } from './geography.js';
import { randomUUID } from 'node:crypto';
import {
  LifecycleError,
  ParameterConfigurationError,
  type JsonValue,
  type LifecycleParameterStore,
  type LifecycleRuntime,
  type ReviewerSelection,
} from '@nocobase/lifecycle';
import {
  APPROVAL_LIFECYCLE,
  approverParameterGroup,
  type ApprovalParameters,
} from '../../lifecycles/approvals.js';
import {
  createLifecycleRuntime,
  LIFECYCLE_PARAMETER_SCOPE,
  lifecycleParameterStore,
} from '../lifecycles.js';
import {
  approverRule,
  approverRuleInput,
  resolveApprovers,
  type ApproverRuleInput,
} from './approvers.js';
import { readEntry } from './ai-entries.js';
import type {
  DatabaseManager,
  Expression,
  ExpressionBuilder,
  QueryAdapter,
  Row,
  SqlBool,
} from '@nocobase/db';
import type {
  AppAuthorization,
  DatabaseAuthorizationConditions,
} from '@nocobase/app-plugin-authorization/server';
import {
  assertFields,
  capability,
  compileFilter,
  conditions,
  crmActor,
  outputFields,
  requireCapability,
  roleOf,
  roles,
  type Actor,
  listUsers,
} from './authorization.js';
import {
  CrmError,
  defaultSettings,
  defaultCurrencyFor,
  defaultTimeZoneFor,
  aiLanguages,
  definitions,
  entities,
  fieldsFor,
  notificationSwitches,
  object,
  type CrmRecord,
  type CrmSettings,
  type Entity,
  type NotificationKind,
} from './schema.js';
import { jsonTextLike } from './json-text.js';

// The approval statuses that carry a message, named by the status.
const approvalEvents = ['pending', 'withdrawn', 'approved', 'rejected'];

export interface ListOptions {
  search?: string;
  status?: string;
  ownerId?: string;
  companyId?: string;
  leadId?: string;
  opportunityId?: string;
  contactId?: string;
  source?: string;
  // "true" / "false": contacts by whether they are still at the company.
  employed?: string;
  // Tasks a user is an internal participant of (their id).
  participantId?: string;
  topic?: string;
  approverId?: string;
  from?: string;
  to?: string;
  // Tasks by when they happen (ISO instants), for the calendar's month.
  dueFrom?: string;
  dueTo?: string;
  // Everything but this status: a picker that must not offer converted leads.
  excludeStatus?: string;
  // Tasks a user runs or takes part in: their own agenda.
  involvedId?: string;
  // The order rows come in: a column this reader may read, a leading minus
  // for descending; the default is newest first by creation. The columns a
  // list page's headers sort by are ordered by what the page shows
  // (list-order.ts).
  sort?: string;
  // Restrict to these records: how a statistic's count becomes the list it
  // counted. Comma-separated in the query string. An empty list matches
  // nothing, which is what a zero count should show.
  ids?: string;
  page?: number;
  pageSize?: number;
}
// The fields a search looks in, where the kind of record has them.
const SEARCH_FIELDS = [
  'name',
  'company',
  'email',
  'phone',
  'website',
  'linkedin',
];

// A search's words: split on spaces and the punctuation people put between
// terms, at most eight. The LIKE wildcards split words too, since the query
// layer has no way to escape them: a typed "%" or "_" never matches
// everything.
export function searchWords(text: string): string[] {
  return text
    .split(/[\s,，、;；/|()（）[\]【】%_\\]+/u)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 8);
}

// Past this many rows a word matches, PostgreSQL's search falls back to a
// match of the letters' case (CrmService.containing).
const CASELESS_LIMIT = 5000;

// A detail page's related lists and history come this many at a time.
export const RELATED_PAGE = 20;
// Settings → Approval process: the approver rule as roles and people, the
// version it is at (0 while it is the default), who saved it and when, and
// the users it names now.
export interface ApproverRuleView extends ApproverRuleInput {
  revision: number;
  updatedById: string | null;
  updatedAt: string | null;
  approvers: string[];
}
export interface ListResult {
  data: CrmRecord[];
  total: number;
  page: number;
  pageSize: number;
}
// What a delete must not orphan: the child objects, by the field that points
// at the parent. Shared by remove(), which refuses when any exist, and
// detail(), which counts them so the confirmation can say what is in the way.
export function deletionChecks(entity: Entity): [Entity, string][] {
  // Tasks are not listed for companies: they are handled like a lead's,
  // deleted when the company was their only anchor and unlinked otherwise.
  // Contacts have no blockers: the places that mention one (an opportunity's
  // contact list, a task's participants, a converted lead's pointer)
  // are cleaned up by remove() instead, since none of them needs the contact
  // to stay valid.
  return entity === 'companies'
    ? [
        ['contacts', 'companyId'],
        ['opportunities', 'companyId'],
        ['leads', 'convertedCompanyId'],
      ]
    : entity === 'opportunities'
      ? // Only approvals block: they are an audit trail that cannot follow
        // the deal out. Tasks cascade or unlink as they do for an
        // company; a converted lead's pointer is cleared.
        [['approvals', 'opportunityId']]
      : [];
}

// The roles that may own records; see save().
const sellerRoles = ['sales-representative', 'sales-manager'];

// A comment's stored changes: its text and, when it has any, the colleagues it
// mentions and the files attached to it (ids of `crmFiles`).
function commentChanges(
  text: string,
  mentions: readonly string[],
  attachments: readonly string[] = [],
): { text: string; mentions?: string[]; attachments?: string[] } {
  return {
    text,
    ...(mentions.length ? { mentions: [...mentions] } : {}),
    ...(attachments.length ? { attachments: [...attachments] } : {}),
  };
}
// A comment's text: within a long text's length, and something to say
// unless files say it.
function commentText(value: unknown, files = false): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if ((!text && !files) || text.length > LONG_TEXT_LIMIT)
    throw new CrmError('invalidInput', 400, 'text');
  return text;
}

// What of a task its lead, company, opportunity or contact is told on its
// timeline: added, moved (its due time), handed to another owner, completed
// or cancelled, and deleted. Its other edits stay on the task.
const TOLD = ['dueAt', 'ownerId'];
const TOLD_STATUSES = ['completed', 'cancelled'];

export class CrmService {
  // The record lifecycles' runtime the approvals move by
  // (server/providers/lifecycles.ts); one over the same database when none
  // is given, as in tests.
  public readonly lifecycles: LifecycleRuntime;
  // The versions of what an administrator sets on a lifecycle: the
  // approver rule.
  private readonly parameters: LifecycleParameterStore;
  // The settings a company has not chosen: `defaultSettings`, the AI's
  // language, the currency and the business time zone following the
  // application's (`i18n.defaultLocale`, APP_DEFAULT_LOCALE), so a
  // deployment that starts in Chinese has its AI write Chinese, its amounts
  // in CNY and its days in Shanghai time until an administrator picks
  // otherwise.
  public readonly defaults: CrmSettings;
  constructor(
    public readonly database: DatabaseManager,
    public readonly authz: AppAuthorization,
    lifecycles?: LifecycleRuntime,
    options: { defaultLocale?: string } = {},
  ) {
    this.lifecycles = lifecycles ?? createLifecycleRuntime(database);
    this.parameters = lifecycleParameterStore(database);
    this.defaults = {
      ...defaultSettings,
      currency: defaultCurrencyFor(options.defaultLocale),
      timeZone: defaultTimeZoneFor(options.defaultLocale),
      aiLanguage: options.defaultLocale?.startsWith('zh')
        ? 'zh-CN'
        : defaultSettings.aiLanguage,
    };
  }
  async settings(
    query: QueryAdapter = this.database.query(),
  ): Promise<CrmSettings> {
    const row = await query
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', 'business')
      .executeTakeFirst();
    // Option lists live in code (schema.ts), not in the stored settings: a
    // stored value from before that decision is ignored rather than merged.
    // object() rejects a missing row (no settings saved yet); the defaults
    // then stand alone.
    const parsed = jsonValue(row?.value);
    const stored = (
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {}
    ) as Partial<CrmSettings> & {
      approvalEnabled?: unknown;
      firstContactDays?: unknown;
      aiInstructions?: unknown;
      aiService?: unknown;
      aiModel?: unknown;
      aiEnabled?: unknown;
    };
    // Settings since retired (the approval switch, the first-contact
    // threshold, the AI business instructions now in the employee's role,
    // the model choice now on the plugin's page, the AI switch now the
    // employee's own Enabled switch there); a row from before still
    // carries them.
    delete stored.approvalEnabled;
    delete stored.firstContactDays;
    delete stored.aiInstructions;
    delete stored.aiService;
    delete stored.aiModel;
    delete stored.aiEnabled;
    // The former `user` choice (each user's own language) is gone: the chat
    // follows the user's language by itself, and the AI's own work uses one
    // language for the whole team, the default unless one was chosen.
    if (
      stored.aiLanguage !== undefined &&
      !aiLanguages.includes(stored.aiLanguage)
    )
      delete stored.aiLanguage;
    // Mentions and replies were told under the record-change switch until
    // they had one of their own: a row from before keeps what it chose.
    if (
      stored.notifyComments === undefined &&
      stored.notifyRecordChanges === false
    )
      stored.notifyComments = false;
    return {
      ...this.defaults,
      ...stored,
      options: defaultSettings.options,
    };
  }
  // Whether the CRM's AI can run: there is a model to ask on the Agents
  // plugin (ai-model.ts `aiAvailable`), set by CrmProvider. The pages show
  // the AI's entries, and the follow-ups, reviews and captures run, only
  // then. Without it (the tests) there is no AI.
  aiCheck: () => Promise<boolean> = () => Promise.resolve(false);
  async assistantEnabled(): Promise<boolean> {
    return this.aiCheck().catch(() => false);
  }
  // What each person may read, as their last workspace load found it
  // (server/routes/workspace.ts): the Agents plugin resolves the records a
  // message names inside its own transaction, where the authorization
  // service cannot read on SQLite, so the resolvers
  // (crm-agents/context.ts) read this instead. Ten minutes old at most;
  // missing or older, they resolve nothing (a message then names no
  // record, never one the person may not read).
  private readonly reads = new Map<
    string,
    {
      at: number;
      decisions: Record<string, DatabaseAuthorizationConditions | null>;
    }
  >();
  rememberReads(
    userId: string,
    decisions: Record<string, DatabaseAuthorizationConditions | null>,
  ): void {
    this.reads.set(userId, { at: Date.now(), decisions });
  }
  readsOf(
    userId: string,
  ): Record<string, DatabaseAuthorizationConditions | null> | null {
    const snapshot = this.reads.get(userId);
    return snapshot && Date.now() - snapshot.at < 10 * 60_000
      ? snapshot.decisions
      : null;
  }
  async mutate<T>(
    actor: Actor,
    fn: (actor: Actor, query: QueryAdapter) => Promise<T>,
  ): Promise<T> {
    // Snapshot authorization before opening SQLite's single-connection transaction.
    // Every SQL read/write still uses those record and field constraints inside it.
    const prepared: Actor = {
      ...actor,
      decisions: {},
      capabilities: {},
      users: await this.users(actor),
    };
    for (const entity of entities)
      for (const action of ['read', 'create', 'update', 'delete']) {
        try {
          prepared.decisions![`${toText(entity)}.${toText(action)}`] =
            await conditions(actor, entity, action);
        } catch {
          prepared.decisions![`${toText(entity)}.${toText(action)}`] = null;
        }
      }
    for (const action of ['assign', 'approve', 'export'])
      prepared.capabilities![`sales.${toText(action)}`] = await capability(
        actor,
        action,
      );
    prepared.capabilities!['settings.manage'] = await capability(
      actor,
      'manage',
      'settings',
    );
    // Work registered during the transaction (the messages a change
    // queues, the follow-ups it starts) runs once it has committed, so it
    // reads what the change wrote and a rolled-back change starts nothing.
    const afterCommit: (() => Promise<void>)[] = [];
    prepared.after = (callback) => {
      afterCommit.push(callback);
    };
    const result = await this.database.transaction((connection) => {
      prepared.transaction = connection;
      return fn(prepared, connection.query);
    });
    for (const callback of afterCommit) await callback();
    return result;
  }
  async saveSettings(actor: Actor, raw: unknown): Promise<CrmSettings> {
    await requireCapability(actor, 'manage', 'settings');
    const input = object(raw);
    // Settings that no longer exist (the option lists, the approval switch)
    // may still arrive from a stored row or an old tab; they are dropped, not
    // rejected. Anything else unknown is a client bug worth surfacing.
    for (const key of Object.keys(input))
      if (!(key in defaultSettings)) {
        if (
          [
            'options',
            'approvalEnabled',
            'firstContactDays',
            // Settings of the CRM's former assistant: its business guidance
            // is in server/providers/crm/guidance.ts and its model is the
            // Agents plugin's.
            'aiInstructions',
            'aiService',
            'aiModel',
            // The AI is on whenever there is a model (assistantEnabled).
            'aiEnabled',
          ].includes(key)
        )
          delete input[key];
        else throw new CrmError('invalidInput', 400, key);
      }
    const current = await this.settings();
    const value = { ...current, ...input };
    if (!/^[A-Z]{3}$/.test(value.currency))
      throw new CrmError('invalidInput', 400, 'currency');
    try {
      new Intl.DateTimeFormat('en', { timeZone: value.timeZone }).format();
    } catch {
      throw new CrmError('invalidInput', 400, 'timeZone');
    }
    if (!aiLanguages.includes(value.aiLanguage))
      throw new CrmError('invalidInput', 400, 'aiLanguage');
    for (const key of [
      'taskReminderMinutes',
      'closeReminderDays',
      'uncontactedDays',
      'leadStaleDays',
      'staleDays',
    ] as const)
      if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 525600)
        throw new CrmError('invalidInput', 400, key);
    for (const key of [
      ...Object.values(notificationSwitches),
      'assistantDock',
    ] as const)
      if (typeof value[key] !== 'boolean')
        throw new CrmError('invalidInput', 400, key);
    // Written over the shipped guidance; blank goes back to it.
    if (
      typeof value.businessGuidance !== 'string' ||
      value.businessGuidance.length > LONG_TEXT_LIMIT
    )
      throw new CrmError('invalidInput', 400, 'businessGuidance');
    if (!value.businessGuidance.trim()) value.businessGuidance = '';
    // A nurture review is planned in whole days, within a year, as the AI
    // gives it.
    if (
      !Number.isInteger(value.nurtureReviewDays) ||
      value.nurtureReviewDays < 1 ||
      value.nurtureReviewDays > 365
    )
      throw new CrmError('invalidInput', 400, 'nurtureReviewDays');
    await this.database.transaction(async ({ query }) => {
      const existing = await query
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', 'business')
        .executeTakeFirst();
      if (existing)
        await query
          .updateTable('crmSettings')
          .set(encodeRow({ value, updatedAt: new Date() }))
          .where('id', '=', 'business')
          .execute();
      else
        await query
          .insertInto('crmSettings')
          .values(encodeRow({ id: 'business', value, updatedAt: new Date() }))
          .execute();
    });
    this.settingsSaved?.(value);
    return value;
  }
  async users(actor: Actor): Promise<Row[]> {
    if (actor.users) return actor.users;
    await conditions(actor, 'leads', 'read');
    const users = await listUsers(this.database);
    const assignments = await this.authz.permissionSets.listAssignments();
    const disabled = new Set(
      (
        await this.database
          .query()
          .selectFrom('user')
          .select('id')
          .where('disabledAt', 'is not', null)
          .execute()
      ).map((row) => toText(row.id)),
    );
    const listed = users.map((user) => {
      // In the roles' own order, whatever order the sets were assigned in.
      const held = new Set(
        assignments
          .filter((a) => a.subject.type === 'user' && a.subject.id === user.id)
          .map((a) => roleOf(a.permissionSet)),
      );
      return {
        id: user.id,
        name: user.name,
        username: user.username ?? null,
        email: user.email,
        roles: roles.filter((role) => held.has(role)),
        // Disabled at the company, on the Users page: such a user cannot
        // sign in, and is not offered as an owner or approver either.
        disabled: disabled.has(toText(user.id)),
      };
    });
    // An approver is whom the approver rule names (Settings → Approval
    // process; the sales managers until an administrator sets it), active
    // and holding the approve capability. Administrators hold it for the
    // system's sake, but are offered only when the rule names them.
    const approvers = await this.approvers(listed);
    return listed.map((user) => ({
      ...user,
      canApprove: approvers.has(user.id),
    }));
  }
  // The approver rule as it stands: the administrator's latest version, or
  // the lifecycle's default.
  private async currentApproverRule(): Promise<readonly ReviewerSelection[]> {
    const values = (await this.lifecycles.resolveParameters(
      APPROVAL_LIFECYCLE,
      { record: null, purpose: 'preview', transactionHandle: undefined },
    )) as ApprovalParameters;
    return values.approverRule;
  }
  private async approvers(
    users: readonly { id: string; roles: string[]; disabled: boolean }[],
    rule?: readonly ReviewerSelection[],
  ): Promise<ReadonlySet<string>> {
    return resolveApprovers(
      rule ?? (await this.currentApproverRule()),
      users,
      (id) => capability(crmActor(this.authz, { id }), 'approve'),
    );
  }
  // Settings → Approval process: who may approve, with the version it is at,
  // who set it and when, and the people it names now.
  async approverRuleView(actor: Actor): Promise<ApproverRuleView> {
    await requireCapability(actor, 'manage', 'settings');
    const [version, users] = await Promise.all([
      this.parameters.read(
        LIFECYCLE_PARAMETER_SCOPE,
        approverParameterGroup.key,
      ),
      this.users(actor),
    ]);
    const rule = await this.currentApproverRule();
    return {
      ...approverRuleInput(rule),
      revision: version?.revision ?? 0,
      updatedById: version?.actorId ?? null,
      updatedAt: version?.at ?? null,
      approvers: users.filter((u) => u.canApprove).map((u) => toText(u.id)),
    };
  }
  // A new version of the rule, made from the version the page showed
  // (`revision`): one saved meanwhile by someone else is a conflict, and a
  // request sent again under the same id saves nothing twice. A rule naming
  // nobody who may approve is refused, since no request could then be
  // submitted.
  async saveApproverRule(
    actor: Actor,
    input: ApproverRuleInput & { revision: number; requestId: string },
  ): Promise<ApproverRuleView> {
    await requireCapability(actor, 'manage', 'settings');
    const users = await this.users(actor);
    const rule = approverRule(input, new Set(users.map((u) => toText(u.id))));
    if (
      !(
        await this.approvers(
          users.map((u) => ({
            id: toText(u.id),
            roles: u.roles as string[],
            disabled: u.disabled === true,
          })),
          rule,
        )
      ).size
    )
      throw new CrmError('noApprovers', 400, 'roles');
    try {
      await this.parameters.save({
        scope: LIFECYCLE_PARAMETER_SCOPE,
        group: approverParameterGroup,
        values: { approverRule: rule as unknown as JsonValue },
        expectedRevision: input.revision,
        requestId: input.requestId,
        actorId: actor.id,
        at: new Date().toISOString(),
      });
    } catch (error) {
      if (!(error instanceof ParameterConfigurationError)) throw error;
      throw error.code === 'CONFIGURATION_INVALID'
        ? new CrmError('invalidInput', 400, 'roles')
        : new CrmError('conflict', 409);
    }
    return this.approverRuleView({ ...actor, users: undefined });
  }
  // Set by CrmProvider to the lead evaluation (lead-evaluation.ts), for the
  // ways a lead is created one at a time outside the create route: the
  // assistant's create tool. Imports and the demo data are not evaluated.
  leadCreated?: (by: Actor, leadId: string) => void;
  // Set by CrmProvider to the opportunity follow-up
  // (opportunity-evaluation.ts), for a deal a conversion opened: the
  // conversion route (unless the person unticked it) and the assistant's
  // conversion tool.
  opportunityOpened?: (by: Actor, opportunityId: string) => void;
  // Set by CrmProvider: a task's status set to completed outside the
  // outcome dialogs (its form, a list, the assistant), which follow its
  // record up themselves; and a lead's company or website changed by a
  // person, which has the AI look the company up again.
  taskCompleted?: (by: Actor, task: CrmRecord) => void;
  // An approval approved or rejected: its deal is followed up again, so the
  // AI reads the decision (CrmProvider).
  approvalDecided?: (by: Actor, approval: CrmRecord) => void;
  // An approval submitted: the AI reviews it for its approver
  // (approval-review.ts, set by CrmProvider).
  approvalSubmitted?: (by: Actor, approval: CrmRecord) => void;
  leadCompanyChanged?: (by: Actor, leadId: string) => void;
  // Set by CrmProvider: whether the reader may open a WhatsApp message's
  // media, by its conversation (whatsapp/service.ts).
  whatsappFileReadable?: (actor: Actor, messageId: string) => Promise<boolean>;
  // Set by CrmProvider: WhatsApp customers follow the records they are
  // linked to when a lead is converted or merged, or a record deleted
  // (whatsapp/service.ts), inside the change's transaction.
  whatsappRecords?: {
    converted(
      query: QueryAdapter,
      leadId: string,
      contactId: string,
    ): Promise<void>;
    merged(query: QueryAdapter, keptId: string, otherId: string): Promise<void>;
    removed(
      query: QueryAdapter,
      entity: 'leads' | 'contacts',
      id: string,
    ): Promise<void>;
  };
  // Set by CrmAgentsProvider: an AI entry's run finished (a follow-up, a
  // review, a preparation), so a conversation that asked for it is told
  // (ai-watches.ts). Each worker calls it after writing the outcome.
  aiFinished?: (entryId: string) => Promise<void>;
  // Set by CrmProvider: the settings were saved (the assistant's prompt
  // follows the AI language setting).
  settingsSaved?: (settings: CrmSettings) => void;
  // The language a user last used the CRM in, for work done on their behalf
  // while they are away (a lead evaluated for its owner).
  async localeOf(userId: string): Promise<string> {
    const preference = await this.database
      .query()
      .selectFrom('crmUserPreferences')
      .select('locale')
      .where('id', '=', userId)
      .executeTakeFirst();
    return servedLocale(preference?.locale);
  }
  async rememberLocale(actor: Actor): Promise<void> {
    const query = this.database.query();
    const preference = await query
      .selectFrom('crmUserPreferences')
      .select('locale')
      .where('id', '=', actor.id)
      .executeTakeFirst();
    if (preference && preference.locale !== actor.locale)
      await query
        .updateTable('crmUserPreferences')
        .set({ locale: actor.locale })
        .where('id', '=', actor.id)
        .execute();
    else if (!preference)
      await query
        .insertInto('crmUserPreferences')
        .values({ id: actor.id, locale: actor.locale })
        .execute();
  }
  // The records of one object this actor may read that match the list
  // filters, as a query still to be ordered and paged: the list and the
  // summary read the same rows.
  private async filtered(
    actor: Actor,
    entity: Entity,
    options: ListOptions,
    query: QueryAdapter,
  ) {
    const access = await conditions(actor, entity, 'read');
    const fields = outputFields(entity, access);
    if (!fields.length) throw new CrmError('forbidden', 403);
    const definition = definitions[entity];
    let select = query
      .selectFrom(definition.table)
      .select(fields)
      .where((eb) => compileFilter(eb, access.scope));
    for (const key of [
      'ownerId',
      'companyId',
      'leadId',
      'opportunityId',
      'source',
      'topic',
      'approverId',
    ] as const)
      if (options[key] && fieldsFor(entity).includes(key))
        select = select.where(key, '=', options[key]);
    if (options.status && definition.statusField)
      select = select.where(definition.statusField, '=', options.status);
    // One status or several, comma-separated (a WhatsApp customer is
    // linked to neither a converted nor an invalid lead).
    if (options.excludeStatus && definition.statusField)
      select = select.where(
        definition.statusField,
        'not in',
        options.excludeStatus.split(',').filter(Boolean),
      );
    if (entity === 'tasks') {
      if (options.dueFrom)
        select = select.where('dueAt', '>=', options.dueFrom);
      if (options.dueTo) select = select.where('dueAt', '<=', options.dueTo);
    }
    if (
      (options.employed === 'true' || options.employed === 'false') &&
      fieldsFor(entity).includes('employed')
    )
      select = select.where('employed', '=', options.employed === 'true');
    // Participants are a JSON array of ids, which the column keeps as JSON
    // text in a JSON string (`"[\"id\"]"`, as every JSON column here), so an
    // id reads `\"id\"`; plain JSON (`["id"]`) is matched too. The quote
    // before the id and the one after it mark membership; past the
    // backslash, which `_` stands for, since a LIKE pattern has no escape
    // every database reads alike. So no shorter id that begins another
    // matches; in plain JSON one a character longer could, but the users'
    // ids are of one length.
    const participantLikes = (id: string): string[] => {
      const bare = id.replace(/[%_"\\]/g, '');
      return [`%"${bare}"%`, `%"${bare}_"%`];
    };
    // The text match runs per database (json-text.ts).
    const takingPart = (id: string) =>
      jsonTextLike(
        this.database.connection(),
        'crmTasks',
        'internalParticipants',
        participantLikes(id),
      );
    if (options.participantId && entity === 'tasks') {
      const participant = await takingPart(options.participantId);
      select = select.where((eb) => participant(eb));
    }
    if (options.involvedId && entity === 'tasks') {
      const id = options.involvedId;
      const participant = await takingPart(id);
      select = select.where((eb) =>
        eb.or([eb('ownerId', '=', id), participant(eb)]),
      );
    }
    // An approval is mine whether I asked for it or decide it.
    if (options.involvedId && entity === 'approvals') {
      const id = options.involvedId;
      select = select.where((eb) =>
        eb.or([eb('ownerId', '=', id), eb('approverId', '=', id)]),
      );
    }
    if (options.ids !== undefined) {
      const ids = options.ids.split(',').filter(Boolean);
      select = ids.length
        ? select.where('id', 'in', ids)
        : select.where('id', '=', '');
    }
    if (options.from) select = select.where('createdAt', '>=', options.from);
    if (options.to) select = select.where('createdAt', '<=', options.to);
    if (options.search) {
      const term = toText(options.search.slice(0, 200));
      const searchFields = SEARCH_FIELDS.filter((f) => fields.includes(f));
      // A number typed as people write it (138 0000 5217, +86 …) finds the
      // number as it is kept, as one term.
      const phone = /^[\d\s+().-]{5,}$/.test(term.trim())
        ? normalizePhone(term)
        : '';
      if (phone && searchFields.includes('phone')) {
        const holding = await this.containing(
          definitions[entity].table,
          searchFields,
          term.trim(),
        );
        select = select.where((eb) =>
          eb.or([eb('phone', 'like', `%${phone}%`), ...holding(eb)]),
        );
      } else {
        // Otherwise word by word, in any order: every word matches one of
        // the search fields.
        const words = searchWords(term);
        if (!words.length || !searchFields.length)
          select = select.where('id', '=', '');
        // A deal and a contact are titled with their company's name, which
        // they link rather than hold: a word finds them through the
        // companies it names that the reader may read.
        const byCompany =
          (entity === 'opportunities' || entity === 'contacts') &&
          fields.includes('companyId')
            ? await this.companiesNamed(actor, words, query)
            : undefined;
        for (const word of words) {
          const companies = byCompany?.get(word) ?? [];
          const holding = await this.containing(
            definitions[entity].table,
            searchFields,
            word,
          );
          select = select.where((eb) =>
            eb.or([
              ...holding(eb),
              ...(companies.length ? [eb('companyId', 'in', companies)] : []),
            ]),
          );
        }
      }
    }
    return { select, fields };
  }
  // Where any of the fields holds the text, ignoring case. LIKE does so on
  // SQLite (for ASCII letters) and on MySQL (by its default collation), but
  // matches case exactly on PostgreSQL, and the query layer has neither
  // lower() nor ILIKE. There a text with letters that have a case is looked
  // up first through the Repository, whose match can ignore it, and the
  // query keeps the rows found; a text so common it matches more than
  // CASELESS_LIMIT rows, which one statement should not list, is matched
  // with LIKE as it stands.
  private async containing(
    table: string,
    fields: readonly string[],
    text: string,
  ): Promise<(eb: ExpressionBuilder) => Expression<SqlBool>[]> {
    const like = (eb: ExpressionBuilder) =>
      fields.map((field) => eb(field, 'like', `%${text}%`));
    if (
      !fields.length ||
      this.database.connection().dialect !== 'postgres' ||
      text.toLowerCase() === text.toUpperCase()
    )
      return like;
    const rows = await this.database.repository(table).findMany({
      filter: (filter) =>
        filter.or(
          fields.map((field) =>
            filter.string(field).includes(text, { mode: 'insensitive' }),
          ),
        ),
      select: (select) => select.fields('id'),
      limit: CASELESS_LIMIT + 1,
    });
    if (rows.length > CASELESS_LIMIT) return like;
    const ids = rows.map((row) => toText(row.id));
    return (eb) => [ids.length ? eb('id', 'in', ids) : eb('id', '=', '')];
  }
  // For each word, the companies the reader may read whose name holds it
  // (at most 500 each).
  private async companiesNamed(
    actor: Actor,
    words: readonly string[],
    query: QueryAdapter,
  ): Promise<Map<string, string[]>> {
    const named = new Map<string, string[]>();
    let access;
    try {
      access = await conditions(actor, 'companies', 'read');
    } catch {
      return named;
    }
    if (!outputFields('companies', access).includes('name')) return named;
    for (const word of words) {
      const holding = await this.containing(
        definitions.companies.table,
        ['name'],
        word,
      );
      const rows = await query
        .selectFrom(definitions.companies.table)
        .select('id')
        .where((eb) => compileFilter(eb, access.scope))
        .where((eb) => eb.or(holding(eb)))
        .limit(500)
        .execute();
      named.set(
        word,
        rows.map((row) => toText(row.id)),
      );
    }
    return named;
  }
  async list(
    actor: Actor,
    entity: Entity,
    options: ListOptions = {},
    query: QueryAdapter = this.database.query(),
  ): Promise<ListResult> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, options.pageSize ?? 25));
    const { select, fields } = await this.filtered(
      actor,
      entity,
      options,
      query,
    );
    const sortField = (options.sort ?? '-createdAt').replace(/^-/, '');
    const direction = options.sort?.startsWith('-') === false ? 'asc' : 'desc';
    // A sort is by a column the reader may read: ordering by another would
    // leak its values through the order.
    if (!DATABASE_ORDERS.has(sortField) && !fields.includes(sortField))
      throw new CrmError('invalidInput', 400, 'sort');
    if (!options.contactId) {
      const count = await select
        .clearSelect()
        .select((eb) => [eb.fn.countAll().as('total')])
        .executeTakeFirst();
      const total = Number(count?.total ?? 0);
      if (!DATABASE_ORDERS.has(sortField) && total <= ORDER_IN_MEMORY_LIMIT) {
        const keyed = await select
          .clearSelect()
          .select(['id', 'createdAt', sortField])
          .execute();
        const order = orderKind(entity, sortField);
        let names: Record<string, string> = {};
        if (order.kind === 'relation') {
          const ids = [
            ...new Set(keyed.map((r) => toText(r[sortField] ?? ''))),
          ].filter(Boolean);
          names =
            order.target === 'users'
              ? Object.fromEntries(
                  (await this.users(actor)).map((u) => [
                    toText(u.id),
                    toText(u.name ?? ''),
                  ]),
                )
              : (await resolveTitles(this, actor, {}, { [order.target]: ids }))
                  .titles;
        }
        const keys = new Map(
          keyed.map((r) => [
            toText(r.id),
            orderKey(order, decodeRow(r)[sortField], names),
          ]),
        );
        const pageIds = orderRecords(
          keyed,
          keys,
          direction,
          actor.locale,
        ).slice((page - 1) * pageSize, page * pageSize);
        const rows = pageIds.length
          ? await select.where('id', 'in', pageIds).execute()
          : [];
        const byId = new Map(rows.map((r) => [toText(r.id), r]));
        return {
          data: pageIds
            .map((id) => byId.get(id))
            .filter((r): r is Row => Boolean(r))
            .map((row) => decodeRow(row) as CrmRecord),
          total,
          page,
          pageSize,
        };
      }
      // On a tie (two tasks starting at the same time), the one
      // created later comes first; the id only keeps the order stable.
      let ordered = select.orderBy(sortField, direction);
      if (sortField !== 'createdAt')
        ordered = ordered.orderBy('createdAt', 'desc');
      const records = await ordered
        .orderBy('id', 'asc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();
      return {
        data: records.map((row) => decodeRow(row) as CrmRecord),
        total,
        page,
        pageSize,
      };
    }
    // Related contact membership is JSON; apply its filter before pagination.
    const all = await select.orderBy('createdAt', 'desc').execute();
    const filtered = options.contactId
      ? all.filter(
          (r) =>
            // A task has no customer people of its own.
            entity !== 'tasks' &&
            array(r.contacts).some(
              (x) => object(x).contactId === options.contactId,
            ),
        )
      : all;
    return {
      data: filtered
        .slice((page - 1) * pageSize, page * pageSize)
        .map((row) => decodeRow(row) as CrmRecord),
      total: filtered.length,
      page,
      pageSize,
    };
  }
  // Counts and totals over the records the list filters match, grouped by a
  // field or a period (summary.ts): the numbers a report is built on, read
  // within the same permission scope as the list.
  async summarize(
    actor: Actor,
    entity: Entity,
    options: ListOptions,
    request: SummaryRequest,
    query: QueryAdapter = this.database.query(),
  ): Promise<Summary> {
    // Contact membership is filtered after the query in the list; a
    // summary does not take it.
    const { select, fields } = await this.filtered(
      actor,
      entity,
      { ...options, contactId: undefined },
      query,
    );
    const settled = validateSummary(entity, fields, request);
    const count = await select
      .clearSelect()
      .select((eb) => [eb.fn.countAll().as('total')])
      .executeTakeFirst();
    const total = Number(count?.total ?? 0);
    const columns = [
      ...new Set(
        [
          settled.groupBy,
          ...(settled.measures ?? []),
          ...(hasCurrency(entity) && settled.measures?.length
            ? ['currency']
            : []),
        ].filter((c): c is string => !!c && fields.includes(c)),
      ),
    ];
    const rows = columns.length
      ? (
          await select
            .clearSelect()
            .select(columns)
            .orderBy('id', 'asc')
            .limit(SUMMARY_ROW_LIMIT)
            .execute()
        ).map((row) => decodeRow(row))
      : [];
    const { timeZone } = await this.settings(query);
    // Without a grouping or a measure, the count is the whole answer.
    if (!columns.length)
      return {
        total,
        truncated: false,
        groups: [{ key: null, count: total, measures: [] }],
        overall: [],
      };
    return summarizeRows(entity, rows, settled, { total, timeZone });
  }
  async get(
    actor: Actor,
    entity: Entity,
    id: string,
    query: QueryAdapter = this.database.query(),
    action = 'read',
  ): Promise<CrmRecord> {
    const access = await conditions(actor, entity, action);
    const fields =
      action === 'read' ? outputFields(entity, access) : fieldsFor(entity);
    const row = await query
      .selectFrom(definitions[entity].table)
      .select(fields)
      .where('id', '=', id)
      .where((eb) => compileFilter(eb, access.scope))
      .executeTakeFirst();
    if (!row) throw new CrmError('notFound', 404);
    return decodeRow(row) as CrmRecord;
  }
  // A record's activity feed, newest first, a page at a time, with the
  // fields the reader may not see left out of each entry: people's changes,
  // the AI's proposals they confirmed and the AI's own work (an evaluation),
  // all of it or only the people's (`source: 'user'`) or the AI's
  // (`source: 'ai'`).
  async historyOf(
    actor: Actor,
    entity: Entity,
    id: string,
    options: {
      page?: number;
      pageSize?: number;
      source?: string;
      // Only the comments, for the comments beside a record's particulars.
      action?: string;
    } = {},
  ): Promise<{ data: Row[]; total: number; page: number; pageSize: number }> {
    const subject = await this.get(actor, entity, id);
    // Mail from before the record existed (mail-timeline.ts reaches 180
    // days back) is one entry at the end of its story, `mailBefore`, its
    // conversations inside, rather than one entry per conversation, under
    // which a customer's long correspondence would bury the record's own.
    const born = Date.parse(toText(subject.createdAt ?? ''));
    const createdAt = Number.isNaN(born)
      ? undefined
      : new Date(born).toISOString();
    // The mail alone (a Mail tab's colleagues' conversations) is never
    // folded: every conversation is wanted.
    const foldsMail =
      Boolean(createdAt) &&
      options.action !== 'comment' &&
      options.source !== 'mail';
    // An approval's AI review is its approver's working draft: it reads
    // with the approver's access (precedents on companies the applicant may
    // not see) and leans on a decision not yet made, so no one else reads it.
    // A task's preparation likewise the people doing it: it reads their
    // mail.
    const hideReviews =
      (entity === 'approvals' && subject.approverId !== actor.id) ||
      (entity === 'tasks' && !doesTask(subject, actor.id));
    const readable = outputFields(
      entity,
      await conditions(actor, entity, 'read'),
    );
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(
      1000,
      Math.max(1, options.pageSize ?? RELATED_PAGE),
    );
    const query = this.database.query();
    // The tasks linked to the record that the reader may see: their
    // planning, edits and outcome are part of the record's story (one
    // deleted is told on the record itself, as taskDeleted). Not for
    // the comments alone.
    const link = (
      {
        leads: 'leadId',
        companies: 'companyId',
        opportunities: 'opportunityId',
      } as Partial<Record<Entity, keyof ListOptions>>
    )[entity];
    const tasks = new Map<string, CrmRecord>();
    if (link && options.action !== 'comment')
      for (const task of (
        await this.list(actor, 'tasks', { [link]: id, pageSize: 1000 })
      ).data)
        tasks.set(toText(task.id), task);
    const taskIds = [...tasks.keys()];
    // A deal's approvals the reader may read: submitted, decided and
    // withdrawn are part of the deal's story too. Only their status
    // changes: an approval's AI review stays its approver's.
    const approvals = new Map<string, CrmRecord>();
    if (entity === 'opportunities' && options.action !== 'comment')
      for (const approval of (
        await this.list(actor, 'approvals', {
          opportunityId: id,
          pageSize: 1000,
        })
      ).data)
        approvals.set(toText(approval.id), approval);
    const approvalIds = [...approvals.keys()];
    const taskFields = taskIds.length
      ? outputFields('tasks', await conditions(actor, 'tasks', 'read'))
      : [];
    const readableOf = (values: Row): Row =>
      Object.fromEntries(
        Object.entries(values).filter(
          ([key]) => TOLD.includes(key) && taskFields.includes(key),
        ),
      );
    // The record's own entries, and those of its tasks that tell.
    const ofRecord = (eb: ExpressionBuilder): Expression<SqlBool> => {
      const own = eb.and([
        eb('entity', '=', entity),
        eb('recordId', '=', id),
        // A reply is read with its comment (below), not as an entry of its
        // own; the comments alone (an AI's reading) take them all.
        ...(options.action === 'comment' ? [] : [eb('replyToId', 'is', null)]),
        ...(foldsMail
          ? [
              eb.or([
                eb('action', '!=', 'mail'),
                eb('createdAt', '>=', createdAt),
              ]),
            ]
          : []),
      ]);
      const linked = [
        ...(taskIds.length
          ? [
              eb.and([
                eb('entity', '=', 'tasks'),
                eb('recordId', 'in', taskIds),
                eb('action', 'in', ['created', 'status', 'updated']),
              ]),
            ]
          : []),
        ...(approvalIds.length
          ? [
              eb.and([
                eb('entity', '=', 'approvals'),
                eb('recordId', 'in', approvalIds),
                eb('action', '=', 'status'),
              ]),
            ]
          : []),
      ];
      return linked.length ? eb.or([own, ...linked]) : own;
    };
    // People's own changes carry no source; the AI's carry `ai` (its own
    // work) or `assistant` (its proposal, confirmed).
    const scoped = <
      Q extends { where(column: string, op: string, value: unknown): Q },
    >(
      select: Q,
    ): Q => {
      const sourced =
        options.source === 'ai'
          ? select.where('source', 'in', ['ai', 'assistant', 'capture'])
          : options.source === 'user'
            ? select.where('source', 'is', null)
            : options.source === 'mail'
              ? select.where('action', '=', 'mail')
              : select;
      const shown = hideReviews
        ? sourced.where('action', 'not in', ['ai', 'aiRevise'])
        : sourced;
      return options.action === 'comment'
        ? shown.where('action', '=', 'comment')
        : shown;
    };
    // A task's edit tells the record only when it changes who has it
    // or when it is (TOLD), and a change of status only to done or called
    // off; its other edits stay on the task. Which
    // fields an edit changed is read from its JSON, so a record with
    // tasks is filtered and paged here rather than by the database (a
    // record's history is short).
    const told = (event: Row): boolean =>
      event.entity !== 'tasks' ||
      entity === 'tasks' ||
      event.action === 'created' ||
      (event.action === 'status' &&
        TOLD_STATUSES.includes(toText(event.toValue))) ||
      (event.action === 'updated' &&
        Object.keys(object(jsonValue(event.changes) ?? {})).some((key) =>
          TOLD.includes(key),
        ));
    const ordered = scoped(
      query.selectFrom('crmHistory').selectAll().where(ofRecord),
    )
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'asc');
    let rows: Row[];
    let total: number;
    if (taskIds.length) {
      const all = (await ordered.execute()).filter(told);
      total = all.length;
      rows = all.slice((page - 1) * pageSize, page * pageSize);
    } else {
      const count = await scoped(
        query
          .selectFrom('crmHistory')
          .select((eb) => [eb.fn.countAll().as('total')])
          .where(ofRecord),
      ).executeTakeFirst();
      total = Number(count?.total ?? 0);
      rows = await ordered
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();
    }
    // The earlier mail, newest first (its latest gives the entry its time),
    // unless the reader filtered to the AI's or people's entries, which leave
    // mail out anyway.
    const earlier =
      foldsMail && !options.source
        ? await query
            .selectFrom('crmHistory')
            .selectAll()
            .where('entity', '=', entity)
            .where('recordId', '=', id)
            .where('action', '=', 'mail')
            .where('createdAt', '<', createdAt!)
            .orderBy('createdAt', 'desc')
            .orderBy('id', 'asc')
            .execute()
        : [];
    // It comes after every other entry: on the page where the list ends.
    const position = total;
    if (earlier.length) total += 1;
    const data: Row[] = rows.map((event) =>
      // One of the deal's approvals changing status: the approval as it now
      // reads, and its decision comment once decided.
      event.entity === 'approvals' && entity !== 'approvals'
        ? (() => {
            const approval = approvals.get(toText(event.recordId))!;
            return {
              ...event,
              changes: {},
              previous: null,
              ai: null,
              approval: {
                id: approval.id,
                name: approval.name,
                topic: approval.topic,
                status: approval.status,
                decisionComment: approval.decisionComment ?? null,
              },
            };
          })()
        : // A task's entry: the task as it now reads (name, status, due
          // time, result) and, for a new due time, the one before.
          // (Not the task's own history, whose entries are its own.)
          event.entity === 'tasks' && entity !== 'tasks'
          ? (() => {
              const task = tasks.get(toText(event.recordId))!;
              const changes = object(jsonValue(event.changes) ?? {});
              const previous = object(jsonValue(event.previous) ?? {});
              return {
                ...event,
                // When it is due; for an edit, the fields it changed
                // that the record is told of and the reader may read, before
                // and after.
                changes:
                  event.action === 'created'
                    ? { dueAt: changes.dueAt ?? null }
                    : event.action === 'updated'
                      ? readableOf(changes)
                      : {},
                previous:
                  event.action === 'updated' ? readableOf(previous) : null,
                ai: null,
                task: {
                  id: task.id,
                  name: task.name,
                  status: task.status,
                  dueAt: task.dueAt ?? null,
                  result: task.result ?? null,
                },
              };
            })()
          : // A comment's text is the comment, not a field of the record; an edit
            // entry carries the text as changed, and a person's instruction to
            // the AI to redo a card (aiRevise) its words, a mail
            // conversation (mail-timeline.ts) its summary, a customer's
            // WhatsApp day (whatsapp/service.ts) its counts, and a company
            // signal (company-signals.ts) what was found and where.
            event.action === 'comment' ||
              event.action === 'mail' ||
              event.action === 'whatsapp' ||
              event.action === 'signal' ||
              event.action === 'commentEdited' ||
              event.action === 'aiRevise' ||
              event.action === 'taskDeleted'
            ? {
                ...event,
                changes: object(jsonValue(event.changes) ?? {}),
                previous:
                  event.previous == null
                    ? null
                    : object(jsonValue(event.previous) ?? {}),
                ai: null,
              }
            : {
                ...event,
                changes:
                  event.action === 'merged'
                    ? (() => {
                        // A merge (lead-merge.ts): the lead merged in, by its
                        // readable fields, and what came over with it.
                        const merge = object(jsonValue(event.changes) ?? {});
                        return {
                          lead: Object.fromEntries(
                            Object.entries(object(merge.lead ?? {})).filter(
                              ([key]) => key === 'id' || readable.includes(key),
                            ),
                          ),
                          tasks: merge.tasks ?? 0,
                          comments: merge.comments ?? 0,
                          // A lead not yet saved, merged from the capture review.
                          ...(merge.captured ? { captured: true } : {}),
                        };
                      })()
                    : Object.fromEntries(
                        Object.entries(
                          object(jsonValue(event.changes) ?? {}),
                        ).filter(([key]) => readable.includes(key)),
                      ),
                // Null for entries written before earlier values were kept.
                previous:
                  event.previous == null
                    ? null
                    : Object.fromEntries(
                        Object.entries(
                          object(jsonValue(event.previous) ?? {}),
                        ).filter(([key]) => readable.includes(key)),
                      ),
                ...(!readable.includes(definitions[entity].statusField ?? '')
                  ? { fromValue: null, toValue: null }
                  : {}),
                // The AI's own work: what it concluded and where that stands.
                ...(event.action === 'ai'
                  ? (() => {
                      const entry = readEntry(event);
                      return { aiStatus: entry.status, ai: entry.ai };
                    })()
                  : { ai: null }),
              },
    );
    // Each comment's replies at any depth, oldest first, each naming what it
    // answers (the page draws the tree).
    const commentIds = data
      .filter((row) => row.action === 'comment' && options.action !== 'comment')
      .map((row) => toText(row.id));
    if (commentIds.length) {
      const replies = await this.repliesUnder(query, commentIds);
      const parentOf = new Map(
        replies.map((reply) => [toText(reply.id), toText(reply.replyToId)]),
      );
      const rootOf = (id: string): string => {
        let at = id;
        for (let depth = 0; parentOf.has(at) && depth < 50; depth += 1)
          at = parentOf.get(at)!;
        return at;
      };
      const byComment = new Map<string, Row[]>();
      for (const reply of replies) {
        const root = rootOf(toText(reply.id));
        byComment.set(root, [
          ...(byComment.get(root) ?? []),
          {
            id: reply.id,
            replyToId: reply.replyToId,
            actorId: reply.actorId,
            createdAt: reply.createdAt,
            editedAt: reply.editedAt ?? null,
            source: reply.source ?? null,
            changes: object(jsonValue(reply.changes) ?? {}),
          },
        ]);
      }
      for (const row of data)
        if (row.action === 'comment')
          row.replies = byComment.get(toText(row.id)) ?? [];
    }
    if (
      earlier.length &&
      position >= (page - 1) * pageSize &&
      position < page * pageSize
    )
      data.push({
        id: `mailBefore:${id}`,
        entity,
        recordId: id,
        actorId: null,
        action: 'mailBefore',
        source: 'mail',
        // When the latest of them took place.
        createdAt: earlier[0].createdAt,
        // How many; the Mail tab lists them.
        changes: { count: earlier.length },
        previous: null,
        ai: null,
      });
    return { data, total, page, pageSize };
  }
  // The record with the first page of its history and of each related list;
  // the page asks for further pages through the list and history endpoints.
  async detail(actor: Actor, entity: Entity, id: string): Promise<Row> {
    const record = await this.get(actor, entity, id);
    const historyPage = await this.historyOf(actor, entity, id);
    const history = historyPage.data;
    const historyTotal = historyPage.total;
    const related: Partial<Record<Entity, CrmRecord[]>> = {};
    const relatedTotals: Partial<Record<Entity, number>> = {};
    const firstPage = async (
      child: Entity,
      options: ListOptions,
    ): Promise<void> => {
      const result = await this.list(actor, child, {
        ...options,
        pageSize: RELATED_PAGE,
      });
      related[child] = result.data;
      relatedTotals[child] = result.total;
    };
    const link: ListOptions =
      entity === 'leads'
        ? { leadId: id }
        : entity === 'companies'
          ? { companyId: id }
          : entity === 'opportunities'
            ? { opportunityId: id }
            : entity === 'contacts'
              ? { contactId: id }
              : {};
    if (['leads', 'companies', 'contacts', 'opportunities'].includes(entity))
      await firstPage('tasks', { ...link, sort: 'dueAt' });
    if (entity === 'companies') {
      await firstPage('contacts', { companyId: id });
      await firstPage('opportunities', { companyId: id });
    }
    // Where the object came from: the leads whose conversion produced it.
    // Read for the "converted from" line, and on companies for the delete check.
    const convertedBy: Partial<Record<Entity, string>> = {
      companies: 'convertedCompanyId',
      contacts: 'convertedContactId',
      opportunities: 'convertedOpportunityId',
    };
    const convertedField = convertedBy[entity];
    if (convertedField) {
      const leadAccess = await conditions(actor, 'leads', 'read');
      related.leads = await this.database
        .query()
        .selectFrom('crmLeads')
        .select(outputFields('leads', leadAccess))
        .where(convertedField, '=', id)
        .where((eb) => compileFilter(eb, leadAccess.scope))
        .execute();
    }
    if (entity === 'contacts')
      await firstPage('opportunities', { contactId: id });
    if (entity === 'opportunities') {
      await firstPage('approvals', { opportunityId: id });
      // The people a deal can involve come from its company; the page
      // offers the first of them and asks for more on demand.
      if (record.companyId)
        await firstPage('contacts', { companyId: toText(record.companyId) });
    }
    let canEdit = false;
    let canDelete = false;
    try {
      await this.get(actor, entity, id, this.database.query(), 'update');
      canEdit = true;
    } catch {
      /* Unauthorized controls are hidden; APIs check again. */
    }
    try {
      await this.get(actor, entity, id, this.database.query(), 'delete');
      canDelete = true;
    } catch {
      /* Same boundary as update. */
    }
    if (entity === 'leads' && record.status === 'converted')
      canEdit = canDelete = false;
    if (entity === 'approvals') {
      canEdit =
        canEdit &&
        record.ownerId === actor.id &&
        ['draft', 'withdrawn'].includes(toText(record.status));
      canDelete =
        canDelete &&
        (canEdit || (await capability(actor, 'manage', 'settings')));
    }
    // Counts of what would block a delete, keyed by child object, so the
    // confirmation dialog can name them instead of failing afterwards.
    const blockers: Partial<Record<Entity, number>> = {};
    if (canDelete) {
      const query = this.database.query();
      for (const [child, field] of deletionChecks(entity)) {
        const row = await query
          .selectFrom(definitions[child].table)
          .select((eb) => [eb.fn.countAll().as('n')])
          .where(field, '=', id)
          .executeTakeFirst();
        const n = Number(row?.n ?? 0);
        if (n) blockers[child] = n;
      }
    }
    // What deleting a contact would edit rather than block: the opportunities
    // that list it. Counted by reading, as the lists are JSON.
    const unlinks: Partial<Record<Entity, number>> = {};
    if (canDelete && entity === 'contacts') {
      const query = this.database.query();
      for (const [child, table, field] of [
        ['opportunities', 'crmOpportunities', 'contacts'],
      ] as const) {
        const rows = await query
          .selectFrom(table)
          .select(field)
          .where('companyId', '=', record.companyId)
          .execute();
        const n = rows.filter((r) =>
          array(r[field]).some((v) =>
            typeof v === 'object' ? object(v).contactId === id : v === id,
          ),
        ).length;
        if (n) unlinks[child] = n;
      }
    }
    return {
      record,
      history,
      historyTotal,
      related,
      relatedTotals,
      blockers,
      unlinks,
      permissions: {
        edit: canEdit,
        delete: canDelete,
        approve:
          entity === 'approvals' &&
          record.approverId === actor.id &&
          record.ownerId !== actor.id &&
          record.status === 'pending' &&
          (await capability(actor, 'approve')),
      },
    };
  }
  async save(
    actor: Actor,
    entity: Entity,
    raw: unknown,
    id?: string,
    tx?: QueryAdapter,
  ): Promise<CrmRecord> {
    if (!tx)
      return this.mutate(actor, (prepared, query) =>
        this.save(prepared, entity, raw, id, query),
      );
    const supplied = object(raw);
    const known = new Set(definitions[entity].fields.map((f) => f.key));
    if (Object.keys(supplied).some((f) => !known.has(f)))
      throw new CrmError('invalidInput');
    const access = await conditions(
      actor,
      entity,
      id ? 'update' : 'create',
      supplied,
    );
    assertFields(supplied, access);
    const previous = id
      ? await this.get(actor, entity, id, tx, 'update')
      : undefined;
    if (entity === 'leads' && previous?.status === 'converted')
      throw new CrmError('convertedReadOnly', 409);
    if (
      entity === 'approvals' &&
      previous &&
      (previous.ownerId !== actor.id ||
        !['draft', 'withdrawn'].includes(toText(previous.status)))
    )
      throw new CrmError('approvalLocked', 409);
    const settings = await this.settings(tx);
    const now = new Date().toISOString();
    const defaults: Row = {
      ownerId: actor.id,
      source: 'other',
      ...(entity === 'leads'
        ? { status: 'new' }
        : entity === 'companies'
          ? { status: 'prospect' }
          : entity === 'contacts'
            ? { employed: true, gender: 'unknown' }
            : entity === 'opportunities'
              ? {
                  stage: 'contact',
                  currency: settings.currency,
                  contacts: [],
                }
              : entity === 'tasks'
                ? {
                    status: 'open',
                    internalParticipants: [],
                  }
                : { status: 'draft' }),
    };
    const input: Row = {
      ...defaults,
      ...previous,
      ...supplied,
      id: id ?? randomUUID(),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      createdById: previous?.createdById ?? actor.id,
    };
    if (entity === 'approvals') input.ownerId = previous?.ownerId ?? actor.id;
    if (!input.name && entity === 'opportunities' && input.companyId)
      input.name = (
        await this.get(actor, 'companies', toText(input.companyId), tx)
      ).name;
    const users = await this.users(actor);
    // An owner is someone who sells: an administrator runs the system and
    // is not a valid owner, even for records they create themselves. An
    // approval is the exception: its "owner" is whoever raised it.
    const owner = users.find(
      (u) =>
        u.id === input.ownerId &&
        !u.disabled &&
        (entity === 'approvals'
          ? array(u.roles).length
          : sellerRoles.some((r) => array(u.roles).includes(r))),
    );
    if (!owner) throw new CrmError('invalidOwner', 400, 'ownerId');
    if (
      input.ownerId !== actor.id &&
      input.ownerId !== previous?.ownerId &&
      !(await capability(actor, 'assign'))
    )
      throw new CrmError('forbidden', 403);
    for (const field of definitions[entity].fields) {
      let value = input[field.key];
      if (typeof value === 'string') {
        // A phone number as the CRM keeps it, however typed (phone.ts).
        value = field.key === 'phone' ? normalizePhone(value) : value.trim();
        input[field.key] = value || null;
      }
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      )
        throw new CrmError('required', 400, field.key);
      if (value === undefined || value === null || value === '') continue;
      if (field.type === 'number') {
        if (
          !Number.isFinite(Number(value)) ||
          Number(value) < 0 ||
          Number(value) > 1e14
        )
          throw new CrmError('invalidInput', 400, field.key);
        input[field.key] = Number(value);
      } else if (field.type === 'boolean') {
        if (typeof value !== 'boolean' && value !== 0 && value !== 1)
          throw new CrmError('invalidInput', 400, field.key);
        input[field.key] = Boolean(value);
      } else if (['date', 'datetime'].includes(field.type)) {
        if (!Number.isFinite(new Date(toText(value)).getTime()))
          throw new CrmError('invalidInput', 400, field.key);
        input[field.key] = new Date(toText(value)).toISOString();
      } else if (['multi', 'contacts', 'files'].includes(field.type)) {
        if (!Array.isArray(value) || value.length > LIST_LIMIT)
          throw new CrmError('invalidInput', 400, field.key);
      } else {
        if (typeof value !== 'string' || value.length > lengthLimit(field.type))
          throw new CrmError('invalidInput', 400, field.key);
      }
      const options =
        settings.options[
          field.key === 'type' && entity === 'companies'
            ? 'companyType'
            : field.key
        ] ?? field.options;
      if (
        field.type === 'select' &&
        options &&
        !options.includes(toText(value)) &&
        value !== previous?.[field.key]
      )
        throw new CrmError('invalidInput', 400, field.key);
      if (
        field.type === 'email' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toText(value))
      )
        throw new CrmError('invalidInput', 400, field.key);
      // "url" fields accept any text: a website typed as "example.com" is
      // still a website. The client links it when it looks like one.
      // Values predating the ISO codes stay editable, matching the select rule above.
      const unchanged = value === previous?.[field.key];
      if (field.type === 'country' && !isCountry(toText(value)) && !unchanged)
        throw new CrmError('invalidInput', 400, field.key);
      if (field.type === 'subdivision' && !unchanged) {
        const country = toText(input.country ?? previous?.country);
        if (!isSubdivision(country, toText(value))) {
          // A name (in either language, "Jiangxi") is taken for its code.
          const code = subdivisionCode(country, toText(value));
          if (!code) throw new CrmError('invalidInput', 400, field.key);
          input[field.key] = code;
        }
      }
    }
    if (
      entity === 'leads' &&
      input.status === 'invalid' &&
      !input.invalidReason
    )
      throw new CrmError('required', 400, 'invalidReason');
    if (
      entity === 'companies' &&
      input.status === 'churned' &&
      !input.churnReason
    )
      throw new CrmError('required', 400, 'churnReason');
    if (input.companyId)
      await this.get(actor, 'companies', toText(input.companyId), tx);
    if (
      entity === 'contacts' &&
      previous?.companyId !== input.companyId &&
      previous
    ) {
      const used = await tx
        .selectFrom('crmOpportunities')
        .select('contacts')
        .where('companyId', '=', previous.companyId)
        .execute();
      if (
        used.some((r) =>
          array(r.contacts).some((c) => object(c).contactId === id),
        )
      )
        throw new CrmError('relatedRecords', 409);
    }
    if (entity === 'opportunities') {
      if (!/^[A-Z]{3}$/.test(toText(input.currency)))
        throw new CrmError('invalidInput', 400, 'currency');
      // A deal's tasks were held with its company's people, so a deal
      // that has any stays with that company. Checked before the contacts,
      // which the page takes off the deal when it moves: this is the reason
      // a move with both cannot go ahead.
      if (
        previous &&
        previous.companyId !== input.companyId &&
        (await tx
          .selectFrom('crmTasks')
          .select('id')
          .where('opportunityId', '=', id)
          .executeTakeFirst())
      )
        throw new CrmError('opportunityHasTasks', 409);
      if (input.stage === 'lost' && !input.lostReason)
        throw new CrmError('required', 400, 'lostReason');
      if (input.stage === 'paused' && !input.pauseReason)
        throw new CrmError('required', 400, 'pauseReason');
      for (const key of ['lostReason', 'pauseReason'] as const)
        if (input[key] && !settings.options[key].includes(toText(input[key])))
          throw new CrmError('invalidInput', 400, key);
      const contacts = array(input.contacts);
      const ids = new Set();
      for (const value of contacts) {
        const contact = object(value);
        if (ids.has(contact.contactId))
          throw new CrmError('invalidInput', 400, 'contacts');
        ids.add(contact.contactId);
        if (
          ![
            'decisionMaker',
            'champion',
            'evaluator',
            'influencer',
            'user',
            'blocker',
            'other',
          ].includes(toText(contact.role))
        )
          throw new CrmError('invalidInput', 400, 'contacts');
        const linked = await this.get(
          actor,
          'contacts',
          toText(contact.contactId),
          tx,
        );
        if (linked.companyId !== input.companyId)
          throw new CrmError('companyMismatch');
      }
      // A contact on an opportunity carries its role and nothing else.
      input.contacts = contacts.map((value) => {
        const contact = object(value);
        return { contactId: contact.contactId, role: contact.role };
      });
      if (previous?.stage !== input.stage) {
        input.closedAt = ['won', 'lost'].includes(toText(input.stage))
          ? now
          : null;
        if (input.stage === 'won') {
          const company = await this.get(
            actor,
            'companies',
            toText(input.companyId),
            tx,
          );
          await tx
            .updateTable('crmCompanies')
            .set({ status: 'customer', updatedAt: now })
            .where('id', '=', input.companyId)
            .execute();
          if (company.status !== 'customer')
            await this.history(
              tx,
              actor,
              'companies',
              toText(input.companyId),
              'status',
              company.status,
              'customer',
            );
        }
      }
    }
    if (entity === 'tasks') {
      // A task may stand on its own: no record to link is required. Its
      // time is optional and has no end.
      if (input.opportunityId) {
        const opp = await this.get(
          actor,
          'opportunities',
          toText(input.opportunityId),
          tx,
        );
        if (input.companyId && opp.companyId !== input.companyId)
          throw new CrmError('companyMismatch');
        input.companyId = opp.companyId;
      }
      if (input.leadId) {
        const lead = await this.get(actor, 'leads', toText(input.leadId), tx);
        if (
          lead.status === 'converted' &&
          (!previous || previous.leadId !== input.leadId)
        )
          throw new CrmError('convertedReadOnly');
        // A task is about a lead, or about a company and its deal, not
        // both: a lead has neither until it is converted, when its tasks are
        // given the company and deal it became (conversion.ts).
        // Checked when the links are set, so a task linked both ways before
        // this rule can still be edited otherwise.
        if (
          lead.status !== 'converted' &&
          (input.companyId || input.opportunityId) &&
          ['leadId', 'companyId', 'opportunityId'].some(
            (key) => key in supplied,
          )
        )
          throw new CrmError('leadOrCompany');
        // A new lead is being worked once something has been done with it:
        // a task of it completed (as a comment or mail does).
        if (input.status === 'completed' && previous?.status !== 'completed')
          await this.leadWorked(tx, actor, toText(input.leadId), now);
      }
      if (
        array(input.internalParticipants).some(
          (userId) =>
            !users.some(
              (u) => u.id === userId && !u.disabled && array(u.roles).length,
            ),
        )
      )
        throw new CrmError('invalidOwner');
      if (input.status === 'completed' && previous?.status !== 'completed')
        input.completedAt = now;
      if (input.status !== 'completed') input.completedAt = null;
    }
    if (entity === 'approvals') {
      // The deal must be one the applicant may edit (their own, for a
      // salesperson); a deal they can only read gets a reason, not "not
      // found".
      try {
        await this.get(
          actor,
          'opportunities',
          toText(input.opportunityId),
          tx,
          'update',
        );
      } catch (error) {
        if (!(error instanceof CrmError && error.code === 'notFound'))
          throw error;
        await this.get(actor, 'opportunities', toText(input.opportunityId), tx);
        throw new CrmError('approvalOpportunity', 403, 'opportunityId');
      }
      if (input.approverId)
        await this.checkApprover(actor, toText(input.approverId));
    }
    for (const fileId of array(input.attachments))
      if (
        !array(previous?.attachments).includes(fileId) &&
        !(await this.canReadFile(actor, toText(fileId), tx))
      )
        throw new CrmError('notFound', 404);
    const values = Object.fromEntries(
      fieldsFor(entity)
        .filter((key) => input[key] !== undefined)
        .map((key) => [key, input[key]]),
    );
    // An approval's status is its lifecycle's alone
    // (server/lifecycles/approvals.ts): an edit leaves it as it is, and a
    // new approval is created through the runtime, which starts it as a
    // draft and logs its creation.
    if (entity === 'approvals') delete values.status;
    if (id) {
      const result = await tx
        .updateTable(definitions[entity].table)
        .set(encodeRow(values))
        .where('id', '=', id)
        .where('updatedAt', '=', previous!.updatedAt)
        .where((eb) => compileFilter(eb, access.scope))
        .execute();
      if (!result.updatedCount) throw new CrmError('conflict', 409);
    } else if (entity === 'approvals') {
      if (!actor.transaction)
        throw new Error(
          'An approval is created only within CrmService.mutate.',
        );
      await this.lifecycles
        .create(APPROVAL_LIFECYCLE, values, {
          actor: { id: actor.id },
          transaction: actor.transaction,
        })
        .catch((error: unknown) => {
          throw lifecycleRefusal(error);
        });
    } else
      await tx
        .insertInto(definitions[entity].table)
        .values(encodeRow(values))
        .execute();
    // A company has at most one primary contact: marking this one clears the
    // flag on its siblings in the same transaction, so the star on the company
    // page moves rather than multiplies.
    if (entity === 'contacts' && input.primary && input.companyId)
      await tx
        .updateTable('crmContacts')
        .set({ primary: false })
        .where('companyId', '=', toText(input.companyId))
        .where('id', '!=', toText(input.id))
        .execute();
    // One entry per save. A status or stage move is not a second row: it is the
    // same save, labelled by what changed and carrying the old and new value.
    const movedField =
      entity === 'opportunities' ? 'stage' : definitions[entity].statusField;
    const moved = Boolean(
      id && movedField && previous?.[movedField] !== input[movedField],
    );
    // An update records the fields that actually changed, each with the
    // value it held before, so the history can show "old → new"; a field the
    // save resent unchanged is not a change.
    const changedKeys = previous
      ? Object.keys(supplied).filter(
          (key) => !sameValue(previous[key], input[key]),
        )
      : Object.keys(supplied);
    // A save that changed nothing leaves no entry.
    if (!previous || moved || changedKeys.length)
      await this.history(
        tx,
        actor,
        entity,
        toText(input.id),
        !id ? 'created' : moved ? (movedField as string) : 'updated',
        moved ? previous?.[movedField as string] : undefined,
        moved ? input[movedField as string] : undefined,
        previous
          ? Object.fromEntries(changedKeys.map((key) => [key, input[key]]))
          : supplied,
        previous
          ? Object.fromEntries(
              changedKeys.map((key) => [key, previous[key] ?? null]),
            )
          : undefined,
      );
    await this.recordNotifications(tx, actor, entity, input, previous);
    return this.get(actor, entity, toText(input.id), tx);
  }
  async canReadFile(
    actor: Actor,
    id: string,
    query: QueryAdapter = this.database.query(),
  ): Promise<boolean> {
    const file = await query
      .selectFrom('crmFiles')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!file) return false;
    const upload = await query
      .selectFrom('crmFileUploads')
      .select('id')
      .where('id', '=', id)
      .where('ownerId', '=', actor.id)
      .executeTakeFirst();
    if (upload) return true;
    // A WhatsApp message's media: whoever may read its conversation.
    const message = await query
      .selectFrom('crmWaMessages')
      .select('id')
      .where('mediaFileId', '=', id)
      .executeTakeFirst();
    if (message && this.whatsappFileReadable)
      return this.whatsappFileReadable(actor, toText(message.id));
    for (const entity of entities) {
      let access;
      try {
        access = await conditions(actor, entity, 'read');
      } catch {
        continue;
      }
      if (!outputFields(entity, access).includes('attachments')) continue;
      const records = await query
        .selectFrom(definitions[entity].table)
        .select('attachments')
        .where((eb) => compileFilter(eb, access.scope))
        .execute();
      if (records.some((record) => array(record.attachments).includes(id)))
        return true;
    }
    // A file on a comment is read by whoever may read the comment's record.
    const comments = await query
      .selectFrom('crmHistory')
      .select(['entity', 'recordId', 'changes'])
      .where('action', '=', 'comment')
      .where(
        await jsonTextLike(
          this.database.connection(),
          'crmHistory',
          'changes',
          [`%${id}%`],
        ),
      )
      .execute();
    for (const comment of comments) {
      if (
        !array(object(jsonValue(comment.changes) ?? {}).attachments).includes(
          id,
        )
      )
        continue;
      try {
        await this.get(
          actor,
          asEntity(toText(comment.entity)),
          toText(comment.recordId),
          query,
        );
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }
  async remove(
    actor: Actor,
    entity: Entity,
    id: string,
    tx?: QueryAdapter,
  ): Promise<void> {
    if (!tx)
      return this.mutate(actor, (prepared, query) =>
        this.remove(prepared, entity, id, query),
      );
    const access = await conditions(actor, entity, 'delete');
    const record = await this.get(actor, entity, id, tx, 'delete');
    if (entity === 'leads' && record.status === 'converted')
      throw new CrmError('convertedReadOnly', 409);
    // An approval stays with its applicant while it is theirs to change; an
    // administrator may remove one in any state (a mistaken or test request).
    if (
      entity === 'approvals' &&
      (record.ownerId !== actor.id ||
        !['draft', 'withdrawn'].includes(toText(record.status))) &&
      !(await capability(actor, 'manage', 'settings'))
    )
      throw new CrmError('approvalLocked', 409);
    for (const [child, field] of deletionChecks(entity))
      if (
        await tx
          .selectFrom(definitions[child].table)
          .select('id')
          .where(field, '=', id)
          .executeTakeFirst()
      )
        throw new CrmError('relatedRecords', 409);
    if (entity === 'contacts') {
      // Take the contact out of the lists that mention it, one history row
      // per record touched, and drop the converted lead's pointer to it.
      const now = new Date().toISOString();
      for (const [child, table, field] of [
        ['opportunities', 'crmOpportunities', 'contacts'],
      ] as const) {
        const rows = await tx
          .selectFrom(table)
          .select(['id', field])
          .where('companyId', '=', record.companyId)
          .execute();
        for (const row of rows) {
          const list = array(row[field]);
          const kept = list.filter((v) =>
            typeof v === 'object' ? object(v).contactId !== id : v !== id,
          );
          if (kept.length === list.length) continue;
          await tx
            .updateTable(table)
            .set({ [field]: JSON.stringify(kept), updatedAt: now })
            .where('id', '=', toText(row.id))
            .execute();
          await this.history(
            tx,
            actor,
            child,
            toText(row.id),
            'updated',
            undefined,
            undefined,
            { [field]: kept },
          );
        }
      }
      await tx
        .updateTable('crmLeads')
        .set({ convertedContactId: null })
        .where('convertedContactId', '=', id)
        .execute();
    }
    // A lead's tasks go with it, because a task must keep at least one
    // of lead/company/opportunity: clearing the lead from a task that has no
    // other link would leave a record that fails its own validation and can never
    // be saved again. Tasks with another anchor survive, unlinked.
    if (entity === 'opportunities')
      await tx
        .updateTable('crmLeads')
        .set({ convertedOpportunityId: null })
        .where('convertedOpportunityId', '=', id)
        .execute();
    if (
      entity === 'leads' ||
      entity === 'companies' ||
      entity === 'opportunities'
    ) {
      const own =
        entity === 'leads'
          ? 'leadId'
          : entity === 'companies'
            ? 'companyId'
            : 'opportunityId';
      const others = (['leadId', 'companyId', 'opportunityId'] as const).filter(
        (key) => key !== own,
      );
      const linked = await tx
        .selectFrom('crmTasks')
        .select(['id', 'leadId', 'companyId', 'opportunityId'])
        .where(own, '=', id)
        .execute();
      for (const task of linked) {
        const taskId = toText(task.id);
        if (others.some((key) => task[key])) {
          await tx
            .updateTable('crmTasks')
            .set({ [own]: null, updatedAt: new Date().toISOString() })
            .where('id', '=', taskId)
            .execute();
          await this.history(
            tx,
            actor,
            'tasks',
            taskId,
            'updated',
            undefined,
            undefined,
            { [own]: null },
          );
        } else {
          await tx.deleteFrom('crmTasks').where('id', '=', taskId).execute();
          await this.history(tx, actor, 'tasks', taskId, 'deleted');
        }
      }
    }
    // A task gone is told on each record it belonged to, by name: the
    // task's own history can no longer be read through it.
    if (entity === 'tasks')
      for (const [field, owner] of [
        ['leadId', 'leads'],
        ['companyId', 'companies'],
        ['opportunityId', 'opportunities'],
      ] as const)
        if (record[field])
          await this.history(
            tx,
            actor,
            owner,
            toText(record[field]),
            'taskDeleted',
            undefined,
            undefined,
            {
              taskId: id,
              name: record.name,

              dueAt: record.dueAt,
            },
          );
    await tx
      .deleteFrom(definitions[entity].table)
      .where('id', '=', id)
      .where((eb) => compileFilter(eb, access.scope))
      .execute();
    if (entity === 'leads' || entity === 'contacts')
      await this.whatsappRecords?.removed(tx, entity, id);
    // A company's signals (company-signals.ts) are its own: they go with it.
    if (entity === 'companies') {
      await tx.deleteFrom('crmSignals').where('companyId', '=', id).execute();
      await tx
        .deleteFrom('crmSignalChecks')
        .where('companyId', '=', id)
        .execute();
    }
    await this.history(tx, actor, entity, id, 'deleted');
  }
  async history(
    query: QueryAdapter,
    actor: Actor,
    entity: Entity,
    recordId: string,
    action: string,
    fromValue?: unknown,
    toValue?: unknown,
    changes?: Row,
    // The values the changed fields held before an update.
    previousValues?: Row,
  ): Promise<void> {
    await query
      .insertInto('crmHistory')
      .values({
        id: randomUUID(),
        entity,
        recordId,
        actorId: actor.id,
        action,
        fromValue: fromValue == null ? null : toText(fromValue),
        toValue: toValue == null ? null : toText(toValue),
        changes: JSON.stringify(changes ?? {}),
        previous: previousValues ? JSON.stringify(previousValues) : null,
        source: actor.via ?? null,
        origin: actor.origin ? JSON.stringify(actor.origin) : null,
        createdAt: new Date().toISOString(),
      })
      .execute();
  }
  // Comments: what a person (or the AI, confirmed) writes into a record's
  // activity feed, stored with its history as action 'comment' and the text in
  // `changes`. Anyone who may read the record may add one; only the author
  // may change or remove it, and only while they may still read the record.
  async addComment(
    actor: Actor,
    entity: Entity,
    id: string,
    text: unknown,
    // The colleagues the comment @-mentions, by id; each is told once the comment
    // is saved (mentioned()).
    mentions?: unknown,
    // The comment or reply of the same record it answers: a reply hangs
    // under what it answers, a reply to a reply under that reply.
    replyTo?: unknown,
    // Files uploaded for it, by id, which the record's readers may then
    // open (canReadFile) and its attachments tab lists.
    attachments?: unknown,
  ): Promise<Row> {
    const files = await this.commentFileIds(actor, attachments);
    const body = commentText(text, files.length > 0);
    await this.get(actor, entity, id);
    const mentioned = await this.mentionIds(actor, mentions);
    const thread = replyTo ? await this.thread(entity, id, replyTo) : null;
    const comment = {
      id: randomUUID(),
      entity,
      recordId: id,
      actorId: actor.id,
      action: 'comment',
      fromValue: null,
      toValue: null,
      changes: JSON.stringify(commentChanges(body, mentioned, files)),
      previous: null,
      source: actor.via ?? null,
      origin: actor.origin ? JSON.stringify(actor.origin) : null,
      replyToId: thread?.parentId ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.database.transaction(async ({ query }) => {
      await query.insertInto('crmHistory').values(comment).execute();
      // Writing down what happened with a new lead is working it.
      if (entity === 'leads')
        await this.leadWorked(query, actor, id, comment.createdAt);
    });
    this.mentioned(actor, entity, id, comment.id, mentioned);
    // A reply tells the thread: whoever wrote the comment and whoever replied
    // before, but not whom the reply mentions, who is told so already.
    if (thread)
      for (const recipientId of thread.people.filter(
        (person) => !mentioned.includes(person),
      ))
        void this.queueMessage('comments', {
          entity,
          recordId: id,
          recipientId,
          actorId: actor.id,
          event: 'replied',
          key: `record-notification:${entity}:${id}:replied:${recipientId}:${comment.id}`,
        }).catch(() => undefined);
    return {
      ...comment,
      changes: commentChanges(body, mentioned, files),
      editedAt: null,
    };
  }
  // The files a comment carries: a list of file ids, each one the writer may
  // read (their own upload, or a file already on what they read); those it
  // carried before (`kept`) stay without asking again.
  private async commentFileIds(
    actor: Actor,
    value: unknown,
    kept: readonly string[] = [],
  ): Promise<string[]> {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > LIST_LIMIT)
      throw new CrmError('invalidInput', 400, 'attachments');
    const ids = [...new Set(value.map(toText).filter(Boolean))];
    for (const fileId of ids)
      if (!kept.includes(fileId) && !(await this.canReadFile(actor, fileId)))
        throw new CrmError('notFound', 404, 'attachments');
    return ids;
  }
  // The files on a record's comments and replies, newest first, each with
  // the comment that carries it and who wrote it: the record's attachments
  // tab lists them beside its own.
  // A comment written inside a transaction already open (a plan's steps,
  // plans/engine.ts): plain text with mentions, read through that
  // transaction, the colleagues it names told only once it commits (through
  // the prepared actor's `after`), so a rolled-back rehearsal tells no one.
  async addCommentIn(
    actor: Actor,
    query: QueryAdapter,
    entity: Entity,
    id: string,
    text: unknown,
    mentions?: unknown,
  ): Promise<Row> {
    const body = commentText(text, false);
    await this.get(actor, entity, id, query);
    const active = new Set(
      (actor.users ?? (await this.users(actor)))
        .filter((user) => !user.disabled)
        .map((user) => toText(user.id)),
    );
    const mentioned = [
      ...new Set(
        (Array.isArray(mentions) ? mentions : [])
          .map((person) => toText(person))
          .filter((person) => person && person !== actor.id),
      ),
    ]
      .filter((person) => active.has(person))
      .slice(0, 20);
    const comment = {
      id: randomUUID(),
      entity,
      recordId: id,
      actorId: actor.id,
      action: 'comment',
      fromValue: null,
      toValue: null,
      changes: JSON.stringify(commentChanges(body, mentioned, [])),
      previous: null,
      source: actor.via ?? null,
      origin: actor.origin ? JSON.stringify(actor.origin) : null,
      replyToId: null,
      createdAt: new Date().toISOString(),
    };
    await query.insertInto('crmHistory').values(comment).execute();
    if (entity === 'leads')
      await this.leadWorked(query, actor, id, comment.createdAt);
    actor.after?.(() => {
      this.mentioned(actor, entity, id, comment.id, mentioned);
      return Promise.resolve();
    });
    return {
      ...comment,
      changes: commentChanges(body, mentioned, []),
      editedAt: null,
    };
  }
  async commentFiles(
    actor: Actor,
    entity: Entity,
    id: string,
  ): Promise<{ fileId: string; commentId: string; actorId: string }[]> {
    await this.get(actor, entity, id);
    const rows = await this.database
      .query()
      .selectFrom('crmHistory')
      .select(['id', 'actorId', 'changes', 'createdAt'])
      .where('entity', '=', entity)
      .where('recordId', '=', id)
      .where('action', '=', 'comment')
      .orderBy('createdAt', 'desc')
      .execute();
    return rows.flatMap((row) =>
      array(object(jsonValue(row.changes) ?? {}).attachments).map((fileId) => ({
        fileId: toText(fileId),
        commentId: toText(row.id),
        actorId: toText(row.actorId),
      })),
    );
  }
  // The thread a reply joins: what it answers, which must be a comment or a
  // reply of the same record, and everyone who has written in that thread,
  // from its comment down.
  private async thread(
    entity: Entity,
    recordId: string,
    replyTo: unknown,
  ): Promise<{ parentId: string; people: string[] }> {
    const query = this.database.query();
    const parent = await query
      .selectFrom('crmHistory')
      .select(['id', 'replyToId'])
      .where('id', '=', toText(replyTo))
      .where('entity', '=', entity)
      .where('recordId', '=', recordId)
      .where('action', '=', 'comment')
      .executeTakeFirst();
    if (!parent) throw new CrmError('notFound', 404);
    // Up to the comment the thread hangs from.
    let root = parent;
    for (let depth = 0; root.replyToId && depth < 50; depth += 1) {
      const up = await query
        .selectFrom('crmHistory')
        .select(['id', 'replyToId'])
        .where('id', '=', toText(root.replyToId))
        .executeTakeFirst();
      if (!up) break;
      root = up;
    }
    const writers = await query
      .selectFrom('crmHistory')
      .select('actorId')
      .where('id', 'in', [
        toText(root.id),
        ...(await this.repliesUnder(query, [toText(root.id)])).map((row) =>
          toText(row.id),
        ),
      ])
      .execute();
    return {
      parentId: toText(parent.id),
      people: [
        ...new Set(writers.map((row) => toText(row.actorId)).filter(Boolean)),
      ],
    };
  }
  // Every reply under the given comments, at any depth, oldest first.
  private async repliesUnder(
    query: QueryAdapter,
    ids: readonly string[],
  ): Promise<Row[]> {
    const found: Row[] = [];
    let level = [...ids];
    for (let depth = 0; level.length && depth < 50; depth += 1) {
      const rows = await query
        .selectFrom('crmHistory')
        .selectAll()
        .where('replyToId', 'in', level)
        .where('action', '=', 'comment')
        .execute();
      found.push(...rows);
      level = rows.map((row) => toText(row.id));
    }
    return found.sort(
      (left, right) =>
        toText(left.createdAt).localeCompare(toText(right.createdAt)) ||
        toText(left.id).localeCompare(toText(right.id)),
    );
  }
  // The colleagues a comment may mention: active accounts other than the
  // writer, each once, at most twenty. Whether one may read the record is
  // not asked here: a message to someone who may not is never delivered
  // (deliverNotifications reads the record as its recipient).
  private async mentionIds(actor: Actor, raw: unknown): Promise<string[]> {
    const ids = [
      ...new Set(
        (Array.isArray(raw) ? raw : [])
          .map((id) => toText(id))
          .filter((id) => id && id !== actor.id),
      ),
    ].slice(0, 20);
    if (!ids.length) return [];
    const rows = await this.database
      .query()
      .selectFrom('user')
      .select(['id', 'disabledAt'])
      .where('id', 'in', ids)
      .execute();
    const active = new Set(
      rows.filter((row) => row.disabledAt == null).map((row) => toText(row.id)),
    );
    return ids.filter((id) => active.has(id));
  }
  // Tells each colleague a comment newly mentions, once the comment is saved; the
  // comment's id keys the message, so one mention is one message.
  private mentioned(
    actor: Actor,
    entity: Entity,
    recordId: string,
    commentId: string,
    recipients: readonly string[],
  ): void {
    for (const recipientId of recipients)
      void this.queueMessage('comments', {
        entity,
        recordId,
        recipientId,
        actorId: actor.id,
        event: 'mentioned',
        key: `record-notification:${entity}:${recordId}:mentioned:${recipientId}:${commentId}`,
      }).catch(() => undefined);
  }
  // A new lead turns working once something has been done with it: a task
  // of it completed, a comment written, mail exchanged (mail-timeline.ts).
  // Anything else leaves it as it is.
  async leadWorked(
    query: QueryAdapter,
    actor: Actor,
    leadId: string,
    now: string,
  ): Promise<void> {
    const lead = await query
      .selectFrom('crmLeads')
      .select('status')
      .where('id', '=', leadId)
      .executeTakeFirst();
    if (lead?.status !== 'new') return;
    await query
      .updateTable('crmLeads')
      .set({ status: 'working', updatedAt: now })
      .where('id', '=', leadId)
      .execute();
    await this.history(
      query,
      actor,
      'leads',
      leadId,
      'status',
      'new',
      'working',
    );
  }
  async editComment(
    actor: Actor,
    commentId: string,
    text: unknown,
    mentions?: unknown,
    // Its files as they now stand; left out, they stay as they were.
    attachments?: unknown,
  ): Promise<Row> {
    const comment = await this.ownComment(actor, commentId);
    if (object(jsonValue(comment.changes) ?? {}).deleted)
      throw new CrmError('notFound', 404);
    const editedAt = new Date().toISOString();
    const previous = object(jsonValue(comment.changes) ?? {});
    const had = array(previous.attachments).map(toText);
    const files =
      attachments === undefined
        ? had
        : await this.commentFileIds(actor, attachments, had);
    const body = commentText(text, files.length > 0);
    const mentioned = await this.mentionIds(actor, mentions);
    // Only those the edit adds are told; who was mentioned already was told
    // when they were.
    const before = new Set(
      (Array.isArray(previous.mentions) ? previous.mentions : []).map(toText),
    );
    // The comment changes in place; the feed also says, at the time of the
    // edit, who changed a comment and to what.
    await this.database.transaction(async ({ query }) => {
      await query
        .updateTable('crmHistory')
        .set({
          changes: JSON.stringify(commentChanges(body, mentioned, files)),
          previous: JSON.stringify({ text: toText(previous.text ?? '') }),
          editedAt,
        })
        .where('id', '=', commentId)
        .execute();
      await query
        .insertInto('crmHistory')
        .values({
          id: randomUUID(),
          entity: comment.entity,
          recordId: comment.recordId,
          actorId: actor.id,
          action: 'commentEdited',
          fromValue: null,
          toValue: null,
          // Which comment: the timeline's "edited a comment" leads to it.
          changes: JSON.stringify({ text: body, commentId }),
          previous: null,
          source: actor.via ?? null,
          origin: actor.origin ? JSON.stringify(actor.origin) : null,
          createdAt: editedAt,
        })
        .execute();
    });
    this.mentioned(
      actor,
      asEntity(toText(comment.entity)),
      toText(comment.recordId),
      commentId,
      mentioned.filter((id) => !before.has(id)),
    );
    return {
      ...comment,
      changes: commentChanges(body, mentioned, files),
      editedAt,
    };
  }
  // Removing a comment leaves its place in the feed to say one was removed,
  // by whom and when, without the text its author took back.
  // A comment or a reply with replies under it keeps its place for them: its
  // text goes and it reads as deleted. One without goes, and with it each
  // deleted place above it that is left with nothing under it.
  async removeComment(actor: Actor, commentId: string): Promise<void> {
    const comment = await this.ownComment(actor, commentId);
    const under = await this.database
      .query()
      .selectFrom('crmHistory')
      .select('id')
      .where('replyToId', '=', commentId)
      .execute();
    if (under.length) {
      await this.database
        .query()
        .updateTable('crmHistory')
        .set({
          changes: JSON.stringify({ text: '', deleted: true }),
          previous: null,
          editedAt: new Date().toISOString(),
        })
        .where('id', '=', commentId)
        .execute();
      return;
    }
    await this.database.transaction(async ({ query }) => {
      await query
        .deleteFrom('crmHistory')
        .where('id', '=', commentId)
        .execute();
      if (comment.replyToId) {
        let parentId = toText(comment.replyToId);
        for (let depth = 0; parentId && depth < 50; depth += 1) {
          const parent = await query
            .selectFrom('crmHistory')
            .select(['id', 'changes', 'replyToId'])
            .where('id', '=', parentId)
            .executeTakeFirst();
          const left = await query
            .selectFrom('crmHistory')
            .select('id')
            .where('replyToId', '=', parentId)
            .execute();
          if (
            !parent ||
            left.length ||
            !object(jsonValue(parent.changes) ?? {}).deleted
          )
            break;
          await query
            .deleteFrom('crmHistory')
            .where('id', '=', parentId)
            .execute();
          parentId = toText(parent.replyToId ?? '');
        }
        // A reply's removal is the thread's own affair, not the timeline's.
        return;
      }
      await query
        .insertInto('crmHistory')
        .values({
          id: randomUUID(),
          entity: comment.entity,
          recordId: comment.recordId,
          actorId: actor.id,
          action: 'commentDeleted',
          fromValue: null,
          toValue: null,
          changes: JSON.stringify({}),
          previous: null,
          source: actor.via ?? null,
          origin: actor.origin ? JSON.stringify(actor.origin) : null,
          createdAt: new Date().toISOString(),
        })
        .execute();
    });
  }
  // A comment the actor wrote on a record they may still read; any other
  // entry, or someone else's comment, is refused.
  private async ownComment(actor: Actor, commentId: string): Promise<Row> {
    const comment = await this.database
      .query()
      .selectFrom('crmHistory')
      .selectAll()
      .where('id', '=', commentId)
      .where('action', '=', 'comment')
      .executeTakeFirst();
    if (!comment) throw new CrmError('notFound', 404);
    await this.get(
      actor,
      asEntity(toText(comment.entity)),
      toText(comment.recordId),
    );
    if (comment.actorId !== actor.id) throw new CrmError('forbidden', 403);
    return comment;
  }
  async checkApprover(actor: Actor, id: string): Promise<void> {
    if (id === actor.id) throw new CrmError('selfApproval');
    // The same rule the pickers apply: an active sales manager.
    const users = await this.users(actor);
    if (!users.some((u) => u.id === id && !u.disabled && u.canApprove))
      throw new CrmError('invalidApprover');
  }
  async approvalAction(
    actor: Actor,
    id: string,
    action: string,
    comment = '',
    tx?: QueryAdapter,
  ): Promise<CrmRecord> {
    if (!tx)
      return this.mutate(actor, (prepared, query) =>
        this.approvalAction(prepared, id, action, comment, query),
      );
    const record = await this.get(actor, 'approvals', id, tx);
    const now = new Date().toISOString();
    let status: string;
    if (action === 'submit') {
      if (
        record.ownerId !== actor.id ||
        !['draft', 'withdrawn'].includes(toText(record.status))
      )
        throw new CrmError('approvalLocked', 409);
      await this.get(
        actor,
        'opportunities',
        toText(record.opportunityId),
        tx,
        'update',
      );
      if (!record.approverId) throw new CrmError('required', 400, 'approverId');
      await this.checkApprover(actor, toText(record.approverId));
      status = 'pending';
    } else if (action === 'withdraw') {
      if (record.ownerId !== actor.id || record.status !== 'pending')
        throw new CrmError('approvalLocked', 409);
      status = 'withdrawn';
    } else {
      if (!['approve', 'reject'].includes(action))
        throw new CrmError('invalidInput');
      await requireCapability(actor, 'approve');
      if (
        record.approverId !== actor.id ||
        record.ownerId === actor.id ||
        record.status !== 'pending'
      )
        throw new CrmError('forbidden', 403);
      status = action === 'approve' ? 'approved' : 'rejected';
    }
    // The state moves by the approvals' lifecycle (server/lifecycles/
    // approvals.ts), in this transaction: it writes the status with the
    // dates and comment the transition sets, logs the transition, and
    // refuses one the approval was moved past meanwhile.
    if (!actor.transaction)
      throw new Error('An approval moves only within CrmService.mutate.');
    try {
      await this.lifecycles.fire(APPROVAL_LIFECYCLE, id, action, {
        actor: { id: actor.id },
        input: ['approve', 'reject'].includes(action) ? { comment } : {},
        transaction: actor.transaction,
      });
    } catch (error) {
      throw lifecycleRefusal(error);
    }
    // A decision's comment is told on its entry in the timeline, where the
    // approval page shows it.
    const decisionComment = ['approve', 'reject'].includes(action)
      ? comment.slice(0, 10000).trim()
      : '';
    await this.history(
      tx,
      actor,
      'approvals',
      id,
      'status',
      record.status,
      status,
      decisionComment ? { decisionComment } : undefined,
    );
    // Decided or withdrawn, a review still waiting has nothing left to
    // decide (approval-review.ts); a review's own decision marks it after.
    // It keeps what became of the approval, by whom and when, so the
    // approver's Waiting on me still shows it, among those handled, rather
    // than losing it without a word.
    if (status !== 'pending')
      for (const row of await tx
        .selectFrom('crmHistory')
        .select(['id', 'ai'])
        .where('entity', '=', 'approvals')
        .where('recordId', '=', id)
        .where('action', '=', 'ai')
        .where('aiStatus', 'in', ['pending', 'running'])
        .execute())
        await tx
          .updateTable('crmHistory')
          .set({
            aiStatus: 'superseded',
            ai: JSON.stringify({
              ...((jsonValue(row.ai) ?? {}) as Row),
              approvalOutcome: status,
              retiredAt: now,
              retiredById: actor.id,
            }),
          })
          .where('id', '=', row.id)
          .execute();
    const changed = await this.get(actor, 'approvals', id, tx);
    // The message is queued once the change is committed: a submission or
    // withdrawal to the approver, a decision to the applicant.
    this.afterCommit(actor, () => this.notifyApproval(actor, changed));
    // A withdrawal counts too: it may be the last of those submitted
    // together to leave the queue (index.ts follows the deal up then).
    if (['approved', 'rejected', 'withdrawn'].includes(status) && !actor.quiet)
      this.afterCommit(actor, async () =>
        this.approvalDecided?.(actor, changed),
      );
    if (status === 'pending' && !actor.quiet)
      this.afterCommit(actor, async () =>
        this.approvalSubmitted?.(actor, changed),
      );
    return changed;
  }
  // Runs work once the current transaction has committed; a caller that
  // supplied its own transaction without a hook gets it run at once.
  private afterCommit(actor: Actor, work: () => Promise<unknown>): void {
    if (actor.after) actor.after(() => work().then(() => undefined));
    else void work();
  }
  // Every message the CRM sends: queued in crmOutbox, which CrmProvider's
  // delivery pass sends as in-app notifications. A message is queued once
  // the change that caused it has committed, keyed so the same message is
  // never queued twice, and not at all to whoever made the change, for a
  // record that is gone, or while the settings switch its kind off. These
  // were workflows of the workflow plugin until the template stopped
  // enabling the plugin (1.0.0-beta.58); the rules are the same.
  private async queueMessage(
    kind: NotificationKind,
    message: {
      entity: Entity;
      recordId: string;
      recipientId: string;
      actorId: string;
      event: string;
      key: string;
    },
  ): Promise<boolean> {
    if (!message.recipientId || message.recipientId === message.actorId)
      return false;
    if (!(await this.settings())[notificationSwitches[kind]]) return false;
    const query = this.database.query();
    const record = await query
      .selectFrom(definitions[message.entity].table)
      .select(['id', 'name'])
      .where('id', '=', message.recordId)
      .executeTakeFirst();
    if (!record) return false;
    return this.enqueue(
      query,
      { id: message.actorId },
      message.entity,
      record,
      message.recipientId,
      message.event,
      message.key,
    );
  }
  // A submission or withdrawal to the approver, a decision to the
  // applicant.
  async notifyApproval(actor: Actor, record: CrmRecord): Promise<boolean> {
    const event = toText(record.status);
    if (!approvalEvents.includes(event)) return false;
    const approvalId = toText(record.id);
    return this.queueMessage('approvals', {
      entity: 'approvals',
      recordId: approvalId,
      recipientId: ['pending', 'withdrawn'].includes(event)
        ? toText(record.approverId)
        : toText(record.ownerId),
      actorId: actor.id,
      event,
      key: `approval-notification:${approvalId}:${event}:${toText(record.updatedAt)}`,
    });
  }
  // A record changing hands, and a task's internal participants being
  // invited, removed, rescheduled or told of a cancellation.
  async notifyRecord(
    actor: Actor,
    entity: Entity,
    record: Row,
    recipientId: string,
    event: string,
  ): Promise<boolean> {
    const recordId = toText(record.id);
    return this.queueMessage('recordChanges', {
      entity,
      recordId,
      recipientId,
      actorId: actor.id,
      event,
      key: `record-notification:${entity}:${recordId}:${event}:${recipientId}:${toText(record.updatedAt)}`,
    });
  }
  // A company signal (company-signals.ts), to someone who sells to the
  // company, once per signal and person.
  async notifySignal(
    companyId: string,
    signalId: string,
    recipientId: string,
  ): Promise<boolean> {
    return this.queueMessage('recordChanges', {
      entity: 'companies',
      recordId: companyId,
      recipientId,
      actorId: 'system',
      event: 'signal',
      key: `signal:${signalId}:${recipientId}`,
    });
  }
  // A task about to start, to its owner and each internal participant; the
  // key is the reminder's identity, so a scan that sees the same task again
  // queues nothing new.
  async remindTask(task: Row, recipientId: string): Promise<boolean> {
    const taskId = toText(task.id);
    const dueAt = toText(task.dueAt);
    return this.queueMessage('taskReminders', {
      entity: 'tasks',
      recordId: taskId,
      recipientId,
      actorId: 'system',
      event: 'starting',
      key: `task:${taskId}:${dueAt}:${recipientId}`,
    });
  }
  async enqueue(
    query: QueryAdapter,
    actor: Pick<Actor, 'id'>,
    entity: Entity,
    record: Row,
    recipientId: string,
    event: string,
    key?: string,
  ): Promise<boolean> {
    if (!recipientId || recipientId === actor.id) return false;
    const id = key ?? randomUUID();
    if (
      await query
        .selectFrom('crmOutbox')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()
    )
      return false;
    try {
      await query
        .insertInto('crmOutbox')
        .values({
          id,
          recipientId,
          entity,
          recordId: record.id,
          name: record.name,
          event,
          // Who caused it, for the inbox to say; none for the system's own.
          actorId: actor.id && actor.id !== 'system' ? actor.id : null,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        .execute();
    } catch (error) {
      // A keyed reminder raced another scan of the same row: the message
      // is already queued, which is the outcome wanted.
      if (!/UNIQUE|PRIMARYKEY|duplicate/i.test(String(error))) throw error;
      return false;
    }
    return true;
  }
  private async recordNotifications(
    query: QueryAdapter,
    actor: Actor,
    entity: Entity,
    record: Row,
    previous?: Row,
  ): Promise<void> {
    // Only a change of hands is worth a message; edits to a record by
    // someone else are visible in its history and were noise as alerts.
    // Each message is queued once this transaction has committed; a
    // message to whoever made the change is not sent.
    const messages: [string, string][] = [];
    if (previous?.ownerId !== record.ownerId)
      messages.push([toText(record.ownerId), 'assigned']);
    if (entity === 'tasks') {
      const before = array(previous?.internalParticipants);
      const after = array(record.internalParticipants);
      for (const user of new Set([...before, ...after])) {
        const event = !after.includes(user)
          ? 'removed'
          : !before.includes(user)
            ? 'invited'
            : record.status === 'cancelled'
              ? 'cancelled'
              : record.dueAt !== previous?.dueAt
                ? 'rescheduled'
                : '';
        if (event) messages.push([toText(user), event]);
      }
    }
    const saved = await query
      .selectFrom(definitions[entity].table)
      .select(['id', 'updatedAt'])
      .where('id', '=', record.id)
      .executeTakeFirst();
    for (const [recipientId, event] of messages)
      if (recipientId && recipientId !== actor.id)
        this.afterCommit(actor, () =>
          this.notifyRecord(
            actor,
            entity,
            { ...record, updatedAt: saved?.updatedAt ?? record.updatedAt },
            recipientId,
            event,
          ),
        );
  }
}
// Whether a field kept its value through a save: instants compare as the
// same moment, and JSON values (participants, contact roles) by content.
function sameValue(before: unknown, after: unknown): boolean {
  const plain = (value: unknown): unknown =>
    value instanceof Date ? value.toISOString() : (value ?? null);
  return JSON.stringify(plain(before)) === JSON.stringify(plain(after));
}
export function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// A transition the approvals' lifecycle refused, in the CRM's own terms, as
// the checks before it answer: a guard's refusal by the code it gives (an
// applicant's lock, an approver's place, the approver to choose), a state
// the approval has left as locked, a concurrent change as a conflict.
// CrmService.approvalAction checks first, so these are what slipped past.
function lifecycleRefusal(error: unknown): unknown {
  if (!(error instanceof LifecycleError)) return error;
  const code = error.blockers[0]?.code;
  if (error.code === 'GUARD_REJECTED')
    return code === 'required'
      ? new CrmError('required', 400, 'approverId')
      : code === 'approvalLocked'
        ? new CrmError('approvalLocked', 409)
        : new CrmError('forbidden', 403);
  if (error.code === 'INVALID_STATE')
    return new CrmError('approvalLocked', 409);
  if (error.code === 'CONFLICT') return new CrmError('conflict', 409);
  if (error.code === 'RECORD_NOT_FOUND') return new CrmError('notFound', 404);
  return error;
}
