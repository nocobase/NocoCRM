import { useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router';
import { FileText, Sparkles } from 'lucide-react';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { ErrorNotice } from './common.js';
import { RecordForm } from './form.js';
import { FollowUpOption } from './follow-up-option.js';
import { AdjustTurns, CaptureTabs, type Turn } from './lead-capture.js';
import { LengthHint } from './length-hint.js';
import {
  fieldLabelKey,
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type Data,
} from './api.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';

// "New opportunity" with the AI (server/providers/crm/opportunity-capture.ts),
// as "new lead" is (lead-capture.tsx): paste what you have — a customer's
// email about buying more, a renewal, a tender notice — and the AI fills the
// opportunity form; the account is matched by the server, the people the
// text names are matched to the account's contacts, and those not found may
// be created with the opportunity. The account's open deals are shown, so
// the same business is not opened twice. Picking another account matches
// again. Nothing is saved until the salesperson creates it.

interface Person {
  name: string;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  contactId: string | null;
  contactName?: string;
}
interface CapturedDeal {
  input: Data;
  company: string | null;
  accounts: { id: string; name: string }[];
  people: Person[];
  duplicates: { id: string; name: string; stage: string }[];
  uncertain: string[];
}
const rowsOf = (value: unknown): Data[] =>
  Array.isArray(value) ? (value as Data[]) : [];
const SELLER_ROLES = ['sales-representative', 'sales-manager'];
// What the form keeps of the opportunity; the rest of what the AI returns
// is for the review.
const FIELDS = [
  'name',
  'accountId',
  'ownerId',
  'stage',
  'amount',
  'currency',
  'expectedCloseAt',
  'source',
  'businessType',
  'contacts',
  'description',
];

export function OpportunityCaptureDialog({
  draft,
  onDraft,
  onClose,
  onForm,
}: {
  // What was pasted, kept by the page while the user switches to the form
  // and back.
  draft: string;
  onDraft: (draft: string) => void;
  onClose: () => void;
  onForm: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const { data: meta } = useMetadata();
  const pasted = draft;
  const [busy, setBusy] = useState<'organise' | 'adjust' | 'create'>();
  const [error, setError] = useState<unknown>();
  const [deal, setDeal] = useState<CapturedDeal>();
  // The form's values as they stand, and a key that remounts the form when
  // the AI or the matching replaces them.
  const [input, setInput] = useState<Data>({});
  const [revision, setRevision] = useState(0);
  const [changed, setChanged] = useState<string[]>([]);
  const [organised, setOrganised] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [instruction, setInstruction] = useState('');
  const [followUp, setFollowUp] = useState(true);
  const definitions = meta?.definitions.opportunities.fields ?? [];
  const required = definitions
    .filter((f) => f.required && FIELDS.includes(f.key))
    .map((f) => f.key);
  const missing = required.filter(
    (key) =>
      input[key] === undefined || input[key] === null || input[key] === '',
  );
  // A new deal's owner is the reader when they sell, as in the form.
  const defaults: Data = {
    stage: 'contact',
    currency: meta?.settings.currency ?? 'USD',
    ...(meta?.users.some(
      (u) =>
        u.id === meta.userId && u.roles.some((r) => SELLER_ROLES.includes(r)),
    )
      ? { ownerId: meta.userId }
      : {}),
  };
  const titles: Record<string, string> = {
    ...Object.fromEntries(
      (deal?.accounts ?? []).map((a) => [a.id, a.name] as const),
    ),
    ...Object.fromEntries(
      (deal?.people ?? [])
        .filter((p) => p.contactId)
        .map((p) => [p.contactId!, p.contactName ?? p.name] as const),
    ),
  };
  const take = (next: CapturedDeal, base: Data, adjusting: boolean): void => {
    // An adjustment returns every field, null where cleared.
    const values = Object.fromEntries(
      Object.entries(next.input).filter(([, v]) => v !== null),
    );
    const merged: Data = adjusting
      ? Object.fromEntries(
          Object.entries({ ...base, ...next.input }).filter(
            ([, v]) => v !== null,
          ),
        )
      : { ...defaults, ...values };
    setChanged(
      adjusting
        ? Object.keys(next.input).filter(
            (key) =>
              JSON.stringify(next.input[key] ?? null) !==
              JSON.stringify(base[key] ?? null),
          )
        : [],
    );
    setDeal(next);
    setInput(merged);
    setRevision((n) => n + 1);
  };

  const organise = async (): Promise<void> => {
    if (!pasted.trim() || busy) return;
    setBusy('organise');
    setError(undefined);
    try {
      const { data } = await api<{ data: { deal: CapturedDeal } }>(
        'opportunities/capture',
        'POST',
        { text: pasted },
      );
      take(data.deal, {}, false);
      setOrganised(pasted);
      setTurns([]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(undefined);
    }
  };

  const adjust = async (): Promise<void> => {
    const said = instruction.trim();
    if (!said || busy || !deal) return;
    setBusy('adjust');
    setError(undefined);
    try {
      const { data } = await api<{
        data: { deal: CapturedDeal; reply?: string };
      }>('opportunities/capture', 'POST', {
        text: pasted,
        instruction: said,
        // The contacts as rows: the server names them for the AI.
        deal: Object.fromEntries(
          FIELDS.map((key) => [key, input[key] ?? null]),
        ),
        accountId: input.accountId ?? '',
      });
      take(data.deal, input, true);
      setTurns((all) => [
        ...all,
        { id: crypto.randomUUID(), from: 'user', text: said },
        ...(data.reply
          ? [{ id: crypto.randomUUID(), from: 'ai' as const, text: data.reply }]
          : []),
      ]);
      setInstruction('');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(undefined);
    }
  };

  // Another account picked: its open deals, and the contacts matched again.
  // A person the text named is looked for among the new account's contacts
  // (or becomes new there); a contact picked by hand belongs to the old one.
  const onChange = (next: Data): void => {
    const account = toText(next.accountId ?? '');
    if (deal && account !== toText(input.accountId ?? '')) {
      setInput(next);
      const people = rowsOf(next.contacts).flatMap((row): Data[] => {
        if (row.person) return [row];
        const named = deal.people.find(
          (p) => p.contactId && p.contactId === toText(row.contactId ?? ''),
        );
        return named ? [{ ...named, role: row.role, contactId: null }] : [];
      });
      void api<{
        data: {
          people: Person[];
          contacts: Data[];
          duplicates: CapturedDeal['duplicates'];
        };
      }>('opportunities/capture/match', 'POST', {
        accountId: account,
        people,
      })
        .then(({ data }) => {
          setDeal({
            ...deal,
            people: data.people,
            duplicates: data.duplicates,
          });
          setInput({ ...next, contacts: data.contacts });
          setRevision((n) => n + 1);
        })
        .catch(setError);
      return;
    }
    setInput(next);
  };

  const create = async (): Promise<void> => {
    if (!deal || missing.length || busy) return;
    setBusy('create');
    setError(undefined);
    try {
      // The new people in the list, created as the account's contacts
      // first; rows left without a contact are dropped.
      const contacts: Data[] = [];
      for (const row of rowsOf(input.contacts)) {
        if (row.person) {
          const person = row.person as Data;
          const { data } = await api<{ data: CrmRecord }>('contacts', 'POST', {
            name: person.name,
            accountId: input.accountId,
            ...(person.jobTitle ? { jobTitle: person.jobTitle } : {}),
            ...(person.phone ? { phone: person.phone } : {}),
            ...(person.email ? { email: person.email } : {}),
            ...(input.ownerId ? { ownerId: input.ownerId } : {}),
          });
          contacts.push({ contactId: toText(data.id), role: row.role });
        } else if (toText(row.contactId ?? ''))
          contacts.push({ contactId: row.contactId, role: row.role });
      }
      const payload = Object.fromEntries(
        FIELDS.filter(
          (key) =>
            input[key] !== undefined &&
            input[key] !== null &&
            input[key] !== '',
        ).map((key) => [key, key === 'contacts' ? contacts : input[key]]),
      );
      const { data } = await api<{ data: CrmRecord }>(
        `opportunities?via=capture${followUp ? '' : '&followUp=0'}`,
        'POST',
        { ...payload, contacts },
      );
      await refresh();
      onClose();
      void navigate(`/crm/opportunities/${toText(data.id)}`);
    } catch (e) {
      setError(e);
      setBusy(undefined);
    }
  };

  const join = (items: string[]): string =>
    items.join(language.startsWith('zh') ? '、' : ', ');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`max-h-[90svh] overflow-y-auto ${
          deal ? 'sm:max-w-6xl' : 'sm:max-w-4xl'
        }`}
      >
        <DialogHeader>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <DialogTitle>
              {text('newRecord', { entity: text('entity.opportunities') })}
            </DialogTitle>
            <CaptureTabs
              current='ai'
              disabled={Boolean(busy)}
              onSwitch={onForm}
            />
          </div>
        </DialogHeader>
        {!deal ? (
          <div className='grid gap-4'>
            <ErrorNotice error={error} />
            <div>
              <Textarea
                autoFocus
                value={pasted}
                className='max-h-[50svh] min-h-48'
                maxLength={LONG_TEXT_LIMIT}
                disabled={Boolean(busy)}
                placeholder={text('dealCapture.placeholder')}
                aria-label={text('leadCapture.input')}
                onChange={(e) => onDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void organise();
                  }
                }}
              />
              <LengthHint length={pasted.length} language={language} />
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                disabled={Boolean(busy)}
                onClick={onClose}
              >
                {text('cancel')}
              </Button>
              <Button
                className='bg-ai text-ai-foreground hover:bg-ai/90'
                disabled={Boolean(busy) || !pasted.trim()}
                onClick={() => void organise()}
              >
                {busy ? <Spinner /> : <Sparkles />}
                {text(busy ? 'leadCapture.organising' : 'leadCapture.organise')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className='grid gap-4'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start'>
              <div className='grid min-w-0 gap-3'>
                <RecordForm
                  key={revision}
                  entity='opportunities'
                  initial={input}
                  titles={titles}
                  review={deal.uncertain}
                  changed={changed}
                  notice={(unfilled) => (
                    <div className='grid gap-1 rounded-lg bg-ai/10 p-3 text-sm'>
                      <p className='flex gap-2'>
                        <Sparkles className='mt-0.5 size-4 shrink-0 text-ai' />
                        <span>
                          {text('leadCapture.filledNotice')}
                          {unfilled.length > 0 && (
                            <>
                              {language.startsWith('zh') ? '' : ' '}
                              <span className='font-medium text-warning'>
                                {text('leadCapture.fillRequired', {
                                  fields: join(
                                    unfilled.map((key) =>
                                      text(fieldLabelKey('opportunities', key)),
                                    ),
                                  ),
                                })}
                              </span>
                            </>
                          )}
                        </span>
                      </p>
                      {/* The account: found by the company the text names,
                          or to be picked (or created first). */}
                      {deal.company && !input.accountId && (
                        <p className='text-warning'>
                          {text(
                            deal.accounts.length
                              ? 'dealCapture.severalAccounts'
                              : 'dealCapture.noAccount',
                            { company: deal.company },
                          )}
                        </p>
                      )}
                      {deal.duplicates.length > 0 && (
                        <p className='text-warning'>
                          {text('dealCapture.duplicates')}{' '}
                          {deal.duplicates.map((d, index) => (
                            <span key={d.id}>
                              {index > 0 &&
                                (language.startsWith('zh') ? '、' : ', ')}
                              <Link
                                to={`/crm/opportunities/${d.id}`}
                                target='_blank'
                                className='underline underline-offset-2'
                              >
                                {d.name}
                              </Link>{' '}
                              <span className='text-muted-foreground'>
                                {text(`options.${d.stage}`)}
                              </span>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  )}
                  embedded={{ onChange }}
                  onClose={() => undefined}
                />
              </div>
              {/* The text beside the form, and the conversation that adjusts
                  it, as in the lead capture. */}
              <aside className='grid content-start gap-3 rounded-lg border bg-muted/30 p-3 md:sticky md:top-0'>
                <div className='grid gap-1.5'>
                  <h3 className='flex items-center gap-1.5 text-sm font-medium'>
                    <FileText className='size-4 text-muted-foreground' />
                    {text('leadCapture.original')}
                  </h3>
                  <Textarea
                    value={pasted}
                    disabled={Boolean(busy)}
                    maxLength={LONG_TEXT_LIMIT}
                    className='max-h-[32svh] min-h-24 bg-background'
                    aria-label={text('leadCapture.original')}
                    onChange={(e) => onDraft(e.target.value)}
                  />
                  {pasted.trim() !== '' && pasted !== organised && (
                    <div className='flex items-center justify-between gap-2'>
                      <span className='text-xs text-muted-foreground'>
                        {text('dealCapture.reorganiseHint')}
                      </span>
                      <Button
                        size='sm'
                        variant='outline'
                        className='shrink-0 text-ai hover:text-ai'
                        disabled={Boolean(busy)}
                        onClick={() => void organise()}
                      >
                        {busy === 'organise' ? <Spinner /> : <Sparkles />}
                        {text('leadCapture.reorganise')}
                      </Button>
                    </div>
                  )}
                </div>
                <div className='grid gap-2 border-t pt-3'>
                  <h3 className='flex items-center gap-1.5 text-sm font-medium'>
                    <Sparkles className='size-4 text-ai' />
                    {text('leadCapture.adjustTitle')}
                  </h3>
                  <AdjustTurns turns={turns} />
                  <Textarea
                    value={instruction}
                    disabled={Boolean(busy)}
                    maxLength={1000}
                    className='min-h-16 bg-background'
                    placeholder={text('leadCapture.adjustPlaceholder')}
                    aria-label={text('leadCapture.adjust')}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        void adjust();
                      }
                    }}
                  />
                  <Button
                    size='sm'
                    className='justify-self-end bg-ai text-ai-foreground hover:bg-ai/90'
                    disabled={Boolean(busy) || !instruction.trim()}
                    onClick={() => void adjust()}
                  >
                    {busy === 'adjust' ? <Spinner /> : <Sparkles />}
                    {text(
                      busy === 'adjust'
                        ? 'leadCapture.adjusting'
                        : 'leadCapture.adjust',
                    )}
                  </Button>
                </div>
              </aside>
            </div>
            <ErrorNotice error={error} />
            <DialogFooter>
              <FollowUpOption
                checked={followUp}
                onChange={setFollowUp}
                disabled={Boolean(busy)}
                label='dealFollowUpNow'
              />
              <Button
                variant='outline'
                disabled={Boolean(busy)}
                onClick={onClose}
              >
                {text('cancel')}
              </Button>
              <Button
                disabled={Boolean(busy) || missing.length > 0}
                onClick={() => void create()}
              >
                {busy === 'create' && <Spinner />}
                {text('dealCapture.create')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
