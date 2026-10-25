import { isEndOfDay } from '../../../server/providers/crm/zone-time.js';
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
import { useCallback, useState, useSyncExternalStore } from 'react';
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
  // May reply on WhatsApp from the CRM (the sendWhatsApp capability).
  sendWhatsApp: boolean;
  settingsAccess: boolean;
  // Only for whoever may manage the settings: whether a demo dataset is
  // imported (the banner offering one shows until it is).
  demoPresent?: boolean;
  // Whether the company's WhatsApp number is connected: records show their
  // WhatsApp tab (components/crm/whatsapp/).
  whatsapp?: { configured: boolean };
  // Whether the CRM's AI employee is switched on (its Enabled switch on the
  // AI Employee plugin's settings page): every assistant entry follows it.
  assistant: boolean;
  // A read-only demo site (Demo Mode): the assistant takes no questions.
  demoSite?: boolean;
  // The CRM's work agents' names as written and the references translating
  // them, by work (crm-agents/work-agents.ts): the dialogs doing that work
  // name it.
  workAgentNames?: Record<
    string,
    {
      name: string;
      nameText: { key: string; ns: string } | null;
      description?: string | null;
      descriptionText?: { key: string; ns: string } | null;
      // The model it asks; null while there is no chat model.
      model?: { modelService: string; model: string } | null;
    }
  >;
  // The library ids of the CRM's method skills, by name, which the agents'
  // pages link to.
  methodSkills?: Record<string, string>;
  // Which of the agents' triggers are on (server/providers/crm/agents.ts).
  agents?: Record<
    string,
    { enabled: boolean; triggers: Record<string, boolean> }
  >;
}
// Display names for every record a response refers to, resolved by the
// server: `titles` are composed ("company / deal"), `names` bare.
export interface Titled {
  titles: Record<string, string>;
  names: Record<string, string>;
  opportunities?: Record<string, { amount: number; currency: string }>;
}
export interface ListMeta extends Titled {
  total: number;
  page: number;
  pageSize: number;
  // Leads and deals the AI is following up or has a verdict waiting on;
  // approvals whose review is being written or waits, for their approver;
  // tasks whose preparation is, for the people doing them.
  ai?: Record<string, 'running' | 'pending'>;
}
// A page of a list: the records, and in `meta` the paging and the names of
// what they refer to.
export interface ListData {
  data: CrmRecord[];
  meta: ListMeta;
}
export interface Detail extends Titled {
  record: CrmRecord;
  // The first page of the history and of each related list; the totals say
  // how much more the history and list endpoints hold.
  history: Data[];
  historyTotal?: number;
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
        path: toText(path),
        method,
        headers: { 'Accept-Language': i18n.language },
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
  return useSessionUser()?.id;
}

// The signed-in user's id as the authentication client holds it: Better Auth's
// session store, which it updates itself on sign-in and sign-out, so a
// component mounted above the sign-in page (the assistant's provider) sees
// the change without a reload, where the cached query above is refetched only
// when something asks for it again.
export function useLiveSessionUserId(): string | undefined {
  const client = useService(authenticationClientToken) as AuthClient;
  return useSyncExternalStore(
    (listener) => client.useSession.subscribe(listener),
    () => client.useSession.get().data?.user.id,
  );
}

