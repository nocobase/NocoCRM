import {
  authenticationClientToken,
  type AuthClient,
} from '@nocobase/app-plugin-authentication/client';
import {
  apiClientToken,
  useService,
  ApiClientError,
} from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@nocobase/i18n/client';
import { useCallback, useState } from 'react';
import type {
  CrmRecord,
  Entity,
  EntityDefinition,
  CrmSettings,
  Field,
} from '../../../server/providers/crm/schema.js';
export type { CrmRecord, Entity, EntityDefinition, CrmSettings, Field };
export type Data = Record<string, unknown>;
export interface User {
  id: string;
  name: string;
  username?: string | null;
  email?: string;
  roles: string[];
  disabled: boolean;
  canApprove: boolean;
}
export interface Metadata {
  definitions: Record<Entity, EntityDefinition>;
  probabilities: Record<string, number>;
  // Per object and action: the fields allowed and whether the action
  // reaches every record (`all`) or only a scope such as one's own.
  permissions: Record<
    Entity,
    Record<string, false | { fields: string[] | '*'; all?: boolean }>
  >;
  settings: CrmSettings;
  userId: string;
  users: User[];
  export: boolean;
  assign: boolean;
  approve: boolean;
  settingsAccess: boolean;
  // Whether the CRM's AI employee is switched on (its Enabled switch on the
  // AI Employee plugin's settings page): every assistant entry follows it.
  assistant: boolean;
}
// Display names for every record a response refers to, resolved by the
// server: `titles` are composed ("account / deal"), `names` bare.
export interface Titled {
  titles: Record<string, string>;
  names: Record<string, string>;
  opportunities?: Record<string, { amount: number; currency: string }>;
}
export interface ListData extends Titled {
  data: CrmRecord[];
  total: number;
  page: number;
  pageSize: number;
  // Leads only: those the AI is evaluating, or has a verdict waiting on.
  ai?: Record<string, 'running' | 'pending'>;
}
export interface Detail extends Titled {
  record: CrmRecord;
  // The first page of the history and of each related list; the totals say
  // how much more the history and list endpoints hold.
  history: Data[];
  historyTotal?: number;
  notesTotal?: number;
  related: Partial<Record<Entity, CrmRecord[]>>;
  relatedTotals?: Partial<Record<Entity, number>>;
  // What a delete would orphan, counted per child object; empty when clear.
  blockers?: Partial<Record<Entity, number>>;
  // Records a delete would edit (a contact taken out of their lists).
  unlinks?: Partial<Record<Entity, number>>;
  permissions: { edit: boolean; delete: boolean; approve: boolean };
}
export function useCrmApi() {
  const api = useService(apiClientToken);
  const { i18n } = useTranslation('crm');
  return useCallback(
    async <T>(
      path: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
      input?: unknown,
    ): Promise<T> =>
      api.request<T>({
        path: `crm/${toText(path)}`,
        method,
        headers: { 'X-CRM-Request': '1', 'Accept-Language': i18n.language },
        ...(input instanceof FormData
          ? { body: input }
          : input !== undefined
            ? { json: input }
            : {}),
      }),
    [api, i18n.language],
  );
}
// One page, everywhere the CRM pages or reveals more: list pages, board
// columns, the lists on a record's tabs, the action centre.
export const PAGE_SIZE = 20;

// The signed-in user's id, read from the authentication plugin's client
// through the shared query cache so it is one request for the whole page
// and available above the plugin's own React provider (the assistant
// panel mounts there). This application registers no Refine identity
// resolver, so Refine's useGetIdentity never resolves here.
export function useSessionUserId(): string | undefined {
  const client = useService(authenticationClientToken) as AuthClient;
  const { data } = useQuery({
    queryKey: ['crm', 'session'],
    queryFn: async () => (await client.getSession()).data ?? null,
    staleTime: 5000,
  });
  return data?.user?.id;
}

