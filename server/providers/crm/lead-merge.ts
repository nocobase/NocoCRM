import {
  AgentServiceError,
  agentServiceFactoryToken,
  aiConversationsManagerToken,
} from '@nocobase/app-plugin-ai-employee/server';
import { loggingToken } from '@nocobase/app-server/logging';
import type { Row } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { z } from 'zod';
import { CRM_ASSISTANT } from '../../ai/employees/crm-assistant.js';
import { lang, pick } from '../../locales/crm-ai/index.js';
import {
  companySuffixes,
  createdOn,
  leadSummary,
  mergeLabels,
  mergeTitle,
  nameLine,
} from '../../locales/crm-ai/lead-merge.js';
import { structuredRunModel } from './ai-model.js';
import { compileFilter, conditions, type Actor } from './authorization.js';
import { jsonIn } from './lead-capture.js';
import { LONG_TEXT_LIMIT } from './limits.js';
import {
  CrmError,
  definitions,
  object,
  toText,
  type CrmRecord,
} from './schema.js';
import { array, type CrmService } from './service.js';

// Leads that are the same enquiry twice (the same person written down by
// two salespeople, or a form sent again), found and merged into one. The
// check is plain matching, not the model: the same email, the same phone,
// or the same person at the same company, among the open leads the reader
// may see. Merging keeps one lead, takes for each field the value the
// person picks (either lead's, or for the long texts both), moves the
// other's activities, notes and attachments over, notes the merge on the
// kept lead's timeline with what the other lead held, and deletes the
// other. The AI proposes which lead to keep and which values are right;
// the person decides in the dialog. Converted and invalid leads take no
// part: a converted one is read-only, an invalid one already handled.
// Whoever may edit both leads may merge them: nothing is lost (the other
// lead's values stay on the merge's timeline entry, its activities and notes
// move), so it asks for edit access, not for the right to delete, which a
// salesperson does not have even for their own leads.

const OPEN = ['new', 'working', 'nurturing'];

// The fields compared and picked, in groups that go together: an address
// is one choice, so a country never ends up beside another country's
// province. A group is named by its first field.
export const MERGE_GROUPS: readonly (readonly string[])[] = [
  ['name'],
  ['company'],
  ['phone'],
  ['email'],
  ['jobTitle'],
  ['ownerId'],
  ['source'],
  ['status'],
  ['employees'],
  ['industry'],
  ['website'],
  ['country', 'state', 'city', 'address'],
  ['message'],
  ['companyDescription'],
];
// The long texts, whose two versions may both be kept, one after the other.
const BOTH = new Set(['message', 'companyDescription']);

export type MatchReason = 'email' | 'phone' | 'person';
export interface LeadDuplicate {
  id: string;
  name: string;
  company: string;
  status: string;
  ownerId: string;
  createdAt: string;
  matched: MatchReason[];
  // Whether the reader may merge the two: edit both.
  mergeable: boolean;
}

const blank = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && !value.length);
const digits = (value: unknown): string =>
  toText(value ?? '').replace(/\D/g, '');
// Two phone numbers as the same line: the shorter, seven digits or more,
// ending the longer, so a country code or a leading 0 does not matter.
function samePhone(a: unknown, b: unknown): boolean {
  const [x, y] = [digits(a), digits(b)].sort((p, q) => p.length - q.length);
  return x.length >= 7 && y.endsWith(x);
}
const bare = (value: unknown): string =>
  toText(value ?? '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');
// The words at the end of a company's name that only say what kind of
// company it is: the Chinese ones (from the locale file), then the English.
const COMPANY_SUFFIX = new RegExp(
  `(${[
    ...companySuffixes,
    'incorporated',
    'corporation',
    'company',
    'limited',
    'gmbh',
    'corp',
    'inc',
    'llc',
    'ltd',
    'co',
  ].join('|')})$`,
  'u',
);
// A company's name without the words that only say what kind of company it
// is, so a name and the same name followed by "Co., Ltd." (in Chinese or
// English) are one.
function companyKey(value: unknown): string {
  let key = bare(value);
  for (;;) {
    const next = key.replace(COMPANY_SUFFIX, '');
    if (next === key) return key;
    key = next;
  }
}
export function matchReasons(a: Row, b: Row): MatchReason[] {
  const reasons: MatchReason[] = [];
  const email = (row: Row): string =>
    toText(row.email ?? '')
      .trim()
      .toLowerCase();
  if (email(a) && email(a) === email(b)) reasons.push('email');
  if (samePhone(a.phone, b.phone)) reasons.push('phone');
  if (
    bare(a.name) &&
    bare(a.name) === bare(b.name) &&
    companyKey(a.company) &&
    companyKey(a.company) === companyKey(b.company)
  )
    reasons.push('person');
  return reasons;
}

