// A row's Reset password and Delete on the prepared Users page
// (user-extras.tsx says what the CRM adds there and why).
import { useSubmission, useToaster } from '@nocobase/app-client';
import type { ManagedUser } from '@nocobase/app-plugin-users/client/user-client';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { Button } from '#components/ui/button';
import { useUserPermission } from '../hooks.js';
import { ConfirmAction } from '../shared.js';
import { errorReason, errorStatus, useAdminText } from '../common/hooks.js';
import { useUsersClient } from './data.js';

/**
 * A row's Reset password and Delete, buttons beside the page's own (Disable,
 * Revoke sessions): `items` the buttons, `dialogs` what they open, `offered`
 * whether there is any. Deleting oneself the server refuses, and the dialog
 * says so.
 */
export function useUserExtras(
  user: ManagedUser,
  reload: () => void,
): {
  readonly items: ReactNode;
  readonly dialogs: ReactNode;
  readonly offered: boolean;
} {
  const { text } = useAdminText();
  const location = useLocation();
  const client = useUsersClient();
  const toaster = useToaster();
  const canReset = useUserPermission('reset-password', user.id);
  const canDelete = useUserPermission('delete', user.id);
  const [deleting, setDeleting] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [error, setError] = useState<string>();
  // As the page's own row actions: one operation key per deletion.
  const submission = useSubmission();
  const busy = requestBusy || submission.submitting;
  const remove = async (): Promise<void> => {
    setRequestBusy(true);
    setError(undefined);
    try {
      const done = await submission.run(
        { action: 'delete', id: user.id },
        async (key) => {
          await client.remove(user.id, key);
          return true;
        },
      );
      if (!done) return;
      toaster.show({
        type: 'success',
        title: text('users.toasts.deleted', { name: user.name }),
      });
      setDeleting(false);
      reload();
    } catch (caught) {
      setError(
        errorReason(caught) === 'SELF_DELETE_NOT_ALLOWED'
          ? text('users.errors.self')
          : errorStatus(caught) === 400
            ? text('users.errors.holdsRecords')
            : errorReason(caught) === 'LAST_ASSIGNMENT'
              ? text('users.errors.lastAdministrator')
              : text('common.failed'),
      );
    } finally {
      setRequestBusy(false);
    }
  };
  const items = (
    <>
      {canReset && (
        <Button
          variant='outline'
          size='xs'
          nativeButton={false}
          render={
            <Link
              to={{
                pathname: `${encodeURIComponent(user.id)}/password`,
                search: location.search,
              }}
            />
          }
        >
          {text('users.actions.password')}
        </Button>
      )}
      {canDelete && (
        <Button
          variant='outline'
          size='xs'
          onClick={() => {
            setError(undefined);
            setDeleting(true);
          }}
        >
          {text('users.actions.delete')}
        </Button>
      )}
    </>
  );
  const dialogs = canDelete && (
    <ConfirmAction
      open={deleting}
      title={text('users.confirm.deleteTitle', { name: user.name })}
      description={text('users.confirm.deleteBody')}
      confirmLabel={text('users.actions.delete')}
      error={error}
      busy={busy}
      onCancel={() => setDeleting(false)}
      onConfirm={() => void remove()}
    />
  );
  return { items, dialogs, offered: canReset || canDelete };
}
