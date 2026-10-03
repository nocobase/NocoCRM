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
import { DateTimeInput } from './datetime-input.js';
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
  startOpen = false,
  onClose,
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
  // A record's heading: `title` over a page, `heading` in a column.
  size?: 'field' | 'title' | 'heading';
  // Passed to Value: an amount shown without its currency sign.
  bare?: boolean;
  // Passed to Value: a status or stage as text rather than a badge.
  plain?: boolean;
  // Opens straight into its editor (a text-like field another control
  // switched to: the website's pencil), and reports when editing ends.
  startOpen?: boolean;
  onClose?: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [editing, setEditing] = useState(startOpen);
  const [draft, setDraft] = useState(() =>
    startOpen ? toText(record[field.key]) : '',
  );
  // A multi field edits a list of ids; the chips toggle it, blur saves it.
  const [listDraft, setListDraft] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // A portalled select popup takes focus out of this element, so blur alone
  // cannot tell "moved into the list" from "left the field".
  const popupOpenRef = useRef(false);

  // Editing over, the control that opened it takes the field back.
  const wasEditingRef = useRef(editing);
  useEffect(() => {
    if (wasEditingRef.current && !editing) onClose?.();
    wasEditingRef.current = editing;
  }, [editing, onClose]);
  useEffect(() => {
    if (editing)
      boxRef.current
        ?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input,textarea,button',
        )
        ?.focus();
  }, [editing]);

  // A native date input speaks yyyy-mm-dd with no zone, so the stored ISO
  // value is cut down on open; a datetime keeps its ISO instant, which
  // DateTimeInput shows on the 24-hour clock and hands back as ISO.
  const toInputValue = (raw: unknown): string => {
    // SQLite hands booleans back as 1 / 0; the picker speaks "true" / "false".
    if (field.type === 'boolean') return raw ? 'true' : 'false';
    if (field.type !== 'date') return toText(raw);
    const parsed = raw ? new Date(toText(raw)) : undefined;
    if (!parsed || !Number.isFinite(+parsed)) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const save = async (raw: unknown): Promise<void> => {
    const next =
      field.type === 'boolean'
        ? raw === 'true'
        : field.type === 'number' && raw !== ''
          ? Number(raw)
          : raw === ''
            ? null
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

  const titled = size !== 'field';
  const titleType =
    size === 'heading'
      ? 'font-heading text-xl font-semibold tracking-tight md:text-xl'
      : 'font-heading text-3xl font-semibold tracking-tight md:text-3xl';
  const readText = titled ? titleType : 'text-sm';
  // A title's parts (a lead's name and company, an account and its deal)
  // flow as text, one run of words wrapping wherever the line is full, so
  // a title breaks inside a name rather than only between its parts. Its
  // padding and hover shading are drawn on each line it spans.
  if (!editable && titled)
    return (
      <span className={`box-decoration-clone px-2 py-1.5 ${readText}`}>
        <Value
          record={record}
          field={field}
          lookup={lookup}
          bare={bare}
          plain={plain}
        />
      </span>
    );
  if (!editable)
    return (
      <div className={`px-2 py-1.5 ${readText}`}>
        <Value
          record={record}
          field={field}
          lookup={lookup}
          bare={bare}
          plain={plain}
          wrap
        />
      </div>
    );

  const startEditing = (): void => {
    setDraft(toInputValue(record[field.key]));
    setListDraft(arrayValues(record[field.key]).map(toText));
    setEditing(true);
  };

  // A title's part is inline text (see above); any other value a block.
  const Tag = titled ? 'span' : 'div';
  if (!editing)
    return (
      // Not a <button>: a single click has to leave the text selectable so a
      // value can be read and copied without ever entering edit mode. Editing is
      // a deliberate gesture — double-click, or Enter / F2 with focus. No
      // pencil: an icon at the end of the line ate the space long values need,
      // and hover shading already says the field is editable.
      <Tag
        role='button'
        tabIndex={0}
        aria-label={label}
        className={`${titled ? 'box-decoration-clone' : 'w-full'} cursor-text rounded-md px-2 py-1.5 text-left transition-colors select-text hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${readText}`}
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
          wrap={!titled}
        />
        {error ? (
          <span className='mt-1 block text-xs text-destructive'>{error}</span>
        ) : null}
      </Tag>
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
        // The date and time popup holds focus while open and saves on close.
        if (field.type === 'datetime' && popupOpenRef.current) return;
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
          className={`min-h-0 w-auto max-w-full min-w-24 resize-none overflow-hidden rounded-md px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] ${titleType}`}
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
      ) : field.type === 'datetime' ? (
        <DateTimeInput
          label={label}
          value={draft}
          disabled={saving}
          onChange={(v) => setDraft(v ?? '')}
          onOpenChange={(open) => {
            popupOpenRef.current = open;
            // Like the other popup pickers, closing the popup is done: what
            // was picked saves, and nothing picked returns to the read view.
            if (!open) void save(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save(draft);
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
      {/* One line of typed text: its count once it nears the limit. */}
      {!picker.includes(field.type) &&
        !['textarea', 'number', 'date', 'datetime', 'boolean'].includes(
          field.type,
        ) && (
          <div className='px-2'>
            <LengthHint
              length={draft.length}
              language={language}
              max={TEXT_LIMIT}
            />
          </div>
        )}
      {error ? <p className='px-2 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}
