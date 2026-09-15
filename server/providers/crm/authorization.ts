import { toText } from './schema.js';
import type {
  AppAuthorization,
  AuthorizationScope,
  DatabaseAuthorizationConditions,
  DatabaseAuthorizationParams,
  DatabaseFilter,
  DatabaseFilterOperator,
} from '@nocobase/app-plugin-authorization';
import type {
  ComparisonOperator,
  DatabaseManager,
  Expression,
  ExpressionBuilder,
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
}
export const roles: string[] = [
  'sales-representative',
  'sales-manager',
  'system-administrator',
];
export function roleKey(role: string): string {
  return `crm-${toText(role)}`;
}
export function registerCrmResources(authz: AppAuthorization): void {
  for (const entity of entities)
    authz.database.collections.add({
      name: definitions[entity].table,
      title: entity,
      actions: ['read', 'create', 'update', 'delete'],
      fields: fieldsFor(entity),
      attributes: {
        identifier: 'id',
        owner: 'ownerId',
        creator: 'createdById',
      },
    });
  authz.resources.add({
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

export async function provisionCrm(
  authz: AppAuthorization,
  database: DatabaseManager,
): Promise<void> {
  for (const role of roles) {
    const key = roleKey(role);
    if (await authz.permissionSets.get(key)) continue;
    const manager = role !== 'sales-representative';
    const grants = entities.map((entity) =>
      authz.database.grant(definitions[entity].table, {
        read: { fields: { output: '*' }, recordAccess: ['allRecords'] },
        create: { fields: { input: '*', output: '*' } },
        update: {
          fields: { input: '*', output: '*' },
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
    if (role === 'system-administrator') {
      grants.push({
        resource: { type: 'authorization.settings', id: '*' },
        actions: ['read', 'create', 'update', 'delete', 'manage'].map(
          (action) => ({ action }),
        ),
      });
      grants.push({
        resource: { type: 'crm', id: 'settings' },
        actions: [{ action: 'manage' }],
      });
      grants.push({
        resource: { type: '*', id: '*' },
        actions: [{ action: '*' }],
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
      !admin.grants.some(
        (grant) => grant.resource.type === 'authorization.settings',
      )
    )
      await authz.permissionSets.update(admin.key, {
        ...admin,
        grants: [
          ...admin.grants,
          {
            resource: { type: 'authorization.settings', id: '*' },
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
      const grant = authz.database.grant('crmApprovals', {
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
    const users = await authz.administration.listUsers();
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
    resource: {
      type: 'database.collection',
      id: `main.${toText(definitions[entity].table)}`,
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
const operators: Record<DatabaseFilterOperator, ComparisonOperator> = {
  $eq: '=',
  $ne: '!=',
  $in: 'in',
  $notIn: 'not in',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
};
export function compileFilter(
  eb: ExpressionBuilder,
  filter: DatabaseFilter,
): Expression<SqlBool> {
  return eb.and(
    Object.entries(filter).map(([key, value]) => {
      if (key === '$and' || key === '$or') {
        if (!Array.isArray(value)) throw new CrmError('forbidden', 403);
        const parts = value.map((item) =>
          compileFilter(eb, item as DatabaseFilter),
        );
        return key === '$and' ? eb.and(parts) : eb.or(parts);
      }
      if (!value || Array.isArray(value)) throw new CrmError('forbidden', 403);
      return eb.and(
        Object.entries(value).map(([operator, expected]) => {
          const op = operators[operator as DatabaseFilterOperator];
          if (!op) throw new CrmError('forbidden', 403);
          return eb(
            key,
            expected === null ? (op === '=' ? 'is' : 'is not') : op,
            expected,
          );
        }),
      );
    }),
  );
}
export function assertFields(
  input: Row,
  access: DatabaseAuthorizationConditions,
): void {
  if (
    access.fields.input !== '*' &&
    Object.keys(input).some((key) => !access.fields.input.includes(key))
  )
    throw new CrmError('forbidden', 403);
}
export function outputFields(
  entity: Entity,
  access: DatabaseAuthorizationConditions,
): string[] {
  const fields = fieldsFor(entity);
  return access.fields.output === '*'
    ? fields
    : fields.filter((f) => access.fields.output.includes(f));
}
