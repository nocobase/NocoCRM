import { defineTools } from '@nocobase/ai-employee';
import type { AppAuthorization } from '@nocobase/app-plugin-authorization/server';
import type { Row } from '@nocobase/db';
import { capability, type Actor } from '../../providers/crm/authorization.js';
import {
  asEntity,
  CrmError,
  entities,
  toText,
} from '../../providers/crm/schema.js';
import type { CrmService, ListOptions } from '../../providers/crm/service.js';
import {
  groupRelation,
  summaryPeriods,
  type SummaryPeriod,
} from '../../providers/crm/summary.js';
import { resolveTitles } from '../../providers/crm/titles.js';
import { accessLines } from '../screen.js';

// The CRM's read tools for the AI employee: the two reads the CRM assistant
// always had and the user list, registered with the AI Employee plugin.
// Every read goes through CrmService with an actor built from the signed-in
// user the plugin hands over, so a tool can never reach a record that user
// could not open in the UI. A refusal ends the call with the CRM's error
// body, which the model reads like any other tool error; the turn goes on.

// A tool answers into the model's context, so an oversized page would undo
// the point of fetching on demand.
const MAX_PAGE_SIZE = 50;

// A refusal or a rule the CRM applied (a record this user may not see, a
// field they may not set, a state that rules the step out). It is thrown
// rather than returned: the plugin records a thrown error as the call's
// result and shows it to the model and the conversation, whereas a result
// object with status "error" is left pending. The message is the CRM's
// error body, which the model reads and the CRM's card renders.
export function refuse(cause: unknown): never {
  throw new Error(
    JSON.stringify(
      cause instanceof CrmError
        ? { error: cause.code, field: cause.field, detail: cause.detail }
        : { error: 'serverError' },
    ),
  );
}

// Runs one tool body under the CRM's rules: success returns its content,
// a refusal becomes the call's error.
export async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    return refuse(cause);
  }
}

export function actorFrom(
  authz: Pick<AppAuthorization, 'for'>,
  ctx: unknown,
): Actor {
  const given = (ctx as { actor?: ToolActor } | undefined)?.actor;
  if (!given || given.id === undefined || given.id === null || given.id === '')
    throw new Error('The CRM tools need the signed-in user.');
  return crmActor(authz, given);
}

const entityProperty = {
  type: 'string',
  enum: entities,
  description: 'Which CRM object to read.',
};

export interface ToolActor {
  id: string | number;
  locale?: string;
}

function text(value: unknown): string | undefined {
  const out = toText(value ?? '').trim();
  return out ? out : undefined;
}

export function crmActor(
  authz: Pick<AppAuthorization, 'for'>,
  actor: ToolActor,
): Actor {
  const id = toText(actor.id);
  return {
    id,
    locale: actor.locale?.startsWith('zh') ? 'zh-CN' : 'en-US',
    scope: authz.for({
      principal: { type: 'user', id },
      subjects: [{ type: 'authenticated', id: '*' }],
    }),
  };
}

// The filters search_records and summarize_records share: the list's own.
const filterProperties = {
  search: {
    type: 'string',
    description: 'Free text matched against name, company, email and phone.',
  },
  status: {
    type: 'string',
    description:
      'Exact status value, or stage for opportunities. Use the enum values from the schema.',
  },
  ownerId: {
    type: 'string',
    description: 'Filter by owning user id.',
  },
  accountId: { type: 'string' },
  leadId: { type: 'string' },
  opportunityId: { type: 'string' },
  source: { type: 'string' },
  from: {
    type: 'string',
    description: 'ISO timestamp; keeps records created at or after it.',
  },
  to: {
    type: 'string',
    description: 'ISO timestamp; keeps records created at or before it.',
  },
  startFrom: {
    type: 'string',
    description:
      'Activities only: ISO timestamp; keeps activities that start at or after it (when they take place, not when they were recorded).',
  },
  startTo: {
    type: 'string',
    description:
      'Activities only: ISO timestamp; keeps activities that start at or before it.',
  },
};

