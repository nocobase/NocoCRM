import { LIST_LIMIT, lengthLimit } from './limits.js';
import type { WorkflowServiceContract } from '@nocobase/app-plugin-workflow/server';
import { decodeRow, encodeRow, jsonValue } from './values.js';
import {
  DATABASE_ORDERS,
  ORDER_IN_MEMORY_LIMIT,
  orderKey,
  orderKind,
  orderRecords,
} from './list-order.js';
import { resolveTitles } from './titles.js';
import {
  hasCurrency,
  summarizeRows,
  SUMMARY_ROW_LIMIT,
  validateSummary,
  type Summary,
  type SummaryRequest,
} from './summary.js';
import { toText } from './schema.js';
import { CRM_ASSISTANT } from '../../ai/employees/crm-assistant.js';
import { isCountry, isSubdivision, subdivisionCode } from './geography.js';
import { randomUUID } from 'node:crypto';
import type { DatabaseManager, QueryAdapter, Row } from '@nocobase/db';
import type { AppAuthorizationService } from '@nocobase/app-plugin-authorization/server';
import {
  assertFields,
  capability,
  compileFilter,
  conditions,
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
  definitions,
  entities,
  fieldsFor,
  object,
  type CrmRecord,
  type CrmSettings,
  type Entity,
} from './schema.js';

// The approval statuses that carry a message, named by the status.
const approvalEvents = ['pending', 'withdrawn', 'approved', 'rejected'];

export interface ListOptions {
  search?: string;
  status?: string;
  ownerId?: string;
  accountId?: string;
  leadId?: string;
  opportunityId?: string;
  contactId?: string;
  source?: string;
  // "true" / "false": contacts by whether they are still at the account.
  employed?: string;
  // Activities a user is an internal participant of (their id).
  participantId?: string;
  topic?: string;
  approverId?: string;
  from?: string;
  to?: string;
  // Activities by when they happen (ISO instants), for the calendar's month.
  startFrom?: string;
  startTo?: string;
  // Everything but this status: a picker that must not offer converted leads.
  excludeStatus?: string;
  // Activities a user runs or takes part in: their own agenda.
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
// A detail page's related lists and history come this many at a time.
export const RELATED_PAGE = 20;
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
  // Activities are not listed for accounts: they are handled like a lead's,
  // deleted when the account was their only anchor and unlinked otherwise.
  // Contacts have no blockers: the places that mention one (an opportunity's
  // contact list, an activity's participants, a converted lead's pointer)
  // are cleaned up by remove() instead, since none of them needs the contact
  // to stay valid.
  return entity === 'accounts'
    ? [
        ['contacts', 'accountId'],
        ['opportunities', 'accountId'],
        ['leads', 'convertedAccountId'],
      ]
    : entity === 'opportunities'
      ? // Only approvals block: they are an audit trail that cannot follow
        // the deal out. Activities cascade or unlink as they do for an
        // account; a converted lead's pointer is cleared.
        [['approvals', 'opportunityId']]
      : [];
}

// The roles that may own records; see save().
const sellerRoles = ['sales-representative', 'sales-manager'];