export function useCrmScopeKey(): readonly string[] {
  // The session user scopes the cache, so one browser signing in as
  // someone else never sees the previous user's pages.
  const userId = useSessionUserId();
  const { i18n } = useTranslation('crm');
  return ['crm', userId ?? 'anonymous', i18n.language];
}
export function useCrmQuery<T>(
  path: string,
  enabled = true,
  // refetchInterval may look at the latest data, so a poll can stop itself.
  options: { refetchInterval?: (data: T | undefined) => number | false } = {},
) {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const interval = options.refetchInterval;
  return useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () => api<{ data: T }>(path).then((r) => r.data),
    enabled,
    staleTime: 15000,
    refetchInterval: interval ? (query) => interval(query.state.data) : false,
    // A 4xx answer (missing, forbidden, invalid) will not change on a retry;
    // retrying it only delays the caller — a deleted record's page waited
    // out three backed-off retries before it could leave.
    retry: (failureCount, error) =>
      !(
        error instanceof ApiClientError &&
        error.status >= 400 &&
        error.status < 500
      ) && failureCount < 3,
  });
}
// One record by id, with the titles of what it refers to, through the list
// endpoint: the light read a picker or a card needs to show a name.
export function useRecord(entity: Entity | undefined, id: unknown) {
  const key = toText(id ?? '');
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  return useQuery({
    queryKey: [...scopeKey, `${toText(entity)}?ids=${key}`],
    queryFn: () =>
      api<ListData>(
        `${toText(entity)}?ids=${encodeURIComponent(key)}&pageSize=1`,
      ),
    enabled: Boolean(entity && key),
    staleTime: 20000,
    select: (result) => ({
      record: result.data[0],
      titles: result.titles,
      names: result.names,
    }),
  });
}
// A list that arrived with a page (a detail's related records, its history)
// and grows a page at a time from the endpoint given: the records so far,
// the server's total, and the titles the extra pages brought with them. The
// state belongs to the base path, so a different record starts afresh.
export function useMore<T = CrmRecord>(
  base: string | undefined,
  initial: { data: T[]; total: number } | undefined,
  pageSize = PAGE_SIZE,
) {
  const api = useCrmApi();
  const [state, setState] = useState<{
    base: string | undefined;
    more: T[];
    page: number;
    titles: Record<string, string>;
    loading: boolean;
  }>({ base, more: [], page: 1, titles: {}, loading: false });
  const current =
    state.base === base
      ? state
      : { base, more: [], page: 1, titles: {}, loading: false };
  const records = [...(initial?.data ?? []), ...current.more];
  const total = initial?.total ?? records.length;
  const loadMore = async (): Promise<void> => {
    if (!base || current.loading) return;
    setState({ ...current, loading: true });
    try {
      const joiner = base.includes('?') ? '&' : '?';
      const next = await api<{
        data: T[];
        page: number;
        titles?: Record<string, string>;
      }>(
        `${base}${joiner}page=${toText(current.page + 1)}&pageSize=${toText(pageSize)}`,
      );
      setState({
        base,
        more: [...current.more, ...next.data],
        page: next.page,
        titles: { ...current.titles, ...(next.titles ?? {}) },
        loading: false,
      });
    } catch {
      setState({ ...current, loading: false });
    }
  };
  return {
    records,
    total,
    titles: current.titles,
    hasMore: records.length < total,
    loading: current.loading,
    loadMore,
  };
}
export function useMetadata(enabled = true) {
  return useCrmQuery<Metadata>('metadata', enabled);
}
// Whether the pages offer the assistant: the header button, the page
// shortcuts and the panel all hide while the CRM's AI employee is disabled.
export function useAssistantAvailable(): boolean {
  return useMetadata().data?.assistant === true;
}
export function useRefresh() {
  const client = useQueryClient();
  return useCallback(
    () => client.invalidateQueries({ queryKey: ['crm'] }),
    [client],
  );
}
export function useCrmText() {
  const { t, i18n } = useTranslation('crm');
  const text = (key: string, options: Record<string, unknown> = {}): string =>
    t(`crm.${toText(key)}`, { ns: 'crm', ...options });
  return { text, language: i18n.language };
}
export function errorCode(error: unknown): {
  code: string;
  field?: string;
  detail?: string;
} {
  if (error instanceof ApiClientError) {
    const body = error.payload as
      { code?: string; field?: string; detail?: string } | undefined;
    return {
      code: body?.code ?? 'serverError',
      field: body?.field,
      detail: body?.detail,
    };
  }
  // A client-side validation result, shaped like a server error body so the
  // same notice renders it.
  if (error && typeof error === 'object' && 'code' in error) {
    const local = error as { code: unknown; field?: string; detail?: string };
    return {
      code: toText(local.code),
      field: local.field,
      detail: local.detail,
    };
  }
  return { code: 'serverError' };
}
export function rows(value: unknown): Data[] {
  return Array.isArray(value) ? (value as Data[]) : [];
}
export function money(
  value: unknown,
  currency = 'CNY',
  language = 'en-US',
): string {
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
  } catch {
    return `${toText(currency)} ${toText(Number(value ?? 0).toLocaleString(language))}`;
  }
}
export function moneyTotals(value: unknown, language: string): string {
  const pairs = Object.entries((value ?? {}) as Data);
  return pairs.length
    ? pairs
        .map(([currency, amount]) => money(amount, currency, language))
        .join(' · ')
    : '—';
}
// Dates read the same in every language: 2026-09-24, and with the time
// 2026-09-24 14:30 on a 24-hour clock, in the business time zone. The
// language is kept for callers; the format no longer depends on it.
function dateParts(
  value: unknown,
  timeZone: string,
  time: boolean,
): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(time
        ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }
        : {}),
      timeZone,
    })
      .formatToParts(new Date(toText(value)))
      .map((part) => [part.type, part.value]),
  );
}
export function localDate(
  value: unknown,
  _language: string,
  timeZone: string,
  time = true,
): string {
  if (!value) return '—';
  try {
    const parts = dateParts(value, timeZone, time);
    const date = `${parts.year ?? ''}-${parts.month ?? ''}-${parts.day ?? ''}`;
    return time ? `${date} ${parts.hour ?? ''}:${parts.minute ?? ''}` : date;
  } catch {
    return '—';
  }
}
// The time of day alone, 14:30, where the date is already on screen.
export function localTime(value: unknown, timeZone: string): string {
  if (!value) return '—';
  try {
    const parts = dateParts(value, timeZone, true);
    return `${parts.hour ?? ''}:${parts.minute ?? ''}`;
  } catch {
    return '—';
  }
}

