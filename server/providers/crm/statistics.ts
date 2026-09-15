import type { Row } from '@nocobase/db';
import type { Actor } from './authorization.js';
import {
  definitions,
  probabilities,
  toText,
  type CrmRecord,
  type Entity,
} from './schema.js';
import type { CrmService, ListOptions } from './service.js';

export async function allRecords(
  service: CrmService,
  actor: Actor,
  entity: Entity,
  options: ListOptions = {},
): Promise<CrmRecord[]> {
  const result: CrmRecord[] = [];
  let page = 1;
  while (true) {
    const batch = await service.list(actor, entity, {
      ...options,
      page,
      pageSize: 1000,
    });
    result.push(...batch.data);
    if (result.length >= batch.total || !batch.data.length) return result;
    page++;
  }
}

export async function statistics(
  service: CrmService,
  actor: Actor,
  entity: Entity,
  options: ListOptions,
): Promise<Row> {
  const records = await allRecords(service, actor, entity, {
    ...options,
    from: undefined,
    to: undefined,
  });
  const settings = await service.settings();
  const now = new Date();
  const date = (value: unknown): string =>
    value
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: settings.timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(toText(value)))
      : '';
  const today = date(now);
  const total: Row = { total: records.length };
  let members: Record<string, string[]> | undefined;
  const count = (predicate: (r: CrmRecord) => boolean): number =>
    records.filter(predicate).length;
  const statusField = definitions[entity].statusField;
  const statuses = definitions[entity].statuses.map((status) => ({
    status,
    count: count((r) => r[statusField ?? 'status'] === status),
  }));
  if (entity === 'leads') {
    // The same rules the dashboard uses for its reminders, so the numbers
    // here and the risks there agree. "Contacted" means a completed activity.
    const activities = await allRecords(service, actor, 'activities');
    const completedFor = (id: string): CrmRecord[] =>
      activities.filter((a) => a.leadId === id && a.status === 'completed');
    const hasUpcoming = (id: string): boolean =>
      activities.some(
        (a) =>
          a.leadId === id &&
          a.status === 'planned' &&
          new Date(toText(a.startAt)) >= now,
      );
    // Every new lead nobody has talked to yet is waiting on someone; there
    // is no grace period.
    const uncontacted = records.filter(
      (r) => r.status === 'new' && !completedFor(r.id).length,
    );
    const stale = records.filter((r) => {
      if (!['working', 'nurturing'].includes(toText(r.status))) return false;
      if (hasUpcoming(r.id)) return false;
      const latest = completedFor(r.id).reduce(
        (last, a) => Math.max(last, +new Date(toText(a.completedAt))),
        +new Date(r.createdAt),
      );
      return +now - latest > settings.leadStaleDays * 86400000;
    });
    // Invalid leads were never a chance to convert, so they leave the base.
    const eligible = count((r) => r.status !== 'invalid');
    // Month counts are two plain numbers rather than a monthly rate: leads
    // created this month have not had time to convert, and a rate over
    // this month's conversions divided by this month's arrivals compares
    // different leads. All-time by creation is the one comparable rate.
    const month = today.slice(0, 7);
    const newThisMonth = records.filter(
      (r) => date(r.createdAt).slice(0, 7) === month,
    );
    const convertedThisMonth = records.filter(
      (r) =>
        Boolean(r.convertedAt) && date(r.convertedAt).slice(0, 7) === month,
    );
    Object.assign(total, {
      uncontacted: uncontacted.length,
      stale: stale.length,
      newThisMonth: newThisMonth.length,
      convertedThisMonth: convertedThisMonth.length,
      conversionRate: eligible
        ? count((r) => r.status === 'converted') / eligible
        : null,
    });
    // The records behind each count, so a click on the card can list them.
    members = {
      uncontacted: uncontacted.map((r) => r.id),
      stale: stale.map((r) => r.id),
      newThisMonth: newThisMonth.map((r) => r.id),
      convertedThisMonth: convertedThisMonth.map((r) => r.id),
    };
  }
  // Shared by accounts and activities: which records have what activity.
  const activities =
    entity === 'accounts' || entity === 'opportunities'
      ? await allRecords(service, actor, 'activities')
      : [];
  const month = today.slice(0, 7);
  const inMonth = (value: unknown): boolean =>
    Boolean(value) && date(value).slice(0, 7) === month;
  const lastCompletedAt = (
    relation: 'accountId' | 'opportunityId',
    r: CrmRecord,
  ): number =>
    activities
      .filter((a) => a[relation] === r.id && a.status === 'completed')
      .reduce(
        (last, a) => Math.max(last, +new Date(toText(a.completedAt))),
        +new Date(r.createdAt),
      );

  if (entity === 'accounts') {
    const contacts = await allRecords(service, actor, 'contacts');
    const opportunities = await allRecords(service, actor, 'opportunities');
    const openStages = new Set([
      'contact',
      'qualification',
      'validation',
      'proposal',
      'negotiation',
      'contract',
    ]);
    // The dashboard's staleAccount rule, so the card and the reminder agree.
    // A scheduled activity does not clear it: the account has still not been
    // reached for that long.
    const stale = records.filter(
      (r) =>
        r.status !== 'churned' &&
        +now - lastCompletedAt('accountId', r) > settings.staleDays * 86400000,
    );
    const noContacts = records.filter(
      (r) => !contacts.some((c) => c.accountId === r.id),
    );
    const noOpenOpportunity = records.filter(
      (r) =>
        ['qualified', 'customer'].includes(toText(r.status)) &&
        !opportunities.some(
          (o) => o.accountId === r.id && openStages.has(toText(o.stage)),
        ),
    );
    const newThisMonth = records.filter((r) => inMonth(r.createdAt));
    const customers = records.filter((r) => r.status === 'customer');
    // Churned this month: churned now, and the move to churned happened this
    // month. The move is read from history, since the record keeps no date
    // for it; only the churned accounts are looked up.
    const churned = records.filter((r) => r.status === 'churned');
    const churnedThisMonth: CrmRecord[] = [];
    for (let offset = 0; offset < churned.length; offset += 400) {
      const slice = churned.slice(offset, offset + 400);
      const moves = await service.database
        .query()
        .selectFrom('crmHistory')
        .select(['recordId', 'createdAt'])
        .where('entity', '=', 'accounts')
        .where('action', '=', 'status')
        .where('toValue', '=', 'churned')
        .where(
          'recordId',
          'in',
          slice.map((r) => r.id),
        )
        .orderBy('createdAt', 'desc')
        .execute();
      for (const r of slice) {
        const latest = moves.find((m) => m.recordId === r.id);
        if (latest && inMonth(latest.createdAt)) churnedThisMonth.push(r);
      }
    }
    // Card order: how big the book is, what needs doing, which way it moves.
    // newThisMonth is not a card; the churn card quotes it in its note.
    Object.assign(total, {
      customers: customers.length,
      stale: stale.length,
      noOpenOpportunity: noOpenOpportunity.length,
      noContacts: noContacts.length,
      churnedThisMonth: churnedThisMonth.length,
      newThisMonth: newThisMonth.length,
    });
    members = {
      customers: customers.map((r) => r.id),
      stale: stale.map((r) => r.id),
      noOpenOpportunity: noOpenOpportunity.map((r) => r.id),
      noContacts: noContacts.map((r) => r.id),
      churnedThisMonth: churnedThisMonth.map((r) => r.id),
      newThisMonth: newThisMonth.map((r) => r.id),
    };
  }
  if (entity === 'contacts') {
    const missingContact = records.filter((r) => !r.phone && !r.email);
    const inactive = records.filter((r) => !r.employed);
    const newThisMonth = records.filter((r) => inMonth(r.createdAt));
    Object.assign(total, {
      missingContact: missingContact.length,
      inactiveContacts: inactive.length,
      newThisMonth: newThisMonth.length,
    });
    members = {
      missingContact: missingContact.map((r) => r.id),
      inactiveContacts: inactive.map((r) => r.id),
      newThisMonth: newThisMonth.map((r) => r.id),
    };
  }
  if (entity === 'activities') {
    const todayActivities = records.filter((r) => date(r.startAt) === today);
    // Overdue means it should have started and nobody has said what happened.
    const overdue = records.filter(
      (r) => r.status === 'planned' && new Date(toText(r.startAt)) < now,
    );
    const upcoming = records.filter(
      (r) => r.status === 'planned' && new Date(toText(r.startAt)) >= now,
    );
    const completedThisMonth = records.filter(
      (r) => r.status === 'completed' && inMonth(r.completedAt ?? r.endAt),
    );
    Object.assign(total, {
      todayActivities: todayActivities.length,
      overdueActivities: overdue.length,
      upcoming: upcoming.length,
      completedThisMonth: completedThisMonth.length,
    });
    members = {
      todayActivities: todayActivities.map((r) => r.id),
      overdueActivities: overdue.map((r) => r.id),
      upcoming: upcoming.map((r) => r.id),
      completedThisMonth: completedThisMonth.map((r) => r.id),
    };
  }
  if (entity === 'opportunities') {
    const open = records.filter(
      (r) => !['won', 'lost', 'paused'].includes(toText(r.stage)),
    );
    const decided = records.filter((r) =>
      ['won', 'lost'].includes(toText(r.stage)),
    );
    const amounts = (values: CrmRecord[], weighted = false): Row =>
      values.reduce<Row>(
        (sum, r) => ({
          ...sum,
          [toText(r.currency)]:
            Number(sum[toText(r.currency)] ?? 0) +
            Number(r.amount ?? 0) *
              (weighted ? (probabilities[toText(r.stage)] ?? 0) : 1),
        }),
        {},
      );
    const soon = +now + settings.closeReminderDays * 86400000;
    // The dashboard's closing-soon rule.
    const closingSoon = open.filter(
      (r) =>
        r.expectedCloseAt &&
        +new Date(toText(r.expectedCloseAt)) >= +now &&
        +new Date(toText(r.expectedCloseAt)) <= soon,
    );
    const overdue = open.filter(
      (r) => r.expectedCloseAt && +new Date(toText(r.expectedCloseAt)) < +now,
    );
    const wonThisMonth = records.filter(
      (r) => r.stage === 'won' && inMonth(r.closedAt),
    );
    Object.assign(total, {
      open: open.length,
      pipeline: amounts(open),
      weighted: amounts(open, true),
      closingSoon: closingSoon.length,
      overdueOpportunities: overdue.length,
      wonThisMonth: amounts(wonThisMonth),
      // All time, like the lead conversion rate: decided deals only.
      winRate: decided.length
        ? decided.filter((r) => r.stage === 'won').length / decided.length
        : null,
    });
    members = {
      open: open.map((r) => r.id),
      closingSoon: closingSoon.map((r) => r.id),
      overdueOpportunities: overdue.map((r) => r.id),
      wonThisMonth: wonThisMonth.map((r) => r.id),
    };
  }
  if (entity === 'approvals') {
    // What the reader has to decide, what they are waiting on, what they
    // still have to send, and how this month's decisions went.
    const pending = records.filter((r) => r.status === 'pending');
    const myDecisions = pending.filter((r) => r.approverId === actor.id);
    const waitingLong = myDecisions.filter(
      (r) =>
        r.submittedAt && +now - +new Date(toText(r.submittedAt)) > 3 * 86400000,
    );
    const awaitingApproval = pending.filter((r) => r.ownerId === actor.id);
    const toSubmit = records.filter(
      (r) =>
        r.ownerId === actor.id &&
        ['draft', 'withdrawn'].includes(toText(r.status)),
    );
    const decidedThisMonth = records.filter(
      (r) =>
        ['approved', 'rejected'].includes(toText(r.status)) &&
        inMonth(r.decidedAt),
    );
    const approvedThisMonth = decidedThisMonth.filter(
      (r) => r.status === 'approved',
    );
    const rejectedThisMonth = decidedThisMonth.filter(
      (r) => r.status === 'rejected',
    );
    Object.assign(total, {
      myDecisions: myDecisions.length,
      // For the card's note: how many have waited past three days.
      waitingLong: waitingLong.length,
      awaitingApproval: awaitingApproval.length,
      toSubmit: toSubmit.length,
      approvedThisMonth: approvedThisMonth.length,
      rejectedThisMonth: rejectedThisMonth.length,
      approvalRate: decidedThisMonth.length
        ? approvedThisMonth.length / decidedThisMonth.length
        : null,
    });
    members = {
      myDecisions: myDecisions.map((r) => r.id),
      awaitingApproval: awaitingApproval.map((r) => r.id),
      toSubmit: toSubmit.map((r) => r.id),
      approvedThisMonth: approvedThisMonth.map((r) => r.id),
      rejectedThisMonth: rejectedThisMonth.map((r) => r.id),
    };
  }
  return { metrics: total, statuses, ...(members ? { members } : {}) };
}
