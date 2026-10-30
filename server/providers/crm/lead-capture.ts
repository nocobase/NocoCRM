import { loggingToken } from '@nocobase/app-server/logging';
import type { Row } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { z } from 'zod';
import { jsonIn, modelFailure, openSession, readSkill } from './ai-model.js';
import {
  captureFields,
  captureLabels,
  captureRequest,
  todayIn,
} from './form-capture.js';
import { settingsGuidance } from './guidance.js';
import { normalizePhone } from './phone.js';
import { findDuplicates, type FoundDuplicate } from './lead-merge.js';
import { capability, conditions, type Actor } from './authorization.js';
import {
  isCountry,
  isSubdivision,
  streetAddress,
  subdivisionCode,
} from './geography.js';
import { LONG_TEXT_LIMIT, TEXT_LIMIT } from './limits.js';
import {
  CrmError,
  employeeRanges,
  industries,
  object,
  sources,
  toText,
} from './schema.js';
import type { CrmService } from './service.js';

// "New lead" with the AI: a salesperson pastes what they have (an email, a
// chat, notes from a trade fair) and the CRM assistant turns it into one
// lead per enquiry (ONE_ENQUIRY), filling only what the text states. The result is a set
// of prefilled forms the salesperson checks and submits (the AI never
// submits); fields it is unsure of come
// back named, so the form can ask for them, and anything already in the CRM
// that the lead may repeat is looked up here, not guessed by the model. The
// salesperson may then tell the AI what to change: the same call with an
// instruction and the leads as they stand returns them revised.
//
// The run is one call to the CRM's model (ai-model.ts), for the signed-in
// user, with no tools and no conversation kept, by the form-capture skill
// (form-capture.ts): the lead form's fields, with the rules of their own
// in each one's hint, and the leads as they stand when adjusting.

// The answer: each lead's form under its ref (null for a new one), and
// what to tell the person. The values are checked field by field in
// clean(), so one value the model got wrong costs that value, not the
// whole reply.
const answerShape = z.object({
  leads: z.array(
    z.object({
      ref: z.string().nullable().default(null),
      values: z.record(z.string(), z.unknown()).default({}),
      uncertain: z.array(z.string()).default([]),
    }),
  ),
  said: z.string().nullable().default(null),
});
type CapturedForm = z.infer<typeof answerShape>['leads'][number];

const TEXT_FIELDS = [
  'name',
  'company',
  'jobTitle',
  'phone',
  'email',
  'linkedin',
  'website',
  'city',
  'address',
] as const;
const LONG_FIELDS = ['message', 'companyDescription'] as const;
const SELECT_FIELDS = ['industry', 'employees', 'source'] as const;
// Every field the AI writes, which an adjustment returns in full.
const FIELDS: readonly string[] = [
  ...TEXT_FIELDS,
  ...LONG_FIELDS,
  ...SELECT_FIELDS,
  'country',
  'state',
];
// The form's fields as the request gives them, in the form's order.
const FORM_FIELDS: readonly string[] = [
  'name',
  'company',
  'jobTitle',
  'phone',
  'email',
  'linkedin',
  'source',
  'employees',
  'industry',
  'website',
  'country',
  'state',
  'city',
  'address',
  'message',
  'companyDescription',
];
// The most leads one text or one adjustment handles.
const MAX_LEADS = 50;

export interface CapturedLead {
  // The client's key for a lead it sent to be adjusted; absent for a new one.
  ref?: string;
  // The lead form's input. A first capture carries only the fields the text
  // gave; an adjustment carries every field the AI writes, null for one it
  // cleared, so the client can tell a cleared value from an untouched one.
  input: Row;
  // Fields whose value the text does not state outright: the form asks for
  // a check.
  uncertain: string[];
  // Records already in the CRM this lead may repeat.
  duplicates: FoundDuplicate[];
}

