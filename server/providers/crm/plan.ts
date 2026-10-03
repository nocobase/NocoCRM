// The description of the activity a follow-up's accept creates or carries
// on: what to prepare, what to ask and the email draft, as Markdown under
// headings in the reader's language. It imports only the headings' import-
// free translations, so the browser bundle takes it too: the card shows,
// and lets the person change, exactly what will be saved.

import { planHeadings as HEADINGS } from '../../locales/crm-ai/index.js';

type Planned = {
  prep?: string[];
  questions?: string[];
  email?: { subject: string; body: string } | null;
};

// The parts, by kind, each under its heading (either language).
export type PlanPart = keyof typeof HEADINGS;
type Part = PlanPart;

// The part a line heads, if it is one of the headings (either language).
function headingOf(line: string): Part | null {
  const match = /^\*\*(.+?)\*\*\s*$/u.exec(line.trim());
  if (!match) return null;
  for (const part of Object.keys(HEADINGS) as Part[])
    if ((HEADINGS[part] as readonly string[]).includes(match[1].trim()))
      return part;
  return null;
}

function parts(verdict: Planned, zh: boolean): [Part, string][] {
  const heading = (part: Part): string => `**${HEADINGS[part][zh ? 0 : 1]}**`;
  const out: [Part, string][] = [];
  if (verdict.prep?.length)
    out.push([
      'prep',
      [heading('prep'), ...verdict.prep.map((p) => `- ${p}`)].join('\n'),
    ]);
  if (verdict.questions?.length)
    out.push([
      'questions',
      [heading('questions'), ...verdict.questions.map((q) => `- ${q}`)].join(
        '\n',
      ),
    ]);
  if (verdict.email)
    out.push([
      'email',
      [
        heading('email'),
        '',
        verdict.email.subject,
        '',
        verdict.email.body,
      ].join('\n'),
    ]);
  return out;
}

export function planDescription(verdict: Planned, zh: boolean): string {
  return parts(verdict, zh)
    .map(([, text]) => text)
    .join('\n\n');
}

// An activity's description with a new follow-up's parts in it: what a
// person wrote first, as it was, then the parts in their order, each the
// one this follow-up brings or, where it brings none, the earlier one's (a
// part runs from its heading to the next part's or the end).
export function mergePlanDescription(
  existing: string,
  verdict: Planned,
  zh: boolean,
): string {
  const fresh = new Map(parts(verdict, zh));
  const earlier = planPartsOf(existing);
  return [
    earlier.own,
    ...(Object.keys(HEADINGS) as Part[]).map(
      (part) => fresh.get(part) ?? earlier.parts[part] ?? '',
    ),
  ]
    .filter(Boolean)
    .join('\n\n');
}

// An activity's description read into what a person wrote and the parts a
// follow-up wrote, by kind, each with its heading (a part runs from its
// heading to the next part's or the end).
export function planPartsOf(description: string): {
  own: string;
  parts: Partial<Record<Part, string>>;
} {
  const own: string[] = [];
  const found: Partial<Record<Part, string[]>> = {};
  let current: Part | null = null;
  for (const line of description.split('\n')) {
    current = headingOf(line) ?? current;
    if (current) (found[current] ??= []).push(line);
    else own.push(line);
  }
  const parts: Partial<Record<Part, string>> = {};
  for (const [part, lines] of Object.entries(found) as [Part, string[]][])
    parts[part] = lines.join('\n').trim();
  return { own: own.join('\n').trim(), parts };
}

// What a follow-up does to each part of an activity's description: adds it,
// changes it, or keeps it (the same words, headings and spacing aside).
// Parts neither has are left out.
export function planPartChanges(
  description: string,
  verdict: Planned,
): Partial<Record<Part, 'added' | 'changed' | 'kept'>> {
  const before = planPartsOf(description).parts;
  const after = new Map(parts(verdict, true));
  const body = (text: string | undefined): string =>
    (text ?? '')
      .split('\n')
      .filter((line) => !headingOf(line))
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();
  const out: Partial<Record<Part, 'added' | 'changed' | 'kept'>> = {};
  for (const part of Object.keys(HEADINGS) as Part[]) {
    const now = after.get(part);
    if (now === undefined) {
      if (before[part]) out[part] = 'kept';
    } else if (!before[part]) out[part] = 'added';
    else out[part] = body(before[part]) === body(now) ? 'kept' : 'changed';
  }
  return out;
}
