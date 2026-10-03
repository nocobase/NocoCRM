// The words the CRM's AI work puts in front of people or of the model, in
// both languages: Chinese first, English second, picked by the AI language
// setting (or the reader's language). Code elsewhere stays in English and
// reads its labels from here. No imports, so the browser bundle can take it
// as well (server/providers/crm/plan.ts is shared with the client).

export type Pair = readonly [zh: string, en: string];
export type Pairs = Readonly<Record<string, Pair>>;

// The language index of a pair: 0 for Chinese, 1 for English.
export const lang = (zh: boolean): 0 | 1 => (zh ? 0 : 1);
export const pick = (pairs: Pairs, zh: boolean): Record<string, string> =>
  Object.fromEntries(
    Object.entries(pairs).map(([key, pair]) => [key, pair[lang(zh)]]),
  );

// The headings of a planned activity's description, by part.
export const planHeadings = {
  prep: ['准备要点', 'To prepare'],
  questions: ['要问的问题', 'To ask'],
  email: ['邮件草稿', 'Email draft'],
} as const satisfies Pairs;
