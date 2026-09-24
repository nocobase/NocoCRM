import {
  LONG_TEXT_LIMIT,
  lengthLimit,
} from '../../../server/providers/crm/limits.js';
import { LengthHint } from './length-hint.js';
import { RecordMultiPicker, RecordPicker } from './record-picker.js';
import { FileDropZone, FileLinks } from './attachments.js';
import { editsAll, fieldLabelKey, toText } from './api.js';
import { CountryChoice, SubdivisionChoice } from './geography.js';
import { useRef, useState, type ReactElement } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Textarea } from '../ui/textarea.js';
import { Checkbox } from '../ui/checkbox.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import {
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  rows,
  arrayValues,
  type Entity,
  type CrmRecord,
  type Data,
  type Field,
} from './api.js';
import { ErrorNotice, Loading } from './common.js';

// The next full hour and one hour after it, as ISO strings.
function activityTimeDefaults(): { startAt: string; endAt: string } {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 3600000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function shiftedEnd(
  previousStart: unknown,
  previousEnd: unknown,
  nextStart: string,
): string {
  const next = new Date(nextStart).getTime();
  const prev = new Date(toText(previousStart)).getTime();
  const end = new Date(toText(previousEnd)).getTime();
  if (Number.isNaN(next)) return toText(previousEnd);
  const length =
    !Number.isNaN(prev) && !Number.isNaN(end) && end > prev
      ? end - prev
      : 3600000;
  return new Date(next + length).toISOString();
}

// A multi-select in the same dress as Choice: the trigger lists what is
// chosen, the popup ticks items on and off and stays open between picks.
export function MultiChoice({
  value,
  onChange,
  choices,
  label,
  disabled,
  onOpenChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  choices: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const labelOf = (id: string): string =>
    choices.find((c) => c.value === id)?.label ?? id;
  return (
    <Select
      multiple
      value={value}
      items={choices}
      onValueChange={(v) => onChange(v ?? [])}
      disabled={disabled}
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
    >
      <SelectTrigger
        className='h-auto min-h-8 w-full min-w-32 whitespace-normal'
        aria-label={label}
      >
        <SelectValue placeholder={text('choose')}>
          {(picked: string[] | null) =>
            picked?.length ? picked.map(labelOf).join('、') : text('choose')
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {choices.length ? (
          choices.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))
        ) : (
          <p className='px-2 py-1.5 text-sm text-muted-foreground'>
            {text('noRelatedRecords')}
          </p>
        )}
      </SelectContent>
    </Select>
  );
}

export function Choice({
  value,
  onChange,
  choices,
  label,
  disabled,
  emptyLabel,
  defaultOpen,
  onOpenChange,
  variant = 'default',
  below = false,
}: {
  value: string;
  onChange: (v: string) => void;
  choices: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  emptyLabel?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // "inline": a quiet trigger for a pick that sits inside a list row — no
  // border until hovered, small type — so the row does not read as a form.
  // "tag": the pick drawn as the grey tag it is read as (a contact's role on
  // a deal), with the chevron saying it can be changed.
  variant?: 'default' | 'inline' | 'tag';
  // Drop the list under the trigger instead of over it: a picker beside
  // other text (a currency next to its amount) must not cover that text.
  below?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const items = [
    { value: '', label: emptyLabel ?? text('choose') },
    ...choices,
  ];
  return (
    <Select
      value={value || ''}
      items={items}
      onValueChange={(v) => onChange(v ?? '')}
      disabled={disabled}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
    >
      <SelectTrigger
        className={
          variant === 'inline'
            ? 'h-7 w-full min-w-0 border-transparent bg-transparent text-xs hover:border-border hover:bg-muted data-[size=default]:h-7'
            : variant === 'tag'
              ? 'h-5 w-auto min-w-0 gap-0.5 rounded-md border-transparent bg-foreground/7 px-1.5 py-0 text-xs font-medium text-muted-foreground hover:bg-foreground/12 data-[size=default]:h-5 [&_svg]:size-3'
              : 'w-full min-w-32'
        }
        aria-label={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        // A tag is narrower than its choices, so its list opens below it at
        // a width of its own.
        alignItemWithTrigger={!below && variant !== 'tag'}
        align={below ? 'start' : variant === 'tag' ? 'end' : 'center'}
        className={variant === 'tag' ? 'min-w-40' : undefined}
      >
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function RecordForm({
  entity,
  initial = {},
  id,
  onClose,
  onSaved,
  saveLabel,
  onSubmit,
  andThen,
  titles,
}: {
  entity: Entity;
  initial?: Data;
  id?: string;
  onClose: () => void;
  onSaved?: (record: CrmRecord) => void;
  saveLabel?: string;
  onSubmit?: (input: Data) => Promise<void>;
  // A second submit button: save, then run this on the saved record (an
  // approval's "save and submit"). If the follow-up fails the dialog stays
  // open on the now-existing record, so a retry updates it rather than
  // creating it again.
  andThen?: { label: string; run: (record: CrmRecord) => Promise<void> };
  // Names the opening page already resolved, so preset relations show at once.
  titles?: Record<string, string>;
}): ReactElement {
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text, language } = useCrmText();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // The bare names of records picked in this form, for the deal name a new
  // opportunity takes from its account.
  const pickedNamesRef = useRef<Record<string, string>>({});
  // The record once created here, so a retry after a failed follow-up
  // updates it instead of creating a second one.
  const [createdId, setCreatedId] = useState<string>();
  // Which submit button fired: read inside the submit handler, so a ref
  // rather than state that would not have settled yet.
  const thenRef = useRef(false);
  const recordId = id ?? createdId;
  // No default for source: it is required, and a silent "other" would let
  // it pass unchosen and pollute the source statistics.
  const [input, setInput] = useState<Data>(() => ({
    // The current user, when they sell; an administrator picks an owner.
    ownerId: meta?.users.some(
      (u) =>
        u.id === meta.userId &&
        u.roles.some((r) =>
          ['sales-representative', 'sales-manager'].includes(r),
        ),
    )
      ? meta.userId
      : undefined,
    ...(entity === 'leads'
      ? { status: 'new' }
      : entity === 'accounts'
        ? { status: 'prospect' }
        : entity === 'contacts'
          ? { employed: true, primary: false, gender: 'unknown' }
          : entity === 'opportunities'
            ? {
                stage: 'contact',
                currency: meta?.settings.currency ?? 'USD',
              }
            : entity === 'activities'
              ? {
                  status: 'planned',
                  type: 'call',
                  // Scheduling usually means "soon": the next full hour, for
                  // an hour. Both are one edit away if not.
                  ...activityTimeDefaults(),
                }
              : {}),
    ...initial,
  }));
  const set = (key: string, value: unknown): void =>
    setInput((current) => ({
      ...current,
      [key]: value,
      // Moving the start keeps the activity's length; an end that would now
      // sit before the start is pulled along too.
      ...(entity === 'activities' && key === 'startAt' && value
        ? { endAt: shiftedEnd(current.startAt, current.endAt, toText(value)) }
        : {}),
      ...(key === 'accountId'
        ? {
            contacts: [],
            externalParticipants: [],
            opportunityId: null,
            ...(entity === 'opportunities' && !id && !current.name && value
              ? {
                  name: text('opportunityName', {
                    name: pickedNamesRef.current[toText(value)] ?? '',
                  }),
                }
              : {}),
          }
        : {}),
    }));
  const definitions = meta?.definitions[entity];
  const writable = meta?.permissions[entity][id ? 'update' : 'create'];
  const fields =
    definitions?.fields.filter(
      (f) =>
        !f.readOnly &&
        // An approval's applicant is whoever raises it; the server sets it.
        !(entity === 'approvals' && f.key === 'ownerId') &&
        !(
          entity === 'activities' &&
          !id &&
          initial.leadId &&
          ['accountId', 'opportunityId', 'externalParticipants'].includes(f.key)
        ) &&
        !(
          entity === 'activities' &&
          !id &&
          initial.accountId &&
          f.key === 'leadId'
        ) &&
        // A reason field exists only for the status it explains; hidden
        // otherwise, so a new record's form does not open with it.
        !(f.key === 'invalidReason' && input.status !== 'invalid') &&
        !(f.key === 'churnReason' && input.status !== 'churned') &&
        !(f.key === 'lostReason' && input.stage !== 'lost') &&
        !(
          ['pauseReason', 'resumeAt'].includes(f.key) &&
          input.stage !== 'paused'
        ) &&
        // Feedback is what happened; a planned activity has nothing to say yet.
        !(
          entity === 'activities' &&
          f.key === 'feedback' &&
          input.status === 'planned'
        ) &&
        writable &&
        (writable.fields === '*' || writable.fields.includes(f.key)),
    ) ?? [];
  const names = titles ?? {};
  const choices = (field: Field): { value: string; label: string }[] => {
    if (field.relation === 'users')
      return (meta?.users ?? [])
        .filter(
          (u) =>
            !u.disabled &&
            u.roles.length &&
            (field.key !== 'approverId' ||
              (u.id !== meta?.userId && u.canApprove)) &&
            // Only sellers own records; an administrator is not offered.
            (field.key !== 'ownerId' ||
              entity === 'approvals' ||
              u.roles.some((r) =>
                ['sales-representative', 'sales-manager'].includes(r),
              )),
        )
        .map((u) => ({ value: u.id, label: u.name }));
    const key =
      field.key === 'type' && entity === 'accounts' ? 'accountType' : field.key;
    return (meta?.settings.options[key] ?? field.options ?? []).map((v) => ({
      value: v,
      label: text(`options.${toText(v)}`, { defaultValue: v }),
    }));
  };
  const fieldInput = (field: Field): ReactElement => {
    const value = input[field.key];
    const label = text(`fields.${toText(field.key)}`);
    const common = {
      id: `crm-field-${toText(field.key)}`,
      'aria-label': label,
    };
    if (field.type === 'boolean')
      return (
        <Checkbox
          {...common}
          checked={Boolean(value)}
          onCheckedChange={(v) => set(field.key, v)}
        />
      );
    if (field.type === 'country')
      return (
        <CountryChoice
          label={label}
          value={toText(value ?? '')}
          codes={field.options ?? []}
          onChange={(v) => {
            set(field.key, v || null);
            // A subdivision only means something under its own country.
            set('state', null);
          }}
        />
      );
    if (field.type === 'subdivision')
      return (
        <SubdivisionChoice
          label={label}
          value={toText(value ?? '')}
          country={toText(input.country ?? '')}
          onChange={(v) => set(field.key, v || null)}
        />
      );
    // A related record is searched for, a page at a time. Contacts and deals
    // are looked for within the chosen account; a converted lead is not
    // offered, since its work has moved on to what it became.
    if (
      field.type === 'relation' &&
      field.relation &&
      field.relation !== 'users'
    )
      return (
        <RecordPicker
          entity={field.relation}
          label={label}
          value={toText(value ?? '')}
          titles={titles}
          filter={{
            ...(['contacts', 'opportunities'].includes(field.relation) &&
            input.accountId
              ? { accountId: toText(input.accountId) }
              : {}),
            // An approval is raised for a deal its applicant may edit, which
            // for a salesperson means their own: the picker offers only
            // those rather than letting the server refuse the pick.
            ...(entity === 'approvals' &&
            field.key === 'opportunityId' &&
            meta &&
            !editsAll(meta, 'opportunities')
              ? { ownerId: meta.userId }
              : {}),
          }}
          excludeStatus={field.relation === 'leads' ? 'converted' : undefined}
          onChange={(v, picked) => {
            if (picked) pickedNamesRef.current[v] = toText(picked.name);
            set(field.key, v || null);
          }}
          disabled={
            !id &&
            ['leadId', 'accountId', 'opportunityId'].includes(field.key) &&
            Boolean(initial[field.key])
          }
        />
      );
    if (field.type === 'multi' && field.relation && field.relation !== 'users')
      return (
        <RecordMultiPicker
          entity={field.relation}
          label={label}
          value={arrayValues(value).map(toText)}
          names={titles}
          filter={
            input.accountId ? { accountId: toText(input.accountId) } : undefined
          }
          onChange={(v) => set(field.key, v)}
        />
      );
    if (field.type === 'select' || field.type === 'relation')
      return (
        <Choice
          label={label}
          value={toText(value ?? '')}
          onChange={(v) => set(field.key, v || null)}
          choices={choices(field)}
          disabled={
            (field.key === 'ownerId' && !meta?.assign) ||
            (!id &&
              ['leadId', 'accountId', 'opportunityId'].includes(field.key) &&
              Boolean(initial[field.key]))
          }
        />
      );
    if (field.type === 'textarea')
      return (
        <div>
          <Textarea
            {...common}
            value={toText(value ?? '')}
            rows={4}
            maxLength={LONG_TEXT_LIMIT}
            required={field.required}
            onChange={(e) => set(field.key, e.target.value)}
          />
          <LengthHint length={toText(value ?? '').length} language={language} />
        </div>
      );
    if (field.type === 'multi')
      return (
        <MultiChoice
          label={label}
          value={arrayValues(value).map(toText)}
          choices={choices(field)}
          onChange={(v) => set(field.key, v)}
        />
      );
    if (field.type === 'contacts')
      return (
        <div className='space-y-3'>
          {rows(value).map((contact, index) => (
            <div
              className='grid grid-cols-2 gap-2 rounded-lg border p-3'
              key={
                toText(contact.contactId) || `unselected-${index.toString()}`
              }
            >
              <RecordPicker
                entity='contacts'
                bare
                label={text('entities.contacts')}
                value={toText(contact.contactId ?? '')}
                titles={titles}
                filter={
                  input.accountId
                    ? { accountId: toText(input.accountId) }
                    : undefined
                }
                onChange={(v) =>
                  set(
                    field.key,
                    rows(value).map((c, i) =>
                      i === index ? { ...c, contactId: v } : c,
                    ),
                  )
                }
              />
              <Choice
                label={text('fields.role')}
                value={toText(contact.role ?? 'other')}
                choices={[
                  'decisionMaker',
                  'champion',
                  'evaluator',
                  'influencer',
                  'user',
                  'blocker',
                  'other',
                ].map((v) => ({
                  value: v,
                  label: text(`options.${toText(v)}`),
                }))}
                onChange={(v) =>
                  set(
                    field.key,
                    rows(value).map((c, i) =>
                      i === index ? { ...c, role: v } : c,
                    ),
                  )
                }
              />
              <Button
                type='button'
                variant='ghost'
                onClick={() =>
                  set(
                    field.key,
                    rows(value).filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 />
                {text('remove')}
              </Button>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            disabled={!input.accountId}
            onClick={() =>
              set(field.key, [
                ...rows(value),
                { contactId: '', role: 'other', primary: false },
              ])
            }
          >
            <Plus />
            {text('addContact')}
          </Button>
        </div>
      );
    if (field.type === 'files')
      return (
        <div className='space-y-2'>
          {/* The same drop zone and file rows as a record's attachments
              tab; what lands here joins the form value and is saved with
              the record. */}
          <FileDropZone
            entity={entity}
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            onUploaded={(ids) =>
              set(field.key, [...arrayValues(value).map(toText), ...ids])
            }
          />
          <FileLinks
            files={arrayValues(value)}
            onRemove={(id) =>
              set(
                field.key,
                arrayValues(value).filter((v) => toText(v) !== id),
              )
            }
          />
        </div>
      );
    const date = ['date', 'datetime'].includes(field.type);
    const datetimeValue = value && date ? new Date(toText(value)) : null;
    // Native datetime controls use the laptop timezone; display it explicitly in the form.
    const display =
      datetimeValue && Number.isFinite(+datetimeValue)
        ? field.type === 'datetime'
          ? new Date(+datetimeValue - datetimeValue.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
          : datetimeValue.toISOString().slice(0, 10)
        : toText(value ?? '');
    return (
      <Input
        {...common}
        type={
          field.type === 'datetime'
            ? 'datetime-local'
            : ['date', 'email', 'number'].includes(field.type)
              ? field.type
              : 'text'
        }
        value={display}
        maxLength={lengthLimit(field.type)}
        required={field.required}
        min={field.type === 'number' ? 0 : undefined}
        step={field.type === 'number' ? '0.01' : undefined}
        onChange={(e) =>
          set(
            field.key,
            field.type === 'number'
              ? e.target.value === ''
                ? null
                : Number(e.target.value)
              : field.type === 'datetime' && e.target.value
                ? new Date(e.target.value).toISOString()
                : e.target.value,
          )
        }
      />
    );
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className='max-h-[90svh] overflow-y-auto sm:max-w-3xl'
      >
        <DialogHeader>
          <DialogTitle>
            {text(id ? 'editRecord' : 'newRecord', {
              entity: text(`entity.${toText(entity)}`),
            })}
          </DialogTitle>
          <DialogDescription>
            {text('requiredHint')}{' '}
            {entity === 'activities' &&
              text('localTimeHint', {
                zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
          </DialogDescription>
        </DialogHeader>
        {!meta ? (
          <Loading />
        ) : (
          <form
            onSubmit={(e) => {
              void (async () => {
                e.preventDefault();
                setBusy(true);
                setError(undefined);
                const payload = Object.fromEntries(
                  fields
                    .map((f): [string, unknown] => [f.key, input[f.key]])
                    .filter(([, v]) => v !== undefined),
                );
                // A required select has no native "required" the browser
                // enforces, so the check happens here, naming the field, rather
                // than as a server round trip ending in the same message.
                const missing = fields.find(
                  (f) =>
                    f.required &&
                    (payload[f.key] === undefined ||
                      payload[f.key] === null ||
                      payload[f.key] === ''),
                );
                if (missing) {
                  setError({ code: 'requiredField', field: missing.key });
                  setBusy(false);
                  return;
                }
                try {
                  if (onSubmit) await onSubmit(payload);
                  else {
                    const response = await api<{ data: CrmRecord }>(
                      recordId
                        ? `${toText(entity)}/${toText(recordId)}`
                        : entity,
                      recordId ? 'PATCH' : 'POST',
                      payload,
                    );
                    if (!recordId) setCreatedId(toText(response.data.id));
                    if (thenRef.current && andThen)
                      await andThen.run(response.data);
                    await refresh();
                    onClose();
                    onSaved?.(response.data);
                    return;
                  }
                  await refresh();
                  onClose();
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              })();
            }}
            className='space-y-5'
          >
            <ErrorNotice error={error} />
            <div className='grid gap-4 sm:grid-cols-2'>
              {fields.map((field) => {
                // An activity's type and name share the first row, the type
                // in a narrow column: "call" then what the call is about.
                const pairedName =
                  entity === 'activities' && field.key === 'type'
                    ? fields.find((f) => f.key === 'name')
                    : undefined;
                // An opportunity's amount and currency are one thing: the
                // number, then a narrow currency picker beside it.
                const pairedCurrency =
                  entity === 'opportunities' && field.key === 'amount'
                    ? fields.find((f) => f.key === 'currency')
                    : undefined;
                if (
                  entity === 'opportunities' &&
                  field.key === 'currency' &&
                  fields.some((f) => f.key === 'amount')
                )
                  return null;
                if (
                  entity === 'activities' &&
                  field.key === 'name' &&
                  fields.some((f) => f.key === 'type')
                )
                  return null;
                const block = (f: Field): ReactElement =>
                  f.type === 'boolean' ? (
                    // A yes / no reads as "[x] Employed": the box leads and
                    // the text is the label, dropped to the input line so it
                    // sits level with the neighbouring controls.
                    <div className='flex min-h-8 items-center'>
                      <label
                        htmlFor={`crm-field-${toText(f.key)}`}
                        className='flex cursor-pointer items-center gap-2 text-sm font-medium'
                      >
                        {fieldInput(f)}
                        {text(fieldLabelKey(entity, toText(f.key)))}
                      </label>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <label
                        htmlFor={`crm-field-${toText(f.key)}`}
                        className='text-sm font-medium'
                      >
                        {text(fieldLabelKey(entity, toText(f.key)))}
                        {f.required && (
                          <span className='ml-1 text-destructive'>*</span>
                        )}
                      </label>
                      {fieldInput(f)}
                      {f.type === 'relation' &&
                        Boolean(input[f.key]) &&
                        names[toText(input[f.key])] && (
                          <span className='sr-only'>
                            {names[toText(input[f.key])]}
                          </span>
                        )}
                    </div>
                  );
                if (pairedCurrency)
                  return (
                    <div
                      key={field.key}
                      className='grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]'
                    >
                      {block(pairedCurrency)}
                      {block(field)}
                    </div>
                  );
                if (pairedName)
                  return (
                    <div
                      key={field.key}
                      className='grid gap-4 sm:col-span-2 sm:grid-cols-[9rem_minmax(0,1fr)]'
                    >
                      {block(field)}
                      {block(pairedName)}
                    </div>
                  );
                return (
                  <div
                    key={field.key}
                    className={
                      ['textarea', 'contacts', 'files', 'multi'].includes(
                        field.type,
                      )
                        ? 'sm:col-span-2'
                        : ''
                    }
                  >
                    {block(field)}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
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
                variant={andThen ? 'outline' : 'default'}
                disabled={busy}
                onClick={() => {
                  thenRef.current = false;
                }}
              >
                {busy ? text('saving') : (saveLabel ?? text('save'))}
              </Button>
              {andThen && (
                <Button
                  type='submit'
                  disabled={busy}
                  onClick={() => {
                    thenRef.current = true;
                  }}
                >
                  {busy ? text('saving') : andThen.label}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
