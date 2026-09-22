import { defineTools } from '@nocobase/ai-employee';
import type { AppAuthorizationService } from '@nocobase/app-plugin-authorization/server';
import type { Row } from '@nocobase/db';
import type { Actor } from '../../providers/crm/authorization.js';
import { convertLead } from '../../providers/crm/conversion.js';
import {
  asEntity,
  entities,
  toText,
  type Entity,
} from '../../providers/crm/schema.js';
import type { CrmService } from '../../providers/crm/service.js';
import { actorFrom, guarded } from './crm-records.js';

// The CRM's write tools for the AI employee. Each one is a proposal the
// plugin holds until the user allows it in the conversation (ASK), and
// then a write through CrmService under the signed-in user's own
// permissions, inside the same transactions the pages use: the business
// invariants (a won deal's account turning customer, a converted lead
// locked) and the notifications hold exactly as for a form. A refusal —
// a record this user may not edit, a state that rules the step out — ends
// the call with the CRM's error body, so the employee can say who could do
// it instead and the card can show why.

const entityProperty = {
  type: 'string',
  enum: entities,
  description: 'Which CRM object the record belongs to.',
};

const inputProperty = {
  type: 'object',
  description:
    'Field values keyed by field name, using the field names and enum values from the schema in your instructions. Relations take the related record id (ownerId a user id, accountId an account id). Dates are ISO 8601.',
  additionalProperties: true,
};

// What a confirmed write reports back: enough for the employee to name the
// record and continue with a step that needed its id, plus the values as
// they were written, because the user may have corrected the proposal on
// the card before confirming and the plugin keeps only the proposed
// arguments; the card shows these once the call has run. Not under
// "status": the plugin reads that key of a result as the call's own
// outcome, and a rejected approval would read as a failed call.
function summary(entity: Entity, record: Row, values: unknown): Row {
  return {
    entity,
    id: record.id,
    name: record.name ?? record.company ?? null,
    recordStatus: record.status ?? record.stage ?? null,
    values,
  };
}

