import type { Row } from '@nocobase/db';
import { CrmError, definitions, toText, type Entity } from './schema.js';

// Counts, sums and averages over the records of one CRM object, grouped by a
// field or by a period of a date: what a report needs and a page of records
// cannot give. The rows come from CrmService.summarize, which reads them
// through the same permission scope and filters as the list, so a summary
// never counts a record the user could not open. Grouping happens here in
// memory rather than in SQL: the CRM's data is small, JSON fields
// (participants) group by element, and dates fall into periods of the
// business time zone the same way on SQLite and PostgreSQL.

export const summaryPeriods = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;
export type SummaryPeriod = (typeof summaryPeriods)[number];

// The most rows one summary reads; past it the result says it is partial.
export const SUMMARY_ROW_LIMIT = 20000;

export interface SummaryRequest {
  groupBy?: string;
  period?: SummaryPeriod;
  measures?: string[];
}

export interface MeasureValue {
  field: string;
  // Present for an object with a currency: amounts in different currencies
  // are never added together.
  currency?: string;
  sum: number;
  average: number;
  min: number;
  max: number;
  // Records that had a value for the field.
  counted: number;
}

export interface SummaryGroup {
  // The field's value, the period ("2026-09", "2026-Q3", the Monday that
  // starts a week), or null for records without one.
  key: string | null;
  count: number;
  measures: MeasureValue[];
}

export interface Summary {
  // Every record the filters match, even past the row limit.
  total: number;
  // True when more records matched than one summary reads.
  truncated: boolean;
  groupBy?: string;
  period?: SummaryPeriod;
  groups: SummaryGroup[];
  // The measures over every record read, all groups together.
  overall: MeasureValue[];
}

type Kind = 'group' | 'multi' | 'date' | 'datetime' | 'number';

const systemKinds: Record<string, Kind> = {
  ownerId: 'group',
  createdById: 'group',
  createdAt: 'datetime',
  updatedAt: 'datetime',
  convertedAt: 'datetime',
  closedAt: 'datetime',
  completedAt: 'datetime',
  submittedAt: 'datetime',
  decidedAt: 'datetime',
  convertedAccountId: 'group',
  convertedContactId: 'group',
  convertedOpportunityId: 'group',
};

// How a field can be summarized, or undefined when it cannot: free text,
// files and contact roles are not grouping keys, and only numbers add up.
export function fieldKind(entity: Entity, key: string): Kind | undefined {
  const definition = definitions[entity];
  if (key === definition.statusField) return 'group';
  const field = definition.fields.find((f) => f.key === key);
  if (!field) return systemKinds[key];
  switch (field.type) {
    case 'select':
    case 'boolean':
    case 'relation':
    case 'country':
    case 'subdivision':
      return 'group';
    case 'multi':
      return 'multi';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime';
    case 'number':
      return 'number';
    default:
      return undefined;
  }
}

// Whose names a grouping key needs: the users or the records a relation
// points at, so the tool can label the groups.
export function groupRelation(
  entity: Entity,
  key: string,
): Entity | 'users' | undefined {
  if (key === 'ownerId' || key === 'createdById') return 'users';
  if (key === 'convertedAccountId') return 'accounts';
  if (key === 'convertedContactId') return 'contacts';
  if (key === 'convertedOpportunityId') return 'opportunities';
  return definitions[entity].fields.find((f) => f.key === key)?.relation;
}

export function hasCurrency(entity: Entity): boolean {
  return definitions[entity].fields.some((f) => f.key === 'currency');
}

// Checks the request against the object's fields and the ones this user may
// read, and settles the period a date grouping uses (a month by default).
export function validateSummary(
  entity: Entity,
  readable: readonly string[],
  request: SummaryRequest,
): SummaryRequest {
  const { groupBy, period } = request;
  const measures = [...new Set(request.measures ?? [])];
  if (groupBy !== undefined) {
    const kind = fieldKind(entity, groupBy);
    if (!kind || kind === 'number')
      throw new CrmError('invalidInput', 400, 'groupBy');
    if (!readable.includes(groupBy))
      throw new CrmError('forbidden', 403, groupBy);
    const dated = kind === 'date' || kind === 'datetime';
    if (period !== undefined && (!dated || !summaryPeriods.includes(period)))
      throw new CrmError('invalidInput', 400, 'period');
    if (dated) return { groupBy, period: period ?? 'month', measures };
  } else if (period !== undefined)
    throw new CrmError('invalidInput', 400, 'period');
  for (const measure of measures) {
    if (fieldKind(entity, measure) !== 'number')
      throw new CrmError('invalidInput', 400, 'measures');
    if (!readable.includes(measure))
      throw new CrmError('forbidden', 403, measure);
  }
  return { groupBy, measures };
}

