import type { Row } from '@nocobase/db';
import { definitions, toText, type Entity } from './schema.js';

// Ordering a list by a column the reader chose. The database adapter orders
// only by a stored column, which would put an option field in the order of
// its keys, a relation in the order of its ids and blanks first or last
// depending on the database. So the list reads the chosen column for every
// matching record, orders them here by what the page shows, and reads the
// page it needs by id (CrmService.list).

// Past this many matching records the list orders in the database instead.
export const ORDER_IN_MEMORY_LIMIT = 20000;

// The columns the database orders well by itself: instants that every
// record has, which the list has always sorted by.
export const DATABASE_ORDERS = new Set([
  'createdAt',
  'updatedAt',
  'startAt',
  'submittedAt',
]);

export type OrderKind =
  | { kind: 'option'; options: readonly string[] }
  | { kind: 'relation'; target: Entity | 'users' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'instant' }
  | { kind: 'text' };

// How a column orders: an option field in the order its options are
// defined (a deal's stages as the pipeline runs), a relation by the name it
// shows, the rest by value.
export function orderKind(entity: Entity, key: string): OrderKind {
  const definition = definitions[entity];
  if (key === definition.statusField)
    return { kind: 'option', options: definition.statuses };
  if (key === 'ownerId' || key === 'createdById')
    return { kind: 'relation', target: 'users' };
  const field = definition.fields.find((f) => f.key === key);
  switch (field?.type) {
    case 'select':
      return { kind: 'option', options: field.options ?? [] };
    case 'relation':
      return field.relation
        ? { kind: 'relation', target: field.relation }
        : { kind: 'text' };
    case 'number':
      return { kind: 'number' };
    case 'boolean':
      return { kind: 'boolean' };
    case 'date':
    case 'datetime':
      return { kind: 'instant' };
    default:
      return field || !key.endsWith('At')
        ? { kind: 'text' }
        : { kind: 'instant' };
  }
}

type Key = number | string | undefined;

// The value a record sorts by, from its stored value and, for a relation,
// the names of what it points at; undefined for a blank.
export function orderKey(
  order: OrderKind,
  value: unknown,
  names: Record<string, string>,
): Key {
  if (value === null || value === undefined || value === '') return undefined;
  switch (order.kind) {
    case 'option': {
      const index = order.options.indexOf(toText(value));
      return index < 0 ? order.options.length : index;
    }
    case 'relation':
      return names[toText(value)] ?? undefined;
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'boolean':
      return value === true || value === 1 || value === 'true' ? 1 : 0;
    case 'instant': {
      const time =
        value instanceof Date ? value.getTime() : Date.parse(toText(value));
      return Number.isNaN(time) ? undefined : time;
    }
    default:
      return toText(value);
  }
}

// Orders records by their keys, blanks last whichever the direction; text
// compares the way the reader's language orders it (Chinese by pinyin), and
// ties keep a stable order by id.
export function orderRecords(
  records: readonly Row[],
  keys: ReadonlyMap<string, Key>,
  direction: 'asc' | 'desc',
  locale: string,
): string[] {
  const collator = new Intl.Collator(locale, { numeric: true });
  const sign = direction === 'asc' ? 1 : -1;
  return records
    .map((r) => toText(r.id))
    .sort((a, b) => {
      const x = keys.get(a);
      const y = keys.get(b);
      if (x === undefined || y === undefined)
        return x === y ? a.localeCompare(b) : x === undefined ? 1 : -1;
      const compared =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : collator.compare(String(x), String(y));
      return compared ? sign * compared : a.localeCompare(b);
    });
}