async function may(
  service: CrmService,
  actor: Actor,
  id: string,
  action: 'update',
): Promise<boolean> {
  try {
    await service.get(actor, 'leads', id, undefined, action);
    return true;
  } catch {
    return false;
  }
}

// The open leads the reader may see that repeat this one.
export async function leadDuplicates(
  service: CrmService,
  actor: Actor,
  id: string,
): Promise<LeadDuplicate[]> {
  const lead = await service.get(actor, 'leads', id);
  if (!OPEN.includes(toText(lead.status))) return [];
  const access = await conditions(actor, 'leads', 'read');
  const rows = await service.database
    .query()
    .selectFrom('crmLeads')
    .select([
      'id',
      'name',
      'company',
      'email',
      'phone',
      'status',
      'ownerId',
      'createdAt',
    ])
    .where('status', 'in', OPEN)
    .where('id', '!=', id)
    .where((eb) => compileFilter(eb, access.scope))
    .execute();
  const found: LeadDuplicate[] = [];
  const editable = await may(service, actor, id, 'update');
  for (const row of rows) {
    const matched = matchReasons(lead, row);
    if (!matched.length) continue;
    const other = toText(row.id);
    found.push({
      id: other,
      name: toText(row.name ?? ''),
      company: toText(row.company ?? ''),
      status: toText(row.status),
      ownerId: toText(row.ownerId ?? ''),
      createdAt: toText(row.createdAt ?? ''),
      matched,
      mergeable: editable && (await may(service, actor, other, 'update')),
    });
    if (found.length >= 5) break;
  }
  return found;
}

// Two companies as one: the same name once the kind of company is left
// off, or, for a name of four characters or more, one inside the other
// (a name inside the same name followed by a word such as "Group").
function sameCompany(a: unknown, b: unknown): boolean {
  const [x, y] = [companyKey(a), companyKey(b)].sort(
    (p, q) => p.length - q.length,
  );
  return Boolean(x) && (x === y || (x.length >= 4 && y.includes(x)));
}

export interface FoundDuplicate {
  entity: 'leads' | 'contacts' | 'accounts';
  id: string;
  name: string;
  matched: (MatchReason | 'company')[];
  // A lead the new one may be merged into (the same person, which the
  // reader may edit).
  mergeable?: boolean;
}

// What a lead not yet created may repeat (the AI's capture review): open
// leads by the same rules as a lead's page, and also those of the same
// company, which are worth knowing though not mergeable; contacts by email
// or phone; accounts by company. As the reader may see them, at most five,
// the leads first.
export async function findDuplicates(
  service: CrmService,
  actor: Actor,
  input: Row,
): Promise<FoundDuplicate[]> {
  const found: FoundDuplicate[] = [];
  const readable = async (
    entity: 'leads' | 'contacts' | 'accounts',
    table: string,
    columns: string[],
  ): Promise<Row[]> => {
    try {
      const access = await conditions(actor, entity, 'read');
      let query = service.database
        .query()
        .selectFrom(table)
        .select(columns)
        .where((eb) => compileFilter(eb, access.scope));
      if (entity === 'leads') query = query.where('status', 'in', OPEN);
      return await query.execute();
    } catch {
      // A list the reader may not see contributes nothing.
      return [];
    }
  };
  for (const row of await readable('leads', 'crmLeads', [
    'id',
    'name',
    'company',
    'email',
    'phone',
  ])) {
    const matched: FoundDuplicate['matched'] = matchReasons(input, row);
    const person = matched.length > 0;
    if (!person && sameCompany(input.company, row.company))
      matched.push('company');
    if (!matched.length) continue;
    found.push({
      entity: 'leads',
      id: toText(row.id),
      name: [row.name, row.company].filter(Boolean).map(toText).join(' / '),
      matched,
      mergeable:
        person && (await may(service, actor, toText(row.id), 'update')),
    });
  }
  // The same person first, then the same company.
  found.sort(
    (a, b) =>
      Number(b.matched[0] !== 'company') - Number(a.matched[0] !== 'company'),
  );
  for (const row of await readable('contacts', 'crmContacts', [
    'id',
    'name',
    'email',
    'phone',
  ])) {
    const matched = matchReasons(
      { email: input.email, phone: input.phone },
      { email: row.email, phone: row.phone },
    );
    if (matched.length)
      found.push({
        entity: 'contacts',
        id: toText(row.id),
        name: toText(row.name ?? ''),
        matched,
      });
  }
  for (const row of await readable('accounts', 'crmAccounts', ['id', 'name']))
    if (sameCompany(input.company, row.name))
      found.push({
        entity: 'accounts',
        id: toText(row.id),
        name: toText(row.name ?? ''),
        matched: ['company'],
      });
  return found.slice(0, 5);
}

