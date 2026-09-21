import { toText } from './schema.js';
import type {
  AppAuthorizationService,
  AuthorizationScope,
  DatabaseAuthorizationConditions,
  DatabaseAuthorizationParams,
} from '@nocobase/app-plugin-authorization/server';
import type {
  ComparisonOperator,
  DatabaseManager,
  Expression,
  ExpressionBuilder,
  FilterAst,
  Row,
  SqlBool,
} from '@nocobase/db';
import {
  CrmError,
  definitions,
  entities,
  fieldsFor,
  type Entity,
} from './schema.js';

export interface Actor {
  id: string;
  scope: AuthorizationScope;
  locale: string;
  decisions?: Record<string, DatabaseAuthorizationConditions | null>;
  capabilities?: Record<string, boolean>;
  users?: Row[];
  // Registers work to run once the current transaction has committed (the
  // workflows a change starts); set by CrmService.mutate on the prepared
  // actor, absent when a caller runs its own transaction.
  after?: (callback: () => Promise<void>) => void;
}
export const roles: string[] = [
  'sales-representative',
  'sales-manager',
  'system-administrator',
];
export function roleKey(role: string): string {
  return `crm-${toText(role)}`;
}
export function registerCrmResources(authz: AppAuthorizationService): void {
  // Field, primary-key and ownership metadata come from the database; the
  // record-access strategies read `ownerId` and `createdById` by default.
  for (const entity of entities)
    authz.db.collections.add({
      name: definitions[entity].table,
      title: entity,
      actions: ['read', 'create', 'update', 'delete'],
    });
  // The CRM's capability resource (`crm/sales`, `crm/settings`): a plain
  // resource type resolved from grants, registered on the handler registry;
  // `resources` now holds composed business operations.
  authz.resourceTypes.add({
    resourceType: 'crm',
    async authorize(request, context) {
      const grants = await context.grants.resolve({
        principal: request.principal,
        subjects: request.subjects,
        resource: request.resource,
        action: request.action,
      });
      return { effect: grants.length ? 'permit' : 'deny', reasons: [] };
    },
  });
}

// The accounts that can hold a CRM role: every user that has not been deleted.
export async function listUsers(
  database: DatabaseManager,
): Promise<
  { id: string; name: string; username: string | null; email: string }[]
> {
  const rows = await database
    .query()
    .selectFrom('user')
    .select(['id', 'name', 'username', 'email'])
    .where('deletedAt', 'is', null)
    .orderBy('createdAt')
    .execute();
  return rows.map((row) => ({
    id: toText(row.id),
    name: toText(row.name),
    username: row.username === null ? null : toText(row.username),
    email: toText(row.email),
  }));
}

export async function provisionCrm(
  authz: AppAuthorizationService,
  database: DatabaseManager,
): Promise<void> {
  for (const role of roles) {
    const key = roleKey(role);
    if (await authz.permissionSets.get(key)) continue;
    const manager = role !== 'sales-representative';
    const grants = entities.map((entity) =>
      authz.db.grant(definitions[entity].table, {
        read: { fields: '*', recordAccess: ['allRecords'] },
        create: { fields: '*' },
        update: {
          fields: '*',
          recordAccess: [manager ? 'allRecords' : 'recordsIOwn'],
        },
        // Deleting is the one write that is not "manage all": a manager
        // removes only what they created themselves, an administrator
        // anything, a salesperson only their own approval drafts.
        ...(manager || entity === 'approvals'
          ? {
              delete: {
                recordAccess: [
                  role === 'system-administrator'
                    ? 'allRecords'
                    : manager
                      ? 'recordsICreated'
                      : 'recordsIOwn',
                ],
              },
            }
          : {}),
      }),
    );
    grants.push({
      resource: { type: 'page', id: '*' },
      actions: [{ action: 'access' }],
    });
    if (manager)
      grants.push({
        resource: { type: 'crm', id: 'sales' },
        actions: [
          { action: 'assign' },
          { action: 'approve' },
          { action: 'manage' },
        ],
      });
    // The administrator set is the application's root set (see
    // server/config/authorization.ts), so its holders skip authorization; the
    // grants below describe the role where the sets are listed and edited.
    if (role === 'system-administrator') {
      grants.push({
        resource: { type: 'settings', id: '*' },
        actions: ['read', 'create', 'update', 'delete', 'manage'].map(
          (action) => ({ action }),
        ),
      });
      grants.push({
        resource: { type: 'crm', id: 'settings' },
        actions: [{ action: 'manage' }],
      });
    }
    await authz.permissionSets.create({
      key,
      title:
        role === 'sales-representative'
          ? 'Salesperson / 销售人员'
          : role === 'sales-manager'
            ? 'Sales manager / 销售经理'
            : 'Administrator / 管理员',
      grants,
    });
  }
  const settingsPolicy = await database
    .query()
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', 'settings-access-v1')
    .executeTakeFirst();
  if (!settingsPolicy) {
    const admin = await authz.permissionSets.get(
      roleKey('system-administrator'),
    );
    if (
      admin &&
      !admin.grants.some((grant) => grant.resource.type === 'settings')
    )
      await authz.permissionSets.update(admin.key, {
        ...admin,
        grants: [
          ...admin.grants,
          {
            resource: { type: 'settings', id: '*' },
            actions: ['read', 'create', 'update', 'delete', 'manage'].map(
              (action) => ({ action }),
            ),
          },
        ],
      });
    await database
      .query()
      .insertInto('crmSettings')
      .values({
        id: 'settings-access-v1',
        value: '{"version":1}',
        updatedAt: new Date(),
      })
      .execute();
  }
  const approvalPolicy = await database
    .query()
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', 'approval-delete-v1')
    .executeTakeFirst();
  if (!approvalPolicy) {
    const representative = await authz.permissionSets.get(
      roleKey('sales-representative'),
    );
    if (representative) {
      const grant = authz.db.grant('crmApprovals', {
        delete: { recordAccess: ['recordsIOwn'] },
      });
      const grants = representative.grants.map((existing) =>
        existing.resource.type === grant.resource.type &&
        existing.resource.id === grant.resource.id &&
        !existing.actions.some((action) => action.action === 'delete')
          ? { ...existing, actions: [...existing.actions, ...grant.actions] }
          : existing,
      );
      await authz.permissionSets.update(representative.key, {
        ...representative,
        grants,
      });
    }
    await database
      .query()
      .insertInto('crmSettings')
      .values({
        id: 'approval-delete-v1',
        value: '{"version":1}',
        updatedAt: new Date(),
      })
      .execute();
  }
  const initialized = await database
    .query()
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', 'provisioned')
    .executeTakeFirst();
  if (!initialized) {
    // A generated app with one existing account has an unambiguous installer.
    // Never elevate an arbitrary member when multiple accounts already exist.
    const users = await listUsers(database);
    if (users.length === 1)
      await authz.permissionSets.assign({
        permissionSet: roleKey('system-administrator'),
        subject: { type: 'user', id: users[0].id },
      });
    if (users.length)
      await database
        .query()
        .insertInto('crmSettings')
        .values({
          id: 'provisioned',
          value: '{"version":1}',
          updatedAt: new Date(),
        })
        .execute();
  }
}

