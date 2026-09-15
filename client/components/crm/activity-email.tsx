import { useState, type ReactElement } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
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
  useCrmQuery,
  useCrmText,
  useRefresh,
  type Data,
} from './api.js';
import { ErrorNotice } from './common.js';

interface EmailPreview {
  subject: string;
  body: string;
  recipients: { id: string; name: string; email: string }[];
  sentAt: string | null;
  sentTo: string | null;
}

// Sending an email activity to its external participants. The dialog holds
// exactly what will go out — recipients, subject, body — because the send is
// an external effect the user cannot take back. Subject and body start from
// the activity's name and description and can be reworded here; the activity
// then keeps the wording that was sent.
export function ActivityEmailAction({
  record,
}: {
  record: Data;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  // Undefined until the user types: the draft then follows the prefill.
  const [subjectDraft, setSubjectDraft] = useState<string>();
  const [bodyDraft, setBodyDraft] = useState<string>();
  const id = toText(record.id);
  const { data: preview, error: previewError } = useCrmQuery<EmailPreview>(
    `activities/${id}/email`,
    open,
  );
  const subject = subjectDraft ?? preview?.subject ?? '';
  const body = bodyDraft ?? preview?.body ?? '';
  const sent = Boolean(record.emailSentAt);
  const ready = Boolean(
    preview && preview.recipients.length && subject.trim() && body.trim(),
  );
  const close = (): void => {
    if (busy) return;
    setOpen(false);
    setError(undefined);
    setSubjectDraft(undefined);
    setBodyDraft(undefined);
  };
  return (
    <>
      <Button
        size='sm'
        variant={sent ? 'outline' : 'default'}
        onClick={() => setOpen(true)}
      >
        <Mail />
        {text(sent ? 'sendEmailAgain' : 'sendEmail')}
      </Button>
      {open && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) close();
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {text('emailTitle', { name: toText(record.name) })}
              </DialogTitle>
              <DialogDescription>{text('emailHint')}</DialogDescription>
            </DialogHeader>
            <ErrorNotice error={error ?? previewError} />
            {preview && (
              <dl className='grid gap-3 text-sm'>
                <div className='grid gap-1'>
                  <dt className='text-muted-foreground'>
                    {text('emailRecipients')}
                  </dt>
                  <dd>
                    {preview.recipients.length ? (
                      preview.recipients.map((r) => (
                        <div key={r.id}>
                          {r.name} &lt;{r.email}&gt;
                        </div>
                      ))
                    ) : (
                      <span className='text-destructive'>
                        {text('errors.noRecipient')}
                      </span>
                    )}
                  </dd>
                </div>
                <div className='grid gap-1'>
                  <dt className='text-muted-foreground'>
                    {text('emailSubject')}
                  </dt>
                  <dd>
                    <Input
                      aria-label={text('emailSubject')}
                      value={subject}
                      onChange={(e) => setSubjectDraft(e.target.value)}
                    />
                  </dd>
                </div>
                <div className='grid gap-1'>
                  <dt className='text-muted-foreground'>{text('emailBody')}</dt>
                  <dd>
                    <Textarea
                      aria-label={text('emailBody')}
                      rows={8}
                      value={body}
                      onChange={(e) => setBodyDraft(e.target.value)}
                    />
                    {!body.trim() && (
                      <p className='mt-1 text-xs text-destructive'>
                        {text('errors.emailBodyRequired')}
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            )}
            <DialogFooter>
              <Button variant='outline' disabled={busy} onClick={close}>
                {text('cancel')}
              </Button>
              <Button
                disabled={busy || !ready}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setError(undefined);
                    try {
                      await api(`activities/${id}/email`, 'POST', {
                        subject,
                        body,
                      });
                      await refresh();
                      setBusy(false);
                      setOpen(false);
                    } catch (e) {
                      setError(e);
                      setBusy(false);
                    }
                  })();
                }}
              >
                {busy ? text('sending') : text('send')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
