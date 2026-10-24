import {
  plainTextToMailHtml,
  useMailClient,
} from '@nocobase/app-plugin-mail/client';
import { useToaster, createUuid, copyText } from '@nocobase/app-client';
import { Copy, Mail, SquarePen } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Button } from '../ui/button.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.js';
import { Spinner } from '../ui/spinner.js';
import { toText, useCrmApi, useCrmText, type Data } from './api.js';
import { useMailComposer, useMailSetup } from './mail.js';
import { ErrorNotice } from './common.js';

// An AI follow-up whose next step is an email (lead-evaluation.tsx): the
// draft laid out to be read and changed on the card, with whom it goes to
// and whom it copies, and sent from there through the Mail plugin as the
// person, from their own mailbox. The fields ticked on the card are
// written first (`beforeSend`), so a send the provider refuses loses none
// of them; sending is what accepts the card (`onSent`). Nothing is sent but by the person pressing Send; without a
// mailbox to send from, the draft is copied instead.
//
// Who it goes to: a lead's own address; on a deal, its primary contact (else
// its first with an address), the others on it copied, as the AI was told
// to address it.

interface Person {
  readonly name: string;
  readonly address: string;
}

// "Name <address>" pairs typed as a list, back into addresses.
const parse = (value: string): { address: string; name?: string }[] =>
  value
    .split(/[,;，；\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(.*?)<([^>]+)>$/.exec(part);
      return match
        ? {
            address: match[2].trim(),
            ...(match[1].trim() ? { name: match[1].trim() } : {}),
          }
        : { address: part };
    });
const format = (people: readonly Person[]): string =>
  people
    .map((p) => (p.name ? `${p.name} <${p.address}>` : p.address))
    .join(', ');
const valid = (address: string): boolean =>
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);

// The people the email goes to and copies, read from the record.
async function recipientsOf(
  api: ReturnType<typeof useCrmApi>,
  entity: 'leads' | 'opportunities',
  recordId: string,
): Promise<{ to: Person[]; cc: Person[] }> {
  const record = (
    await api<{ data: { record: Data } }>(`${entity}/${recordId}`)
  ).data.record;
  if (entity === 'leads')
    return {
      to: record.email
        ? [{ name: toText(record.name), address: toText(record.email) }]
        : [],
      cc: [],
    };
  const rows = (
    Array.isArray(record.contacts) ? record.contacts : []
  ) as Data[];
  // The primary contact first, the rest in their order.
  const ordered = [
    ...rows.filter((row) => row.primary),
    ...rows.filter((row) => !row.primary),
  ];
  const people = (
    await Promise.allSettled(
      ordered.map((row) =>
        api<{ data: { record: Data } }>(`contacts/${toText(row.contactId)}`),
      ),
    )
  )
    .flatMap((result) =>
      result.status === 'fulfilled' ? [result.value.data.record] : [],
    )
    .filter((contact) => contact.email)
    .map((contact) => ({
      name: toText(contact.name),
      address: toText(contact.email),
    }));
  return { to: people.slice(0, 1), cc: people.slice(1) };
}

