import type { Actor } from './authorization.js';
import type { CrmService } from './service.js';
import { asEntity, CrmError, entities, toText } from './schema.js';
import type { Row } from '@nocobase/db';

// The shape @nocobase/ai-employee's buildTool expects. `schema` is JSON Schema 7,
// which langchain's tool() accepts directly — using zod here would make it a
// runtime import in server/, and zod is only a devDependency.
export interface CrmTool {
  definition: {
    name: string;
    description: string;
    schema: Record<string, unknown>;
  };
  // buildTool otherwise demands an agentContext this application never creates.
  requiresContext: boolean;
  invoke: (agentContext: unknown, input: unknown) => Promise<string>;
}

// A tool answers into the model's context, so an oversized page would undo the
// point of fetching on demand.
const MAX_PAGE_SIZE = 50;

const entityProperty = {
  type: 'string',
  enum: entities,
  description: 'Which CRM object to read.',
};

function text(value: unknown): string | undefined {
  const out = toText(value ?? '').trim();
  return out ? out : undefined;
}

export function crmTools(service: CrmService, actor: Actor): CrmTool[] {
  // Every read goes through CrmService with this request's actor, so a tool can
  // never reach a record the signed-in user could not open in the UI. A refusal
  // is reported back to the model as data rather than thrown, so one forbidden
  // lookup does not fail the whole turn.
  const guard = async (run: () => Promise<unknown>): Promise<string> => {
    try {
      return JSON.stringify(await run());
    } catch (cause) {
      const code = cause instanceof CrmError ? cause.code : 'serverError';
      return JSON.stringify({ error: code });
    }
  };

  return [
    {
      requiresContext: false,
      definition: {
        name: 'search_records',
        description:
          'Search one CRM object. Returns {total, showing, page, records}: total is every record matching the filter that this user may read, records holds that page only. Use this instead of guessing when the inline context is truncated, when you need older records, or when you need to filter by owner, status, account or date.',
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
      invoke: async (_agentContext, input) =>
        guard(async () => {
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
        }),
    },
    {
      requiresContext: false,
      definition: {
        name: 'get_record',
        description:
          "Read one CRM record in full, including its change history, related records and what this user may do to it. Use it before proposing an update, so the action carries the record's current values.",
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            id: { type: 'string', description: 'The record id.' },
          },
          required: ['entity', 'id'],
        },
      },
      invoke: async (_agentContext, input) =>
        guard(async () => {
          const args = (input ?? {}) as Row;
          return service.detail(
            actor,
            asEntity(toText(args.entity)),
            toText(args.id),
          );
        }),
    },
  ];
}