// The signed-in user (id and display name), from the same query.
export function useSessionUser(): { id: string; name?: string } | undefined {
  const client = useService(authenticationClientToken) as AuthClient;
  const { data } = useQuery({
    queryKey: ['crm', 'session'],
    queryFn: async () => (await client.getSession()).data ?? null,
    staleTime: 5000,
  });
  const user = data?.user;
  if (!user?.id) return undefined;
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return { id: user.id, ...(name ? { name } : {}) };
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
      titles: result.meta.titles,
      names: result.meta.names,
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
        meta: { page: number; titles?: Record<string, string> };
      }>(
        `${base}${joiner}page=${toText(current.page + 1)}&pageSize=${toText(pageSize)}`,
      );
      setState({
        base,
        more: [...current.more, ...next.data],
        page: next.meta.page,
        titles: { ...current.titles, ...(next.meta.titles ?? {}) },
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
  return useCrmQuery<Metadata>('workspace', enabled);
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
// A field's label inside a Chinese sentence: one that starts with a Latin
// letter or a digit is set apart from the Chinese before it by a space
// ("填写 LinkedIn"), as Chinese typesetting does; English needs nothing.
export function inSentence(label: string, language: string): string {
  return language.startsWith('zh') && /^[A-Za-z0-9]/.test(label)
    ? ` ${label}`
    : label;
}
// The standard error body (references/http-api.md): the CRM's reasons are
// its camelCase codes in UPPER_SNAKE_CASE (server/routes/errors.ts), turned
// back so `errors.<code>` names their text; the framework's and other
// plugins' are worded by what they mean.
interface StandardError {
  status?: string;
  reason?: string;
  domain?: string;
  fieldViolations?: { field?: string }[];
  metadata?: { field?: unknown; detail?: unknown };
}
const FOREIGN_REASONS: Record<string, string> = {
  UNAUTHENTICATED: 'unauthorized',
  ROUTE_NOT_FOUND: 'notFound',
  INTERNAL_ERROR: 'serverError',
  BODY_TOO_LARGE: 'fileTooLarge',
  INVALID_INPUT: 'invalidInput',
};
const STATUS_CODES: Record<string, string> = {
  UNAUTHENTICATED: 'unauthorized',
  PERMISSION_DENIED: 'forbidden',
  NOT_FOUND: 'notFound',
  INVALID_ARGUMENT: 'invalidInput',
};
const camelCode = (reason: string): string =>
  reason
    .toLowerCase()
    .replace(/_([a-z0-9])/gu, (_, letter: string) => letter.toUpperCase());
export function errorCode(error: unknown): {
  code: string;
  field?: string;
  detail?: string;
} {
  if (error instanceof ApiClientError) {
    const body = error.payload as
      | {
          error?: StandardError;
          code?: string;
          field?: string;
          detail?: string;
        }
      | undefined;
    const standard = body?.error;
    if (standard?.reason) {
      const field =
        standard.fieldViolations?.[0]?.field ??
        (typeof standard.metadata?.field === 'string'
          ? standard.metadata.field
          : undefined);
      return {
        code:
          standard.domain === 'crm'
            ? camelCode(standard.reason)
            : (FOREIGN_REASONS[standard.reason] ??
              STATUS_CODES[standard.status ?? ''] ??
              camelCode(standard.reason)),
        field,
        detail:
          typeof standard.metadata?.detail === 'string'
            ? standard.metadata.detail
            : undefined,
      };
    }
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
    // A little room between the currency and the number ("CN¥ 35,000"),
    // a narrow space that never breaks, where the language writes none.
    const parts = new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(Number(value ?? 0));
    return parts
      .map((part, index) => {
        const next = parts[index + 1];
        return part.type === 'currency' &&
          next &&
          (next.type === 'integer' || next.type === 'minusSign')
          ? `${part.value}\u202f`
          : part.type === 'currency' &&
              index > 0 &&
              parts[index - 1]?.type !== 'literal'
            ? `\u202f${part.value}`
            : part.value;
      })
      .join('');
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
// How long ago a moment was, in the interface language: "just now" within
// a minute, then minutes, hours, days ("yesterday"), weeks, months and
// years, by the browser's own wording. The timeline shows it, the full time
// on hover.
export function relativeTime(
  value: unknown,
  language: string,
  now: number,
  justNow: string,
): string {
  const at = new Date(toText(value));
  if (!Number.isFinite(+at)) return '';
  const seconds = Math.round((+at - now) / 1000);
  // It is always how long ago: a moment after the page's clock (read when
  // the page drew, before newer data arrived) is just now, never "in 1m".
  if (seconds > -60) return justNow;
  // Compact, as a timeline reads: "3m ago", "2h ago", "1d ago" in English,
  // always in figures; Chinese keeps its words ("3分钟前", "昨天").
  const format = new Intl.RelativeTimeFormat(language, {
    style: 'narrow',
    numeric: language.startsWith('zh') ? 'auto' : 'always',
  });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 7 * 86400],
    ['month', 30 * 86400],
    ['year', 365 * 86400],
  ];
  const limits = [3600, 86400, 7 * 86400, 30 * 86400, 365 * 86400, Infinity];
  const index = limits.findIndex((limit) => Math.abs(seconds) < limit);
  const [unit, size] = steps[index];
  return format.format(Math.round(seconds / size), unit);
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
// When a task is due, as a list shows it: its date alone for a date-only
// task, else its date and time, the year left out within the current one
// (10-12 14:30); empty when it has no due time.
export function dueText(task: Data, timeZone: string): string {
  if (!task.dueAt) return '';
  // A date alone is kept as the last instant of its day.
  const text = localDate(
    task.dueAt,
    '',
    timeZone,
    !isEndOfDay(new Date(toText(task.dueAt)), timeZone),
  );
  try {
    const year = dateParts(new Date(), timeZone, false).year ?? '';
    return year && text.startsWith(`${year}-`)
      ? text.slice(year.length + 1)
      : text;
  } catch {
    return text;
  }
}

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

// Whether the reader may change a record shown beside another one (the
// company, deal or lead card on a record page), as far as the page can tell
// without asking: the object's edit scope, every record or their own, and
// the field among those it lets them change; never a converted lead or an
// approval, whose own pages hold their rules. The server checks every save
// again.
export function mayEditField(
  meta: Metadata | undefined,
  entity: Entity,
  record: CrmRecord,
  field: string,
): boolean {
  const update = meta?.permissions[entity]?.update;
  if (!meta || !update) return false;
  if (entity === 'approvals') return false;
  if (entity === 'leads' && toText(record.status) === 'converted') return false;
  if (update.fields !== '*' && !update.fields.includes(field)) return false;
  return (
    Boolean(update.all) ||
    toText(record.ownerId) === meta.userId ||
    toText(record.createdById) === meta.userId
  );
}

export function fieldLabelKey(entity: Entity, field: string): string {
  if (entity === 'leads' && field === 'name') return 'fields.leadName';
  if (entity === 'contacts' && field === 'name') return 'fields.contactName';
  if (entity === 'tasks' && field === 'name') return 'fields.taskName';
  // On an approval the owner is the person asking.
  if (entity === 'approvals' && field === 'ownerId') return 'fields.applicant';
  if (entity === 'approvals' && field === 'name')
    return 'fields.approvalSubject';
  // An approval's deal is the one it was asked about.
  if (entity === 'approvals' && field === 'opportunityId')
    return 'fields.related.opportunityId';
  // The specification calls a company's description its introduction.
  if (entity === 'companies' && field === 'description')
    return 'fields.companyIntro';
  // On a task the record links are "related lead / company /
  // opportunity", not the bare object names.
  if (
    entity === 'tasks' &&
    ['leadId', 'companyId', 'opportunityId'].includes(field)
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

// Whether an agent runs on a trigger now (server/providers/crm/agents.ts):
// a form offers "AI follows up at once" only while that would happen.
export function agentRuns(
  meta: Metadata | undefined,
  agent: 'leads' | 'opportunities',
  trigger: string,
): boolean {
  const switches = meta?.agents?.[agent];
  if (!switches) return true;
  return switches.enabled && switches.triggers[trigger] !== false;
}
