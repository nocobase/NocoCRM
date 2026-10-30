import {
  LONG_TEXT_LIMIT,
  lengthLimit,
} from '../../../server/providers/crm/limits.js';
import { LengthHint } from './length-hint.js';
import { DateTimeInput } from './datetime-input.js';
import { RecordMultiPicker, RecordPicker } from './record-picker.js';
import { FileDropZone } from './attachments.js';
import { CommentFiles } from './comment-files.js';
import { ConfirmDialog } from './confirm-dialog.js';
import { editsAll, fieldLabelKey, toText } from './api.js';
import { approverChoices } from './approver-choices.js';
import { CountryChoice, SubdivisionChoice } from './geography.js';
import {
  Fragment,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Badge } from '../ui/badge.js';
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Paperclip,
  Search,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { TaskSearchChip } from './task-quick.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { ApprovalChips } from './approval-quick.js';
import { TaskLinkChips } from './task-links.js';
import { TaskTimeField } from './task-time-field.js';
import { DatePicker } from '../date-picker.js';
import { format } from 'date-fns';
import { dateLocale } from './date-locale.js';
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
import { FollowUpOption } from './follow-up-option.js';
import { LIGHT_FOCUS } from './focus.js';

// A multi-select in the same dress as Choice: the trigger lists what is
// chosen, the popup ticks items on and off and stays open between picks.
export function MultiChoice({
  value,
  onChange,
  choices,
  label,
  disabled,
  onOpenChange,
  searchable = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  choices: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  // A box above the list narrows it as one types, for a list too long to
  // scan (the people who may approve).
  searchable?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const labelOf = (id: string): string =>
    choices.find((c) => c.value === id)?.label ?? id;
  if (searchable)
    return (
      <SearchableMultiChoice
        value={value}
        onChange={onChange}
        choices={choices}
        label={label}
        disabled={disabled}
        onOpenChange={onOpenChange}
        labelOf={labelOf}
      />
    );
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

// MultiChoice with a search box: the list the record pickers show
// (record-picker.tsx), over choices already loaded, filtered as typed.
function SearchableMultiChoice({
  value,
  onChange,
  choices,
  label,
  disabled,
  onOpenChange,
  labelOf,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  choices: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  labelOf: (id: string) => string;
}): ReactElement {
  const { text } = useCrmText();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const change = (next: boolean): void => {
    setOpen(next);
    if (!next) setSearch('');
    onOpenChange?.(next);
  };
  const needle = search.trim().toLocaleLowerCase();
  const shown = needle
    ? choices.filter((c) => c.label.toLocaleLowerCase().includes(needle))
    : choices;
  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger
        disabled={disabled}
        role='combobox'
        aria-expanded={open}
        aria-label={label}
        className='flex min-h-8 w-full min-w-32 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-left text-sm shadow-xs hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50'
      >
        <span
          className={`min-w-0 whitespace-normal ${value.length ? '' : 'text-muted-foreground'}`}
        >
          {value.length ? value.map(labelOf).join('、') : text('choose')}
        </span>
        <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='flex max-h-80 w-(--anchor-width) min-w-60 flex-col p-0'
      >
        <div className='relative border-b p-2'>
          <Search className='pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            autoFocus
            value={search}
            placeholder={toText(text('searchRecords'))}
            aria-label={toText(text('searchRecords'))}
            className='pl-8'
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ul role='listbox' className='min-h-0 flex-1 overflow-y-auto p-1'>
          {shown.map((choice) => {
            const picked = value.includes(choice.value);
            return (
              <li key={choice.value}>
                <button
                  type='button'
                  role='option'
                  aria-selected={picked}
                  className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover hover:text-accent-foreground'
                  onClick={() =>
                    onChange(
                      picked
                        ? value.filter((v) => v !== choice.value)
                        : [...value, choice.value],
                    )
                  }
                >
                  <Check
                    className={`size-4 shrink-0 ${picked ? '' : 'invisible'}`}
                  />
                  <span className='min-w-0 truncate'>{choice.label}</span>
                </button>
              </li>
            );
          })}
          {!shown.length && (
            <li className='px-2 py-1.5 text-sm text-muted-foreground'>
              {text('noMatches')}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
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
  compact = false,
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
  // As wide as its value rather than a full field: a short code (a currency)
  // edited in place keeps the width it is read at.
  compact?: boolean;
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
            ? 'h-7 w-full min-w-0 border-transparent bg-transparent text-xs hover:border-border hover:bg-hover data-[size=default]:h-7'
            : variant === 'tag'
              ? 'h-5.5 w-auto min-w-0 gap-0.5 rounded-md border-transparent bg-foreground/7 px-1.5 py-0 text-xs font-medium text-muted-foreground hover:bg-foreground/12 data-[size=default]:h-5.5 [&_svg]:size-3'
              : compact
                ? 'w-auto min-w-0'
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
        className={
          variant === 'tag' ? 'min-w-40' : compact ? 'min-w-32' : undefined
        }
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
// A new lead's fields that wait behind "More": the person's LinkedIn, the
// company's particulars and attachments, usually filled later or by research.
const LEAD_MORE_FIELDS = [
  'linkedin',
  'employees',
  'currency',
  'annualRevenue',
  'industry',
  'website',
  'country',
  'state',
  'city',
  'address',
  'companyDescription',
  'attachments',
];

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
  review,
  notice,
  tabs,
  changed,
  embedded,
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
  // Fields the AI filled but was unsure of (lead capture): marked for a check.
  review?: readonly string[];
  // Shown above the fields: what filled the form and what it may repeat.
  // Given as a function, it is told which required fields are still empty.
  notice?: ReactNode | ((unfilled: readonly string[]) => ReactNode);
  // Under the title: the switch back to entering the lead with the AI.
  tabs?: ReactNode;
  // Fields the AI's last adjustment changed (lead capture): marked so.
  changed?: readonly string[];
  // Rendered inside another dialog: fields only, each change reported.
  embedded?: { onChange: (input: Data) => void };
}): ReactElement {
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text, language } = useCrmText();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // A new lead's follow-up by the AI, at once unless unticked.
  const [followUp, setFollowUp] = useState(true);
  // The bare names of records picked in this form, for the deal name a new
  // opportunity takes from its company.
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
      : entity === 'companies'
        ? { status: 'prospect', currency: meta?.settings.currency ?? 'USD' }
        : entity === 'contacts'
          ? { employed: true, primary: false, gender: 'unknown' }
          : entity === 'opportunities'
            ? {
                stage: 'contact',
                currency: meta?.settings.currency ?? 'USD',
              }
            : entity === 'tasks'
              ? // A task needs only what to do; when it is due, who takes
                // part and what it concerns are added when they matter.
                { status: 'open' }
              : {}),
    ...initial,
  }));
  const set = (key: string, value: unknown): void =>
    setInput((current) => ({
      ...current,
      [key]: value,
      ...(key === 'companyId'
        ? {
            contacts: [],
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
  // The embedding page keeps the values: every change is reported to it,
  // through whichever callback the page passed last.
  const report = useEffectEvent((next: Data) => embedded?.onChange(next));
  useEffect(() => {
    report(input);
  }, [input]);
  const definitions = meta?.definitions[entity];
  const writable = meta?.permissions[entity][id ? 'update' : 'create'];
  const listed =
    definitions?.fields.filter(
      (f) =>
        !f.readOnly &&
        // An approval's applicant is whoever raises it; the server sets it.
        !(entity === 'approvals' && f.key === 'ownerId') &&
        // A new lead is always new: its status moves with the work (its first
        // task makes it working), so creating one does not ask for it.
        !(entity === 'leads' && !id && f.key === 'status') &&
        !(
          entity === 'tasks' &&
          !id &&
          initial.leadId &&
          ['companyId', 'opportunityId'].includes(f.key)
        ) &&
        !(
          entity === 'tasks' &&
          !id &&
          initial.companyId &&
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
        // A result is what came of it; an open task has none yet, and a
        // new task is open.
        !(
          entity === 'tasks' &&
          f.key === 'result' &&
          input.status === 'open'
        ) &&
        !(entity === 'tasks' && !id && f.key === 'status') &&
        writable &&
        (writable.fields === '*' || writable.fields.includes(f.key)),
    ) ?? [];
  // A task's description says what its title means, so it comes right under
  // the title.
  const fields =
    entity === 'tasks'
      ? [
          ...listed.filter((f) => f.key === 'name'),
          ...listed.filter((f) => f.key === 'description'),
          ...listed.filter((f) => f.key !== 'name' && f.key !== 'description'),
        ]
      : listed;
  // A form the AI filled (review given) highlights the required fields it
  // could not fill, until they are filled.
  // A new lead opens with the fields a salesperson fills first; the rest
  // wait behind "More" unless they already hold a value (the AI filled
  // them, or the user did), or the AI marked or changed them.
  const [showMore, setShowMore] = useState(false);
  // A new task opens quick, laid out like Clarify's task dialog: a title and
  // a description over chips (task-quick.tsx); so does a new approval, its
  // chips the topic, the deal and the approver (approval-quick.tsx).
  // Editing keeps the whole form.
  const quick =
    (entity === 'tasks' || entity === 'approvals') &&
    !id &&
    !embedded &&
    !onSubmit;
  // The quick form's description grows with what is written, and the dialog
  // with it, up to half the screen; past that it scrolls.
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const descriptionText = toText(input.description ?? '');
  useLayoutEffect(() => {
    const box = descriptionRef.current;
    if (!box) return;
    const limit = Math.round(window.innerHeight / 2);
    box.style.height = 'auto';
    box.style.height = `${String(Math.min(box.scrollHeight, limit))}px`;
    // A scrollbar only once it has stopped growing.
    box.style.overflowY = box.scrollHeight > limit ? 'auto' : 'hidden';
  }, [descriptionText]);
  // The names of records picked here, for the chips' labels.
  const [pickedNames, setPickedNames] = useState<Record<string, string>>({});
  // Files dropped or pasted into a new task's description, or picked with
  // its paperclip, go up as the task's attachments.
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Files held over the dialog: the whole of it takes them, and says so.
  const [dropping, setDropping] = useState(false);
  // A file taken off the form: at once on a record not yet saved; on a
  // saved one, confirmed first, as on its Attachments tab.
  const [removing, setRemoving] = useState<{ key: string; id: string }>();
  const dropFile = (key: string, fileId: string): void =>
    set(
      key,
      arrayValues(input[key]).filter((value) => toText(value) !== fileId),
    );
  const removeFile = (key: string, fileId: string): void => {
    if (id) setRemoving({ key, id: fileId });
    else dropFile(key, fileId);
  };
  const removeConfirm = removing ? (
    <ConfirmDialog
      title={toText(text('removeFileTitle'))}
      description={text('removeFileHint')}
      busy={false}
      confirmLabel={toText(text('remove'))}
      onCancel={() => setRemoving(undefined)}
      onConfirm={() => {
        dropFile(removing.key, removing.id);
        setRemoving(undefined);
      }}
    />
  ) : null;
  const uploadFiles = (picked: File[]): void => {
    if (!picked.length || busy) return;
    void (async () => {
      setBusy(true);
      setError(undefined);
      const body = new FormData();
      picked.forEach((file) => body.append('file', file));
      try {
        const result = await api<{ data: { id: string }[] }>(
          `attachments/upload?entity=${toText(entity)}`,
          'POST',
          body,
        );
        const ids = result.data.map((uploaded) => toText(uploaded.id));
        setInput((current) => ({
          ...current,
          attachments: [
            ...arrayValues(current.attachments).map(toText),
            ...ids,
          ],
        }));
      } catch (cause) {
        setError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };

  const [filledAtOpen] = useState(
    () =>
      new Set(
        Object.keys(initial).filter(
          (key) =>
            initial[key] !== undefined &&
            initial[key] !== null &&
            initial[key] !== '' &&
            !(Array.isArray(initial[key]) && !initial[key].length),
        ),
      ),
  );
  const moreFields = entity === 'leads' ? LEAD_MORE_FIELDS : [];
  const tucked = (f: Field): boolean =>
    !id &&
    !showMore &&
    moreFields.includes(f.key) &&
    !f.required &&
    !filledAtOpen.has(f.key) &&
    !review?.includes(f.key) &&
    !changed?.includes(f.key) &&
    (input[f.key] === undefined ||
      input[f.key] === null ||
      input[f.key] === '' ||
      (Array.isArray(input[f.key]) && !(input[f.key] as unknown[]).length));
  const tuckable =
    !id && fields.some((f) => moreFields.includes(f.key) && !f.required);
  const unfilled = review
    ? fields
        .filter(
          (f) =>
            f.required &&
            (input[f.key] === undefined ||
              input[f.key] === null ||
              input[f.key] === ''),
        )
        .map((f) => f.key)
    : [];
  const names = titles ?? {};
  const choices = (field: Field): { value: string; label: string }[] => {
    if (field.relation === 'users')
      return (
        field.key === 'approverId'
          ? approverChoices(meta?.users ?? [], meta?.userId)
          : (meta?.users ?? [])
      )
        .filter(
          (u) =>
            !u.disabled &&
            u.roles.length &&
            // Only sellers own records; an administrator is not offered.
            (field.key !== 'ownerId' ||
              entity === 'approvals' ||
              u.roles.some((r) =>
                ['sales-representative', 'sales-manager'].includes(r),
              )),
        )
        .map((u) => ({ value: u.id, label: u.name }));
    const key =
      field.key === 'type' && entity === 'companies'
        ? 'companyType'
        : field.key;
    return (meta?.settings.options[key] ?? field.options ?? []).map((v) => ({
      value: v,
      label: text(`options.${toText(v)}`, { defaultValue: v }),
    }));
  };
  const fieldInput = (field: Field): ReactElement => {
    const value = input[field.key];
    const label = text(fieldLabelKey(entity, toText(field.key)));
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
    // are looked for within the chosen company; a converted lead is not
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
            input.companyId
              ? { companyId: toText(input.companyId) }
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
            if (picked) {
              pickedNamesRef.current[v] = toText(picked.name);
              setPickedNames((known) => ({
                ...known,
                [v]: toText(picked.name),
              }));
            }
            set(field.key, v || null);
          }}
          // A record opened from its parent's page keeps that parent; one
          // the AI organised (an embedded capture form) took its parent
          // from a match the person may correct.
          disabled={
            !id &&
            !embedded &&
            ['leadId', 'companyId', 'opportunityId'].includes(field.key) &&
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
            input.companyId ? { companyId: toText(input.companyId) } : undefined
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
          // A currency stands inside its amount's field, as wide as its code.
          compact={field.key === 'currency'}
          disabled={
            (field.key === 'ownerId' && !meta?.assign) ||
            (!id &&
              ['leadId', 'companyId', 'opportunityId'].includes(field.key) &&
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
        <div className='space-y-2'>
          {/* One list, a row per contact: who, their role, remove. */}
          {rows(value).length > 0 && (
            <div className='divide-y rounded-lg border'>
              {rows(value).map((contact, index) => (
                <div
                  className='grid grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto] items-center gap-2 p-2'
                  key={
                    toText(contact.contactId) ||
                    `${contact.person ? 'new' : 'unselected'}-${index.toString()}`
                  }
                >
                  {/* A person the AI capture found who is not yet the
                      company's contact (opportunity-capture.tsx): created
                      with the opportunity, in the list it is linked from. */}
                  {contact.person ? (
                    <NewContact
                      person={contact.person as Data}
                      company={Boolean(input.companyId)}
                    />
                  ) : (
                    <RecordPicker
                      entity='contacts'
                      bare
                      label={text('entities.contacts')}
                      value={toText(contact.contactId ?? '')}
                      exclude={rows(value)
                        .filter((_, i) => i !== index)
                        .map((c) => toText(c.contactId ?? ''))
                        .filter(Boolean)}
                      titles={titles}
                      filter={
                        input.companyId
                          ? { companyId: toText(input.companyId) }
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
                  )}
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
                    size='icon'
                    className='text-muted-foreground hover:text-destructive'
                    aria-label={text('remove')}
                    title={text('remove')}
                    onClick={() =>
                      set(
                        field.key,
                        rows(value).filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            type='button'
            variant='outline'
            disabled={!input.companyId}
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
          {/* The drop zone above already says there is nothing yet; the
              list appears with the first file. */}
          {arrayValues(value).length > 0 && (
            <CommentFiles
              className=''
              ids={arrayValues(value).map(toText)}
              onRemove={(fileId) => removeFile(field.key, fileId)}
            />
          )}
        </div>
      );
    // A task's time: a day, and a time of day and an end when it is at an
    // hour; "date only" and the end are set through it, not drawn apart.
    if (entity === 'tasks' && field.key === 'dueAt')
      return (
        <TaskTimeField
          id={common.id}
          value={{
            dueAt: input.dueAt,
          }}
          onChange={(time) => setInput((current) => ({ ...current, ...time }))}
        />
      );
    // Entered on the laptop's clock; the dialog names that timezone.
    if (field.type === 'datetime')
      return (
        <DateTimeInput
          id={common.id}
          label={label}
          value={toText(value ?? '')}
          required={field.required}
          onChange={(v) => set(field.key, v)}
        />
      );
    // A day, picked from a calendar as a task's time is (DatePicker), not a
    // native date input, whose look and format follow the browser.
    if (field.type === 'date') {
      const raw = toText(value ?? '');
      const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(
        raw.includes('T') ? new Date(raw).toISOString() : raw,
      );
      const day = parts
        ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
        : undefined;
      return (
        <DatePicker
          {...common}
          className='w-full'
          value={day}
          locale={dateLocale(language)}
          placeholder={toText(text('taskTime.pickDate'))}
          onChange={(picked) =>
            set(field.key, picked ? format(picked, 'yyyy-MM-dd') : null)
          }
        />
      );
    }
    const display = toText(value ?? '');
    const typed = field.type !== 'number';
    return (
      <div>
        <Input
          {...common}
          type={
            field.type === 'email' || field.type === 'number'
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
                : e.target.value,
            )
          }
        />
        {typed && (
          <LengthHint
            length={display.length}
            language={language}
            max={lengthLimit(field.type)}
          />
        )}
      </div>
    );
  };
  const grid = (
    <>
      {/* Three fields a row, two or one where the form is narrow: sized by
          the form's own width, which beside the lead capture's panels is
          less than the dialog's. Long text, lists and files take the whole
          row. */}
      {/* Its fields show their focus as the record pages' inline fields
          do. */}
      <div className={`@container ${LIGHT_FOCUS}`}>
        <div className='grid gap-x-4 gap-y-3 @xl:grid-cols-2 @2xl:grid-cols-3'>
          {fields.map((field) => {
            if (tucked(field)) return null;
            // An opportunity's amount and currency are one thing: one
            // field labelled Amount, the currency picker leading the
            // number; a company's annual revenue (a lead's too) the same.
            const moneyKey =
              entity === 'opportunities'
                ? 'amount'
                : entity === 'companies' || entity === 'leads'
                  ? 'annualRevenue'
                  : undefined;
            const pairedCurrency =
              moneyKey && field.key === moneyKey
                ? fields.find((f) => f.key === 'currency')
                : undefined;
            if (
              moneyKey &&
              field.key === 'currency' &&
              fields.some((f) => f.key === moneyKey)
            )
              return null;
            const block = (f: Field, lead?: Field): ReactElement =>
              f.type === 'boolean' ? (
                // A yes / no reads as "[x] Employed": the box leads and
                // the text is the label, dropped to the input line so it
                // sits level with the neighbouring controls: an empty line
                // where their labels are, then the box on their inputs' line.
                <div className='space-y-1.5'>
                  <span
                    aria-hidden
                    className='invisible block text-sm font-medium'
                  >
                    &nbsp;
                  </span>
                  <div className='flex min-h-8 items-center'>
                    <label
                      htmlFor={`crm-field-${toText(f.key)}`}
                      className='flex cursor-pointer items-center gap-2 text-sm font-medium'
                    >
                      {fieldInput(f)}
                      {text(fieldLabelKey(entity, toText(f.key)))}
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  className={
                    unfilled.includes(f.key) ||
                    (lead && unfilled.includes(lead.key))
                      ? '-m-1.5 space-y-1.5 rounded-lg bg-warning/10 p-1.5 ring-1 ring-warning/40 dark:bg-warning/20'
                      : 'space-y-1.5'
                  }
                >
                  {/* A row of its own, so the block's spacing holds under a
                    tag as it does under plain text. */}
                  <label
                    htmlFor={`crm-field-${toText(f.key)}`}
                    className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium'
                  >
                    <span>
                      {text(fieldLabelKey(entity, toText(f.key)))}
                      {f.required && (
                        <span className='ml-1 text-destructive'>*</span>
                      )}
                    </span>
                    {(review?.includes(f.key) ||
                      (lead && review?.includes(lead.key))) && (
                      <Badge variant='warning'>
                        {text('leadCapture.check')}
                      </Badge>
                    )}
                    {(changed?.includes(f.key) ||
                      (lead && changed?.includes(lead.key))) && (
                      <Badge variant='ai'>
                        {text('leadCapture.aiChanged')}
                      </Badge>
                    )}
                  </label>
                  {lead ? (
                    <div className='flex gap-2'>
                      <div className='shrink-0'>{fieldInput(lead)}</div>
                      <div className='min-w-0 flex-1'>{fieldInput(f)}</div>
                    </div>
                  ) : (
                    fieldInput(f)
                  )}
                  {f.type === 'relation' &&
                    Boolean(input[f.key]) &&
                    names[toText(input[f.key])] && (
                      <span className='sr-only'>
                        {names[toText(input[f.key])]}
                      </span>
                    )}
                </div>
              );
            // The yes / no fields share one cell, in the place of the first,
            // side by side: each alone took a cell, and a row ended half
            // empty with one box on the next.
            const flags = fields.filter(
              (f) => f.type === 'boolean' && !tucked(f),
            );
            if (field.type === 'boolean') {
              if (field !== flags[0]) return null;
              return (
                <div key={field.key} className='flex flex-wrap gap-x-6'>
                  {flags.map((f) => (
                    <Fragment key={f.key}>{block(f)}</Fragment>
                  ))}
                </div>
              );
            }
            if (pairedCurrency)
              return <div key={field.key}>{block(field, pairedCurrency)}</div>;
            return (
              <div
                key={field.key}
                className={
                  ['textarea', 'contacts', 'files', 'multi'].includes(
                    field.type,
                  ) ||
                  // What to do reads as one line across the form.
                  (entity === 'tasks' && field.key === 'name')
                    ? 'col-span-full'
                    : // A day, its time of day and an end, side by side.
                      entity === 'tasks' && field.key === 'dueAt'
                      ? 'col-span-full @2xl:col-span-2'
                      : ''
                }
              >
                {block(field)}
              </div>
            );
          })}
          {tuckable && (showMore || fields.some(tucked)) && (
            <div className='col-span-full'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='-ml-2.5 text-muted-foreground'
                onClick={() => setShowMore((shown) => !shown)}
              >
                {showMore ? <ChevronUp /> : <ChevronDown />}
                {showMore
                  ? text('fewerFields')
                  : text('moreFields', {
                      fields: fields
                        .filter(tucked)
                        .map((f) => text(fieldLabelKey(entity, toText(f.key))))
                        .join(language.startsWith('zh') ? '、' : ', '),
                    })}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
  const submit = (e: FormEvent): void => {
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
              : (entity === 'leads' || entity === 'opportunities') && !followUp
                ? `${entity}?followUp=false`
                : entity,
            recordId ? 'PATCH' : 'POST',
            payload,
          );
          if (!recordId) setCreatedId(toText(response.data.id));
          if (thenRef.current && andThen) await andThen.run(response.data);
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
  };
  // Inside the lead capture review: the fields alone, their values reported
  // as they change, no dialog, no buttons.
  if (embedded)
    return (
      <div className='space-y-4'>
        {typeof notice === 'function' ? notice(unfilled) : notice}
        {grid}
      </div>
    );
  if (quick && meta) {
    const field = (key: string): Field | undefined =>
      fields.find((f) => f.key === key);
    const owner = meta.users.find((u) => u.id === input.ownerId)?.name;
    const title = field('name');
    const description = field('description');
    const ownerField = field('ownerId');
    const topicField = field('topic');
    // What the save needs: a title, and for an approval its topic and deal.
    const complete =
      Boolean(toText(input.name ?? '').trim()) &&
      (entity !== 'approvals' ||
        (Boolean(input.topic) && Boolean(input.opportunityId)));
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className='max-h-[90svh] overflow-y-auto sm:max-w-xl'
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setDropping(true);
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) e.preventDefault();
          }}
          onDragLeave={(e) => {
            // Left the dialog, not one of its children.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setDropping(false);
          }}
          onDrop={(e) => {
            setDropping(false);
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            uploadFiles([...e.dataTransfer.files]);
          }}
        >
          {/* Over the whole dialog while files are held over it. */}
          {dropping ? (
            <div className='pointer-events-none absolute inset-1 z-10 flex items-center justify-center gap-2 rounded-[calc(var(--radius-xl)-4px)] border-2 border-dashed border-ring bg-background/90 text-sm text-muted-foreground'>
              <Paperclip className='size-4' />
              {text('taskQuick.dropToAttach')}
            </div>
          ) : null}
          {/* Named for screen readers; the record's own title leads. */}
          <DialogHeader className='sr-only'>
            <DialogTitle>
              {entity === 'approvals'
                ? text('newApproval')
                : text('newRecord', { entity: text('entity.tasks') })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className='space-y-4'>
            <ErrorNotice error={error} />
            <div className='space-y-1'>
              <input
                autoFocus
                aria-label={toText(text(fieldLabelKey(entity, 'name')))}
                placeholder={toText(
                  text(
                    entity === 'approvals'
                      ? 'approvalQuick.titlePlaceholder'
                      : 'taskQuick.titlePlaceholder',
                  ),
                )}
                maxLength={title ? lengthLimit(title.type) : undefined}
                className='w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground'
                value={toText(input.name ?? '')}
                onChange={(e) => set('name', e.target.value)}
              />
              <textarea
                onPaste={(e) => {
                  if (!e.clipboardData.files.length) return;
                  e.preventDefault();
                  uploadFiles([...e.clipboardData.files]);
                }}
                aria-label={toText(text(fieldLabelKey(entity, 'description')))}
                placeholder={toText(
                  text(
                    entity === 'approvals'
                      ? 'approvalQuick.descriptionPlaceholder'
                      : 'taskQuick.descriptionPlaceholder',
                  ),
                )}
                maxLength={
                  description ? lengthLimit(description.type) : undefined
                }
                ref={descriptionRef}
                rows={3}
                className='w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                value={toText(input.description ?? '')}
                onChange={(e) => set('description', e.target.value)}
              />
              {/* As a comment's and the Attachments tab's files. */}
              {arrayValues(input.attachments).length > 0 && (
                <CommentFiles
                  ids={arrayValues(input.attachments).map(toText)}
                  onRemove={(fileId) => removeFile('attachments', fileId)}
                />
              )}
            </div>
            <div className='flex flex-wrap items-center gap-1.5'>
              {entity === 'approvals' ? (
                <ApprovalChips
                  input={input}
                  names={{ ...names, ...pickedNames }}
                  options={topicField ? choices(topicField) : []}
                  locked={Boolean(initial.opportunityId)}
                  onChange={(changes) =>
                    setInput((current) => ({ ...current, ...changes }))
                  }
                />
              ) : (
                <>
                  <TaskTimeField
                    size='sm'
                    value={{
                      dueAt: input.dueAt,
                    }}
                    onChange={(time) =>
                      setInput((current) => ({ ...current, ...time }))
                    }
                  />
                  {ownerField && entity === 'tasks' && (
                    <TaskSearchChip
                      icon={<User />}
                      label={owner ?? text(fieldLabelKey(entity, 'ownerId'))}
                      empty={!owner}
                      placeholder={toText(text('taskQuick.searchPeople'))}
                      groups={[
                        {
                          key: 'users',
                          options: choices(ownerField).map((c) => ({
                            id: c.value,
                            label: c.label,
                          })),
                        },
                      ]}
                      selected={new Set([toText(input.ownerId ?? '')])}
                      limit={8}
                      onPick={(_group, option) => set('ownerId', option.id)}
                    />
                  )}
                  <TaskLinkChips
                    input={input}
                    names={{ ...names, ...pickedNames }}
                    onChange={(changes) =>
                      setInput((current) => ({ ...current, ...changes }))
                    }
                  />
                </>
              )}
              <input
                ref={fileInputRef}
                type='file'
                multiple
                hidden
                onChange={(e) => {
                  uploadFiles([...(e.target.files ?? [])]);
                  e.target.value = '';
                }}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='text-muted-foreground'
                aria-label={toText(text('taskQuick.attach'))}
                title={toText(text('taskQuick.attach'))}
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip />
              </Button>
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
              {entity === 'approvals' ? (
                <>
                  {/* Saved as a draft, or saved and submitted to its
                      approver at once. */}
                  <Button
                    type='submit'
                    variant={andThen ? 'outline' : 'default'}
                    disabled={busy || !complete}
                    onClick={() => {
                      thenRef.current = false;
                    }}
                  >
                    {busy ? text('saving') : text('approvalQuick.saveDraft')}
                  </Button>
                  {andThen && (
                    <Button
                      type='submit'
                      variant='contrast'
                      disabled={busy || !complete || !input.approverId}
                      title={
                        input.approverId
                          ? undefined
                          : toText(text('approvalQuick.approverFirst'))
                      }
                      onClick={() => {
                        thenRef.current = true;
                      }}
                    >
                      {busy ? text('saving') : text('approvalQuick.submit')}
                    </Button>
                  )}
                </>
              ) : (
                <Button type='submit' disabled={busy || !complete}>
                  {busy ? text('saving') : text('taskQuick.add')}
                </Button>
              )}
            </DialogFooter>
          </form>
          {removeConfirm}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className='max-h-[90svh] overflow-y-auto sm:max-w-4xl'
      >
        <DialogHeader>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <DialogTitle>
              {text(id ? 'editRecord' : 'newRecord', {
                entity: text(`entity.${toText(entity)}`),
              })}
            </DialogTitle>
            {tabs}
          </div>
          {/* The required fields carry their asterisk; only a task's
              times need a word on how they are read. */}
          {entity === 'tasks' && (
            <DialogDescription>
              {text('localTimeHint', {
                zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </DialogDescription>
          )}
        </DialogHeader>
        {!meta ? (
          <Loading />
        ) : (
          <form onSubmit={submit} className='space-y-4'>
            <ErrorNotice error={error} />
            {typeof notice === 'function' ? notice(unfilled) : notice}
            {grid}
            <DialogFooter>
              {/* A new lead or opportunity: whether the AI follows it up at
                  once. */}
              {(entity === 'leads' || entity === 'opportunities') &&
              !recordId &&
              !onSubmit ? (
                <FollowUpOption
                  checked={followUp}
                  onChange={setFollowUp}
                  disabled={busy}
                  {...(entity === 'opportunities'
                    ? {
                        label: 'dealFollowUpNow',
                        agent: 'opportunities' as const,
                        trigger: 'opened',
                      }
                    : { agent: 'leads' as const, trigger: 'created' })}
                />
              ) : null}
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
        {removeConfirm}
      </DialogContent>
    </Dialog>
  );
}

// A person to create as the company's contact with the opportunity: what
// the text gave, marked new, in place of the picker.
function NewContact({
  person,
  company,
}: {
  person: Data;
  company: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const details = [person.jobTitle, person.phone, person.email]
    .map((v) => toText(v ?? ''))
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      className='flex min-w-0 items-center gap-2 px-1 text-sm'
      title={text(
        company
          ? 'dealCapture.newContactHint'
          : 'dealCapture.newContactNeedsCompany',
      )}
    >
      <Badge variant={company ? 'ai' : 'warning'} className='shrink-0'>
        {text('dealCapture.newContact')}
      </Badge>
      <span className='shrink-0 font-medium'>{toText(person.name)}</span>
      {details && (
        <span className='truncate text-muted-foreground'>{details}</span>
      )}
    </div>
  );
}