// A lead as the merge dialog compares it: its fields, and how much of its
// own history goes with it.
interface MergeSide {
  lead: CrmRecord;
  activities: number;
  notes: number;
  // Which of the two the reader may keep (and so delete the other).
  keepable: boolean;
}

export interface MergeProposal {
  leads: (CrmRecord & { activities: number; notes: number })[];
  // The lead to keep, the other's id being the other one.
  keepId: string;
  // Which lead's value each differing group takes (its first field names
  // it), or `both` for a long text.
  picks: Record<string, string>;
  // Why, in a line: the keep, and a group where it is not obvious.
  reason: string;
  reasons: Record<string, string>;
  // Which leads the reader may keep.
  keepable: string[];
  // The groups whose values differ, by their first field: the rows the
  // dialog asks about.
  groups: string[];
  // The AI made the proposal (rather than the plain defaults, when it is
  // off or did not answer).
  ai: boolean;
}

// The id the merge gives a lead not yet saved: what the AI organised from
// pasted text and the person checked in the capture review, merged into a
// lead the CRM holds instead of being created. It has no history, so the
// lead the CRM holds is the one kept.
export const UNSAVED = 'new';
function unsavedLead(raw: unknown): CrmRecord {
  const input = object(raw);
  const values = Object.fromEntries(
    definitions.leads.fields
      .map((f) => f.key)
      // A lead that does not exist has no status yet.
      .filter((key) => !['status', 'invalidReason'].includes(key))
      .filter((key) => input[key] !== undefined && input[key] !== '')
      .map((key) => [key, input[key]]),
  );
  return {
    ...values,
    id: UNSAVED,
    createdAt: new Date().toISOString(),
  } as CrmRecord;
}

async function side(
  service: CrmService,
  actor: Actor,
  id: string,
): Promise<MergeSide> {
  const lead = await service.get(actor, 'leads', id);
  if (!OPEN.includes(toText(lead.status)))
    throw new CrmError('convertedReadOnly', 409);
  const query = service.database.query();
  const activities = await query
    .selectFrom('crmActivities')
    .select('id')
    .where('leadId', '=', id)
    .execute();
  const notes = await query
    .selectFrom('crmHistory')
    .select('id')
    .where('entity', '=', 'leads')
    .where('recordId', '=', id)
    .where('action', '=', 'note')
    .execute();
  return {
    lead,
    activities: activities.length,
    notes: notes.length,
    // Whether it may be changed; the caller adds whether the other may go.
    keepable: await may(service, actor, id, 'update'),
  };
}