// The lead form's own rules, each field's `hint`.
const HINTS: Readonly<Record<string, string>> = {
  company: "The company's full name.",
  phone: 'As written.',
  linkedin:
    "The person's LinkedIn profile address; only when the material gives one.",
  country:
    'Only from a place the material gives for this person or this company. Do not work out where a company is from what you know of it: its head office may not be where this person is, and the company\'s public particulars are looked up on the web later, with sources. The place where an exhibition, conference or event is held is not where the person is either, unless the material says they are there. For example, "met Lin Yue of Sunny Optical at an exhibition in Hangzhou": Hangzhou is where the exhibition was, so Lin Yue\'s country, province and city are left out; "Zhou Xiao of Hangzhou Robam Appliances": the company\'s name says Hangzhou, so the city is Hangzhou. When the material gives a city or a province, add the regions above it that follow for certain: Hangzhou → country CN, province Zhejiang Province; Shenzhen → CN, Guangdong Province. A city name shared by several places is uncertain. With no place in the material, the country, province and city are all left out.',
  state:
    "As the country's rule says. The province, state or municipality as the material writes it, in its language.",
  city: "As the country's rule says. The city as the material writes it, in its language: never translated or romanised.",
  address:
    'The street part only (street, number, building); the country, province and city have their own fields and are not repeated in it.',
  message:
    'This person\'s enquiry. It is kept unchanged once saved and is what every later follow-up works from, so keep everything the material says about this person, as close to its own words as possible: their situation, what they want to do, scale, deployment, timing, budget, concerns — whatever of these it has. Leave out only the name, phone and email already in their own fields; the others of the company who came with this person are written in it with their particulars. Never cut it down to a one-line summary, add no judgement of yours, and never write things like "the material does not say".',
  companyDescription:
    'What the material says about the company itself: what it does, its business, its scale. Left out when the material says nothing of it beyond its name.',
  employees:
    'A stated head count goes into its range (about 120 people → 51-200).',
  source:
    'Where these people came from, which the situation may show: met at an exhibition → exhibition; a website form or enquiry → website; introduced by a customer → customerReferral; by a colleague → employeeReferral; by a partner → partner; we contacted them first → outbound. Someone who called or wrote to us themselves is not outbound: with no matching option, leave it out. Leave it out as well when it cannot be told: other is only for a source the material names that no option fits.',
  ownerId:
    "The lead's owner: one of the salespeople `records` lists for users, only when the material says whom it goes to; one it names is stated, not uncertain.",
};

// What makes one lead: an enquiry, not a person. People of one company
// about one need are one lead, led by the one who decides or asked, the
// rest written into its message, so two salespeople do not follow the same
// business up as two leads.
const ONE_ENQUIRY = `The people of one company about the same need make one lead: its person is the one who leads it (who decides, or who asked); the others of that company go into its message, each with only what the material gives of them (job title, phone, email, what they said they care about), adding nothing it does not say. People of different companies, or one company's needs that have nothing to do with each other, make separate leads. People of our own company are not leads. A company named without any particular person becomes one lead with the company only.`;

const TASK = `Organise the material into sales leads for the new lead form, by the form-capture method: one form for each enquiry, each in \`leads\` as { ref, values, uncertain }, with ref null. ${ONE_ENQUIRY} Call no tools.`;

const ADJUST_TASK = `The leads below were organised from the material, by the form-capture method, and the person has checked them: \`form\` holds each one under its ref. Return every lead, changed as the person asks, in \`leads\` as { ref, values, uncertain }: each existing one with its ref as given, a lead the person adds with ref null; leave out a lead the person removes. ${ONE_ENQUIRY} Call no tools.`;

// The owner a value names: one of the salespeople offered, by id or by
// their name when only one has it.
function ownerOf(
  value: unknown,
  owners: readonly { id: string; name: string }[],
): string | undefined {
  const named = toText(value ?? '').trim();
  if (!named) return undefined;
  const byId = owners.find((o) => o.id === named);
  if (byId) return byId.id;
  const byName = owners.filter((o) => o.name === named);
  return byName.length === 1 ? byName[0].id : undefined;
}

