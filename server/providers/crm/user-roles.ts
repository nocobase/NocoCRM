import type { DatabaseConnection } from '@nocobase/db';
import type { AppAuthorizationService } from '@nocobase/app-plugin-authorization/server';
import {
  UserManagementError,
  UserRoleScopeError,
  type UserRoleScope,
  type UserRoleValue,
} from '@nocobase/app-plugin-users/server/tokens';
import { roleKey, roles } from './authorization.js';

// The CRM's roles in the Users page (Settings → Users), replacing the
// template's generic provider: a user holds exactly one CRM role, the last
// administrator can neither lose the role nor be disabled, and only the
// three CRM roles are offered. The permission sets stay the source of truth.
const ADMINISTRATOR = 'system-administrator';
const USERS_I18N_NAMESPACE = '@nocobase/app-plugin-users';

export function createCrmUserRoleScope(
  authorization: Pick<AppAuthorizationService, 'permissionSets'>,
): UserRoleScope {
  const managed = roles.map(roleKey);
  const sets = (connection?: DatabaseConnection) =>
    connection
      ? authorization.permissionSets.withTransaction(connection)
      : authorization.permissionSets;
  const assignedRole = (
    assignments: readonly {
      permissionSet: string;
      subject: { type: string; id: string };
    }[],
    userId: string,
  ): string =>
    assignments.find(
      (a) =>
        a.subject.type === 'user' &&
        a.subject.id === userId &&
        managed.includes(a.permissionSet),
    )?.permissionSet ?? '';
  const administrators = (
    assignments: readonly {
      permissionSet: string;
      subject: { type: string; id: string };
    }[],
  ): string[] =>
    assignments
      .filter(
        (a) =>
          a.subject.type === 'user' &&
          a.permissionSet === roleKey(ADMINISTRATOR),
      )
      .map((a) => a.subject.id);
  return {
    key: 'app',
    label: 'Roles',
    labelI18nKey: 'page.roles',
    labelI18nNs: USERS_I18N_NAMESPACE,
    selection: 'single',
    requiredOnCreate: true,
    hasAuthenticatedDefaultAccess: true,
    async options() {
      const all = await authorization.permissionSets.list();
      return roles.map((role) => {
        const set = all.find((s) => s.key === roleKey(role));
        return {
          value: roleKey(role),
          // The permission set's title is bilingual because the
          // Authorization pages do not translate; the Users page does, so
          // it shows the CRM's own wording in the current language.
          label:
            (typeof set?.title === 'string' ? set.title.trim() : '') ||
            roleKey(role),
          labelI18nKey: `crm.options.${role}`,
          labelI18nNs: 'crm',
        };
      });
    },
    async get(userId, connection) {
      return assignedRole(await sets(connection).listAssignments(), userId);
    },
    async getMany(userIds, connection) {
      const assignments = await sets(connection).listAssignments();
      return Object.fromEntries(
        userIds.map((id) => [id, assignedRole(assignments, id)]),
      );
    },
    async findUserIds(role, connection) {
      if (!managed.includes(role))
        throw new UserManagementError(
          'INVALID_ROLE_SCOPE_VALUE',
          `Unknown CRM role: ${role}`,
        );
      return (await sets(connection).listAssignments())
        .filter((a) => a.permissionSet === role && a.subject.type === 'user')
        .map((a) => a.subject.id);
    },
    async replace(userId, value: UserRoleValue, connection) {
      const role = typeof value === 'string' ? value : (value[0] ?? '');
      if (typeof value !== 'string' && value.length > 1)
        throw new UserManagementError(
          'INVALID_ROLE_SCOPE_VALUE',
          'A user holds one CRM role',
        );
      if (!managed.includes(role))
        throw new UserManagementError(
          'INVALID_ROLE_SCOPE_VALUE',
          `Unknown CRM role: ${role}`,
        );
      const assignments = await sets(connection).listAssignments();
      const admins = administrators(assignments);
      if (
        role !== roleKey(ADMINISTRATOR) &&
        admins.length === 1 &&
        admins[0] === userId
      )
        throw new UserRoleScopeError(
          'LAST_ADMINISTRATOR',
          'The last administrator keeps the administrator role',
          409,
        );
      await sets(connection).replaceSubjectAssignments({
        subject: { type: 'user', id: userId },
        managedPermissionSets: managed,
        permissionSets: [role],
      });
    },
    async assertCanDisable(userId, connection) {
      const admins = administrators(await sets(connection).listAssignments());
      if (admins.length === 1 && admins[0] === userId)
        throw new UserRoleScopeError(
          'LAST_ADMINISTRATOR',
          'The last administrator cannot be disabled',
          409,
        );
    },
  };
}