function groupValues(lead: Row, group: readonly string[]): unknown[] {
  return group.map((key) => (blank(lead[key]) ? null : lead[key]));
}
// The same value however it is written: an email in another case, a
// phone with a country code or other separators is no choice to make.
function sameGroup(a: Row, b: Row, group: readonly string[]): boolean {
  const [key] = group;
  if (key === 'email')
    return (
      toText(a.email ?? '')
        .trim()
        .toLowerCase() ===
      toText(b.email ?? '')
        .trim()
        .toLowerCase()
    );
  if (key === 'phone')
    return (blank(a.phone) && blank(b.phone)) || samePhone(a.phone, b.phone);
  return (
    JSON.stringify(groupValues(a, group)) ===
    JSON.stringify(groupValues(b, group))
  );
}
// The groups whose values differ between the two leads.
export function differing(a: Row, b: Row): (readonly string[])[] {
  return MERGE_GROUPS.filter((group) => !sameGroup(a, b, group));
}
const filled = (lead: Row, group: readonly string[]): boolean =>
  group.some((key) => !blank(lead[key]));

// The plain proposal: keep the lead with more history (more activities,
// then more notes, then the older one), and for each field its value, or
// the other's where it has none; two different long texts are both kept.
export function plainProposal(
  a: MergeSide,
  b: MergeSide,
): Pick<MergeProposal, 'keepId' | 'picks'> {
  const weight = (s: MergeSide): [number, number, number] => [
    s.activities,
    s.notes,
    -Date.parse(toText(s.lead.createdAt)) || 0,
  ];
  const [wa, wb] = [weight(a), weight(b)];
  const preferA =
    wa[0] !== wb[0]
      ? wa[0] > wb[0]
      : wa[1] !== wb[1]
        ? wa[1] > wb[1]
        : wa[2] >= wb[2];
  const [keep, other] =
    a.keepable && (preferA || !b.keepable) ? [a, b] : [b, a];
  const picks: Record<string, string> = {};
  for (const group of differing(keep.lead, other.lead)) {
    const key = group[0];
    picks[key] =
      BOTH.has(key) && filled(keep.lead, group) && filled(other.lead, group)
        ? 'both'
        : filled(keep.lead, group)
          ? toText(keep.lead.id)
          : toText(other.lead.id);
  }
  return { keepId: toText(keep.lead.id), picks };
}

const proposalShape = z.object({
  keep: z.enum(['A', 'B']),
  reason: z.string(),
  fields: z.array(
    z.object({
      field: z.string(),
      pick: z.enum(['A', 'B', 'both']),
      why: z.string().nullable(),
    }),
  ),
});