export function crmWriteTools(
  service: CrmService,
  authz: Pick<AppAuthorizationService, 'for'>,
) {
  const actorOf = (ctx: unknown): Actor => actorFrom(authz, ctx);
  const common = {
    scope: 'SPECIFIED' as const,
    execution: 'backend' as const,
    defaultPermission: 'ASK' as const,
    i18n: { namespace: 'crm' },
  };
  return [
    defineTools({
      ...common,
      introduction: {
        title: 'Create a CRM record',
        about:
          'Creates a lead, account, contact, opportunity, activity or approval once the user confirms the values.',
      },
      definition: {
        name: 'create_record',
        description:
          'Create one CRM record. Propose it with every field you know; the user reviews the values and confirms before anything is written. Include a one-line "title" naming what this creates. When ownerId is left out the record belongs to the current user. Do not chain a create that needs the id of a record not yet created: create the parent first, then continue after it is confirmed.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            title: {
              type: 'string',
              description:
                'What this creates, in the user\'s language, e.g. "创建线索：嘉禾食品 周明".',
            },
            input: inputProperty,
            assumptions: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Values you inferred rather than were told, one per line, so the user can correct them.',
            },
          },
          required: ['entity', 'title', 'input'],
        },
      },
      invoke: async (ctx, raw) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (raw ?? {}) as Row;
          const entity = asEntity(toText(args.entity));
          const record = await service.save(actor, entity, args.input ?? {});
          return summary(entity, record, args.input ?? {});
        });
      },
    }),
    defineTools({
      ...common,
      introduction: {
        title: 'Update a CRM record',
        about:
          'Changes the fields of an existing record once the user confirms the new values.',
      },
      definition: {
        name: 'update_record',
        description:
          'Update fields of one existing CRM record. Read the record with get_record first so the proposal is based on its current values, and send only the fields that change. Use it to move an opportunity to another stage, complete or reschedule an activity, mark a lead invalid, or hand a record to another owner. Include a one-line "title" naming the change.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            id: { type: 'string', description: 'The record id.' },
            title: { type: 'string', description: 'What this changes.' },
            input: inputProperty,
            assumptions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Values you inferred rather than were told.',
            },
          },
          required: ['entity', 'id', 'title', 'input'],
        },
      },
      invoke: async (ctx, raw) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (raw ?? {}) as Row;
          const entity = asEntity(toText(args.entity));
          const record = await service.save(
            actor,
            entity,
            args.input ?? {},
            toText(args.id),
          );
          return summary(entity, record, args.input ?? {});
        });
      },
    }),
    defineTools({
      ...common,
      introduction: {
        title: 'Delete a CRM record',
        about:
          'Deletes one record once the user confirms; it cannot be undone.',
      },
      definition: {
        name: 'delete_record',
        description:
          'Delete one CRM record. Only propose it when the user asked for a deletion; say in "title" what is removed. A converted lead and a submitted approval cannot be deleted.',
        schema: {
          type: 'object',
          properties: {
            entity: entityProperty,
            id: { type: 'string', description: 'The record id.' },
            title: { type: 'string', description: 'What this removes.' },
          },
          required: ['entity', 'id', 'title'],
        },
      },
      invoke: async (ctx, raw) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (raw ?? {}) as Row;
          const entity = asEntity(toText(args.entity));
          await service.remove(actor, entity, toText(args.id));
          return { entity, id: args.id, deleted: true };
        });
      },
    }),
    defineTools({
      ...common,
      introduction: {
        title: 'Convert a lead',
        about:
          'Turns a lead into an account and a contact, optionally with an opportunity, once the user confirms.',
      },
      definition: {
        name: 'convert_lead',
        description:
          'Convert a lead into an account and a contact, and optionally an opportunity. Before proposing it, search accounts for the same company and contacts for the same email or phone: pass accountId or contactId to link existing records instead of creating duplicates. Fields under "account" and "contact" override what the new records inherit from the lead. Include a one-line "title".',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The lead id.' },
            title: { type: 'string', description: 'What this converts.' },
            accountId: {
              type: 'string',
              description:
                'An existing account to link instead of creating one.',
            },
            accountName: {
              type: 'string',
              description:
                "The name for a new account when it differs from the lead's company.",
            },
            contactId: {
              type: 'string',
              description:
                'An existing contact of that account to link instead of creating one.',
            },
            createOpportunity: { type: 'boolean' },
            opportunityName: { type: 'string' },
            amount: { type: 'number' },
            account: {
              type: 'object',
              additionalProperties: true,
              description: 'Account fields overriding what the lead supplies.',
            },
            contact: {
              type: 'object',
              additionalProperties: true,
              description: 'Contact fields overriding what the lead supplies.',
            },
            assumptions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Values you inferred rather than were told.',
            },
          },
          required: ['id', 'title'],
        },
      },
      invoke: async (ctx, raw) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const {
            id,
            title: _title,
            assumptions: _a,
            ...input
          } = (raw ?? {}) as Row;
          const lead = await convertLead(service, actor, toText(id), input);
          return summary('leads', lead, input);
        });
      },
    }),
    defineTools({
      ...common,
      introduction: {
        title: 'Decide on an approval',
        about:
          'Submits, withdraws, approves or rejects an approval request once the user confirms.',
      },
      definition: {
        name: 'approval_action',
        description:
          'Act on an approval request: "submit" or "withdraw" one the current user raised, "approve" or "reject" one they are the approver of. Only propose a decision the user may make (get_record shows what this user may do). Include a one-line "title".',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The approval id.' },
            action: {
              type: 'string',
              enum: ['submit', 'withdraw', 'approve', 'reject'],
            },
            title: { type: 'string', description: 'What this decides.' },
            comment: { type: 'string', description: 'An optional comment.' },
          },
          required: ['id', 'action', 'title'],
        },
      },
      invoke: async (ctx, raw) => {
        const actor = actorOf(ctx);
        return guarded(async () => {
          const args = (raw ?? {}) as Row;
          const record = await service.approvalAction(
            actor,
            toText(args.id),
            toText(args.action),
            toText(args.comment ?? ''),
          );
          return summary('approvals', record, {
            action: args.action,
            ...(args.comment ? { comment: args.comment } : {}),
          });
        });
      },
    }),
  ];
}
