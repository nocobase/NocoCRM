import { useEffect, useRef, type ReactElement } from 'react';
import { Card, CardContent } from '../ui/card.js';
import { Progress } from '../ui/progress.js';
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock,
  FilePen,
  Hourglass,
  ShieldCheck,
  XCircle,
  Inbox,
  Layers,
  PauseCircle,
  Percent,
  PhoneOff,
  Scale,
  Trophy,
  UserMinus,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import {
  useCrmQuery,
  useCrmText,
  moneyTotals,
  rows,
  toText,
  type Data,
  type Entity,
  useMetadata,
} from './api.js';
import { ErrorNotice, Metric } from './common.js';

// One glyph per lead metric; other objects' metrics render without one.
const metricIcons: Record<string, LucideIcon> = {
  uncontacted: Clock,
  stale: PauseCircle,
  newThisMonth: Inbox,
  convertedThisMonth: CheckCircle2,
  conversionRate: Percent,
  customers: Building2,
  noContacts: UserX,
  noOpenOpportunity: CircleDashed,
  churnedThisMonth: UserMinus,
  missingContact: PhoneOff,
  inactiveContacts: UserMinus,
  open: Layers,
  weighted: Scale,
  closingSoon: CalendarClock,
  overdueOpportunities: AlertCircle,
  wonThisMonth: Trophy,
  winRate: Percent,
  todayActivities: CalendarDays,
  overdueActivities: AlertCircle,
  upcoming: CalendarClock,
  completedThisMonth: CheckCircle2,
  myDecisions: ShieldCheck,
  awaitingApproval: Hourglass,
  toSubmit: FilePen,
  approvedThisMonth: CheckCircle2,
  rejectedThisMonth: XCircle,
};

// A card on a list page reads exactly as the same card on the workspace:
// one wording key per concept, mapped here from the metric keys the server
// shares across objects ("stale" is a lead's stall or an account's silence).
const titleOverrides: Partial<Record<Entity, Record<string, string>>> = {
  leads: {
    stale: 'staleLeads',
    newThisMonth: 'newLeads',
    convertedThisMonth: 'convertedLeads',
    conversionRate: 'leadConversionRate',
  },
  accounts: { stale: 'staleAccounts' },
};
const noteOverrides: Partial<Record<Entity, Record<string, string>>> = {
  leads: {
    stale: 'staleLeads',
    newThisMonth: 'newLeads',
    convertedThisMonth: 'convertedLeads',
  },
  accounts: { stale: 'staleAccounts' },
  contacts: { newThisMonth: 'contactsNewThisMonth' },
};

// Counts of things waiting on someone: red when non-zero.
const attention = new Set([
  'uncontacted',
  'stale',
  'churnedThisMonth',
  'noContacts',
  'noOpenOpportunity',
  'missingContact',
  'overdueOpportunities',
  'overdueActivities',
  'myDecisions',
]);

export function EntityStatistics({
  entity,
  filters,
  breakdown = true,
  hide = [],
  selected,
  onSelect,
  initial,
  enabled = true,
}: {
  entity: Entity;
  filters: string;
  // Off while the page is leaving for a route whose segment is no object.
  enabled?: boolean;
  // The per-status card; a page whose board already shows a count per
  // column turns it off.
  breakdown?: boolean;
  // Metric keys the page shows elsewhere (a total beside the title).
  hide?: readonly string[];
  // Which metric the page is currently filtering by, and how to change it.
  // Only metrics the server returned members for are clickable.
  selected?: string;
  onSelect?: (key: string | undefined, ids: string[]) => void;
  // A metric to select as soon as the numbers arrive: how a workspace card
  // opens the list already filtered.
  initial?: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const { data, error } = useCrmQuery<Data>(
    `${entity}/statistics?${filters}`,
    enabled,
  );
  const metrics = (data?.metrics ?? {}) as Data;
  const members = (data?.members ?? {}) as Record<string, string[]>;
  // Applied once, when the initial key's members are known; the ref keeps
  // it from re-applying after the user clears the selection.
  const initialIds = initial ? members[initial] : undefined;
  const appliedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!initial || !initialIds || !onSelect || appliedRef.current === initial)
      return;
    appliedRef.current = initial;
    onSelect(initial, initialIds);
  }, [initial, initialIds, onSelect]);
  const statuses = rows(data?.statuses);
  return (
    <section className='space-y-4'>
      <ErrorNotice error={error} />
      {/* Columns follow the number of cards, so five cards fill the row
          instead of leaving a sixth slot empty. */}
      <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
        {Object.entries(metrics)
          .filter(([key]) => !hide.includes(key))
          .map(([key, value]) => (
            <Metric
              key={key}
              title={text(titleOverrides[entity]?.[key] ?? key)}
              icon={metricIcons[key]}
              tone={
                attention.has(key) && Number(value) > 0
                  ? 'attention'
                  : 'neutral'
              }
              active={selected === key}
              onClick={
                onSelect && members[key]
                  ? () =>
                      onSelect(
                        selected === key ? undefined : key,
                        members[key] ?? [],
                      )
                  : undefined
              }
              note={
                key === 'open'
                  ? moneyTotals(metrics.pipeline, language)
                  : text(
                      // A shared key can mean something else on another object.
                      `metricNotes.${noteOverrides[entity]?.[key] ?? key}`,
                      {
                        defaultValue: '',
                        days:
                          key === 'stale'
                            ? entity === 'leads'
                              ? meta?.settings.leadStaleDays
                              : meta?.settings.staleDays
                            : key === 'closingSoon'
                              ? meta?.settings.closeReminderDays
                              : undefined,
                        added: metrics.newThisMonth ?? 0,
                        waiting: metrics.waitingLong ?? 0,
                        rate:
                          metrics.approvalRate === null ||
                          metrics.approvalRate === undefined
                            ? '—'
                            : `${Math.round(Number(metrics.approvalRate) * 100)}%`,
                        share: Number(metrics.total)
                          ? `${Math.round((Number(metrics.customers) / Number(metrics.total)) * 100)}%`
                          : '0%',
                      },
                    ) || undefined
              }
              value={
                value === null
                  ? '—'
                  : typeof value === 'object'
                    ? moneyTotals(value, language)
                    : ['winRate', 'conversionRate'].includes(key)
                      ? `${Math.round(Number(value) * 100)}%`
                      : Number(value)
              }
            />
          ))}
      </div>
      {breakdown && statuses.length > 0 && (
        <Card className='shadow-none'>
          <CardContent className='grid gap-4 pt-5 sm:grid-cols-3 xl:grid-cols-5'>
            {statuses.map((row) => (
              <div key={toText(row.status)} className='space-y-2'>
                <div className='flex justify-between gap-3 text-sm'>
                  <span>{text(`options.${toText(row.status)}`)}</span>
                  <span className='font-semibold tabular-nums'>
                    {Number(row.count)}
                  </span>
                </div>
                <Progress
                  value={
                    Number(metrics.total)
                      ? (Number(row.count) / Number(metrics.total)) * 100
                      : 0
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
