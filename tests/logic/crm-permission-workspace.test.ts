// The role editor shows only the business operations and settings the
// application opts into (client/pages/settings/permission-workspace.ts), so
// every operation the CRM registers on the server has to be listed there, or
// an administrator can no longer grant or see it.
import { expect, it } from 'vitest';
import { permissionWorkspaceSelection } from '../../client/pages/settings/permission-workspace.js';
import {
  CRM_SALES_RESOURCE,
  capabilityActions,
  entityActions,
  entityResourceName,
} from '../../server/providers/crm/resources.js';
import { entities } from '../../server/providers/crm/schema.js';

function selected(id: string) {
  return permissionWorkspaceSelection.business.find(
    (entry) => entry.type === 'composite' && entry.id === id,
  )?.actions;
}

it("lists every object's operations", () => {
  for (const entity of entities)
    expect(selected(entityResourceName(entity))).toEqual([...entityActions]);
});

it('lists every sales capability', () => {
  expect(selected(CRM_SALES_RESOURCE)).toEqual([...capabilityActions]);
});

it('lists the CRM settings', () => {
  expect(
    permissionWorkspaceSelection.settings.find((entry) => entry.id === 'crm')
      ?.actions,
  ).toEqual(['manage']);
});
