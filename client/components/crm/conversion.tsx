import { recordTitle } from './lookups.js';
import { RecordPicker } from './record-picker.js';
import { toText } from './api.js';
import {
  Fragment,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Checkbox } from '../ui/checkbox.js';
import { Textarea } from '../ui/textarea.js';
import { Choice } from './form.js';
import { CountryChoice, SubdivisionChoice } from './geography.js';
import {
  LONG_TEXT_LIMIT,
  lengthLimit,
} from '../../../server/providers/crm/limits.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import { inherited, proposalFor } from './conversion-fields.js';
import { FollowUpOption } from './follow-up-option.js';
import { ErrorNotice, LongText, Value } from './common.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  useCrmScopeKey,
  useRecord,
  arrayValues,
  type CrmRecord,
  type Data,
  type Field,
} from './api.js';

function Section({
  title,
  note,
  aside,
  children,
}: {
  title: string;
  // Right after the title: what the duplicate check found, when nothing.
  note?: ReactNode;
  // On the title's row, at its right: whether the record is created or
  // linked, or whether there is one at all.
  aside?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <section className='space-y-3 rounded-xl border p-4'>
      <div className='flex min-h-8 flex-wrap items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
          <h3 className='text-sm font-medium'>{title}</h3>
          {note}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

// The fields a new record takes from the lead (and a new deal's own), laid
// out as they will be saved and each changeable, every section of the
// dialog alike, the labels in one column of one width: read as a value, opened for editing by a
// double-click, or Enter or F2 with focus (as the follow-up card's planned
// activity is); Enter or leaving keeps a text, Escape takes it back. An
// empty field shows a dash, so it can be filled too. The owner changes only
// for whoever may assign records. What is changed (`onChange`) is sent with
// the conversion over what the lead supplies, and the server checks it as
// any other write.
export function EditablePreview({
  entity,
  record,
  keys,
  names,
  onChange,
  disabled = false,
  required = [],
}: {
  entity: 'accounts' | 'contacts' | 'opportunities';
  record: Data;
  keys: readonly string[];
  names: Record<string, string>;
  onChange: (changes: Data) => void;
  disabled?: boolean;
  // Fields the conversion cannot go without (a name): marked while empty.
  required?: readonly string[];
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const [editing, setEditing] = useState<string | null>(null);
  const [before, setBefore] = useState<unknown>();
  if (!meta) return null;
  const fieldOf = (key: string): Field =>
    meta.definitions[entity].fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  const close = (): void => setEditing(null);
  const open = (key: string): void => {
    setBefore(record[key]);
    setEditing(key);
  };
  const keysOf = (
    event: KeyboardEvent<HTMLElement>,
    key: string,
    multiline = false,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Back to what it held when it opened; the dialog stays open.
      event.stopPropagation();
      onChange({ [key]: before });
      close();
    } else if (
      event.key === 'Enter' &&
      !multiline &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      close();
    }
  };
  const choices = (key: string): { value: string; label: string }[] =>
    key === 'ownerId'
      ? meta.users
          .filter(
            (u) =>
              !u.disabled &&
              u.roles.some((r) =>
                ['sales-representative', 'sales-manager'].includes(r),
              ),
          )
          .map((u) => ({ value: u.id, label: u.name }))
      : (meta.settings.options[key] ?? fieldOf(key).options ?? []).map((v) => ({
          value: v,
          label: toText(text(`options.${toText(v)}`, { defaultValue: v })),
        }));
  const editor = (key: string): ReactNode => {
    const field = fieldOf(key);
    const label = toText(text(`fields.${key}`));
    const value = toText(record[key] ?? '');
    if (field.type === 'country')
      return (
        <CountryChoice
          label={label}
          value={value}
          codes={field.options ?? []}
          onChange={(v) => {
            // A province only means something under its own country.
            onChange({ country: v || null, state: null });
            close();
          }}
        />
      );
    if (field.type === 'subdivision')
      return (
        <SubdivisionChoice
          label={label}
          value={value}
          country={toText(record.country ?? '')}
          onChange={(v) => {
            onChange({ state: v || null });
            close();
          }}
        />
      );
    if (field.type === 'select' || field.type === 'relation')
      return (
        <Choice
          label={label}
          value={value}
          choices={choices(key)}
          defaultOpen
          // A currency beside its amount, as on the deal's page.
          compact={key === 'currency'}
          below={key === 'currency'}
          onOpenChange={(isOpen) => !isOpen && close()}
          onChange={(v) => {
            onChange({ [key]: v || null });
            close();
          }}
        />
      );
    if (field.type === 'textarea')
      return (
        <Textarea
          autoFocus
          value={value}
          maxLength={LONG_TEXT_LIMIT}
          aria-label={label}
          onChange={(event) => onChange({ [key]: event.target.value })}
          onBlur={close}
          onKeyDown={(event) => keysOf(event, key, true)}
          className='max-h-60 min-h-16 bg-background'
        />
      );
    if (field.type === 'number' || field.type === 'date')
      return (
        <Input
          autoFocus
          type={field.type}
          min={field.type === 'number' ? 0 : undefined}
          step={field.type === 'number' ? '0.01' : undefined}
          value={field.type === 'date' ? value.slice(0, 10) : value}
          aria-label={label}
          onChange={(event) =>
            onChange({
              [key]:
                event.target.value === ''
                  ? null
                  : field.type === 'number'
                    ? Number(event.target.value)
                    : event.target.value,
            })
          }
          onBlur={close}
          onKeyDown={(event) => keysOf(event, key)}
        />
      );
    return (
      <Input
        autoFocus
        type={field.type === 'email' ? 'email' : 'text'}
        value={value}
        maxLength={lengthLimit(field.type ?? 'text')}
        aria-label={label}
        onChange={(event) => onChange({ [key]: event.target.value })}
        onBlur={close}
        onKeyDown={(event) => keysOf(event, key)}
      />
    );
  };
  // One value, read or opened for editing. `bare`: an amount without its
  // currency sign, where the currency stands beside it.
  const cell = (key: string, bare = false): ReactNode => {
    const label = toText(text(`fields.${key}`));
    const canEdit = !disabled && (key !== 'ownerId' || meta.assign);
    const empty = record[key] == null || record[key] === '';
    if (editing === key) return editor(key);
    return (
      <div
        role={canEdit ? 'button' : undefined}
        tabIndex={canEdit ? 0 : undefined}
        aria-label={canEdit ? label : undefined}
        // Wrapped, not cut: an address or an introduction reads whole
        // without opening it.
        className={`-mx-2 min-h-7 rounded-md px-2 py-1 break-words ${
          canEdit
            ? 'cursor-text transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            : ''
        }`}
        onDoubleClick={canEdit ? () => open(key) : undefined}
        onKeyDown={(event) => {
          if (canEdit && (event.key === 'Enter' || event.key === 'F2')) {
            event.preventDefault();
            open(key);
          }
        }}
      >
        {empty ? (
          <span
            className={
              required.includes(key)
                ? 'text-destructive'
                : 'text-muted-foreground'
            }
          >
            {required.includes(key) ? text('requiredEmpty') : '—'}
          </span>
        ) : fieldOf(key).type === 'textarea' ? (
          // As a long text reads on a record's page: Markdown, folded after
          // a few lines.
          <LongText value={toText(record[key])} />
        ) : (
          <Value
            record={record as CrmRecord}
            field={fieldOf(key)}
            lookup={names}
            bare={bare}
          />
        )}
      </div>
    );
  };
  return (
    <dl className='grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 text-sm'>
      {keys.map((key) => (
        <Fragment key={key}>
          <dt
            className={`text-muted-foreground ${
              fieldOf(key).type === 'textarea' ? 'self-start pt-1' : ''
            }`}
          >
            {toText(text(`fields.${key === 'money' ? 'amount' : key}`))}
          </dt>
          <dd className='min-w-0'>
            {key === 'money' ? (
              // A deal's amount as its page shows it: the currency, then the
              // bare number, each changed in place.
              <div className='flex items-center gap-2'>
                <div className='shrink-0'>{cell('currency')}</div>
                <div className='min-w-0 flex-1'>{cell('amount', true)}</div>
              </div>
            ) : (
              cell(key)
            )}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

// What the duplicate check found when it found nothing, so that an empty
// list of matches reads as checked rather than as not looked at.
// In the theme's success colour, as the follow-up card's own check is.
function Checked({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className='flex items-center gap-1.5 text-xs text-success'>
      <Check className='size-3.5 shrink-0' />
      {children}
    </p>
  );
}

export function ConvertDialog({
  lead,
  onClose,
  initial,
  onConverted,
}: {
  lead: CrmRecord;
  onClose: () => void;
  // The opportunity the AI's follow-up proposed, to start from.
  initial?: {
    opportunityName: string;
    amount: number | null;
    currency?: string | null;
  };
  // Runs once the lead is converted, before the dialog closes: accepting
  // the AI's conversion proposal records the decision here.
  onConverted?: () => Promise<unknown>;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const scopeKey = useCrmScopeKey();
  const preview = useCrmQuery<{
    accounts: CrmRecord[];
    contacts: CrmRecord[];
    opportunities: CrmRecord[];
    titles: Record<string, string>;
  }>(`leads/${toText(lead.id)}/conversion`);
  // The list endpoint puts total beside data, not inside it, so this reads
  // the raw response rather than going through useCrmQuery's unwrapping.
  const activities = useQuery({
    queryKey: [...scopeKey, `activities?leadId=${toText(lead.id)}&count`],
    queryFn: () =>
      api<{ total: number }>(`activities?leadId=${toText(lead.id)}&pageSize=1`),
  });
  const [input, setInput] = useState<Data>(() => ({
    accountName: lead.company ?? '',
    createOpportunity: Boolean(initial),
    // "Company + opportunity", per the specification's default.
    opportunityName:
      initial?.opportunityName ||
      `${toText(lead.company ?? lead.name)}${text('opportunitySuffix')}`,
    amount: initial?.amount ?? 0,
  }));
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // Whether the AI follows up the opportunity the conversion opens at once.
  const [followUp, setFollowUp] = useState(true);
  // What the person changed on the new account and the new contact, over
  // what the lead supplies, and on the deal beside its name and amount.
  const [accountEdits, setAccountEdits] = useState<Data>({});
  const [contactEdits, setContactEdits] = useState<Data>({});
  const [dealEdits, setDealEdits] = useState<Data>(() =>
    initial?.currency ? { currency: initial.currency } : {},
  );
  const set = (key: string, value: unknown): void =>
    setInput((v) => ({
      ...v,
      [key]: value,
      // A different account invalidates the contact choice and any overwrite
      // decisions made against the previous records.
      // Back to "untouched" for the contact, so the new account's own single
      // match can become the default again.
      ...(key === 'accountId'
        ? {
            contactId: undefined,
            overwriteAccountFields: [],
            overwriteContactFields: [],
          }
        : {}),
    }));

  const suggestedAccounts = preview.data?.accounts ?? [];
  // Until the user chooses, exactly one match is taken as the choice: a
  // single strong hit is more likely the same company than a new one, and a
  // wrong guess is one click away from "create new". Zero or several matches
  // leave "create new". `undefined` is untouched; `null` is an explicit new.
  const accountId =
    input.accountId === undefined
      ? suggestedAccounts.length === 1
        ? suggestedAccounts[0].id
        : null
      : input.accountId;
  // The chosen records: a suggestion the preview brought, or one picked by
  // search and read on its own.
  const pickedAccount = useRecord(
    accountId && !suggestedAccounts.some((r) => r.id === accountId)
      ? 'accounts'
      : undefined,
    accountId,
  );
  const account =
    suggestedAccounts.find((r) => r.id === accountId) ??
    (pickedAccount.data?.record?.id === accountId
      ? pickedAccount.data.record
      : undefined);
  const suggestedContacts = (preview.data?.contacts ?? []).filter(
    (c) => !account || c.accountId === account.id,
  );
  const contactId =
    input.contactId === undefined
      ? account && suggestedContacts.length === 1
        ? suggestedContacts[0].id
        : null
      : input.contactId;
  const pickedContact = useRecord(
    contactId && !suggestedContacts.some((r) => r.id === contactId)
      ? 'contacts'
      : undefined,
    contactId,
  );
  const contact =
    suggestedContacts.find((r) => r.id === contactId) ??
    (pickedContact.data?.record?.id === contactId
      ? pickedContact.data.record
      : undefined);
  // Names for the lead, the suggestions and whatever was picked by search.
  const names: Record<string, string> = {
    ...(preview.data?.titles ?? {}),
    ...(pickedAccount.data?.titles ?? {}),
    ...(pickedContact.data?.titles ?? {}),
  };
  // What is actually submitted: the derived choices, not the raw state.
  const resolved: Data = {
    ...input,
    accountId,
    contactId,
    // Changes to a record only when it is created here; one linked keeps
    // its own values, bar the overwrites ticked.
    ...(accountId ? {} : { account: accountEdits }),
    ...(contactId ? {} : { contact: contactEdits }),
    ...(input.createOpportunity === true ? { opportunity: dealEdits } : {}),
  };
  // The deals still open at the chosen account: a new opportunity beside
  // them may duplicate one already being worked.
  const accountDeals = useCrmQuery<CrmRecord[]>(
    `opportunities?accountId=${toText(accountId ?? '')}&pageSize=50`,
    Boolean(accountId),
  );
  const openDeals = accountId
    ? (accountDeals.data ?? []).filter(
        (o) => !['won', 'lost'].includes(toText(o.stage)),
      )
    : [];
  const linkedActivities = activities.data?.total ?? 0;

  // Conflicts: fields where the lead and the chosen record both have a value
  // and disagree; the user opts into each overwrite.
  const conflicts = (
    entity: 'accounts' | 'contacts',
    current: CrmRecord | undefined,
  ): string[] => {
    if (!current) return [];
    const proposed = proposalFor(lead, entity);
    return inherited[entity].filter(
      (key) => current[key] && proposed[key] && current[key] !== proposed[key],
    );
  };

  const modeToggle = (
    entity: 'accounts' | 'contacts',
    canLink: boolean,
  ): ReactElement => {
    const key = entity === 'accounts' ? 'accountId' : 'contactId';
    // Linking without a pick yet is the empty string: the picker is open,
    // nothing chosen. Null is an explicit "create new".
    const linking = resolved[key] !== null && resolved[key] !== undefined;
    return (
      <div className='flex gap-1 rounded-lg border p-0.5'>
        <Button
          type='button'
          size='sm'
          variant={linking ? 'ghost' : 'secondary'}
          onClick={() => set(key, null)}
        >
          {text('newRecord', { entity: text(`entity.${entity}`) })}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={linking ? 'secondary' : 'ghost'}
          disabled={!canLink}
          onClick={() => {
            const first =
              entity === 'accounts'
                ? suggestedAccounts[0]
                : suggestedContacts[0];
            set(key, first ? first.id : '');
          }}
        >
          {text('linkExisting')}
        </Button>
      </div>
    );
  };

  const overwriteList = (
    entity: 'accounts' | 'contacts',
    current: CrmRecord | undefined,
  ): ReactElement | null => {
    const fields = conflicts(entity, current);
    if (!current || !fields.length) return null;
    const key =
      entity === 'accounts'
        ? 'overwriteAccountFields'
        : 'overwriteContactFields';
    const proposed = proposalFor(lead, entity);
    const chosen = arrayValues(input[key]);
    const def = (k: string) =>
      meta?.definitions[entity].fields.find((f) => f.key === k) ?? { key: k };
    return (
      <div className='space-y-2'>
        <p className='text-xs text-muted-foreground'>
          {text('overwriteFields')}
        </p>
        {fields.map((field) => (
          <label key={field} className='flex items-start gap-2 text-sm'>
            <Checkbox
              className='mt-0.5'
              checked={chosen.includes(field)}
              onCheckedChange={(v) =>
                set(
                  key,
                  v ? [...chosen, field] : chosen.filter((x) => x !== field),
                )
              }
            />
            <span className='min-w-0'>
              <span className='text-muted-foreground'>
                {text(`fields.${field}`)}：
              </span>
              <Value record={current} field={def(field)} lookup={names} />
              <span className='mx-1 text-muted-foreground'>→</span>
              <Value
                record={proposed as CrmRecord}
                field={def(field)}
                lookup={names}
              />
            </span>
          </label>
        ))}
      </div>
    );
  };

  const chips = (
    records: CrmRecord[],
    entity: 'accounts' | 'contacts',
  ): ReactElement | null =>
    records.length ? (
      <div className='flex flex-wrap items-center gap-1.5'>
        <span className='text-xs text-muted-foreground'>
          {text('possibleDuplicates')}
        </span>
        {records.map((r) => {
          const key = entity === 'accounts' ? 'accountId' : 'contactId';
          const active = resolved[key] === r.id;
          return (
            <Button
              key={r.id}
              type='button'
              size='sm'
              variant={active ? 'secondary' : 'outline'}
              className='h-7'
              onClick={() => set(key, active ? null : r.id)}
            >
              {recordTitle(entity, r)}
            </Button>
          );
        })}
      </div>
    ) : null;

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className='max-h-[90svh] overflow-y-auto sm:max-w-2xl'
      >
        <DialogHeader>
          <DialogTitle>
            {text('convert')}：{recordTitle('leads', lead)}
          </DialogTitle>
          <DialogDescription>{text('conversionHint')}</DialogDescription>
        </DialogHeader>
        <ErrorNotice error={error ?? preview.error} />
        <form
          className='space-y-4'
          onSubmit={(e) => {
            void (async () => {
              e.preventDefault();
              setBusy(true);
              setError(undefined);
              try {
                await api(`leads/${toText(lead.id)}/convert`, 'POST', {
                  ...resolved,
                  followUp,
                });
                await onConverted?.();
                await refresh();
                onClose();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <Section
            title={text('entities.accounts')}
            note={
              preview.data && !suggestedAccounts.length ? (
                <Checked>{text('noDuplicateAccounts')}</Checked>
              ) : undefined
            }
            aside={modeToggle('accounts', true)}
          >
            {accountId !== null && accountId !== undefined && (
              <RecordPicker
                entity='accounts'
                label={text('entities.accounts')}
                value={toText(accountId)}
                titles={names}
                onChange={(v) => set('accountId', v || null)}
              />
            )}
            {chips(suggestedAccounts, 'accounts')}
            {/* Linking: the overwrites once one is picked, nothing before;
                creating: the new account's fields. */}
            {accountId !== null ? (
              accountId ? (
                overwriteList('accounts', account)
              ) : null
            ) : (
              // The name first, as the conversion sends it (accountName),
              // then what the account takes from the lead.
              <EditablePreview
                entity='accounts'
                record={{
                  ...proposalFor(lead, 'accounts'),
                  ...accountEdits,
                  name: input.accountName,
                }}
                keys={inherited.accounts}
                required={['name']}
                names={names}
                disabled={busy}
                onChange={({ name, ...changes }) => {
                  if (name !== undefined) set('accountName', name ?? '');
                  setAccountEdits((edits) => ({ ...edits, ...changes }));
                }}
              />
            )}
          </Section>

          <Section
            title={text('entities.contacts')}
            note={
              preview.data && !suggestedContacts.length ? (
                <Checked>{text('noDuplicateContacts')}</Checked>
              ) : undefined
            }
            aside={modeToggle('contacts', Boolean(account))}
          >
            {contactId !== null && contactId !== undefined && (
              <RecordPicker
                entity='contacts'
                bare
                label={text('entities.contacts')}
                value={toText(contactId)}
                titles={names}
                filter={account ? { accountId: toText(account.id) } : undefined}
                onChange={(v) => set('contactId', v || null)}
              />
            )}
            {chips(suggestedContacts, 'contacts')}
            {contactId !== null ? (
              contactId ? (
                overwriteList('contacts', contact)
              ) : null
            ) : (
              <EditablePreview
                entity='contacts'
                record={{ ...proposalFor(lead, 'contacts'), ...contactEdits }}
                keys={inherited.contacts}
                names={names}
                disabled={busy}
                onChange={(changes) =>
                  setContactEdits((edits) => ({ ...edits, ...changes }))
                }
              />
            )}
          </Section>

          <Section
            title={text('entities.opportunities')}
            aside={
              <label className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={Boolean(input.createOpportunity)}
                  onCheckedChange={(v) => set('createOpportunity', v === true)}
                />
                {text('createOpportunity')}
              </label>
            }
          >
            {openDeals.length > 0 && (
              <p className='flex items-start gap-1.5 text-xs text-warning'>
                <TriangleAlert className='mt-px size-3.5 shrink-0' />
                <span>
                  {text('openOpportunities')}
                  {openDeals
                    .map((o) => toText(o.name))
                    .join(language.startsWith('zh') ? '、' : ', ')}
                </span>
              </p>
            )}
            {input.createOpportunity === true && (
              // Its name, amount in its currency and when it is expected
              // to close, as the account's and the contact's fields are;
              // the rest the deal takes from the lead and the account.
              <EditablePreview
                entity='opportunities'
                record={{
                  name: input.opportunityName,
                  amount: input.amount,
                  currency:
                    dealEdits.currency ?? meta?.settings.currency ?? 'USD',
                  expectedCloseAt: dealEdits.expectedCloseAt,
                }}
                // The amount in one row with its currency (`money`).
                keys={['name', 'money', 'expectedCloseAt']}
                required={['name']}
                names={names}
                disabled={busy}
                onChange={({ name, amount, ...changes }) => {
                  if (name !== undefined) set('opportunityName', name ?? '');
                  if (amount !== undefined) set('amount', amount ?? 0);
                  setDealEdits((edits) => ({ ...edits, ...changes }));
                }}
              />
            )}
          </Section>

          <p className='text-xs text-muted-foreground'>
            {text('conversionImpact', { activities: linkedActivities })}
          </p>
          <DialogFooter>
            {/* The deal it opens, followed up by the AI at once unless
                unticked, as a new lead is. */}
            {input.createOpportunity === true && (
              <FollowUpOption
                checked={followUp}
                onChange={setFollowUp}
                disabled={busy}
                label='dealFollowUpNow'
              />
            )}
            <Button
              type='button'
              variant='outline'
              disabled={busy}
              onClick={onClose}
            >
              {text('cancel')}
            </Button>
            <Button
              type='submit'
              // Linking was chosen but nothing picked yet: nothing to submit.
              // A new account and a new deal need their names.
              disabled={
                busy ||
                accountId === '' ||
                contactId === '' ||
                (!accountId && !toText(input.accountName).trim()) ||
                (input.createOpportunity === true &&
                  !toText(input.opportunityName).trim())
              }
            >
              {busy ? text('saving') : text('convert')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