export async function conditions(
  actor: Actor,
  entity: Entity,
  action: string,
  input?: Row,
): Promise<DatabaseAuthorizationConditions> {
  if (actor.decisions) {
    const result = actor.decisions[`${toText(entity)}.${toText(action)}`];
    if (!result) throw new CrmError('forbidden', 403);
    if (input) assertFields(input, result);
    return result;
  }
  const decision = await actor.scope.authorize<DatabaseAuthorizationParams>({
    // The collection as registered above; the authorizer resolves it on the
    // connection it was created with, so no connection prefix.
    resource: {
      type: 'database.collection',
      id: toText(definitions[entity].table),
    },
    action,
    params: { fields: input ? { input: Object.keys(input) } : {} },
  });
  if (
    decision.effect !== 'conditional' ||
    decision.conditions?.type !== 'database'
  )
    throw new CrmError('forbidden', 403);
  return decision.conditions as DatabaseAuthorizationConditions;
}
export async function capability(
  actor: Actor,
  action: string,
  id = 'sales',
): Promise<boolean> {
  return actor.capabilities
    ? actor.capabilities[`${toText(id)}.${toText(action)}`] === true
    : actor.scope.can({ resource: { type: 'crm', id }, action });
}
export async function requireCapability(
  actor: Actor,
  action: string,
  id = 'sales',
): Promise<void> {
  if (!(await capability(actor, action, id)))
    throw new CrmError('forbidden', 403);
}
// The record scope a decision carries is the database package's filter AST,
// limited by the authorization plugin to this table's own columns; the CRM
// still queries through the query builder, so the scope is compiled here.
interface ConditionNode {
  kind: 'condition';
  path: readonly string[];
  operator: string;
  value?: unknown;
}
interface GroupNode {
  kind: 'group';
  logic: 'and' | 'or';
  items: readonly ScopeNode[];
}
type ScopeNode = ConditionNode | GroupNode;
export function compileFilter(
  eb: ExpressionBuilder,
  scope: true | FilterAst,
): Expression<SqlBool> {
  if (scope === true) return eb.and([]);
  return compileNode(eb, (scope as unknown as { root: ScopeNode }).root);
}
function compileNode(
  eb: ExpressionBuilder,
  node: ScopeNode,
): Expression<SqlBool> {
  if (node.kind === 'group') {
    const parts = node.items.map((item) => compileNode(eb, item));
    return node.logic === 'or' ? eb.or(parts) : eb.and(parts);
  }
  if (node.kind !== 'condition' || node.path.length !== 1)
    throw new CrmError('forbidden', 403);
  const column = node.path[0];
  const raw = node.value;
  const value =
    typeof raw === 'string' ||
    typeof raw === 'number' ||
    typeof raw === 'boolean'
      ? raw
      : raw === undefined || raw === null
        ? null
        : undefined;
  if (value === undefined) throw new CrmError('forbidden', 403);
  const text = value === null ? '' : String(value);
  const compare = (op: ComparisonOperator, expected: unknown) =>
    eb(column, op, expected);
  switch (node.operator) {
    case '$eq':
      return value === null ? compare('is', null) : compare('=', value);
    case '$ne':
      return value === null ? compare('is not', null) : compare('!=', value);
    case '$gt':
      return compare('>', value);
    case '$gte':
      return compare('>=', value);
    case '$lt':
      return compare('<', value);
    case '$lte':
      return compare('<=', value);
    case '$includes':
      return compare('like', `%${text}%`);
    case '$notIncludes':
      return compare('not like', `%${text}%`);
    case '$startsWith':
      return compare('like', `${text}%`);
    case '$endsWith':
      return compare('like', `%${text}`);
    default:
      throw new CrmError('forbidden', 403);
  }
}
export function assertFields(
  input: Row,
  access: DatabaseAuthorizationConditions,
): void {
  if (Object.keys(input).some((key) => !access.fields.includes(key)))
    throw new CrmError('forbidden', 403);
}
export function outputFields(
  entity: Entity,
  access: DatabaseAuthorizationConditions,
): string[] {
  return fieldsFor(entity).filter((f) => access.fields.includes(f));
}