// A composed heading ("lead information") starts with a capital, whatever
// the piece it was built from; harmless on languages without case.
export function sentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
export function toText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object')
    return value instanceof Date ? value.toISOString() : JSON.stringify(value);
  return typeof value === 'string'
    ? value
    : typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        typeof value === 'symbol'
      ? String(value)
      : '';
}

// Whether the current user may change any record of the object, or only
// those they own: the edit scope the server reported, which is what the
// pages use in place of a notion of "manager".
export function editsAll(meta: Metadata | undefined, entity: Entity): boolean {
  const update = meta?.permissions[entity]?.update;
  return Boolean(update && update.all);
}

export function fieldLabelKey(entity: Entity, field: string): string {
  if (entity === 'leads' && field === 'name') return 'fields.leadName';
  if (entity === 'contacts' && field === 'name') return 'fields.contactName';
  if (entity === 'activities' && field === 'name') return 'fields.activityName';
  // On an approval the owner is the person asking.
  if (entity === 'approvals' && field === 'ownerId') return 'fields.applicant';
  if (entity === 'approvals' && field === 'name')
    return 'fields.approvalSubject';
  // The specification calls an account's description its introduction.
  if (entity === 'accounts' && field === 'description')
    return 'fields.accountDescription';
  // On an activity the record links are "related lead / account /
  // opportunity", not the bare object names.
  if (
    entity === 'activities' &&
    ['leadId', 'accountId', 'opportunityId'].includes(field)
  )
    return `fields.related.${field}`;
  return `fields.${field}`;
}

export function arrayValues(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

// The href for a value that looks like a web address, or undefined. A bare
// domain ("example.com", "www.example.com/path") gets https://; anything with
// spaces or no dot is not a link. Nothing is required of what the user typed.
export function linkOf(value: unknown): string | undefined {
  const raw = toText(value ?? '').trim();
  if (!raw || /\s/.test(raw)) return undefined;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).href;
    } catch {
      return undefined;
    }
  }
  return /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(raw)
    ? `https://${raw}`
    : undefined;
}