export class CrmService {
  constructor(
    public readonly database: DatabaseManager,
    public readonly authz: AppAuthorizationService,
    // The workflow service, looked up when needed because it is registered
    // after this one; absent in tests and in an application without the
    // workflow plugin, which then does the follow-through directly.
    private readonly workflows: () =>
      WorkflowServiceContract | undefined = () => undefined,
  ) {}
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
    return {
      ...defaultSettings,
      ...stored,
      options: defaultSettings.options,
    };
  }
  // Whether the CRM's AI employee is switched on: its Enabled switch on the
  // AI Employee plugin's settings page is the assistant's only on/off, so
  // the pages show the assistant's entries only when the plugin would
  // answer. Without the plugin's table (an application without it, the
  // tests) there is no assistant.
  async assistantEnabled(
    query: QueryAdapter = this.database.query(),
  ): Promise<boolean> {
    try {
      const row = await query
        .selectFrom('aiEmployees')
        .select('enabled')
        .where('username', '=', CRM_ASSISTANT)
        .executeTakeFirst();
      return Boolean(row?.enabled);
    } catch {
      return false;
    }
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
    // Work registered during the transaction (the workflows a change
    // starts) runs once it has committed, so a workflow reads what the
    // change wrote and a rolled-back change starts nothing.
    const afterCommit: (() => Promise<void>)[] = [];
    prepared.after = (callback) => {
      afterCommit.push(callback);
    };
    const result = await this.database.transaction(({ query }) =>
      fn(prepared, query),
    );
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
            // The assistant is the AI Employee plugin's: its business
            // guidance is in the employee's role (server/ai) and its model
            // is chosen on the plugin's own settings page.
            'aiInstructions',
            'aiService',
            'aiModel',
            // Switched on and off as the employee itself (assistantEnabled).
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
    for (const key of [
      'activityReminderMinutes',
      'closeReminderDays',
      'leadStaleDays',
      'staleDays',
    ] as const)
      if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 525600)
        throw new CrmError('invalidInput', 400, key);
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
    return users.map((user) => {
      // In the roles' own order, whatever order the sets were assigned in.
      const held = new Set(
        assignments
          .filter((a) => a.subject.type === 'user' && a.subject.id === user.id)
          .map((a) => roleOf(a.permissionSet)),
      );
      const userRoles = roles.filter((role) => held.has(role));
      return {
        id: user.id,
        name: user.name,
        username: user.username ?? null,
        email: user.email,
        roles: userRoles,
        // Disabled at the account, on the Users page: such a user cannot
        // sign in, and is not offered as an owner or approver either.
        disabled: disabled.has(toText(user.id)),
        // An approver is a sales manager. Administrators hold the approve
        // right for the system's sake, but deciding commercial terms is the
        // manager's job, so they are not offered and not accepted.
        canApprove: userRoles.includes('sales-manager'),
      };
    });
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
      'accountId',
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
    if (options.excludeStatus && definition.statusField)
      select = select.where(
        definition.statusField,
        '!=',
        options.excludeStatus,
      );
    if (entity === 'activities') {
      if (options.startFrom)
        select = select.where('startAt', '>=', options.startFrom);
      if (options.startTo)
        select = select.where('startAt', '<=', options.startTo);
    }
    if (
      (options.employed === 'true' || options.employed === 'false') &&
      fieldsFor(entity).includes('employed')
    )
      select = select.where('employed', '=', options.employed === 'true');
    // Participants are a JSON array of ids; the quoted id is what marks
    // membership, so a prefix of another id cannot match.
    if (options.participantId && entity === 'activities')
      select = select.where(
        'internalParticipants',
        'like',
        `%"${options.participantId.replace(/[%_"]/g, '')}"%`,
      );
    if (options.involvedId && entity === 'activities') {
      const id = options.involvedId;
      select = select.where((eb) =>
        eb.or([
          eb('ownerId', '=', id),
          eb('internalParticipants', 'like', `%"${id.replace(/[%_"]/g, '')}"%`),
        ]),
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
      const searchFields = ['name', 'company', 'email', 'phone'].filter((f) =>
        fields.includes(f),
      );
      select = select.where((eb) =>
        eb.or(
          searchFields.map((f) =>
            eb(f, 'like', `%${toText(options.search!.slice(0, 200))}%`),
          ),
        ),
      );
    }
    return { select, fields };
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
          .select(['id', sortField])
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
      const records = await select
        .orderBy(sortField, direction)
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
      ? all.filter((r) =>
          entity === 'activities'
            ? array(r.externalParticipants).includes(options.contactId)
            : array(r.contacts).some(
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
  // A record's change history, newest first, a page at a time, with the
  // fields the reader may not see left out of each entry.
  async historyOf(
    actor: Actor,
    entity: Entity,
    id: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<{ data: Row[]; total: number; page: number; pageSize: number }> {
    await this.get(actor, entity, id);
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
    const count = await query
      .selectFrom('crmHistory')
      .select((eb) => [eb.fn.countAll().as('total')])
      .where('entity', '=', entity)
      .where('recordId', '=', id)
      .executeTakeFirst();
    const data = (
      await query
        .selectFrom('crmHistory')
        .selectAll()
        .where('entity', '=', entity)
        .where('recordId', '=', id)
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'asc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute()
    ).map((event) => ({
      ...event,
      changes: Object.fromEntries(
        Object.entries(object(jsonValue(event.changes) ?? {})).filter(([key]) =>
          readable.includes(key),
        ),
      ),
      // Null for entries written before earlier values were kept.
      previous:
        event.previous == null
          ? null
          : Object.fromEntries(
              Object.entries(object(jsonValue(event.previous) ?? {})).filter(
                ([key]) => readable.includes(key),
              ),
            ),
      ...(!readable.includes(definitions[entity].statusField ?? '')
        ? { fromValue: null, toValue: null }
        : {}),
    }));
    return { data, total: Number(count?.total ?? 0), page, pageSize };
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
        : entity === 'accounts'
          ? { accountId: id }
          : entity === 'opportunities'
            ? { opportunityId: id }
            : entity === 'contacts'
              ? { contactId: id }
              : {};
    if (['leads', 'accounts', 'contacts', 'opportunities'].includes(entity))
      await firstPage('activities', { ...link, sort: '-startAt' });
    if (entity === 'accounts') {
      await firstPage('contacts', { accountId: id });
      await firstPage('opportunities', { accountId: id });
    }
    // Where the object came from: the leads whose conversion produced it.
    // Read for the "converted from" line, and on accounts for the delete check.
    const convertedBy: Partial<Record<Entity, string>> = {
      accounts: 'convertedAccountId',
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
      // The people a deal can involve come from its account; the page
      // offers the first of them and asks for more on demand.
      if (record.accountId)
        await firstPage('contacts', { accountId: toText(record.accountId) });
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
    // and activities that list it. Counted by reading, as the lists are JSON.
    const unlinks: Partial<Record<Entity, number>> = {};
    if (canDelete && entity === 'contacts') {
      const query = this.database.query();
      for (const [child, table, field] of [
        ['opportunities', 'crmOpportunities', 'contacts'],
        ['activities', 'crmActivities', 'externalParticipants'],
      ] as const) {
        const rows = await query
          .selectFrom(table)
          .select(field)
          .where('accountId', '=', record.accountId)
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
        : entity === 'accounts'
          ? { status: 'prospect' }
          : entity === 'contacts'
            ? { employed: true, gender: 'unknown' }
            : entity === 'opportunities'
              ? {
                  stage: 'contact',
                  currency: settings.currency,
                  contacts: [],
                }
              : entity === 'activities'
                ? {
                    status: 'planned',
                    type: 'call',
                    internalParticipants: [],
                    externalParticipants: [],
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
    if (!input.name && entity === 'opportunities' && input.accountId)
      input.name = (
        await this.get(actor, 'accounts', toText(input.accountId), tx)
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
        value = value.trim();
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
          field.key === 'type' && entity === 'accounts'
            ? 'accountType'
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
          // A name ("江西省", "Jiangxi") is taken for its code.
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
      entity === 'accounts' &&
      input.status === 'churned' &&
      !input.churnReason
    )
      throw new CrmError('required', 400, 'churnReason');
    if (input.accountId)
      await this.get(actor, 'accounts', toText(input.accountId), tx);
    if (
      entity === 'contacts' &&
      previous?.accountId !== input.accountId &&
      previous
    ) {
      const used = await tx
        .selectFrom('crmOpportunities')
        .select('contacts')
        .where('accountId', '=', previous.accountId)
        .execute();
      if (
        used.some((r) =>
          array(r.contacts).some((c) => object(c).contactId === id),
        )
      )
        throw new CrmError('relatedRecords', 409);
      const activities = await tx
        .selectFrom('crmActivities')
        .select('externalParticipants')
        .where('accountId', '=', previous.accountId)
        .execute();
      if (activities.some((r) => array(r.externalParticipants).includes(id)))
        throw new CrmError('relatedRecords', 409);
    }
    if (entity === 'opportunities') {
      if (!/^[A-Z]{3}$/.test(toText(input.currency)))
        throw new CrmError('invalidInput', 400, 'currency');
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
        if (linked.accountId !== input.accountId)
          throw new CrmError('accountMismatch');
      }
      // A contact on an opportunity carries its role and nothing else.
      input.contacts = contacts.map((value) => {
        const contact = object(value);
        return { contactId: contact.contactId, role: contact.role };
      });
      if (
        previous &&
        previous.accountId !== input.accountId &&
        (await tx
          .selectFrom('crmActivities')
          .select('id')
          .where('opportunityId', '=', id)
          .executeTakeFirst())
      )
        throw new CrmError('relatedRecords', 409);
      if (previous?.stage !== input.stage) {
        input.closedAt = ['won', 'lost'].includes(toText(input.stage))
          ? now
          : null;
        if (input.stage === 'won') {
          const account = await this.get(
            actor,
            'accounts',
            toText(input.accountId),
            tx,
          );
          await tx
            .updateTable('crmAccounts')
            .set({ status: 'customer', updatedAt: now })
            .where('id', '=', input.accountId)
            .execute();
          if (account.status !== 'customer')
            await this.history(
              tx,
              actor,
              'accounts',
              toText(input.accountId),
              'status',
              account.status,
              'customer',
            );
        }
      }
    }
    if (entity === 'activities') {
      if (!input.leadId && !input.accountId && !input.opportunityId)
        throw new CrmError('activityRelation');
      if (new Date(toText(input.endAt)) < new Date(toText(input.startAt)))
        throw new CrmError('endBeforeStart');
      if (input.opportunityId) {
        const opp = await this.get(
          actor,
          'opportunities',
          toText(input.opportunityId),
          tx,
        );
        if (input.accountId && opp.accountId !== input.accountId)
          throw new CrmError('accountMismatch');
        input.accountId = opp.accountId;
      }
      if (input.leadId) {
        const lead = await this.get(actor, 'leads', toText(input.leadId), tx);
        if (
          lead.status === 'converted' &&
          (!previous || previous.leadId !== input.leadId)
        )
          throw new CrmError('convertedReadOnly');
        if (!id && lead.status === 'new') {
          await tx
            .updateTable('crmLeads')
            .set({ status: 'working', updatedAt: now })
            .where('id', '=', input.leadId)
            .where('status', '=', 'new')
            .execute();
          await this.history(
            tx,
            actor,
            'leads',
            toText(input.leadId),
            'status',
            'new',
            'working',
          );
        }
      }
      for (const contactId of array(input.externalParticipants)) {
        const contact = await this.get(
          actor,
          'contacts',
          toText(contactId),
          tx,
        );
        if (!input.accountId || contact.accountId !== input.accountId)
          throw new CrmError('accountMismatch');
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
    if (id) {
      const result = await tx
        .updateTable(definitions[entity].table)
        .set(encodeRow(values))
        .where('id', '=', id)
        .where('updatedAt', '=', previous!.updatedAt)
        .where((eb) => compileFilter(eb, access.scope))
        .execute();
      if (!result.updatedCount) throw new CrmError('conflict', 409);
    } else
      await tx
        .insertInto(definitions[entity].table)
        .values(encodeRow(values))
        .execute();
    // An account has at most one primary contact: marking this one clears the
    // flag on its siblings in the same transaction, so the star on the account
    // page moves rather than multiplies.
    if (entity === 'contacts' && input.primary && input.accountId)
      await tx
        .updateTable('crmContacts')
        .set({ primary: false })
        .where('accountId', '=', toText(input.accountId))
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
        ['activities', 'crmActivities', 'externalParticipants'],
      ] as const) {
        const rows = await tx
          .selectFrom(table)
          .select(['id', field])
          .where('accountId', '=', record.accountId)
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
    // A lead's activities go with it, because an activity must keep at least one
    // of lead/account/opportunity: clearing the lead from an activity that has no
    // other link would leave a record that fails its own validation and can never
    // be saved again. Activities with another anchor survive, unlinked.
    if (entity === 'opportunities')
      await tx
        .updateTable('crmLeads')
        .set({ convertedOpportunityId: null })
        .where('convertedOpportunityId', '=', id)
        .execute();
    if (
      entity === 'leads' ||
      entity === 'accounts' ||
      entity === 'opportunities'
    ) {
      const own =
        entity === 'leads'
          ? 'leadId'
          : entity === 'accounts'
            ? 'accountId'
            : 'opportunityId';
      const others = (['leadId', 'accountId', 'opportunityId'] as const).filter(
        (key) => key !== own,
      );
      const linked = await tx
        .selectFrom('crmActivities')
        .select(['id', 'leadId', 'accountId', 'opportunityId'])
        .where(own, '=', id)
        .execute();
      for (const activity of linked) {
        const activityId = toText(activity.id);
        if (others.some((key) => activity[key])) {
          await tx
            .updateTable('crmActivities')
            .set({ [own]: null, updatedAt: new Date().toISOString() })
            .where('id', '=', activityId)
            .execute();
          await this.history(
            tx,
            actor,
            'activities',
            activityId,
            'updated',
            undefined,
            undefined,
            { [own]: null },
          );
        } else {
          await tx
            .deleteFrom('crmActivities')
            .where('id', '=', activityId)
            .execute();
          await this.history(tx, actor, 'activities', activityId, 'deleted');
        }
      }
    }
    await tx
      .deleteFrom(definitions[entity].table)
      .where('id', '=', id)
      .where((eb) => compileFilter(eb, access.scope))
      .execute();
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
        createdAt: new Date().toISOString(),
      })
      .execute();
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
    const changes = {
      status,
      updatedAt: now,
      ...(action === 'submit'
        ? { submittedAt: now, decisionComment: null, decidedAt: null }
        : ['approve', 'reject'].includes(action)
          ? { decisionComment: comment.slice(0, 10000), decidedAt: now }
          : {}),
    };
    const result = await tx
      .updateTable('crmApprovals')
      .set(changes)
      .where('id', '=', id)
      .where('status', '=', record.status)
      .where('updatedAt', '=', record.updatedAt)
      .execute();
    if (!result.updatedCount) throw new CrmError('conflict', 409);
    await this.history(
      tx,
      actor,
      'approvals',
      id,
      'status',
      record.status,
      status,
    );
    const changed = await this.get(actor, 'approvals', id, tx);
    // The message goes out through the approval-notification workflow once
    // the change is committed: a submission or withdrawal to the approver,
    // a decision to the applicant.
    this.afterCommit(actor, () => this.notifyApproval(actor, changed));
    return changed;
  }
  // Runs work once the current transaction has committed; a caller that
  // supplied its own transaction without a hook gets it run at once.
  private afterCommit(actor: Actor, work: () => Promise<unknown>): void {
    if (actor.after) actor.after(() => work().then(() => undefined));
    else void work();
  }
  // The workflows the CRM starts. Every message the CRM sends goes through
  // one of them, started once the change that caused it is committed, so
  // each message leaves an inspectable run. They are the only senders:
  // without the workflow service, or with a workflow not deployed or not
  // enabled, nothing is sent.
  private async trigger(
    workflow: string,
    input: Record<string, string | null>,
    eventKey: string,
  ): Promise<
    Awaited<ReturnType<WorkflowServiceContract['trigger']>> | undefined
  > {
    const workflows = this.workflows();
    if (!workflows) return undefined;
    return workflows.trigger(workflow, input, { eventKey });
  }
  // "approval-notification": a submission or withdrawal to the approver, a
  // decision to the applicant.
  async notifyApproval(
    actor: Actor,
    record: CrmRecord,
  ): Promise<
    Awaited<ReturnType<WorkflowServiceContract['trigger']>> | undefined
  > {
    const event = toText(record.status);
    if (!approvalEvents.includes(event)) return undefined;
    const approvalId = toText(record.id);
    const at = toText(record.updatedAt);
    return this.trigger(
      'approval-notification',
      {
        approvalId,
        event,
        recipientId: ['pending', 'withdrawn'].includes(event)
          ? toText(record.approverId)
          : toText(record.ownerId),
        actorId: actor.id,
        at,
        opportunityId: record.opportunityId
          ? toText(record.opportunityId)
          : null,
      },
      `approval-notification:${approvalId}:${event}:${at}`,
    );
  }
  // "record-notification": a record changing hands, and an activity's
  // internal participants being invited, removed, rescheduled or told of
  // a cancellation.
  async notifyRecord(
    actor: Actor,
    entity: Entity,
    record: Row,
    recipientId: string,
    event: string,
  ): Promise<
    Awaited<ReturnType<WorkflowServiceContract['trigger']>> | undefined
  > {
    const recordId = toText(record.id);
    const at = toText(record.updatedAt);
    return this.trigger(
      'record-notification',
      { entity, recordId, recipientId, actorId: actor.id, event, at },
      `record-notification:${entity}:${recordId}:${event}:${recipientId}:${at}`,
    );
  }
  // "activity-reminder": an activity about to start, to its owner and each
  // internal participant; the event key is the reminder's identity, so a
  // scan that sees the same activity again starts nothing new.
  async remindActivity(
    activity: Row,
    recipientId: string,
  ): Promise<
    Awaited<ReturnType<WorkflowServiceContract['trigger']>> | undefined
  > {
    const activityId = toText(activity.id);
    const startAt = toText(activity.startAt);
    return this.trigger(
      'activity-reminder',
      { activityId, recipientId, startAt },
      `activity:${activityId}:${startAt}:${recipientId}`,
    );
  }
  async enqueue(
    query: QueryAdapter,
    actor: Pick<Actor, 'id'>,
    entity: Entity,
    record: Row,
    recipientId: string,
    event: string,
    key?: string,
  ): Promise<void> {
    if (!recipientId || recipientId === actor.id) return;
    const id = key ?? randomUUID();
    if (
      await query
        .selectFrom('crmOutbox')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()
    )
      return;
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
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        .execute();
    } catch (error) {
      // A keyed reminder raced another scan of the same row: the message
      // is already queued, which is the outcome wanted.
      if (!/UNIQUE|PRIMARYKEY|duplicate/i.test(String(error))) throw error;
    }
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
    // Each message is a record-notification workflow run, started once
    // this transaction has committed; a message to whoever made the
    // change is not sent.
    const messages: [string, string][] = [];
    if (previous?.ownerId !== record.ownerId)
      messages.push([toText(record.ownerId), 'assigned']);
    if (entity === 'activities') {
      const before = array(previous?.internalParticipants);
      const after = array(record.internalParticipants);
      for (const user of new Set([...before, ...after])) {
        const event = !after.includes(user)
          ? 'removed'
          : !before.includes(user)
            ? 'invited'
            : record.status === 'cancelled'
              ? 'cancelled'
              : record.startAt !== previous?.startAt ||
                  record.endAt !== previous?.endAt
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
