// @vitest-environment node
import { expect, it } from 'vitest';
import ruRU from '../../client/locales/ru-RU.js';

// Russian counts in one, few, many and other, the copy in one and other
// alone, and i18next shows English for a form it does not find (2 and 5
// among them): every `_other` stands for few and many as well.

function pluralKeys(node: unknown, path: string[] = []): string[][] {
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key.endsWith('_other') && typeof value === 'string'
      ? [[...path, key.slice(0, -'_other'.length)]]
      : pluralKeys(value, [...path, key]),
  );
}

it('gives every plural its few and many forms', () => {
  const stems = pluralKeys(ruRU);
  expect(stems.length).toBeGreaterThan(0);
  for (const stem of stems) {
    const parent = stem
      .slice(0, -1)
      .reduce<Record<string, unknown>>(
        (node, key) => node[key] as Record<string, unknown>,
        ruRU as unknown as Record<string, unknown>,
      );
    const last = stem.at(-1);
    expect(parent[`${last}_few`]).toBe(parent[`${last}_other`]);
    expect(parent[`${last}_many`]).toBe(parent[`${last}_other`]);
  }
});