// Which lead to keep and which values are right, from the AI where it is
// on, else the plain proposal.
export async function mergeProposal(
  service: CrmService,
  container: ServiceResolver,
  actor: Actor,
  id: string,
  body: unknown,
): Promise<MergeProposal> {
  const raw = object(body);
  // With `input`, the other side is a lead not yet saved (UNSAVED).
  const unsaved = raw.input !== undefined;
  const otherId = unsaved ? UNSAVED : toText(raw.with ?? '');
  if (!otherId || otherId === id)
    throw new CrmError('invalidInput', 400, 'with');
  const a = await side(service, actor, id);
  const b: MergeSide = unsaved
    ? { lead: unsavedLead(raw.input), activities: 0, notes: 0, keepable: false }
    : await side(service, actor, otherId);
  if (!matchReasons(a.lead, b.lead).length)
    throw new CrmError('invalidInput', 400, 'with');
  if (!a.keepable || (!unsaved && !b.keepable))
    throw new CrmError('forbidden', 403);
  const keepable = [a, b]
    .filter((s) => s.keepable)
    .map((s) => toText(s.lead.id));
  const leads = [a, b].map((s) => ({
    ...s.lead,
    activities: s.activities,
    notes: s.notes,
  }));
  const plain = plainProposal(a, b);
  // A lead not yet saved brings only what it holds: a field it leaves
  // empty keeps the held lead's value, no choice to make.
  const groups = differing(a.lead, b.lead).filter(
    (group) => !unsaved || filled(b.lead, group),
  );
  const fallback: MergeProposal = {
    leads,
    ...plain,
    reason: '',
    reasons: {},
    keepable,
    groups: groups.map((g) => toText(g[0])),
    ai: false,
  };
  if (
    !groups.length ||
    !container.has(agentServiceFactoryToken) ||
    !(await service.assistantEnabled())
  )
    return fallback;
  const settings = await service.settings();
  const zh = (
    settings.aiLanguage === 'user'
      ? (actor.locale ?? 'zh-CN')
      : settings.aiLanguage
  ).startsWith('zh');
  const users = await service.users(actor);
  // A date as the pages show it, in the CRM's time zone.
  const day = (value: unknown): string => {
    try {
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: settings.timeZone,
        dateStyle: 'short',
      }).format(new Date(toText(value)));
    } catch {
      return toText(value);
    }
  };
  // How the reason names each lead to the person, who sees no A or B: by
  // the day it was created, the one on the page and the other where both
  // were created the same day, and the unsaved one as what was organised.
  const t = pick(mergeLabels, zh);
  const dated = (s: MergeSide): string =>
    createdOn(day(s.lead.createdAt))[lang(zh)];
  const label = (s: MergeSide): string =>
    s.lead.id === UNSAVED
      ? t.unsaved
      : dated(a) === dated(b)
        ? s === a
          ? t.thisLead
          : t.otherLead
        : dated(s);
  const describe = (s: MergeSide): string =>
    [
      nameLine(label(s))[lang(zh)],
      s.lead.id === UNSAVED
        ? t.unsavedSummary
        : leadSummary(
            day(s.lead.createdAt),
            day(s.lead.updatedAt),
            s.activities,
            s.notes,
          )[lang(zh)],
      ...groups.flatMap((group) =>
        group.map((key) => {
          const value = s.lead[key];
          const shown =
            key === 'ownerId'
              ? toText(users.find((u) => u.id === value)?.name ?? '')
              : toText(value ?? '');
          return `- ${key}: ${shown.replace(/\s+/g, ' ').slice(0, 1500) || '(empty)'}`;
        }),
      ),
    ].join('\n');
  const skillSettings = {
    toolsVersion: 1,
    tools: [],
    skillsVersion: 1,
    skills: [],
  };
  const logger = container.resolve(loggingToken).getLogger('crm-lead-merge');
  try {
    const conversation = await container
      .resolve(aiConversationsManagerToken)
      .create({
        userId: actor.id,
        aiEmployee: { username: CRM_ASSISTANT },
        title: mergeTitle[lang(zh)],
        from: 'sub-agent',
        options: { skillSettings },
      });
    const model = await structuredRunModel(container);
    const agent = await container
      .resolve(agentServiceFactoryToken)
      .createAIEmployee({
        username: CRM_ASSISTANT,
        state: {
          sessionId: conversation.sessionId,
          timezone: settings.timeZone,
          ...(model ? { model } : {}),
        },
        actor: {
          id: actor.id,
          roles: ['member'],
          isRoot: false,
          locale: actor.locale,
        },
        runtime: { logger },
        from: 'sub-agent',
        skillSettings,
      });
    const ask = async () => {
      const result = await agent.invoke({
        userMessages: [
          {
            role: 'user',
            content: {
              type: 'text',
              content: mergePrompt(
                describe(a),
                describe(b),
                groups.map((g) => g[0]),
                a.keepable && b.keepable ? null : a.keepable ? 'A' : 'B',
                zh,
              ),
            },
          },
        ],
        responseFormat: proposalShape,
        signal: AbortSignal.timeout(90_000),
      });
      return proposalShape.safeParse(
        result.structuredResponse ?? jsonIn(result.message?.content),
      );
    };
    // A reply without the proposal (it happens now and then) is asked for
    // once more before the plain proposal stands in.
    let parsed = await ask();
    if (!parsed.success) parsed = await ask();
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues.slice(0, 5) },
        'lead merge proposal unreadable',
      );
      return fallback;
    }
    const pickOf = { A: toText(a.lead.id), B: toText(b.lead.id) };
    const keepId =
      parsed.data.keep === 'A'
        ? a.keepable
          ? pickOf.A
          : pickOf.B
        : b.keepable
          ? pickOf.B
          : pickOf.A;
    const keep = keepId === pickOf.A ? a.lead : b.lead;
    const other = keepId === pickOf.A ? b.lead : a.lead;
    const picks: Record<string, string> = {};
    const reasons: Record<string, string> = {};
    for (const group of groups) {
      const key = group[0];
      const answer = parsed.data.fields.find((f) => f.field === key);
      const chosen =
        answer?.pick === 'both'
          ? BOTH.has(key) && filled(a.lead, group) && filled(b.lead, group)
            ? 'both'
            : undefined
          : answer
            ? pickOf[answer.pick]
            : undefined;
      // An empty value is never picked over a filled one.
      const lead =
        chosen === pickOf.A ? a.lead : chosen === pickOf.B ? b.lead : undefined;
      picks[key] =
        chosen && (!lead || filled(lead, group))
          ? chosen
          : filled(keep, group)
            ? keepId
            : toText(other.id);
      const why = toText(answer?.why ?? '').trim();
      if (why) reasons[key] = why.slice(0, 300);
    }
    return {
      leads,
      keepId,
      picks,
      reason: parsed.data.reason.trim().slice(0, 500),
      reasons,
      keepable,
      groups: fallback.groups,
      ai: true,
    };
  } catch (error) {
    if (error instanceof AgentServiceError || error instanceof Error) {
      logger.warn({ err: error }, 'lead merge proposal failed');
      return fallback;
    }
    throw error;
  }
}

