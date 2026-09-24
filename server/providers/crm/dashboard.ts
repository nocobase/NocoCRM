import { toText } from './schema.js';
import type { Row } from '@nocobase/db';
import type { Actor } from './authorization.js';
import { probabilities, stages, type CrmRecord } from './schema.js';
import { array, type CrmService, type ListResult } from './service.js';
import { allRecords, statistics } from './statistics.js';

export { allRecords };

// The offset of a zone at an instant, so the business day's end can be
// expressed as an instant without a calendar library.
function zoneOffsetMinutes(timeZone: string, date: Date): number {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

// A workspace card shows this many before asking for the next page.
export const AGENDA_PAGE = 5;
export type AgendaName = 'today' | 'overdue' | 'approvals';
export const agendaNames: AgendaName[] = ['today', 'overdue', 'approvals'];

// One of the workspace's three lists, a page at a time, straight from the
// list query: today's agenda is what is still ahead today, anything not
// started whose time has passed is overdue (the rule the activity list's
// card uses), and the approvals are the ones waiting for the reader — or,
// in the team scope, for anyone. The reader's own agenda is what they run
// or take part in.
export async function agenda(
  service: CrmService,
  actor: Actor,
  name: AgendaName,
  options: { scope?: string; page?: number; pageSize?: number },
): Promise<ListResult> {
  const team = options.scope === 'team';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? AGENDA_PAGE;
  if (name === 'approvals')
    return service.list(actor, 'approvals', {
      status: 'pending',
      approverId: team ? undefined : actor.id,
      sort: '-submittedAt',
      page,
      pageSize,
    });
  const settings = await service.settings();
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: settings.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const endOfToday = new Date(
    Date.parse(`${today}T23:59:59.999Z`) -
      zoneOffsetMinutes(settings.timeZone, now) * 60000,
  );
  const involvedId = team ? undefined : actor.id;
  return name === 'today'
    ? service.list(actor, 'activities', {
        status: 'planned',
        startFrom: now.toISOString(),
        startTo: endOfToday.toISOString(),
        involvedId,
        sort: 'startAt',
        page,
        pageSize,
      })
    : service.list(actor, 'activities', {
        status: 'planned',
        startTo: new Date(now.getTime() - 1).toISOString(),
        involvedId,
        sort: '-startAt',
        page,
        pageSize,
      });
}

// The workspace reads top to bottom: what to do today, where the risks are,
// how the month's business stands, and how the team does. The team scope
// is open to every role: the records are visible to all anyway, and the
// workspace only sums what the list pages already show.
// Every risk and business number is the same rule the list pages' cards use
// (statistics.ts), so a card here and the card on the list agree.
export async function dashboard(
  service: CrmService,
  actor: Actor,
  options: { scope?: string },
): Promise<Row> {
  const team = options.scope === 'team';
  const ownerId = team ? undefined : actor.id;
  const settings = await service.settings();
  const now = new Date();
  const dayOf = (date: unknown): string =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: settings.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(toText(date)));
  const today = dayOf(now);
  const month = today.slice(0, 7);

  // Every object's numbers, with the list pages' rules, so the workspace is
  // the one place that reads them.
  const [leads, accounts, contacts, opportunities, activities, approvals] =
    await Promise.all(
      (
        [
          'leads',
          'accounts',
          'contacts',
          'opportunities',
          'activities',
          'approvals',
        ] as const
      ).map((entity) => statistics(service, actor, entity, { ownerId })),
    );
  const leadMetrics = leads.metrics as Row;
  const accountMetrics = accounts.metrics as Row;
  const contactMetrics = contacts.metrics as Row;
  const dealMetrics = opportunities.metrics as Row;
  const activityMetrics = activities.metrics as Row;
  const approvalMetrics = approvals.metrics as Row;

  // The three lists come one page each; the cards ask for the rest.
  const [todayList, overdueList, approvalList] = await Promise.all(
    agendaNames.map((name) => agenda(service, actor, name, options)),
  );

  // The funnel is the book as it stands: open deals by current stage.
  const deals = await allRecords(service, actor, 'opportunities', { ownerId });
  const totals = (records: CrmRecord[], weighted = false): Row =>
    records.reduce<Row>((sum, r) => {
      const currency = toText(r.currency);
      sum[currency] =
        Number(sum[currency] ?? 0) +
        Number(r.amount ?? 0) *
          (weighted ? (probabilities[toText(r.stage)] ?? 0) : 1);
      return sum;
    }, {});
  const openStages = stages.filter(
    (stage) => !['won', 'lost', 'paused'].includes(stage),
  );
  const funnel = openStages.map((stage) => {
    const inStage = deals.filter((r) => r.stage === stage);
    return { stage, count: inStage.length, amount: totals(inStage) };
  });

  // Per seller, the same numbers the person's own workspace would show.
  // Administrators own nothing and are not a row.
  const users = (await service.users(actor)).filter(
    (u) =>
      !u.disabled &&
      array(u.roles).some((r) =>
        ['sales-representative', 'sales-manager'].includes(toText(r)),
      ),
  );
  const sellers = await Promise.all(
    users.map(async (u) => {
      const [l, a, o, act] = await Promise.all(
        (['leads', 'accounts', 'opportunities', 'activities'] as const).map(
          (entity) =>
            statistics(service, actor, entity, { ownerId: toText(u.id) }),
        ),
      );
      return {
        id: u.id,
        name: u.name,
        pipeline: (o.metrics as Row).pipeline,
        wonThisMonth: (o.metrics as Row).wonThisMonth,
        uncontacted: (l.metrics as Row).uncontacted,
        staleLeads: (l.metrics as Row).stale,
        staleAccounts: (a.metrics as Row).stale,
        overdueActivities: (act.metrics as Row).overdueActivities,
      };
    }),
  );
  const allLeads = await allRecords(service, actor, 'leads');
  const wonDeals = deals.filter((r) => r.stage === 'won');
  const sources = [...new Set(allLeads.map((r) => toText(r.source)))].map(
    (source) => {
      const fromSource = allLeads.filter((r) => r.source === source);
      const converted = fromSource.filter(
        (r) => r.status === 'converted',
      ).length;
      // The overall rate's definition, per source: converted over the
      // source's leads that are not invalid; null when there are none.
      const eligible = fromSource.filter((r) => r.status !== 'invalid').length;
      return {
        source,
        leads: fromSource.length,
        converted,
        conversionRate: eligible ? converted / eligible : null,
        won: totals(wonDeals.filter((r) => r.source === source)),
      };
    },
  );
  // Won / lost by month over the last six months, oldest first.
  const closed = deals.filter((r) => ['won', 'lost'].includes(toText(r.stage)));
  const trends = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(
      Date.UTC(
        Number(month.slice(0, 4)),
        Number(month.slice(5)) - 1 - (5 - i),
        15,
      ),
    );
    const key = d.toISOString().slice(0, 7);
    const inMonth = closed.filter(
      (r) => r.closedAt && dayOf(r.closedAt).startsWith(key),
    );
    return {
      month: key,
      won: inMonth.filter((r) => r.stage === 'won').length,
      lost: inMonth.filter((r) => r.stage === 'lost').length,
    };
  });

  return {
    scope: team ? 'team' : 'mine',
    today: todayList,
    overdue: overdueList,
    approvals: approvalList,
    attention: {
      uncontacted: leadMetrics.uncontacted,
      staleLeads: leadMetrics.stale,
      staleAccounts: accountMetrics.stale,
      noOpenOpportunity: accountMetrics.noOpenOpportunity,
      noContacts: accountMetrics.noContacts,
      missingContact: contactMetrics.missingContact,
      closingSoon: dealMetrics.closingSoon,
      overdueOpportunities: dealMetrics.overdueOpportunities,
      toSubmit: approvalMetrics.toSubmit,
    },
    business: {
      newLeads: leadMetrics.newThisMonth,
      convertedLeads: leadMetrics.convertedThisMonth,
      pipeline: dealMetrics.pipeline,
      weighted: dealMetrics.weighted,
      wonThisMonth: dealMetrics.wonThisMonth,
      churnedThisMonth: accountMetrics.churnedThisMonth,
      newAccounts: accountMetrics.newThisMonth,
      completedThisMonth: activityMetrics.completedThisMonth,
      approvedThisMonth: approvalMetrics.approvedThisMonth,
      rejectedThisMonth: approvalMetrics.rejectedThisMonth,
      approvalRate: approvalMetrics.approvalRate,
    },
    // Whole-history ratios and standing counts, kept apart from the
    // month's numbers.
    overall: {
      conversionRate: leadMetrics.conversionRate,
      winRate: dealMetrics.winRate,
      customers: accountMetrics.customers,
      accounts: accountMetrics.total,
    },
    funnel,
    sellers,
    sources,
    trends,
  };
}
