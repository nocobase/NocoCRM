import { toText } from './api.js';
import { CountryLabel, SubdivisionLabel } from './geography.js';
import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router';
import { useRecordDrawer, useRecordLink } from './record-drawer.js';
import {
  ArrowUpRight,
  Inbox,
  LoaderCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/button.js';
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
  useAssistantAvailable,
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
  assistant = true,
  fill = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  // A control that sits beside the title on a phone, where the actions wrap
  // onto rows of their own below it, and leads the actions on wider screens.
  titleAside?: ReactNode;
  // The title is an inline field (a detail page's), which carries the
  // field's padding around its line.
  editableTitle?: boolean;
  actions?: ReactNode;
  // The action center is where the assistant's proposals already live, so a
  // button to open the assistant there adds nothing.
  assistant?: boolean;
  // The page takes exactly the viewport height and its content scrolls
  // inside (the board), instead of growing and scrolling as a whole.
  fill?: boolean;
  children: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const assistantAvailable = useAssistantAvailable();
  // Inside the record drawer the frame is a section of the drawer, not the
  // page's main landmark, and sits tighter.
  const inDrawer = useRecordDrawer()?.inDrawer ?? false;
  const Frame = inDrawer ? 'div' : 'main';
  return (
    <Frame
      className={
        inDrawer
          ? 'space-y-6 p-4 md:p-6'
          : `mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-8 ${toText(
              fill ? 'flex h-full flex-col pb-0 md:pb-0' : 'pb-24 md:pb-24',
            )}`
      }
    >
      <header className='flex flex-wrap items-start justify-between gap-4'>
        {/* Grows into the space the actions leave, so an editable title's
            editor can take the whole line. */}
        <div className={`min-w-0 grow ${titleAside ? 'w-full md:w-auto' : ''}`}>
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
          {actions}
          {assistant && assistantAvailable && (
            <Button
              variant='outline'
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('crm-assistant', { detail: {} }),
                )
              }
            >
              <Sparkles />
              {text('assistant')}
            </Button>
          )}
        </div>
      </header>
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
  noShow: 'warning',
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
// has the room, the board), and the full name shows on hover.
export function RecordLink({
  entity,
  record,
  lines = 1,
}: {
  entity: Entity;
  record: { id: string; name: string };
  lines?: 1 | 2;
}): ReactElement {
  const link = useRecordLink(entity, toText(record.id));
  return (
    <Link
      className={`inline-flex max-w-full min-w-0 gap-1 font-medium hover:text-primary hover:underline ${lines === 1 ? 'items-center' : 'items-start'}`}
      title={record.name}
      {...link}
    >
      <span className={lines === 1 ? 'truncate' : 'line-clamp-2 break-words'}>
        {record.name}
      </span>
      <ArrowUpRight
        className={`size-3 shrink-0 text-muted-foreground ${lines === 1 ? '' : 'mt-1'}`}
      />
    </Link>
  );
}
export function Value({
  field,
  record,
  lookup = {},
  bare = false,
  plain = false,
}: {
  field: Field | { key: string; type?: string; relation?: string };
  record: CrmRecord;
  lookup?: Record<string, string>;
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
      <a
        className='text-primary hover:underline'
        href={href}
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
        entity={field.relation as Entity}
        record={{
          id: toText(value),
          name:
            lookup[toText(value)] ?? text(`entities.${toText(field.relation)}`),
        }}
      />
    );
  if (Array.isArray(value)) return <>{value.length}</>;
  return (
    <span className='whitespace-pre-wrap break-words'>{toText(value)}</span>
  );
}