// The calendar day of a stored value: a date field is already one; an
// instant is read in the business time zone.
function calendarDay(
  value: unknown,
  kind: Kind,
  timeZone: string,
): [number, number, number] | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (kind === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(toText(value));
    return match
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : undefined;
  }
  const instant = value instanceof Date ? value : new Date(toText(value));
  if (Number.isNaN(instant.getTime())) return undefined;
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instant)
    .split('-')
    .map(Number);
  return [y, m, d];
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function periodKey(
  value: unknown,
  kind: Kind,
  period: SummaryPeriod,
  timeZone: string,
): string | null {
  const day = calendarDay(value, kind, timeZone);
  if (!day) return null;
  const [y, m, d] = day;
  switch (period) {
    case 'day':
      return `${y}-${pad(m)}-${pad(d)}`;
    case 'week': {
      // Weeks start on Monday; the key is that Monday.
      const date = new Date(Date.UTC(y, m - 1, d));
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      return date.toISOString().slice(0, 10);
    }
    case 'month':
      return `${y}-${pad(m)}`;
    case 'quarter':
      return `${y}-Q${Math.ceil(m / 3)}`;
    case 'year':
      return String(y);
  }
}

interface Accumulator {
  sum: number;
  min: number;
  max: number;
  counted: number;
}

function number(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const round = (n: number): number => Math.round(n * 100) / 100;

function measureValues(accumulators: Map<string, Accumulator>): MeasureValue[] {
  // In a stable order: by field, then currency.
  return [...accumulators.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, a]) => {
      const [field, currency] = JSON.parse(id) as [string, string | null];
      return {
        field,
        ...(currency ? { currency } : {}),
        sum: round(a.sum),
        average: round(a.sum / a.counted),
        min: a.min,
        max: a.max,
        counted: a.counted,
      };
    });
}

function accumulate(
  accumulators: Map<string, Accumulator>,
  field: string,
  currency: string | null,
  value: number,
): void {
  const id = JSON.stringify([field, currency]);
  const current = accumulators.get(id);
  if (!current)
    accumulators.set(id, { sum: value, min: value, max: value, counted: 1 });
  else {
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.counted += 1;
  }
}

export function summarizeRows(
  entity: Entity,
  rows: readonly Row[],
  request: SummaryRequest,
  options: { total: number; timeZone: string },
): Summary {
  const { groupBy, period } = request;
  const measures = request.measures ?? [];
  const kind = groupBy === undefined ? undefined : fieldKind(entity, groupBy);
  const currencyOf = hasCurrency(entity)
    ? (row: Row): string | null => toText(row.currency ?? '') || null
    : (): null => null;
  const keysOf = (row: Row): (string | null)[] => {
    if (groupBy === undefined || !kind) return [null];
    const value = row[groupBy];
    if (kind === 'multi') {
      const items = Array.isArray(value)
        ? value.map((v) => toText(v ?? '')).filter(Boolean)
        : [];
      return items.length ? [...new Set(items)] : [null];
    }
    if (kind === 'date' || kind === 'datetime')
      return [periodKey(value, kind, period ?? 'month', options.timeZone)];
    if (value === null || value === undefined || value === '') return [null];
    return [toText(value)];
  };

  const groups = new Map<
    string | null,
    { count: number; measures: Map<string, Accumulator> }
  >();
  const overall = new Map<string, Accumulator>();
  for (const row of rows) {
    const currency = currencyOf(row);
    const values = measures
      .map((field) => [field, number(row[field])] as const)
      .filter(
        (pair): pair is readonly [string, number] => pair[1] !== undefined,
      );
    for (const [field, value] of values)
      accumulate(overall, field, currency, value);
    for (const key of keysOf(row)) {
      let group = groups.get(key);
      if (!group) {
        group = { count: 0, measures: new Map() };
        groups.set(key, group);
      }
      group.count += 1;
      for (const [field, value] of values)
        accumulate(group.measures, field, currency, value);
    }
  }

  const dated = kind === 'date' || kind === 'datetime';
  const list = [...groups.entries()]
    .map(([key, g]) => ({
      key,
      count: g.count,
      measures: measureValues(g.measures),
    }))
    // Periods read in time order; other groups largest first. Records
    // without a value come last either way.
    .sort((a, b) => {
      if (a.key === null || b.key === null)
        return a.key === null ? (b.key === null ? 0 : 1) : -1;
      return dated ? a.key.localeCompare(b.key) : b.count - a.count;
    });
  return {
    total: options.total,
    truncated: options.total > rows.length,
    ...(groupBy !== undefined ? { groupBy } : {}),
    ...(dated ? { period: period ?? 'month' } : {}),
    groups: list,
    overall: measureValues(overall),
  };
}
