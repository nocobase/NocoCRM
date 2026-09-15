import { useCrmScopeKey } from './api.js';
import { useQueries } from '@tanstack/react-query';
import { toText, useCrmApi, type Entity, type CrmRecord } from './api.js';
export const entityNames: Entity[] = [
  'leads',
  'accounts',
  'contacts',
  'opportunities',
  'activities',
  'approvals',
];
// How a record is named wherever it is linked from another record. A lead is
// "name / company": on its own a person's name says little about which
// enquiry it is.
export function recordTitle(
  entity: Entity,
  record: CrmRecord,
  lookups?: Partial<Record<Entity, CrmRecord[]>>,
): string {
  if (entity === 'leads')
    return [record.name, record.company]
      .map(toText)
      .filter(Boolean)
      .join(' / ');
  // A contact is a person at an account, so it reads the same way as a lead
  // when the account is at hand.
  if (entity === 'contacts' && lookups) {
    const account = lookups.accounts?.find((a) => a.id === record.accountId);
    return [record.name, account?.name].map(toText).filter(Boolean).join(' / ');
  }
  // An opportunity is named for what it delivers, so the account comes
  // first: which customer, then which deal.
  if (entity === 'opportunities' && lookups) {
    const account = lookups.accounts?.find((a) => a.id === record.accountId);
    return [account?.name, record.name].map(toText).filter(Boolean).join(' / ');
  }
  return toText(record.name);
}

// The grouped lookups flattened to id -> display title, the shape Value and
// InlineField take.
export function lookupTitles(
  lookups: Partial<Record<Entity, CrmRecord[]>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [entity, records] of Object.entries(lookups))
    for (const record of records ?? [])
      out[toText(record.id)] = recordTitle(entity as Entity, record, lookups);
  return out;
}

// Bare names for one entity, for places that already say which account the
// people belong to and do not want "name / account" repeated on each.
export function plainNames(
  lookups: Partial<Record<Entity, CrmRecord[]>>,
  entity: Entity,
): Record<string, string> {
  return Object.fromEntries(
    (lookups[entity] ?? []).map((r) => [toText(r.id), toText(r.name)]),
  );
}

export function useLookups(enabled = true) {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const results = useQueries({
    queries: entityNames.map((entity) => ({
      queryKey: [...scopeKey, `${toText(entity)}/lookup`],
      queryFn: () =>
        api<{ data: CrmRecord[] }>(`${toText(entity)}/lookup`).then(
          (r) => r.data,
        ),
      enabled,
      staleTime: 20000,
    })),
  });
  return Object.fromEntries(
    entityNames.map((name, i) => [name, results[i]?.data ?? []]),
  ) as Record<Entity, CrmRecord[]>;
}
