import { toText } from './schema.js';
import type { Row } from '@nocobase/db';
import type { Actor } from './authorization.js';
import { probabilities, stages, type CrmRecord } from './schema.js';
import { array, type CrmService } from './service.js';
import { allRecords, statistics } from './statistics.js';

export { allRecords };

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

  const [leads, accounts, opportunities] = await Promise.all(
    (['leads', 'accounts', 'opportunities'] as const).map((entity) =>
      statistics(service, actor, entity, { ownerId }),
    ),
  );
  const leadMetrics = leads.metrics as Row;
  const accountMetrics = accounts.metrics as Row;
  const dealMetrics = opportunities.metrics as Row;

  // Today's agenda follows the scope: the reader's own (what they run or
  // take part in), or the whole team's.
  const visibleActivities = await allRecords(service, actor, 'activities');
  const personal = team
    ? visibleActivities
    : visibleActivities.filter(
        (r) =>
          r.ownerId === actor.id ||
          array(r.internalParticipants).includes(actor.id),
      );
  const approvals = await allRecords(service, actor, 'approvals');

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
    (source) => ({
      source,
      leads: allLeads.filter((r) => r.source === source).length,
      converted: allLeads.filter(
        (r) => r.source === source && r.status === 'converted',
      ).length,
      won: totals(wonDeals.filter((r) => r.source === source)),
    }),
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
    // Today's agenda is what is still ahead today; anything not started
    // whose time has passed — earlier today or on an earlier day — is
    // overdue, the same rule the activity list's card uses.
    today: personal.filter(
      (r) =>
        r.status === 'planned' &&
        r.startAt &&
        dayOf(r.startAt) === today &&
        new Date(toText(r.startAt)) >= now,
    ),
    overdue: personal.filter(
      (r) =>
        r.status === 'planned' &&
        r.startAt &&
        new Date(toText(r.startAt)) < now,
    ),
    approvals: approvals.filter(
      (r) => r.status === 'pending' && (team || r.approverId === actor.id),
    ),
    attention: {
      uncontacted: leadMetrics.uncontacted,
      staleLeads: leadMetrics.stale,
      staleAccounts: accountMetrics.stale,
      noOpenOpportunity: accountMetrics.noOpenOpportunity,
      closingSoon: dealMetrics.closingSoon,
      overdueOpportunities: dealMetrics.overdueOpportunities,
    },
    business: {
      newLeads: leadMetrics.newThisMonth,
      convertedLeads: leadMetrics.convertedThisMonth,
      pipeline: dealMetrics.pipeline,
      weighted: dealMetrics.weighted,
      wonThisMonth: dealMetrics.wonThisMonth,
    },
    // Whole-history ratios, kept apart from the month's numbers.
    overall: {
      conversionRate: leadMetrics.conversionRate,
      winRate: dealMetrics.winRate,
    },
    funnel,
    sellers,
    sources,
    trends,
  };
}
