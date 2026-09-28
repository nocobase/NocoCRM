import type { DatabaseConnection } from '@nocobase/db';
import type { AppAuthorization } from '@nocobase/app-plugin-authorization/server';
import {
  UserManagementError,
  UserRoleScopeError,
  type UserRoleScope,
  type UserRoleValue,
} from '@nocobase/app-plugin-users/server/tokens';
import { roleKey, roles } from './authorization.js';

// The CRM's roles in the Users page (Settings → Users), replacing the
// template's generic provider: a user holds one or more CRM roles (their
// grants add up, as the authorization plugin composes permission sets),
// the last administrator can neither lose the role nor be disabled, and
// only the three CRM roles are offered. The permission sets stay the
// source of truth.
const ADMINISTRATOR = 'system-administrator';
const USERS_I18N_NAMESPACE = '@nocobase/app-plugin-users';

export function createCrmUserRoleScope(
  authorization: Pick<AppAuthorization, 'permissionSets'>,
): UserRoleScope {
  const managed = roles.map(roleKey);
  const sets = (connection?: DatabaseConnection) =>
    connection
      ? authorization.permissionSets.withTransaction(connection)
      : authorization.permissionSets;
  // The CRM roles a user holds, in the roles' own order.
  const assignedRoles = (
    assignments: readonly {
      permissionSet: string;
      subject: { type: string; id: string };
    }[],
    userId: string,
  ): string[] =>
    managed.filter((key) =>
      assignments.some(
        (a) =>
          a.subject.type === 'user' &&
          a.subject.id === userId &&
          a.permissionSet === key,
      ),
    );
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
    selection: 'multiple',
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
      return assignedRoles(await sets(connection).listAssignments(), userId);
    },
    async getMany(userIds, connection) {
      const assignments = await sets(connection).listAssignments();
      return Object.fromEntries(
        userIds.map((id) => [id, assignedRoles(assignments, id)]),
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
      const chosen = [...new Set(typeof value === 'string' ? [value] : value)];
      // A user of the CRM holds at least one of its roles; taking every
      // role away is what disabling the account is for.
      if (!chosen.length)
        throw new UserManagementError(
          'INVALID_ROLE_SCOPE_VALUE',
          'A user holds at least one CRM role',
        );
      for (const role of chosen)
        if (!managed.includes(role))
          throw new UserManagementError(
            'INVALID_ROLE_SCOPE_VALUE',
            `Unknown CRM role: ${role}`,
          );
      const assignments = await sets(connection).listAssignments();
      const admins = administrators(assignments);
      if (
        !chosen.includes(roleKey(ADMINISTRATOR)) &&
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
        permissionSets: chosen,
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
