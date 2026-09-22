import { defineTools } from '@nocobase/ai-employee';
import type { AppAuthorizationService } from '@nocobase/app-plugin-authorization/server';
import type { Row } from '@nocobase/db';
import { capability, type Actor } from '../../providers/crm/authorization.js';
import {
  asEntity,
  CrmError,
  entities,
  toText,
} from '../../providers/crm/schema.js';
import type { CrmService } from '../../providers/crm/service.js';

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
  authz: Pick<AppAuthorizationService, 'for'>,
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
  authz: Pick<AppAuthorizationService, 'for'>,
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

export function crmRecordTools(
  service: CrmService,
  authz: Pick<AppAuthorizationService, 'for'>,
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
          'Search one CRM object. Returns {total, showing, page, records}: total is every record matching the filter that this user may read, records holds that page only. Use this instead of guessing when you need older records, or when you need to filter by owner, status, account or date.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            search: {
              type: 'string',
              description:
                'Free text matched against name, company, email and phone.',
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
              description:
                'ISO timestamp; keeps records created at or after it.',
            },
            to: {
              type: 'string',
              description:
                'ISO timestamp; keeps records created at or before it.',
            },
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
          const page = await service.list(
            actor,
            asEntity(toText(args.entity)),
            {
              search: text(args.search),
              status: text(args.status),
              ownerId: text(args.ownerId),
              accountId: text(args.accountId),
              leadId: text(args.leadId),
              opportunityId: text(args.opportunityId),
              source: text(args.source),
              from: text(args.from),
              to: text(args.to),
              page: Math.max(1, Number(args.page) || 1),
              pageSize: Math.min(
                MAX_PAGE_SIZE,
                Math.max(1, Number(args.pageSize) || 25),
              ),
            },
          );
          return {
            total: page.total,
            showing: page.data.length,
            page: page.page,
            records: page.data,
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
          return service.detail(
            actor,
            asEntity(toText(args.entity)),
            toText(args.id),
          );
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
          'List the CRM users: id, name, username, roles (sales-representative, sales-manager, system-administrator) and which one is the current user ("current": true, with "can": what they may do beyond their own records: assign a record to someone else, approve, manage settings). Call it to turn a person\'s name into the id that ownerId, approverId or internalParticipants take, to know who may approve, and to learn whether the current user can own records or give one to someone else. Only sales representatives and managers can own records; only managers approve.',
        schema: { type: 'object', properties: {} },
      },
      invoke: async (ctx) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          // What the caller may do beyond their own records, so the model
          // does not propose handing a record to someone else for a user
          // who cannot, nor a decision they cannot make.
          const can = {
            assign: await capability(actor, 'assign'),
            approve: await capability(actor, 'approve'),
            manage: await capability(actor, 'manage'),
          };
          return (await service.users(actor))
            .filter((user) => !user.disabled)
            .map((user) => ({
              id: user.id,
              name: user.name,
              username: user.username,
              roles: user.roles,
              ...(toText(user.id) === actor.id ? { current: true, can } : {}),
            }));
        });
      },
    }),
  ];
}
