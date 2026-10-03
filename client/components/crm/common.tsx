import { toText } from './api.js';
import { CountryLabel, SubdivisionLabel } from './geography.js';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { useRecordDrawer, useRecordLink } from './record-drawer.js';
import { Markdown } from './markdown.js';
import {
  ArrowUpRight,
  Inbox,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Alert, AlertDescription } from '../ui/alert.js';
import {
  useCrmText,
  errorCode,
  linkOf,
  localDate,
  money,
  useMetadata,
  type CrmRecord,
  type Entity,
  type Field,
} from './api.js';

export function CrmFrame({
  title,
  description,
  titleAside,
  editableTitle = false,
  actions,
  fill = false,
  children,
}: {
  // Without one the frame has no header: the page draws its heading and
  // actions itself (a lead's, in its columns).
  title?: ReactNode;
  description?: ReactNode;
  // A control that sits beside the title on a phone, where the actions wrap
  // onto rows of their own below it, and leads the actions on wider screens.
  titleAside?: ReactNode;
  // The title is an inline field (a detail page's), which carries the
  // field's padding around its line.
  editableTitle?: boolean;
  actions?: ReactNode;
  // The page takes exactly the viewport height and its content scrolls
  // inside (the board), instead of growing and scrolling as a whole.
  fill?: boolean;
  children: ReactNode;
}): ReactElement {
  // Inside the record drawer the frame is a section of the drawer, not the
  // page's main landmark, and sits tighter.
  const inDrawer = useRecordDrawer()?.inDrawer ?? false;
  const Frame = inDrawer ? 'div' : 'main';
  return (
    <Frame
      className={
        inDrawer
          ? 'space-y-6 p-4 md:p-6'
          : // A record's page sits tighter at the top than a list's, so its
            // particulars and timeline start higher; one without a header
            // starts at the top, where its own columns begin.
            `mx-auto w-full max-w-[1600px] p-4 md:p-8 ${title === undefined ? 'space-y-4 pt-0 md:pt-0' : editableTitle ? 'space-y-4 md:pt-6' : 'space-y-6'} ${toText(
              fill ? 'flex h-full flex-col pb-0 md:pb-0' : 'pb-24 md:pb-24',
            )}`
      }
    >
      {title !== undefined && (
        <header className='flex flex-wrap items-start justify-between gap-4'>
          {/* Grows into the space the actions leave, so an editable title's
            editor can take the whole line. */}
          <div
            className={`min-w-0 grow ${titleAside ? 'w-full md:w-auto' : ''}`}
          >
            <div className='flex items-center justify-between gap-3'>
              {typeof title === 'string' ? (
                <h1 className='font-heading text-3xl font-semibold tracking-tight'>
                  {title}
                </h1>
              ) : (
                // An editable title brings its own block elements, which a <h1>
                // may not contain; the role keeps it a heading for readers.
                <div
                  role='heading'
                  aria-level={1}
                  className='flex min-w-0 flex-1 flex-wrap items-center font-heading text-3xl font-semibold tracking-tight'
                >
                  {title}
                </div>
              )}
              {titleAside && <div className='md:hidden'>{titleAside}</div>}
            </div>
            {description && (
              <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>
                {description}
              </p>
            )}
          </div>
          {/* Beside the title, the actions are centred on its first line: a
            line of the title's type size (1lh at text-3xl), plus the padding
            an editable title carries. */}
          <div
            className={`flex flex-wrap items-center gap-2 md:font-heading md:text-3xl ${editableTitle ? 'md:min-h-[calc(1lh+--spacing(3))]' : 'md:min-h-lh'}`}
          >
            {titleAside && <div className='hidden md:block'>{titleAside}</div>}
            {/* The assistant opens from the header's AI button, and about a
                record from its "Ask AI": no generic entry here. */}
            {actions}
          </div>
        </header>
      )}
      {children}
    </Frame>
  );
}