// A form's values as the lead form's input, each kept only when it is of
// its field's kind. An adjustment's leaves none out: a field the reply
// does not return keeps the lead's value as the person left it (`current`),
// and one it returns empty is null, cleared.
function clean(
  values: Readonly<Record<string, unknown>>,
  owners: readonly { id: string; name: string }[],
  options: Readonly<Record<(typeof SELECT_FIELDS)[number], readonly string[]>>,
  current?: Row,
): Row {
  const fields: Record<string, unknown> = current
    ? { ...current, ...values }
    : values;
  const input: Row = {};
  for (const key of TEXT_FIELDS) {
    const raw = toText(fields[key] ?? '');
    // The number as it will be kept, so the review shows it so (phone.ts).
    const value = key === 'phone' ? normalizePhone(raw) : raw.trim();
    if (value) input[key] = value.slice(0, TEXT_LIMIT);
  }
  for (const key of LONG_FIELDS) {
    const value = toText(fields[key] ?? '').trim();
    if (value) input[key] = value.slice(0, LONG_TEXT_LIMIT);
  }
  // A region the model names: the country by its ISO code, the province by
  // code or name within that country, dropped when either does not resolve.
  const country = toText(fields.country ?? '')
    .trim()
    .toUpperCase();
  if (isCountry(country)) {
    input.country = country;
    const state = toText(fields.state ?? '').trim();
    const code = isSubdivision(country, state)
      ? state
      : subdivisionCode(country, state);
    if (code) input.state = code;
  }
  // The address without the region its own fields hold.
  if (typeof input.address === 'string') {
    const street = streetAddress(input.address, {
      country: toText(input.country ?? ''),
      state: toText(input.state ?? ''),
      city: toText(input.city ?? ''),
    });
    if (street) input.address = street;
    else delete input.address;
  }
  for (const key of SELECT_FIELDS) {
    const value = toText(fields[key] ?? '');
    if (value && options[key].includes(value)) input[key] = value;
  }
  if (current) for (const key of FIELDS) input[key] ??= null;
  // An owner is kept only when it is one of the salespeople offered.
  const owner = ownerOf(fields.ownerId, owners);
  if (owner) input.ownerId = owner;
  return input;
}

// The leads the client sends back to be adjusted: its key for each and the
// fields the AI writes, as the user left them.
function currentLeads(value: unknown): Row[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_LEADS)
    throw new CrmError('invalidInput', 400, 'leads');
  return value.map((item) => {
    const lead = object(item);
    const ref = toText(lead.ref ?? '');
    if (!ref || ref.length > 64)
      throw new CrmError('invalidInput', 400, 'leads');
    const row: Row = { ref };
    for (const key of [...FIELDS, 'ownerId']) {
      const text = toText(lead[key] ?? '').slice(0, LONG_TEXT_LIMIT);
      row[key] = text || null;
    }
    return row;
  });
}

// Records the lead may repeat, as the lead page's duplicate check finds
// them (lead-merge.ts): open leads by the same person (mergeable) or
// company, contacts by email or phone, companies by name.
async function duplicatesOf(
  service: CrmService,
  actor: Actor,
  input: Row,
): Promise<CapturedLead['duplicates']> {
  return findDuplicates(service, actor, input);
}

// Read from a reply's text (ai-model.ts).
export { jsonIn };

