import type { ReactElement } from 'react';
import { Navigate } from 'react-router';

// /settings/permission-sets, the CRM's own Permission sets page until it
// took NocoBase 3's prepared Roles page at /settings/roles.
export default function PermissionSetsRedirect(): ReactElement {
  return <Navigate to='/settings/roles' replace />;
}