function mergePrompt(
  a: string,
  b: string,
  fields: string[],
  only: 'A' | 'B' | null,
  zh: boolean,
): string {
  const t = pick(mergeLabels, zh);
  return `The two leads are very likely the same enquiry and are to be merged into one. Give a merge plan: which lead to keep (keep), and for each differing field below, which lead's value to take (pick).
Rules:
- Keep the one with more history (more activities and notes) and the further follow-up; when they are about even, keep the one created earlier.${only ? `\n- Only ${only} may be kept.` : ''}
- For each field: take the more complete, more specific, more recent value (for example, a company's full name beats a short name, and a phone number confirmed later beats an old number); never pick an empty value.
- When a person's or company's name differs only in how it is written (a typo, a homophone, simplified or traditional characters, letter case), take the kept lead's spelling: the lead followed up more has been checked through contact, and the newly entered one is more likely a slip; take the other only when it is clearly more complete (such as a company's full name), and explain it in why.
- message (the original enquiry) and companyDescription: when both leads have one and they differ, pick both, keeping both texts; when they repeat each other, pick the more complete one.
- country stands for the whole address group (country, state or province, city, street address), all taken from the same lead.
- ownerId: take the owner who came earlier and has followed up more, unless the other lead's owner is clearly the one following it up now.
- source records the channel the lead first came from, used to measure each channel's results: take the source of the lead created earlier, and do not change it because the lead later turned up through another channel.
- Answer only for the fields listed here: ${fields.join(', ')}.
- reason says in one sentence which lead to keep and why; why is one sentence only where the choice is not obvious, otherwise null.
- The reader cannot see the code names A and B: in reason and why, refer to each lead by its "${t.callIt}", never as A or B.
- "${t.unsaved}" is not yet saved as a lead: do not say on which day it was created, and do not give its having no activities as a reason; it is to be merged into the existing lead, so the one kept is always the existing lead, and reason need only say that it is the same enquiry as the existing lead.
- Write values in natural words (in progress, trade show, food and beverage), not codes or field names such as working or exhibition.
- Write reason and why in ${zh ? 'Chinese' : 'English'}.

# Lead A
${a}

# Lead B
${b}`;
}

