import {
  LONG_TEXT_LIMIT,
  TEXT_LIMIT,
  lengthLimit,
} from '../../../server/providers/crm/limits.js';
import { LengthHint } from './length-hint.js';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Input } from '../ui/input.js';
import { Textarea } from '../ui/textarea.js';
import { Choice, MultiChoice } from './form.js';
import { RecordMultiPicker, RecordPicker } from './record-picker.js';
import { CountryChoice, SubdivisionChoice } from './geography.js';
import { Value } from './common.js';
import {
  arrayValues,
  errorCode,
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type Entity,
  type Field,
} from './api.js';

// Values that live in a popup list save the moment one is picked; typed values
// save when the field loses focus, which is what "click elsewhere" means here.
const picker = [
  'select',
  'relation',
  'boolean',
  'country',
  'subdivision',
  'multi',
];

// Sizes a textarea to its content where CSS field-sizing is unavailable.
const fitHeight = (element: HTMLTextAreaElement | null): void => {
  if (!element || CSS.supports('field-sizing', 'content')) return;
  element.style.height = 'auto';
  element.style.height = `${String(element.scrollHeight)}px`;
};

export function InlineField({
  entity,
  record,
  field,
  editable,
  lookup = {},
  label,
  choices: choiceOverride,
  onSave,
  size = 'field',
  bare = false,
  plain = false,
  relationFilter,
}: {
  entity: Entity;
  record: CrmRecord;
  field: Field;
  editable: boolean;
  lookup?: Record<string, string>;
  label: string;
  choices?: { value: string; label: string }[];
  // What a related record is searched within (the contacts of one account).
  relationFilter?: Record<string, string | undefined>;
  // Lets a caller save several fields together when one alone would be
  // rejected — a lead going invalid must carry its reason in the same write.
  onSave?: (value: unknown) => Promise<void>;
  // "title" dresses the value as the page heading: same gestures, larger type.
  size?: 'field' | 'title';
  // Passed to Value: an amount shown without its currency sign.
  bare?: boolean;
  // Passed to Value: a status or stage as text rather than a badge.
  plain?: boolean;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // A multi field edits a list of ids; the chips toggle it, blur saves it.
  const [listDraft, setListDraft] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // A portalled select popup takes focus out of this element, so blur alone
  // cannot tell "moved into the list" from "left the field".
  const popupOpenRef = useRef(false);

  useEffect(() => {
    if (editing)
      boxRef.current
        ?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input,textarea,button',
        )
        ?.focus();
  }, [editing]);

  // Native date inputs speak local wall-clock time with no zone, so the stored
  // ISO value has to be converted in on open and back out on save; handing an
  // ISO string straight to datetime-local leaves the control blank.
  const toInputValue = (raw: unknown): string => {
    // SQLite hands booleans back as 1 / 0; the picker speaks "true" / "false".
    if (field.type === 'boolean') return raw ? 'true' : 'false';
    if (field.type !== 'datetime' && field.type !== 'date') return toText(raw);
    const parsed = raw ? new Date(toText(raw)) : undefined;
    if (!parsed || !Number.isFinite(+parsed)) return '';
    return field.type === 'datetime'
      ? new Date(+parsed - parsed.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : parsed.toISOString().slice(0, 10);
  };

  const save = async (raw: unknown): Promise<void> => {
    const next =
      field.type === 'boolean'
        ? raw === 'true'
        : field.type === 'number' && raw !== ''
          ? Number(raw)
          : raw === ''
            ? null
            : field.type === 'datetime'
              ? new Date(toText(raw)).toISOString()
              : raw;
    const same = Array.isArray(next)
      ? JSON.stringify(next) ===
        JSON.stringify(arrayValues(record[field.key]).map(toText))
      : field.type === 'boolean'
        ? next === Boolean(record[field.key])
        : toText(next) === toText(record[field.key]);
    if (same) {
      setEditing(false);
      return;
    }
    if (field.required && (next === null || next === undefined)) {
      setError(text('requiredField'));
      return;
    }
    setSaving(true);
    try {
      if (onSave) await onSave(next);
      else {
        await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
          [field.key]: next,
        });
        await refresh();
      }
      setError('');
      setEditing(false);
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
    } finally {
      setSaving(false);
    }
  };

  const titled = size === 'title';
  const readText = titled
    ? 'font-heading text-3xl font-semibold tracking-tight'
    : 'text-sm';
  if (!editable)
    return (
      <div className={`px-2 py-1.5 ${readText}`}>
        <Value
          record={record}
          field={field}
          lookup={lookup}
          bare={bare}
          plain={plain}
        />
      </div>
    );

  const startEditing = (): void => {
    setDraft(toInputValue(record[field.key]));
    setListDraft(arrayValues(record[field.key]).map(toText));
    setEditing(true);
  };

  if (!editing)
    return (
      // Not a <button>: a single click has to leave the text selectable so a
      // value can be read and copied without ever entering edit mode. Editing is
      // a deliberate gesture — double-click, or Enter / F2 with focus. No
      // pencil: an icon at the end of the line ate the space long values need,
      // and hover shading already says the field is editable.
      <div
        role='button'
        tabIndex={0}
        aria-label={label}
        className={`${titled ? 'w-auto max-w-full' : 'w-full'} cursor-text rounded-md px-2 py-1.5 text-left transition-colors select-text hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${readText}`}
        onDoubleClick={() => {
          // The double-click also selected the word under it; left alone, that
          // selection lands on the new value once the editor closes, so a
          // saved status reads as highlighted text.
          window.getSelection()?.removeAllRanges();
          startEditing();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            startEditing();
          }
        }}
      >
        <Value
          record={record}
          field={field}
          lookup={lookup}
          bare={bare}
          plain={plain}
        />
        {error ? (
          <span className='mt-1 block text-xs text-destructive'>{error}</span>
        ) : null}
      </div>
    );

  const choices =
    choiceOverride ??
    (field.type === 'boolean'
      ? [
          { value: 'true', label: text('yes') },
          { value: 'false', label: text('no') },
        ]
      : field.relation === 'users'
        ? (meta?.users ?? [])
            .filter(
              (u) =>
                !u.disabled &&
                // Only sellers own records; an administrator is not offered.
                (field.key !== 'ownerId' ||
                  entity === 'approvals' ||
                  u.roles.some((r) =>
                    ['sales-representative', 'sales-manager'].includes(r),
                  )),
            )
            .map((u) => ({ value: u.id, label: u.name }))
        : (meta?.settings.options[field.key] ?? field.options ?? []).map(
            (v) => ({
              value: v,
              label: text(`options.${toText(v)}`, { defaultValue: v }),
            }),
          ));

  return (
    <div
      ref={boxRef}
      // A title's editor is as wide as its text, like the title it replaces,
      // and wraps only once it reaches the edge of the heading.
      className={`rounded-md ring-2 ring-ring/40 ${titled ? 'min-w-0 max-w-full' : ''}`}
      // Saving on blur is the whole point, but focus moving between the parts of
      // one control (a select and its popup) must not count as leaving.
      onBlur={(event) => {
        if (saving || event.currentTarget.contains(event.relatedTarget)) return;
        // Nothing to save for a list: the value only changes by picking one, so
        // leaving without a pick simply returns to the read view.
        if (picker.includes(field.type)) {
          if (!popupOpenRef.current) setEditing(false);
          return;
        }
        void save(field.type === 'multi' ? listDraft : draft);
      }}
    >
      {field.type === 'multi' &&
      field.relation &&
      field.relation !== 'users' ? (
        // Records are searched for, a page at a time, never listed whole.
        <RecordMultiPicker
          entity={field.relation}
          label={label}
          value={listDraft}
          names={lookup}
          filter={relationFilter}
          disabled={saving}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            if (!open) void save(listDraft);
          }}
          onChange={setListDraft}
        />
      ) : field.type === 'relation' &&
        field.relation &&
        field.relation !== 'users' ? (
        <RecordPicker
          entity={field.relation}
          label={label}
          value={draft}
          titles={lookup}
          filter={relationFilter}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            if (!open) setEditing(false);
          }}
          onChange={(v) => {
            setDraft(v);
            void save(v);
          }}
        />
      ) : field.type === 'multi' ? (
        // Picks accumulate while the list is open; closing it saves the set.
        <MultiChoice
          label={label}
          value={listDraft}
          choices={choices}
          disabled={saving}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            if (!open) void save(listDraft);
          }}
          onChange={setListDraft}
        />
      ) : field.type === 'country' ? (
        <CountryChoice
          label={label}
          value={draft}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            if (!open) setEditing(false);
          }}
          codes={field.options ?? []}
          onChange={(v) => {
            setDraft(v);
            void save(v);
          }}
        />
      ) : field.type === 'subdivision' ? (
        <SubdivisionChoice
          label={label}
          value={draft}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            if (!open) setEditing(false);
          }}
          country={toText(record.country)}
          onChange={(v) => {
            setDraft(v);
            void save(v);
          }}
        />
      ) : picker.includes(field.type) ? (
        <Choice
          below
          compact={field.key === 'currency'}
          label={label}
          value={draft}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            if (!open) setEditing(false);
          }}
          choices={choices}
          onChange={(v) => {
            setDraft(v);
            void save(v);
          }}
        />
      ) : field.type === 'textarea' ? (
        <>
          <Textarea
            aria-label={label}
            rows={4}
            maxLength={LONG_TEXT_LIMIT}
            value={draft}
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setEditing(false);
            }}
          />
          <LengthHint length={draft.length} language={language} />
        </>
      ) : titled && field.type === 'text' ? (
        // A title is one line of text that may be long: a textarea sized to
        // its content (field-sizing, with a height fallback for browsers
        // without it) widens with it and then wraps, while Enter still saves
        // and a pasted line break becomes a space.
        <Textarea
          aria-label={label}
          rows={1}
          maxLength={TEXT_LIMIT}
          // The title's own box: its padding (in the theme's spacing) less
          // the 1px border, and its line height, so opening the editor
          // moves no text.
          className='min-h-0 w-auto max-w-full min-w-24 resize-none overflow-hidden rounded-md px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] font-heading text-3xl font-semibold tracking-tight md:text-3xl'
          value={draft}
          disabled={saving}
          ref={fitHeight}
          onChange={(event) => {
            setDraft(event.target.value.replace(/\s*\n\s*/g, ' '));
            fitHeight(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save(draft);
            }
            if (event.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <Input
          aria-label={label}
          className={
            titled
              ? 'h-auto min-w-64 py-1 font-heading text-3xl font-semibold tracking-tight md:text-3xl'
              : undefined
          }
          type={
            ['date', 'email', 'number'].includes(field.type)
              ? field.type
              : field.type === 'datetime'
                ? 'datetime-local'
                : 'text'
          }
          value={draft}
          maxLength={lengthLimit(field.type)}
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save(draft);
            if (event.key === 'Escape') setEditing(false);
          }}
        />
      )}
      {error ? <p className='px-2 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}