export function EmailStep({
  entity,
  recordId,
  draft,
  editable,
  beforeSend,
  onSent,
  sendRef,
  heading,
}: {
  entity: 'leads' | 'opportunities';
  recordId: string;
  draft: { subject: string; body: string };
  // A waiting card the reader may decide: changed and sent here. Otherwise
  // the draft as it was, to read.
  editable: boolean;
  // Before the message goes as part of accepting the whole card: what else
  // the card writes. Sent from the box itself, it goes alone.
  beforeSend?: () => Promise<void>;
  // Once the provider took it: the card is accepted, with the rest of what
  // it proposes when `all`, else as the email alone.
  onSent: (all: boolean) => Promise<void>;
  // The card's own "accept all" sends through this, as the draft stands.
  sendRef?: { current: ((all: boolean) => Promise<void>) | null };
  // What the box is, atop it.
  heading?: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const mail = useMailClient();
  const toaster = useToaster();
  const { senders } = useMailSetup();
  const composer = useMailComposer();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  // The copy line shows once it holds someone or is asked for.
  const [ccShown, setCcShown] = useState(false);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [copied, setCopied] = useState(false);
  // One key for this card's message, so sending again after an unclear
  // answer cannot send it twice (the plugin's idempotency).
  const [idempotencyKey] = useState(() => createUuid());
  // The recipients, read once from the record.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!editable) return;
    let active = true;
    void recipientsOf(api, entity, recordId)
      .then((people) => {
        if (!active) return;
        setTo(format(people.to));
        setCc(format(people.cc));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      active = false;
    };
  }, [api, editable, entity, recordId]);
  // The body grows with what is written, up to half the screen.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const box = bodyRef.current;
    if (!box) return;
    // A long draft scrolls within a third of the screen, so the card
    // around it stays one view.
    const limit = Math.round(Math.min(window.innerHeight / 3, 320));
    box.style.height = 'auto';
    box.style.height = `${String(Math.min(box.scrollHeight, limit))}px`;
    box.style.overflowY = box.scrollHeight > limit ? 'auto' : 'hidden';
  }, [body]);
  const sender = senders.find((a) => a.id === accountId) ?? senders[0];
  const toList = parse(to);
  const ccList = parse(cc);
  const ready =
    toList.length > 0 &&
    [...toList, ...ccList].every((p) => valid(p.address)) &&
    subject.trim() !== '' &&
    body.trim() !== '';
  // The whole composer, the card's fields written first; sending there
  // The whole composer; sending there accepts the card as the email alone.
  const openComposer = (): void => {
    setError(undefined);
    composer.compose(
      {
        // The composer takes bare addresses; a name with one
        // would be sent as part of the address, which the
        // provider refuses.
        to: toList.map((p) => p.address).join(', '),
        cc: ccList.map((p) => p.address).join(', '),
        subject,
        text: body,
        html: plainTextToMailHtml(body),
      },
      async (sent) => {
        if (sent) await onSent(false);
      },
    );
  };
  // From the box, the email alone; from the card's "accept all", with what
  // else it writes first.
  const send = async (all = false): Promise<void> => {
    if (!sender || !ready) {
      if (all) setError(new Error(toText(text('emailStep.notReady'))));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      if (all) await beforeSend?.();
      const identities = await mail.listIdentities(sender.id);
      const identity =
        identities.find((i) => i.isPrimary && i.canSend) ??
        identities.find((i) => i.canSend);
      if (!identity) throw new Error(toText(text('emailStep.noIdentity')));
      const submission = await mail.sendMessage({
        accountId: sender.id,
        identityId: identity.id,
        to: toList,
        cc: ccList,
        subject: subject.trim(),
        text: body,
        html: plainTextToMailHtml(body),
        idempotencyKey,
      });
      if (['failed', 'cancelled'].includes(submission.status))
        throw new Error(toText(text('mail.failed')));
      // The mail reaches the record's timeline now rather than at the next
      // minute's pass.
      await api('mailTimeline/sync', 'POST', {}).catch(() => undefined);
      await onSent(all);
      toaster.show({
        type: submission.status === 'unknown' ? 'warning' : 'success',
        title: toText(
          text(
            submission.status === 'unknown' ? 'mail.unknown' : 'emailStep.sent',
          ),
        ),
      });
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  // The card's "accept all" reaches the send as the draft now stands.
  useEffect(() => {
    if (!sendRef) return;
    sendRef.current = send;
    return () => {
      sendRef.current = null;
    };
  });
  const field =
    'w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-60';
  // Decided, or the reader may not act: the draft as written.
  if (!editable)
    return (
      <div className='grid gap-1.5 rounded-lg border border-border bg-background/60 p-3'>
        {heading}
        <p className='font-medium'>{draft.subject}</p>
        <p className='break-words whitespace-pre-wrap'>{draft.body}</p>
      </div>
    );
  // The whole composer, for attachments, a signature or formatting;
  // sending there accepts the card too. Then sending it as it stands.
  const sendActions = (
    <>
      <Button size='xs' variant='ghost' disabled={busy} onClick={openComposer}>
        <SquarePen />
        {text('emailStep.openComposer')}
      </Button>
      {/* As the field updates' write: a plain button in the AI's colour,
          the card's own "accept all" being the filled one. */}
      <Button
        size='xs'
        variant='outline'
        className='border-primary/40 bg-card font-medium text-primary hover:bg-primary/10 hover:text-primary'
        disabled={busy || !ready}
        onClick={() => void send()}
      >
        {busy ? <Spinner /> : <Mail />}
        {text('emailStep.send')}
      </Button>
    </>
  );
  const label = (key: string) => (
    <span className='pt-1 text-xs text-muted-foreground'>{text(key)}</span>
  );
  return (
    <div className='grid gap-2 rounded-lg border border-border bg-background/60 p-3'>
      {heading}
      <div className='grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1.5'>
        {senders.length > 0 && (
          <>
            {label('emailStep.from')}
            {senders.length > 1 ? (
              <Select
                items={senders.map((account) => ({
                  value: account.id,
                  label: account.address,
                }))}
                value={sender?.id ?? ''}
                disabled={busy}
                onValueChange={(next: string | null) => {
                  if (next) setAccountId(next);
                }}
              >
                <SelectTrigger
                  size='sm'
                  className='w-full'
                  aria-label={toText(text('emailStep.from'))}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {senders.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className='truncate py-1'>{sender?.address}</span>
            )}
          </>
        )}
        {label('emailStep.to')}
        <span className='flex min-w-0 items-center gap-1'>
          <input
            className={field}
            value={to}
            disabled={busy}
            placeholder={loaded ? toText(text('emailStep.toPlaceholder')) : ''}
            onChange={(e) => setTo(e.target.value)}
            aria-label={toText(text('emailStep.to'))}
          />
          {/* An empty copy line is asked for, not drawn. */}
          {!cc && !ccShown ? (
            <Button
              size='xs'
              variant='ghost'
              className='shrink-0 text-muted-foreground'
              disabled={busy}
              onClick={() => setCcShown(true)}
            >
              {text('emailStep.addCc')}
            </Button>
          ) : null}
        </span>
        {cc || ccShown ? (
          <>
            {label('emailStep.cc')}
            <input
              className={field}
              value={cc}
              disabled={busy}
              autoFocus={ccShown && !cc}
              onChange={(e) => setCc(e.target.value)}
              aria-label={toText(text('emailStep.cc'))}
            />
          </>
        ) : null}
        {label('emailStep.subject')}
        <input
          className={`${field} font-medium`}
          value={subject}
          disabled={busy}
          onChange={(e) => setSubject(e.target.value)}
          aria-label={toText(text('emailStep.subject'))}
        />
      </div>
      <textarea
        ref={bodyRef}
        rows={6}
        className={`${field} resize-none leading-relaxed`}
        value={body}
        disabled={busy}
        onChange={(e) => setBody(e.target.value)}
        aria-label={toText(text('emailStep.body'))}
      />
      <ErrorNotice error={error} />
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {senders.length ? (
          sendActions
        ) : (
          <>
            <span className='mr-auto text-xs text-muted-foreground'>
              {text('emailStep.noMailbox')}
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                void copyText(`${subject}\n\n${body}`).then((copied) => {
                  if (copied) setCopied(true);
                });
              }}
            >
              <Copy />
              {text(copied ? 'evaluation.copied' : 'evaluation.copy')}
            </Button>
          </>
        )}
      </div>
      {composer.composer}
    </div>
  );
}
