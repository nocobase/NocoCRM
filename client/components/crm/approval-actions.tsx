import { useState, type ReactElement } from 'react';
import { Send, ShieldCheck, ShieldX, Trash2, Undo2 } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Textarea } from '../ui/textarea.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import {
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type Data,
} from './api.js';
import { ErrorNotice } from './common.js';
import { ConfirmDialog } from '../../pages/crm-detail.js';

type Decision = 'submit' | 'withdraw' | 'approve' | 'reject';

// The steps an approval can take, offered to whoever may take them and
// confirmed in a dialog: the applicant submits, withdraws or deletes their
// own request while it is theirs to change; the approver decides a pending
// one, with a comment. Used on the approval page and on an opportunity's
// approvals tab, so both behave the same.
export function ApprovalActions({
  approval,
  names,
  withDelete = false,
  onDeleted,
}: {
  approval: Data;
  names: Record<string, string>;
  // The approval page deletes through its own flow (it must leave the page).
  withDelete?: boolean;
  onDeleted?: () => void;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [decision, setDecision] = useState<Decision | ''>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  if (!meta) return null;
  const status = toText(approval.status);
  const applicant = approval.ownerId === meta.userId;
  const canSubmit = applicant && ['draft', 'withdrawn'].includes(status);
  const canWithdraw = applicant && status === 'pending';
  const canDecide =
    meta.approve &&
    approval.approverId === meta.userId &&
    approval.ownerId !== meta.userId &&
    status === 'pending';
  // An administrator may delete an approval in any state.
  const canDelete =
    withDelete &&
    (canSubmit || meta.settingsAccess) &&
    Boolean(meta.permissions.approvals.delete);
  if (!canSubmit && !canWithdraw && !canDecide && !canDelete) return null;
  const run = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      setDecision('');
      setConfirmDelete(false);
      setComment('');
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className='flex flex-wrap gap-2'>
        {canDelete && (
          <Button
            size='sm'
            variant='outline'
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
            {text('deleteRecord', { entity: text('entity.approvals') })}
          </Button>
        )}
        {canSubmit && (
          <Button size='sm' onClick={() => setDecision('submit')}>
            <Send />
            {text('submit')}
          </Button>
        )}
        {canWithdraw && (
          <Button
            size='sm'
            variant='outline'
            onClick={() => setDecision('withdraw')}
          >
            <Undo2 />
            {text('withdraw')}
          </Button>
        )}
        {canDecide && (
          <>
            <Button size='sm' onClick={() => setDecision('approve')}>
              <ShieldCheck />
              {text('approve')}
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={() => setDecision('reject')}
            >
              <ShieldX />
              {text('reject')}
            </Button>
          </>
        )}
      </div>
      {decision && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v && !busy) setDecision('');
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {text(`decisionTitle.${decision}`, {
                  name: toText(approval.name),
                })}
              </DialogTitle>
              <DialogDescription>
                {text(`decisionHint.${decision}`, {
                  approver:
                    names[toText(approval.approverId)] ??
                    text('fields.approverId'),
                })}
              </DialogDescription>
            </DialogHeader>
            <ErrorNotice error={error} />
            {(decision === 'approve' || decision === 'reject') && (
              <Textarea
                aria-label={text('comment')}
                placeholder={text('comment')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            )}
            <DialogFooter>
              <Button
                variant='outline'
                disabled={busy}
                onClick={() => setDecision('')}
              >
                {text('cancel')}
              </Button>
              <Button
                disabled={busy}
                variant={decision === 'reject' ? 'destructive' : 'default'}
                onClick={() =>
                  void run(async () => {
                    await api(
                      `approvals/${toText(approval.id)}/${decision}`,
                      'POST',
                      { comment },
                    );
                  })
                }
              >
                {busy ? text('saving') : text('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={text('deleteRecordTitle', {
            entity: text('entity.approvals'),
            name: toText(approval.name),
          })}
          description={text(
            canSubmit ? 'deleteApprovalHint' : 'deleteDecidedApprovalHint',
          )}
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            void run(async () => {
              await api(`approvals/${toText(approval.id)}`, 'DELETE');
              onDeleted?.();
            })
          }
        />
      )}
    </>
  );
}
