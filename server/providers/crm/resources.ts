import {
  defineCompositeResource,
  type AuthorizationTitle,
  type CompositeResourceContribution,
  type PermissionGrant,
} from '@nocobase/authorization/core';
import { definePermissionSet } from '@nocobase/authorization/permission-sets';
import {
  defineDatabasePermission,
  recordAccess,
} from '@nocobase/app-plugin-authorization/server';
import { definitions, entities, type Entity } from './schema.js';
import { roleKey } from './roles.js';

// The CRM's permission model as the authorization plugin's composite
// resources (its business operations): what each object supports (view, create, edit, delete, each
// with the record scopes it can be limited to) and the three capabilities
// beyond one's own records (assign, approve, manage). Declaring them this
// way is what makes the permission sets readable and editable on the
// Permission Sets page; the grants a set stores reference these composites
// and the plugin expands them into the collection grants the service layer
// authorizes against, so `conditions()` and `capability()` are unchanged.
// Portable: no registration, no database, no assignment happens here.

// The application's locale namespace is its package name, `crm`, and the
// CRM's own keys sit under `crm.` inside it (client/locales/crm).
const crm = (key: string): AuthorizationTitle => ({
  key: `crm.${key}`,
  ns: 'crm',
});

// The permission workspace's subsections the CRM's composites are listed in:
// the objects under Business, the capabilities (which grant the CRM's own
// resource type rather than collections) under Administration.
export const CRM_GROUP = 'crm';
export const CRM_CAPABILITIES_GROUP = 'crm-capabilities';
export const CRM_SALES_RESOURCE = 'crm.sales';
// One scope key for every object operation: the set stores
// `{ view: { records: 'allRecords' } }` and the page shows one selector.
export const RECORDS_SCOPE = 'records';

// The plugin's built-in record access, referenced by key; it applies to
// every registered collection and reads `ownerId` / `createdById`.
export const recordScopes = {
  allRecords: recordAccess.allRecords,
  recordsIOwn: recordAccess.recordsIOwn,
  recordsICreated: recordAccess.recordsICreated,
} as const;
export type RecordScope = keyof typeof recordScopes;

export const entityActions = ['view', 'create', 'edit', 'delete'] as const;
export type EntityAction = (typeof entityActions)[number];
// The collection operation each business action stands for.
export const operationOf: Record<EntityAction, string> = {
  view: 'read',
  create: 'create',
  edit: 'update',
  delete: 'delete',
};

export function entityResourceName(entity: Entity): string {
  return `crm.${entity}`;
}

function entityResource(entity: Entity) {
  const table = definitions[entity].table;
  // The permission is validated when defined, so each operation is added
  // inside the definition.
  const data = (
    configure: (
      permission: ReturnType<
        ReturnType<typeof defineDatabasePermission>['title']
      >,
    ) => ReturnType<typeof defineDatabasePermission>,
  ) =>
    defineDatabasePermission((p) =>
      configure(p.collection(table).title(crm(`entities.${entity}`))),
    );
  return defineCompositeResource(entityResourceName(entity), (r) =>
    r
      .title(crm(`entities.${entity}`))
      .action('view', (a) =>
        a.title(crm('authz.actions.view')).grant(
          RECORDS_SCOPE,
          data((p) =>
            p
              .read('*')
              .options(recordScopes.allRecords, recordScopes.recordsIOwn)
              .default(recordScopes.allRecords),
          ),
        ),
      )
      // Creating has no record scope: the grant is bound without a scope
      // key, so the page shows no selector for it.
      .action('create', (a) =>
        a.title(crm('authz.actions.create')).grant({
          build: () => ({ grants: [data((p) => p.create('*')).build()] }),
        }),
      )
      .action('edit', (a) =>
        a.title(crm('authz.actions.edit')).grant(
          RECORDS_SCOPE,
          data((p) =>
            p
              .update('*')
              .options(recordScopes.allRecords, recordScopes.recordsIOwn)
              .default(recordScopes.recordsIOwn),
          ),
        ),
      )
      .action('delete', (a) =>
        a.title(crm('authz.actions.delete')).grant(
          RECORDS_SCOPE,
          data((p) =>
            p
              .delete()
              .options(
                recordScopes.allRecords,
                recordScopes.recordsICreated,
                recordScopes.recordsIOwn,
              )
              .default(recordScopes.recordsIOwn),
          ),
        ),
      ),
  );
}

