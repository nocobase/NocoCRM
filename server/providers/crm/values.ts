import type { Row } from '@nocobase/db';
const jsonFields = new Set([
  'attachments',
  'contacts',
  'internalParticipants',
  'externalParticipants',
  'value',
  'changes',
  'input',
  'assumptions',
  'proposedInput',
  'options',
  'steps',
]);
export function jsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
export function decodeRow<T extends Row>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      jsonFields.has(key) ? jsonValue(value) : value,
    ]),
  ) as T;
}
export function encodeRow(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      jsonFields.has(key) && value != null ? JSON.stringify(value) : value,
    ]),
  );
}