function filtersOf(args: Row): ListOptions {
  return {
    search: text(args.search),
    status: text(args.status),
    ownerId: text(args.ownerId),
    accountId: text(args.accountId),
    leadId: text(args.leadId),
    opportunityId: text(args.opportunityId),
    source: text(args.source),
    from: text(args.from),
    to: text(args.to),
    startFrom: text(args.startFrom),
    startTo: text(args.startTo),
  };
}

export function crmRecordTools(
  service: CrmService,
  authz: Pick<AppAuthorization, 'for'>,
) {
  const actorOf = (ctx: unknown): Actor => actorFrom(authz, ctx);
  return [
    defineTools({
      scope: 'SPECIFIED',
      execution: 'backend',
      defaultPermission: 'ALLOW',
      i18n: { namespace: 'crm' },
      introduction: {
        title: 'Search CRM records',
        about:
          'Finds leads, accounts, contacts, opportunities, activities and approvals the current user may read, a page at a time.',
      },
      definition: {
        name: 'search_records',
        description:
          'Search one CRM object. Returns {total, showing, page, records, names}: total is every record matching the filter that this user may read, records holds that page only, names maps the ids in the records (owners, accounts, ...) to display names — use those names, never show an id to the user. Use this instead of guessing when you need older records, or when you need to filter by owner, status, account or date.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            ...filterProperties,
            page: { type: 'number', description: 'One-based page number.' },
            pageSize: {
              type: 'number',
              description: `Records per page, at most ${MAX_PAGE_SIZE}.`,
            },
          },
          required: ['entity'],
        },
      },
      invoke: async (ctx, input) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (input ?? {}) as Row;
          const entity = asEntity(toText(args.entity));
          const page = await service.list(actor, entity, {
            ...filtersOf(args),
            page: Math.max(1, Number(args.page) || 1),
            pageSize: Math.min(
              MAX_PAGE_SIZE,
              Math.max(1, Number(args.pageSize) || 25),
            ),
          });
          // Display names for the records and the ids they refer to
          // (owners, accounts), so the model reads names instead of ids.
          const { names } = await resolveTitles(service, actor, {
            [entity]: page.data,
          });
          return {
            total: page.total,
            showing: page.data.length,
            page: page.page,
            records: page.data,
            names,
          };
        });
      },
    }),
    defineTools({
      scope: 'SPECIFIED',
      execution: 'backend',
      defaultPermission: 'ALLOW',
      i18n: { namespace: 'crm' },
      introduction: {
        title: 'Summarize CRM records',
        about:
          'Counts and totals over the records the current user may read, grouped by a field or a period, for reports and analysis.',
      },
      definition: {
        name: 'summarize_records',
        description:
          'Count and total the records of one CRM object that this user may read, with the same filters as search_records, optionally grouped by a field (stage, status, source, industry, ownerId, accountId, a country ...) or by a period of a date field (createdAt, closedAt, expectedCloseAt, startAt ...; period day, week, month, quarter or year, in the business time zone), with sum, average, min and max of number fields (measures, such as amount). Returns {total, truncated, groupBy, period, groups: [{key, count, measures}], overall, names}: total is every matching record, a group key is the field value (an enum value to put in words, or an id whose display name is in names) or the period ("2026-09", "2026-Q3", a week by its Monday), null for records without one; measures and overall hold {field, currency, sum, average, min, max, counted}, one entry per currency, since amounts in different currencies are never added together. A participants field counts a record once for each participant. Use it for every count, total, breakdown or trend instead of paging through search_records.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            ...filterProperties,
            groupBy: {
              type: 'string',
              description:
                'The field to group by; leave it out for one total over every matching record.',
            },
            period: {
              type: 'string',
              enum: summaryPeriods,
              description:
                'For a date field in groupBy: the period records fall into (month when left out).',
            },
            measures: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Number fields to sum and average, such as ["amount"]; the count is always returned.',
            },
          },
          required: ['entity'],
        },
      },
      invoke: async (ctx, input) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (input ?? {}) as Row;
          const entity = asEntity(toText(args.entity));
          const summary = await service.summarize(
            actor,
            entity,
            filtersOf(args),
            {
              groupBy: text(args.groupBy),
              period: text(args.period) as SummaryPeriod | undefined,
              measures: Array.isArray(args.measures)
                ? args.measures.map((m) => toText(m)).filter(Boolean)
                : undefined,
            },
          );
          // Group keys that are ids get their display names, like the
          // records search_records returns.
          const relation = summary.groupBy
            ? groupRelation(entity, summary.groupBy)
            : undefined;
          const keys = summary.groups
            .map((g) => g.key)
            .filter((k): k is string => k !== null);
          let names: Record<string, string> = {};
          if (relation === 'users') {
            const wanted = new Set(keys);
            names = Object.fromEntries(
              (await service.users(actor))
                .filter((u) => wanted.has(toText(u.id)))
                .map((u) => [toText(u.id), toText(u.name ?? u.id)]),
            );
          } else if (relation && keys.length)
            names = (
              await resolveTitles(service, actor, {}, { [relation]: keys })
            ).names;
          return { ...summary, names };
        });
      },
    }),
    defineTools({
      scope: 'SPECIFIED',
      execution: 'backend',
      defaultPermission: 'ALLOW',
      i18n: { namespace: 'crm' },
      introduction: {
        title: 'Read a CRM record',
        about:
          'Reads one record in full, with its change history, related records and what the current user may do to it.',
      },
      definition: {
        name: 'get_record',
        description:
          'Read one CRM record in full, including its change history, related records and what this user may do to it. Use it for the record the user is looking at, and before advising on an existing record.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            id: { type: 'string', description: 'The record id.' },
          },
          required: ['entity', 'id'],
        },
      },
      invoke: async (ctx, input) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (input ?? {}) as Row;
          const entity = asEntity(toText(args.entity));
          const detail = await service.detail(actor, entity, toText(args.id));
          const { names } = await resolveTitles(service, actor, {
            [entity]: [detail.record],
          });
          return { ...detail, names };
        });
      },
    }),
    defineTools({
      scope: 'SPECIFIED',
      execution: 'backend',
      defaultPermission: 'ALLOW',
      i18n: { namespace: 'crm' },
      introduction: {
        title: 'List CRM users',
        about:
          'Lists the users who hold a CRM role, with their ids, so a record can be given an owner or an approver by name.',
      },
      definition: {
        name: 'list_users',
        description:
          'List the CRM users, as "users": id, name, username, roles (sales-representative, sales-manager, system-administrator) and which one is the current user ("current": true, with "can": what they may do beyond their own records — assign a record to someone else, approve, export — and "access": per object, the operations they may perform and on which records: all, own, created). Call it to turn a person\'s name into the id that ownerId, approverId or internalParticipants take, to know who may approve, and to learn whether the current user can own records or give one to someone else. Only sales representatives and managers can own records; only managers approve.',
        schema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description:
                'A name or username to look up; leave it out to list everyone. Prefer a search when the request names a person.',
            },
          },
        },
      },
      invoke: async (ctx, input) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          // What the caller may do beyond their own records, so the model
          // does not propose handing a record to someone else for a user
          // who cannot, nor a decision they cannot make.
          const can = {
            assign: await capability(actor, 'assign'),
            approve: await capability(actor, 'approve'),
            export: await capability(actor, 'export'),
          };
          // And their access per object: the operations they may perform
          // and on which records, so no write is proposed that their
          // permissions rule out.
          const access = await accessLines(actor);
          const search = text(
            (input as Row | undefined)?.search,
          )?.toLowerCase();
          // An object rather than the bare list: the plugin hands an array
          // result to the model as content parts, which DashScope refuses
          // ("item must be dict and key[type] should in dict"), where an
          // object is sent as JSON text like every other tool's result.
          const users = (await service.users(actor))
            .filter((user) => !user.disabled)
            .filter(
              (user) =>
                !search ||
                toText(user.name).toLowerCase().includes(search) ||
                toText(user.username ?? '')
                  .toLowerCase()
                  .includes(search),
            )
            .map((user) => ({
              id: user.id,
              name: user.name,
              username: user.username,
              roles: user.roles,
              ...(toText(user.id) === actor.id
                ? { current: true, can, access }
                : {}),
            }));
          return { users };
        });
      },
    }),
  ];
}
