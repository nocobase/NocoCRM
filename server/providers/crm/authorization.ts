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
import { ROOT_SET, roleKey, roles } from './roles.js';
import {
  CRM_CAPABILITIES_GROUP,
  CRM_GROUP,
  CRM_SALES_RESOURCE,
  crmEntityResources,
  crmPages,
  crmPermissionSet,
  crmSalesResource,
  entityGrant,
  operationOf,
  pageGrant,
  salesGrant,
  type CapabilityAction,
  type EntityAction,
  type EntityScopes,
  type RecordScope,
} from './resources.js';
import type { PermissionGrant } from '@nocobase/authorization/permissions';

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
export { roles, roleKey, roleOf, ROOT_SET } from './roles.js';
export function registerCrmResources(authz: AppAuthorizationService): void {
  // Field, primary-key and ownership metadata come from the database; the
  // record-access strategies read `ownerId` and `createdById` by default.
  for (const entity of entities)
    authz.db.collections.add({
      name: definitions[entity].table,
      title: { key: `crm.entities.${entity}`, ns: 'crm' },
      actions: ['read', 'create', 'update', 'delete'],
    });
  // The business operations the Permission Sets page shows and edits
  // (resources.ts): one resource per object, one for the capabilities, in
  // the CRM's own group; and the application's pages, so a set can grant
  // entry page by page.
  authz.resourceGroups.add({
    name: CRM_GROUP,
    title: { key: 'crm.authz.group', ns: 'crm' },
    category: 'business',
  });
  authz.resourceGroups.add({
    name: CRM_CAPABILITIES_GROUP,
    title: { key: 'crm.authz.capabilities', ns: 'crm' },
    category: 'administration',
  });
  for (const entity of entities)
    crmEntityResources[entity].register(authz.resources);
  crmSalesResource.register(authz.resources);
  for (const page of crmPages)
    authz.pages.add({
      name: page.name,
      title: page.title,
      actions: ['access'],
    });
  // The CRM's capability resource (`crm/sales`, `crm/settings`): a plain
  // resource type resolved from grants, registered on the handler registry.
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
  const salesRoles = roles.filter((role) => role !== 'system-administrator');
  for (const role of salesRoles) {
    if (await authz.permissionSets.get(roleKey(role))) continue;
    await authz.permissionSets.create(crmPermissionSet(role));
  }
  const marker = async (id: string): Promise<boolean> =>
    Boolean(
      await database
        .query()
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst(),
    );
  const mark = async (id: string): Promise<void> => {
    await database
      .query()
      .insertInto('crmSettings')
      .values({ id, value: '{"version":1}', updatedAt: new Date() })
      .execute();
  };
  // The administrator used to be a set of the CRM's own, configured as the
  // root set; it is the plugin's root set now. An installation from before
  // moves that set's holders to root once and drops the set, so the
  // Permission Sets page lists one administrator.
  const legacyAdministrator = 'crm-system-administrator';
  if (!(await marker('authz-root-v1'))) {
    const legacy = await authz.permissionSets.get(legacyAdministrator);
    if (legacy) {
      const held = await authz.permissionSets.listAssignments(ROOT_SET);
      for (const assignment of await authz.permissionSets.listAssignments(
        legacyAdministrator,
      ))
        if (
          assignment.subject.type === 'user' &&
          !held.some(
            (a) =>
              a.subject.type === 'user' &&
              a.subject.id === assignment.subject.id,
          )
        )
          await authz.permissionSets.assign({
            permissionSet: ROOT_SET,
            subject: assignment.subject,
          });
      await authz.permissionSets.delete(legacyAdministrator);
    }
    await mark('authz-root-v1');
  }
  // Sets provisioned before the business operations existed hold raw
  // collection grants, a page wildcard and the capability grant, which the
  // Permission Sets page cannot show. Translate them once into the same
  // access expressed through the operations; an administrator's later edits
  // are then what the page shows and what the server enforces.
  if (!(await marker('authz-resources-v1'))) {
    for (const role of salesRoles) {
      const set = await authz.permissionSets.get(roleKey(role));
      if (!set) continue;
      const grants = translateLegacyGrants(set.grants);
      if (grants)
        await authz.permissionSets.update(set.key, { ...set, grants });
    }
    await mark('authz-resources-v1');
  }
  // The "manage" capability became "export" (all it ever gated); a set
  // translated while it was still called manage would hold a grant on an
  // action the resource no longer declares, which the plugin rejects.
  if (!(await marker('authz-export-v1'))) {
    for (const role of salesRoles) {
      const set = await authz.permissionSets.get(roleKey(role));
      if (!set) continue;
      let changed = false;
      const grants = set.grants.map((grant) =>
        grant.resource.type === 'resource' &&
        grant.resource.id === CRM_SALES_RESOURCE &&
        grant.actions.some((a) => a.action === 'manage')
          ? ((changed = true),
            {
              ...grant,
              actions: grant.actions.map((a) =>
                a.action === 'manage' ? { ...a, action: 'export' } : a,
              ),
            })
          : grant,
      );
      if (changed)
        await authz.permissionSets.update(set.key, { ...set, grants });
    }
    await mark('authz-export-v1');
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
    if (users.length === 1) {
      const subject = { type: 'user', id: users[0].id };
      const held = await authz.permissionSets.listAssignments(ROOT_SET);
      if (
        !held.some(
          (a) => a.subject.type === 'user' && a.subject.id === subject.id,
        )
      )
        await authz.permissionSets.assign({ permissionSet: ROOT_SET, subject });
    }
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

// Rewrites a set's grants from the raw form provisioning used to write
// (collection grants per table, `page/*`, `crm/sales` capabilities) into
// grants on the business operations, keeping the record scopes and the
// operations each grant held; grants the CRM does not own stay as they are.
// Returns undefined when nothing needed translating.
export function translateLegacyGrants(
  grants: readonly PermissionGrant[],
): PermissionGrant[] | undefined {
  const tables = new Map(
    entities.map((entity) => [definitions[entity].table, entity] as const),
  );
  const actionOf = new Map(
    (Object.entries(operationOf) as [EntityAction, string][]).map(
      ([action, operation]) => [operation, action] as const,
    ),
  );
  const scopes: Partial<Record<Entity, EntityScopes>> = {};
  const capabilities: CapabilityAction[] = [];
  const kept: PermissionGrant[] = [];
  let legacy = false;
  for (const grant of grants) {
    const entity =
      grant.resource.type === 'database.collection'
        ? tables.get(toText(grant.resource.id))
        : undefined;
    if (entity) {
      legacy = true;
      const target = (scopes[entity] ??= {});
      for (const operation of grant.actions) {
        const action = actionOf.get(toText(operation.action));
        if (!action) continue;
        const policy = operation.policy as
          { recordAccess?: readonly string[] } | undefined;
        const scope = toText(policy?.recordAccess?.[0] ?? '');
        if (action === 'create') target.create = {};
        else if (action === 'delete')
          target.delete = {
            records: (['allRecords', 'recordsIOwn', 'recordsICreated'].includes(
              scope,
            )
              ? scope
              : 'recordsIOwn') as RecordScope,
          };
        else
          target[action] = {
            records: scope === 'allRecords' ? 'allRecords' : 'recordsIOwn',
          };
      }
      continue;
    }
    if (grant.resource.type === 'page' && grant.resource.id === '*') {
      legacy = true;
      continue;
    }
    if (grant.resource.type === 'crm' && grant.resource.id === 'sales') {
      legacy = true;
      for (const operation of grant.actions) {
        // The former "manage" capability gated exactly what "export" does.
        const action =
          toText(operation.action) === 'manage'
            ? 'export'
            : toText(operation.action);
        if (['assign', 'approve', 'export'].includes(action))
          capabilities.push(action as CapabilityAction);
      }
      continue;
    }
    kept.push(grant);
  }
  if (!legacy) return undefined;
  const result: PermissionGrant[] = [];
  for (const page of crmPages) result.push(pageGrant(page.name));
  for (const entity of entities) {
    const target = scopes[entity];
    if (target && Object.keys(target).length)
      result.push(entityGrant(entity, target));
  }
  if (capabilities.length)
    result.push(
      salesGrant(
        ...(capabilities as [CapabilityAction, ...CapabilityAction[]]),
      ),
    );
  return [...result, ...kept];
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
