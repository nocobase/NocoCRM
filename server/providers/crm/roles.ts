import { toText } from './schema.js';

// The CRM's three roles as permission sets of the authorization plugin. The
// two sales roles are the CRM's own sets, keyed `crm-<role>`; the
// administrator is the plugin's built-in root set, which is unrestricted,
// assignable to users and keeps its last holder, exactly what the CRM's
// administrator needs, so no set of the CRM's own duplicates it. Kept apart
// from the declarations and the provisioning so both can import them.
export const roles: string[] = [
  'sales-representative',
  'sales-manager',
  'system-administrator',
];
export const ROOT_SET = 'root';
export function roleKey(role: string): string {
  return toText(role) === 'system-administrator'
    ? ROOT_SET
    : `crm-${toText(role)}`;
}
// The role a permission-set key stands for, or undefined for a set that is
// not one of the CRM's roles.
export function roleOf(key: string): string | undefined {
  return roles.find((role) => roleKey(role) === toText(key));
}