export const crmEntityResources = Object.fromEntries(
  entities.map((entity) => [entity, entityResource(entity)]),
) as Record<Entity, ReturnType<typeof entityResource>>;

// A capability is a plain grant on the CRM's own resource type (`crm/sales`),
// which `capability()` asks for; wrapped as a contribution so it can be an
// action of a composite. Assign: give a record to someone else;
// approve: decide approval requests; export: take records out as a file.
// Whether a user may act on records they do not own is not a capability
// but the edit scope of each object.
function capability(action: string): CompositeResourceContribution {
  return {
    build: () => ({
      grants: [
        { resource: { type: 'crm', id: 'sales' }, actions: [{ action }] },
      ],
    }),
  };
}

export const capabilityActions = [
  'assign',
  'approve',
  'export',
  'manageSkills',
] as const;
export type CapabilityAction = (typeof capabilityActions)[number];

export const crmSalesResource = defineCompositeResource(
  CRM_SALES_RESOURCE,
  (r) =>
    r
      .title(crm('authz.sales'))
      .action('assign', (a) =>
        a.title(crm('authz.actions.assign')).grant(capability('assign')),
      )
      .action('approve', (a) =>
        a.title(crm('authz.actions.approve')).grant(capability('approve')),
      )
      .action('export', (a) =>
        a.title(crm('authz.actions.export')).grant(capability('export')),
      )
      // Edit the company's notes on the CRM's AI skills (skills.ts).
      .action('manageSkills', (a) =>
        a
          .title(crm('authz.actions.manageSkills'))
          .grant(capability('manageSkills')),
      ),
);

// The application's pages, by the page id each route declares as its `authz`
// (client/routes.ts, the route name): the client checks `page/<id> access`
// before rendering a route, and the permission workspace lists the pages
// from the client route tree.
export const crmPages: readonly { name: string; title: AuthorizationTitle }[] =
  [
    { name: 'home', title: crm('authz.pages.home') },
    { name: 'crm-actions', title: crm('actions') },
    ...entities.map((entity) => ({
      name: `crm-${entity}`,
      title: crm(`entities.${entity}`),
    })),
    { name: 'crm-record', title: crm('authz.pages.record') },
    { name: 'crm-notifications', title: crm('authz.pages.notifications') },
    { name: 'crm-skills', title: crm('authz.pages.skills') },
  ];

export function pageGrant(name: string): PermissionGrant {
  return {
    resource: { type: 'page', id: name },
    actions: [{ action: 'access' }],
  };
}

// A set's selection per operation: the record scope of view, edit and
// delete; create takes none.
export type ViewScope = 'allRecords' | 'recordsIOwn';
export type EntityScopes = {
  view?: { records?: ViewScope };
  create?: Record<string, never>;
  edit?: { records?: ViewScope };
  delete?: { records?: RecordScope };
};

export function entityGrant(
  entity: Entity,
  scopes: EntityScopes,
): PermissionGrant {
  return crmEntityResources[entity].reference().grant(scopes);
}

export function salesGrant(
  ...actions: [CapabilityAction, ...CapabilityAction[]]
): PermissionGrant {
  return crmSalesResource.reference().grant(...actions);
}

// The two sales roles as the plugin's permission sets: values, saved by
// provisioning once and editable by administrators afterwards. The
// administrator is the plugin's root set (roles.ts), which has no grants.
export function crmPermissionSet(role: string) {
  if (role === 'system-administrator')
    throw new Error('The administrator is the root set, not a CRM set.');
  const manager = role === 'sales-manager';
  let set = definePermissionSet(roleKey(role)).title(
    manager ? 'Sales manager / 销售经理' : 'Salesperson / 销售人员',
  );
  for (const page of crmPages) set = set.grant(pageGrant(page.name));
  for (const entity of entities)
    set = set.grant(
      entityGrant(entity, {
        view: { records: 'allRecords' },
        create: {},
        edit: { records: manager ? 'allRecords' : 'recordsIOwn' },
        // Deleting is the one write that is not "manage all": a manager
        // removes only what they created themselves, a salesperson only
        // their own approval drafts; an administrator, being root, anything.
        ...(manager || entity === 'approvals'
          ? { delete: { records: manager ? 'recordsICreated' : 'recordsIOwn' } }
          : {}),
      }),
    );
  if (manager)
    set = set.grant(salesGrant('assign', 'approve', 'export', 'manageSkills'));
  return set.build();
}
