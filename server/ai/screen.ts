import type { Row } from '@nocobase/db';
import {
  capability,
  conditions,
  type Actor,
} from '../providers/crm/authorization.js';
import {
  asEntity,
  CrmError,
  entities,
  object,
  toText,
  type Entity,
} from '../providers/crm/schema.js';
import type { CrmService } from '../providers/crm/service.js';

// Whether the signed-in user could carry out a proposed write, judged by
// the rules the write tools apply but without writing anything. The card
// asks before it offers confirmation, so a change the user cannot make is
// shown as such instead of failing after they confirm; the tools still
// decide for real when the call runs. "forbidden" is a right the user
// lacks, the CRM's other codes name the rule (a converted lead, a locked
// approval); a record the user may not see is reported as absent, as the
// pages do.
export type ScreenResult =
  { ok: true } | { ok: false; code: string; field?: string };

const refuse = (code: string, field?: string): ScreenResult => ({
  ok: false,
  code,
  ...(field ? { field } : {}),
});

export async function screenProposal(
  service: CrmService,
  actor: Actor,
  tool: string,
  raw: unknown,
): Promise<ScreenResult> {
  const input = object(raw);
  const id = toText(input.id ?? '');
  try {
    switch (tool) {
      case 'create_record': {
        const entity = asEntity(toText(input.entity));
        const values = object(input.input);
        await conditions(actor, entity, 'create');
        if (
          entity !== 'approvals' &&
          values.ownerId &&
          values.ownerId !== actor.id &&
          !(await capability(actor, 'assign'))
        )
          return refuse('forbidden', 'ownerId');
        if (entity === 'approvals' && values.opportunityId)
          try {
            await service.get(
              actor,
              'opportunities',
              toText(values.opportunityId),
              undefined,
              'update',
            );
          } catch (error) {
            if (error instanceof CrmError && error.code === 'notFound')
              return refuse('approvalOpportunity', 'opportunityId');
            throw error;
          }
        return { ok: true };
      }
      case 'update_record': {
        const entity = asEntity(toText(input.entity));
        if (!id) return refuse('invalidInput', 'id');
        const values = object(input.input);
        const record = await service.get(
          actor,
          entity,
          id,
          undefined,
          'update',
        );
        if (entity === 'leads' && record.status === 'converted')
          return refuse('convertedReadOnly');
        if (
          entity === 'approvals' &&
          (record.ownerId !== actor.id ||
            !['draft', 'withdrawn'].includes(toText(record.status)))
        )
          return refuse('approvalLocked');
        if (
          values.ownerId &&
          values.ownerId !== actor.id &&
          values.ownerId !== record.ownerId &&
          !(await capability(actor, 'assign'))
        )
          return refuse('forbidden', 'ownerId');
        return { ok: true };
      }
      case 'delete_record': {
        const entity = asEntity(toText(input.entity));
        if (!id) return refuse('invalidInput', 'id');
        const record = await service.get(
          actor,
          entity,
          id,
          undefined,
          'delete',
        );
        if (entity === 'leads' && record.status === 'converted')
          return refuse('convertedReadOnly');
        if (
          entity === 'approvals' &&
          (record.ownerId !== actor.id ||
            !['draft', 'withdrawn'].includes(toText(record.status))) &&
          !(await capability(actor, 'manage', 'settings'))
        )
          return refuse('approvalLocked');
        return { ok: true };
      }
      case 'convert_lead': {
        if (!id) return refuse('invalidInput', 'id');
        const lead = await service.get(actor, 'leads', id, undefined, 'update');
        if (lead.status === 'converted') return refuse('convertedReadOnly');
        return { ok: true };
      }
      case 'approval_action': {
        if (!id) return refuse('invalidInput', 'id');
        const action = toText(input.action);
        const record = await service.get(actor, 'approvals', id);
        const status = toText(record.status);
        if (action === 'submit')
          return record.ownerId !== actor.id ||
            !['draft', 'withdrawn'].includes(status)
            ? refuse('approvalLocked')
            : !record.approverId
              ? refuse('required', 'approverId')
              : { ok: true };
        if (action === 'withdraw')
          return record.ownerId !== actor.id || status !== 'pending'
            ? refuse('approvalLocked')
            : { ok: true };
        if (action === 'approve' || action === 'reject')
          return !(await capability(actor, 'approve')) ||
            record.approverId !== actor.id ||
            record.ownerId === actor.id
            ? refuse('forbidden')
            : status !== 'pending'
              ? refuse('approvalLocked')
              : { ok: true };
        return refuse('invalidInput', 'action');
      }
      case 'add_note': {
        // Anyone who may read the record may note on it.
        const entity = asEntity(toText(input.entity));
        if (!id) return refuse('invalidInput', 'id');
        if (!toText(input.text ?? '').trim())
          return refuse('invalidInput', 'text');
        await service.get(actor, entity, id);
        return { ok: true };
      }
      default:
        return refuse('invalidInput', 'tool');
    }
  } catch (error) {
    return error instanceof CrmError
      ? refuse(error.code, error.field)
      : refuse('serverError');
  }
}

// The user's access per object, one line each, for the model: which
// operations they may perform and on which records — "all", "own" (records
// they own), "created" (records they created) — so it never proposes a
// write the user's permissions rule out.
export async function accessLines(
  actor: Actor,
): Promise<Record<Entity, string>> {
  const lines = {} as Record<Entity, string>;
  for (const entity of entities) {
    const parts: string[] = [];
    for (const [action, label] of [
      ['read', 'view'],
      ['create', 'create'],
      ['update', 'edit'],
      ['delete', 'delete'],
    ] as const) {
      try {
        const access = await conditions(actor, entity, action);
        parts.push(
          action === 'create' ? label : `${label}:${scopeLabel(access.scope)}`,
        );
      } catch {
        // No right to this operation: the line leaves it out.
      }
    }
    lines[entity] = parts.join(' ') || 'none';
  }
  return lines;
}

// The column a record scope compares against, found anywhere in the
// filter AST the decision carries (a condition node, possibly grouped).
function scopeColumn(node: unknown, depth = 0): string | undefined {
  if (depth > 8 || !node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const column = scopeColumn(item, depth + 1);
      if (column) return column;
    }
    return undefined;
  }
  const row = node as Row;
  if (Array.isArray(row.path) && typeof row.operator === 'string')
    return toText(row.path[0]);
  for (const value of Object.values(row)) {
    const column = scopeColumn(value, depth + 1);
    if (column) return column;
  }
  return undefined;
}

function scopeLabel(scope: unknown): string {
  if (scope === true) return 'all';
  const column = scopeColumn(scope);
  return column === 'ownerId'
    ? 'own'
    : column === 'createdById'
      ? 'created'
      : 'some';
}