// Merges the lead `fromId` into `keepId`, as `picks` (from the proposal,
// changed by the person) say; returns the kept lead.
export async function mergeLeads(
  service: CrmService,
  actor: Actor,
  keepId: string,
  body: unknown,
): Promise<CrmRecord> {
  const input = object(body);
  // With `input`, a lead not yet saved (the capture review) is merged in:
  // its values only, nothing to move and nothing to delete.
  const unsaved = input.input !== undefined;
  const fromId = unsaved ? UNSAVED : toText(input.from ?? '');
  if (!fromId || fromId === keepId)
    throw new CrmError('invalidInput', 400, 'from');
  const picks = object(input.picks ?? {});
  return service.mutate(actor, async (actorNow, tx) => {
    // What a lead organised by the AI brings is recorded as such.
    const prepared: Actor = unsaved
      ? { ...actorNow, via: 'capture' }
      : actorNow;
    const keep = await service.get(prepared, 'leads', keepId, tx, 'update');
    const other = unsaved
      ? unsavedLead(input.input)
      : await service.get(prepared, 'leads', fromId, tx, 'update');
    if (
      !OPEN.includes(toText(keep.status)) ||
      (!unsaved && !OPEN.includes(toText(other.status)))
    )
      throw new CrmError('convertedReadOnly', 409);
    if (!matchReasons(keep, other).length)
      throw new CrmError('invalidInput', 400, 'from');
    const values: Row = {};
    for (const group of differing(keep, other)) {
      const key = group[0];
      const pick = toText(picks[key] ?? keepId);
      if (pick === 'both') {
        if (!BOTH.has(key)) throw new CrmError('invalidInput', 400, key);
        // The older lead's text first, as it arrived first.
        const [first, second] =
          Date.parse(toText(keep.createdAt)) <=
          Date.parse(toText(other.createdAt))
            ? [keep, other]
            : [other, keep];
        values[key] = [first[key], second[key]]
          .filter((v) => !blank(v))
          .map((v) => toText(v).trim())
          .join('\n\n---\n\n')
          .slice(0, LONG_TEXT_LIMIT);
      } else if (pick === fromId) {
        if (group.includes('status'))
          throw new CrmError('invalidInput', 400, key);
        for (const field of group) values[field] = other[field] ?? null;
      } else if (pick !== keepId) throw new CrmError('invalidInput', 400, key);
    }
    // Every attachment of both.
    const files = [
      ...new Set([...array(keep.attachments), ...array(other.attachments)]),
    ];
    if (files.length !== array(keep.attachments).length)
      values.attachments = files;
    if (Object.keys(values).length)
      await service.save(prepared, 'leads', values, keepId, tx);
    // A lead not yet saved: its values, as organised and checked, on the
    // kept lead's timeline; it has nothing else to move and is never
    // created.
    if (unsaved) {
      await service.history(
        tx,
        prepared,
        'leads',
        keepId,
        'merged',
        undefined,
        undefined,
        {
          lead: Object.fromEntries(
            Object.entries(other).filter(
              ([key]) => !['attachments', 'id', 'createdAt'].includes(key),
            ),
          ),
          captured: true,
          activities: 0,
          notes: 0,
        },
      );
      return service.get(prepared, 'leads', keepId, tx);
    }
    const now = new Date().toISOString();
    // The other's activities, with their history, now the kept lead's.
    const activities = await tx
      .selectFrom('crmActivities')
      .select('id')
      .where('leadId', '=', fromId)
      .execute();
    for (const activity of activities) {
      await tx
        .updateTable('crmActivities')
        .set({ leadId: keepId, updatedAt: now })
        .where('id', '=', toText(activity.id))
        .execute();
      await service.history(
        tx,
        prepared,
        'activities',
        toText(activity.id),
        'updated',
        undefined,
        undefined,
        { leadId: keepId },
        { leadId: fromId },
      );
    }
    // Its notes, edits and removals included, now on the kept lead.
    const notes = await tx
      .updateTable('crmHistory')
      .set({ recordId: keepId })
      .where('entity', '=', 'leads')
      .where('recordId', '=', fromId)
      .where('action', 'in', ['note', 'noteEdited', 'noteDeleted'])
      .execute();
    // A follow-up of the other still waiting or running has nothing left
    // to act on.
    await tx
      .updateTable('crmHistory')
      .set({ aiStatus: 'superseded' })
      .where('entity', '=', 'leads')
      .where('recordId', '=', fromId)
      .where('action', '=', 'ai')
      .where('aiStatus', 'in', ['pending', 'running'])
      .execute();
    // The merge on the kept lead's timeline, with what the other lead was.
    await service.history(
      tx,
      prepared,
      'leads',
      keepId,
      'merged',
      undefined,
      undefined,
      {
        lead: Object.fromEntries(
          Object.entries(other).filter(([key]) => key !== 'attachments'),
        ),
        activities: activities.length,
        notes: Number(notes.updatedCount ?? 0),
      },
    );
    // Gone, its activities moved: deleted here rather than through
    // remove(), which asks for the right to delete (see the top).
    await tx.deleteFrom('crmLeads').where('id', '=', fromId).execute();
    await service.history(tx, prepared, 'leads', fromId, 'deleted');
    return service.get(prepared, 'leads', keepId, tx);
  });
}