export function Loading(): ReactElement {
  const { text } = useCrmText();
  return (
    <div
      role='status'
      className='flex items-center justify-center gap-2 p-12 text-muted-foreground'
    >
      <LoaderCircle className='size-5 animate-spin' />
      {text('loading')}
    </div>
  );
}
export function ErrorNotice({
  error,
}: {
  error: unknown;
}): ReactElement | null {
  const { text } = useCrmText();
  if (!error) return null;
  const { code, field, detail } = errorCode(error);
  return (
    <Alert variant='destructive' role='alert'>
      <AlertDescription>
        {text(`errors.${toText(code)}`, {
          defaultValue: text('errors.serverError'),
        })}
        {field
          ? ` (${toText(text(`fields.${toText(field)}`, { defaultValue: field }))})`
          : ''}
        {/* Verbatim text from an upstream system, which usually names the real
            cause far more precisely than the message above. */}
        {detail ? (
          <span className='mt-1 block text-xs break-words opacity-80'>
            {toText(detail)}
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
export function Empty({ action }: { action?: ReactNode }): ReactElement {
  const { text } = useCrmText();
  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center'>
      <div className='rounded-xl bg-muted p-3'>
        <Inbox className='size-6 text-muted-foreground' />
      </div>
      <h3 className='font-medium'>{text('empty')}</h3>
      <p className='max-w-sm text-sm text-muted-foreground'>
        {text('emptyDescription')}
      </p>
      {action}
    </div>
  );
}
// A status's colour says where the record stands: done, under way, waiting,
// failed, or not started (and withdrawn). A deal's open stages are under way.
const statusTones: Record<
  string,
  'success' | 'info' | 'warning' | 'destructive' | 'secondary'
> = {
  converted: 'success',
  customer: 'success',
  won: 'success',
  completed: 'success',
  approved: 'success',
  new: 'info',
  working: 'info',
  qualified: 'info',
  planned: 'info',
  contact: 'info',
  qualification: 'info',
  validation: 'info',
  proposal: 'info',
  negotiation: 'info',
  contract: 'info',
  pending: 'warning',
  nurturing: 'warning',
  paused: 'warning',
  inactive: 'warning',
  // A no-show, before the status was folded into cancelled, in history.
  noShow: 'destructive',
  invalid: 'destructive',
  churned: 'destructive',
  lost: 'destructive',
  cancelled: 'destructive',
  rejected: 'destructive',
};
const statusTone = (
  status: string,
): 'success' | 'info' | 'warning' | 'destructive' | 'secondary' =>
  statusTones[status] ?? 'secondary';
// label overrides the option wording where the same code means something
// else: a pending AI action awaits the user, a pending approval its approver.
export function Status({
  value,
  label,
}: {
  value: unknown;
  label?: string;
}): ReactElement {
  const { text } = useCrmText();
  const status = toText(value ?? '');
  return (
    <Badge variant={statusTone(status)}>
      {label ?? text(`options.${toText(status)}`, { defaultValue: status })}
    </Badge>
  );
}
export function Metric({
  title,
  value,
  note,
  icon: Icon,
  tone = 'neutral',
  onClick,
  active = false,
}: {
  title: string;
  value: ReactNode;
  note?: string;
  icon?: LucideIcon;
  // "attention" colors the number: the metric is a count of things waiting
  // on someone, and it is not zero.
  tone?: 'neutral' | 'attention';
  // A clickable metric is a filter: the card is the entry point to the
  // records it counted, and "active" marks the one currently applied.
  onClick?: () => void;
  active?: boolean;
}): ReactElement {
  const body = (
    // A container, so a long value can size itself to the card's width.
    <CardContent className='@container space-y-1.5 px-4'>
      <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
        {Icon && <Icon className='size-3.5' aria-hidden />}
        {title}
      </div>
      <p
        className={`font-semibold tracking-tight tabular-nums ${toText(
          typeof value === 'string' && value.length > 8
            ? // An amount like "CN¥1,696,000" sizes to the card: on a phone,
              // two to a row, a fixed size ran past the card's edge.
              'text-[clamp(1.125rem,11cqi,1.5rem)] leading-tight break-words'
            : 'text-3xl',
        )} ${toText(tone === 'attention' ? 'text-destructive' : '')}`}
      >
        {value}
      </p>
      {note && (
        <p className='text-xs leading-snug text-muted-foreground'>{note}</p>
      )}
    </CardContent>
  );
  const frame = `gap-0 py-4 shadow-none ${toText(
    active ? 'border-primary ring-1 ring-primary' : '',
  )}`;
  return onClick ? (
    <Card
      role='button'
      tabIndex={0}
      aria-pressed={active}
      className={`${frame} cursor-pointer text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {body}
    </Card>
  ) : (
    <Card className={frame}>{body}</Card>
  );
}
// A link to a record by its name. Long names never wrap into the layout
// around them: they are cut with an ellipsis after one line (two where a card
// has the room, the board), and the full name shows on hover. The arrow
// follows the name's last character.
export function RecordLink({
  entity,
  record,
  lines = 1,
}: {
  entity: Entity;
  record: { id: string; name: string };
  // 'all': the whole name, wrapping over as many lines as it takes (a
  // record's particulars, where nothing sits beside it).
  lines?: 1 | 2 | 'all';
}): ReactElement {
  const link = useRecordLink(entity, toText(record.id));
  const arrow = (
    <ArrowUpRight className='inline size-3 shrink-0 text-muted-foreground' />
  );
  if (lines === 'all')
    return (
      <Link
        className='font-medium break-words hover:text-primary hover:underline'
        {...link}
      >
        {record.name}{' '}
        <ArrowUpRight className='inline size-3 align-baseline text-muted-foreground' />
      </Link>
    );
  return lines === 1 ? (
    <Link
      className='inline-flex max-w-full min-w-0 items-center gap-1 font-medium hover:text-primary hover:underline'
      title={record.name}
      {...link}
    >
      <span className='truncate'>{record.name}</span>
      {arrow}
    </Link>
  ) : (
    <Link
      className='block max-w-full font-medium hover:text-primary hover:underline'
      title={record.name}
      {...link}
    >
      <TwoLineName name={record.name} arrow={arrow} />
    </Link>
  );
}

// A name in at most two lines with the arrow after its last character: in
// the text while it fits, and when the name is cut, after the ellipsis at the
// end of the second line, which leaves the arrow's room on each line.
function TwoLineName({
  name,
  arrow,
}: {
  name: string;
  arrow: ReactElement;
}): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // The observer reports once when it starts, then on every resize.
    const observer = new ResizeObserver(() => {
      setCut(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [name]);
  return (
    <span className='relative block'>
      <span
        ref={ref}
        className={`line-clamp-2 break-words ${cut ? 'pr-4' : ''}`}
      >
        {name}
        {!cut && <> {arrow}</>}
      </span>
      {cut && (
        <span className='absolute right-0 bottom-0 flex h-[1lh] items-center'>
          {arrow}
        </span>
      )}
    </span>
  );
}
export function Value({
  field,
  record,
  lookup = {},
  bare = false,
  plain = false,
  wrap = false,
}: {
  field: Field | { key: string; type?: string; relation?: string };
  record: CrmRecord;
  lookup?: Record<string, string>;
  // A related record's whole name over several lines if need be, where the
  // value has a row of its own (a record's particulars), not cut to one.
  wrap?: boolean;
  // An amount without its currency sign, where the currency is shown beside it.
  bare?: boolean;
  // A status or stage as its label only, where a badge would be noise — the
  // rows of an action card.
  plain?: boolean;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const value = record[field.key];
  if (value == null || value === '')
    return <span className='text-muted-foreground'>—</span>;
  if (['status', 'stage'].includes(field.key))
    return plain ? (
      <>{text(`options.${toText(value)}`, { defaultValue: toText(value) })}</>
    ) : (
      <Status value={value} />
    );
  if (field.key === 'amount')
    return (
      <>
        {bare
          ? new Intl.NumberFormat(language).format(Number(value))
          : money(value, toText(record.currency), language)}
      </>
    );
  if (field.type === 'boolean') return <>{text(value ? 'yes' : 'no')}</>;
  if (
    field.type === 'date' ||
    field.type === 'datetime' ||
    field.key.endsWith('At')
  )
    return (
      <>
        {localDate(
          value,
          language,
          meta?.settings.timeZone ?? 'Asia/Shanghai',
          field.type !== 'date',
        )}
      </>
    );
  // A list of people: users by name, records as links, "—" when empty.
  if (field.type === 'multi' && Array.isArray(value)) {
    if (!value.length) return <span className='text-muted-foreground'>—</span>;
    if (field.relation === 'users')
      return (
        <>
          {value
            .map(
              (id) => meta?.users.find((u) => u.id === id)?.name ?? toText(id),
            )
            .join('、')}
        </>
      );
    return (
      <span className='flex flex-wrap gap-x-2 gap-y-1'>
        {value.map((id) => (
          <RecordLink
            key={toText(id)}
            entity={field.relation as Entity}
            record={{
              id: toText(id),
              name:
                lookup[toText(id)] ??
                text(`entities.${toText(field.relation)}`),
            }}
          />
        ))}
      </span>
    );
  }
  if (
    field.relation === 'users' ||
    ['ownerId', 'approverId', 'createdById', 'actorId'].includes(field.key)
  )
    return <>{meta?.users.find((u) => u.id === value)?.name ?? '—'}</>;
  if (field.type === 'url') {
    const href = linkOf(value);
    return href ? (
      // One line, cut with an ellipsis where the space ends, whole on
      // hover: an address has nowhere to break and would push the layout.
      <a
        className='inline-block max-w-full truncate align-bottom text-primary hover:underline'
        href={href}
        title={toText(value)}
        target='_blank'
        rel='noopener noreferrer'
        // Inside an inline-editable field a double-click starts editing;
        // on the link itself that would also have opened the tab twice.
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {toText(value)}
      </a>
    ) : (
      <>{toText(value)}</>
    );
  }
  if (field.type === 'country') return <CountryLabel code={toText(value)} />;
  if (field.type === 'subdivision')
    return (
      <SubdivisionLabel country={toText(record.country)} code={toText(value)} />
    );
  if (field.type === 'select')
    return (
      <>
        {text(`options.${toText(toText(value))}`, {
          defaultValue: toText(value),
        })}
      </>
    );
  if (field.type === 'relation' && field.relation && field.relation !== 'users')
    return (
      <RecordLink
        lines={wrap ? 'all' : 1}
        entity={field.relation as Entity}
        record={{
          id: toText(value),
          name:
            lookup[toText(value)] ?? text(`entities.${toText(field.relation)}`),
        }}
      />
    );
  if (Array.isArray(value)) return <>{value.length}</>;
  if (field.type === 'textarea') return <LongText value={toText(value)} />;
  return (
    <span className='whitespace-pre-wrap break-words'>{toText(value)}</span>
  );
}

// A long text (a description, a message, a note) is Markdown, rendered as
// the chat's replies are (single line breaks kept, HTML escaped, images
// only from this origin), and shows its first four lines and offers the
// rest; the toggle, only when there is more to show,
// sits at the end of the last line shown, folded or open: floated right
// in the text and pushed down by a float one line short of the text's
// height (the box around it being flex, so that height resolves). Its
// clicks and keys stay its own: the field around it opens its editor on a
// double-click or Enter.
export function LongText({ value }: { value: string }): ReactElement {
  const { text } = useCrmText();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = (): void => {
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    };
    // The observer reports once when it starts, then on every resize.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [value]);
  const toggle = overflows || open;
  return (
    <div className='flex'>
      <div
        ref={ref}
        className={`min-w-0 flex-1 break-words ${open ? 'block' : 'line-clamp-4'} ${
          toggle
            ? "before:float-right before:h-[calc(100%-1lh)] before:content-['']"
            : ''
        }`}
      >
        {toggle ? (
          // The label is the text's own size, so it sits on the last
          // line's baseline (at 12px, its shorter line rode up).
          <button
            type='button'
            className='group/toggle float-right clear-both ml-2'
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
          >
            <span className='font-medium text-ai group-hover/toggle:underline'>
              {text(open ? 'showLess' : 'showMore')}
            </span>
          </button>
        ) : null}
        <Markdown compact>{value}</Markdown>
      </div>
    </div>
  );
}
