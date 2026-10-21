// What the CRM adds to NocoBase 3's prepared Users page
// (client/pages/settings/users.tsx), which lists, creates, edits, disables
// and signs people out but neither invites, resets a password nor deletes:
// the Invite button beside New user, Reset password and Delete in a row's
// menu (user-row-extras.tsx), and the pending invitations under the table. Each is offered only to
// whoever holds the users plugin's action, which checks it again; a deletion
// the CRM's role scope refuses (the last administrator, someone CRM records
// still name) says why.
import { MailPlusIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';

import { Button } from '#components/ui/button';
import { useUserPermission } from '../hooks.js';
import { useAdminText } from '../common/hooks.js';
import { Invitations } from './invitations.js';

/** The page header's Invite button, beside New user. */
export function InviteUsersButton(): ReactElement | null {
  const { text } = useAdminText();
  const location = useLocation();
  const canInvite = useUserPermission('invite');
  const canAssign = useUserPermission('assign-role');
  if (!canInvite || !canAssign) return null;
  return (
    <Button
      variant='outline'
      nativeButton={false}
      render={<Link to={{ pathname: 'invite', search: location.search }} />}
    >
      <MailPlusIcon />
      {text('users.invite')}
    </Button>
  );
}

/** The invitations not yet accepted, under the table, for whoever may invite. */
export function PendingInvitations(): ReactElement | null {
  const canInvite = useUserPermission('invite');
  return canInvite ? <Invitations /> : null;
}