export async function captureLeads(
  service: CrmService,
  container: ServiceResolver,
  actor: Actor,
  body: unknown,
  timeZone: string,
): Promise<{ leads: CapturedLead[]; reply?: string }> {
  await conditions(actor, 'leads', 'create');
  const input = object(body);
  const pasted = toText(input.text ?? '').trim();
  if (!pasted) throw new CrmError('required', 400, 'text');
  if (pasted.length > LONG_TEXT_LIMIT)
    throw new CrmError('invalidInput', 400, 'text');
  // An adjustment: the user's instruction and the leads as they stand.
  const instruction = toText(input.instruction ?? '').trim();
  if (instruction.length > TEXT_LIMIT * 4)
    throw new CrmError('invalidInput', 400, 'instruction');
  const current = currentLeads(input.leads);
  if (instruction && !current.length)
    throw new CrmError('required', 400, 'leads');
  const adjusting = Boolean(instruction);
  // The CRM's AI language, which the reply is written in.
  const settings = await service.settings();
  const language = settings.aiLanguage;
  // Whom the AI may make the owner: the active salespeople, for a user who
  // may assign leads at all.
  const owners = (await capability(actor, 'assign'))
    ? (await service.users(actor))
        .filter(
          (u) =>
            !u.disabled &&
            (u.roles as string[]).some((r) =>
              ['sales-representative', 'sales-manager'].includes(r),
            ),
        )
        .map((u) => ({ id: toText(u.id), name: toText(u.name) }))
    : [];
  const options = {
    industry: settings.options.industry ?? industries,
    employees: settings.options.employees ?? employeeRanges,
    source: settings.options.source ?? sources,
  };
  const labels = captureLabels(input.labels);
  const fields = captureFields(
    'leads',
    owners.length ? [...FORM_FIELDS, 'ownerId'] : FORM_FIELDS,
    settings,
    labels,
    HINTS,
    // Every lead has an owner, but who it is need not be in the text.
    { ownerId: { required: false } },
  );
  // The form as it stands, the owner by the name the review shows.
  const ownerName = (id: unknown): string | null =>
    owners.find((o) => o.id === toText(id ?? ''))?.name ?? null;
  const form = current.map(({ ref, ownerId, ...values }) => ({
    ref,
    values: owners.length ? { ...values, ownerId: ownerName(ownerId) } : values,
  }));
  if (!(await service.assistantEnabled()))
    throw new CrmError('assistantUnavailable', 409);
  const session = await openSession(container, {
    timeZone,
    guidance: settingsGuidance(settings),
    work: 'leads',
    method: await readSkill(container, 'form-capture'),
  });
  if (!session) throw new CrmError('assistantUnavailable', 409);
  const logger = container.resolve(loggingToken).getLogger('crm-lead-capture');
  let answer: z.infer<typeof answerShape> | null;
  try {
    answer = await session.askJson(
      captureRequest({
        task: adjusting ? ADJUST_TASK : TASK,
        language,
        context: {
          fields,
          ...(owners.length
            ? { records: { users: owners.map((o) => o.name) } }
            : {}),
          ...(adjusting ? { form } : {}),
          today: todayIn(timeZone),
        },
        material: pasted,
        ...(adjusting ? { instruction } : {}),
      }),
      answerShape,
      AbortSignal.timeout(120_000),
    );
  } catch (error) {
    throw modelFailure(error, 'captureFailed');
  }
  if (!answer) {
    logger.warn('lead capture returned no usable leads');
    throw new CrmError('captureFailed', 502);
  }

  const byRef = new Map(current.map((lead) => [toText(lead.ref), lead]));
  const leads: CapturedLead[] = [];
  for (const captured of answer.leads.slice(0, MAX_LEADS)) {
    const ref =
      captured.ref && byRef.has(captured.ref) ? captured.ref : undefined;
    const lead = cleanForm(captured, owners, options, adjusting, ref, byRef);
    if (!Object.values(lead).some((v) => v !== null)) continue;
    leads.push({
      ...(ref ? { ref } : {}),
      input: lead,
      uncertain: [...new Set(captured.uncertain)].filter(
        (key) =>
          (FIELDS.includes(key) || key === 'ownerId') &&
          lead[key] !== undefined &&
          lead[key] !== null,
      ),
      duplicates: await duplicatesOf(service, actor, lead),
    });
  }
  const reply = toText(answer.said ?? '').trim();
  return { leads, ...(reply ? { reply: reply.slice(0, TEXT_LIMIT * 4) } : {}) };
}

// One answered form as the lead form's input: a revision on the lead the
// person left under its ref, a lead an adjustment adds on an empty one.
function cleanForm(
  captured: CapturedForm,
  owners: readonly { id: string; name: string }[],
  options: Readonly<Record<(typeof SELECT_FIELDS)[number], readonly string[]>>,
  adjusting: boolean,
  ref: string | undefined,
  byRef: ReadonlyMap<string, Row>,
): Row {
  if (!adjusting) return clean(captured.values, owners, options);
  const current: Row = { ...((ref ? byRef.get(ref) : undefined) ?? {}) };
  delete current.ref;
  return clean(captured.values, owners, options, current);
}
