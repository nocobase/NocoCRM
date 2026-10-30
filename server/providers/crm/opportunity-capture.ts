import { loggingToken } from '@nocobase/app-server/logging';
import type { Row } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { z } from 'zod';
import { modelFailure, openSession, readSkill } from './ai-model.js';
import {
  captureFields,
  captureLabels,
  captureRequest,
  optionsOf,
  todayIn,
} from './form-capture.js';
import { settingsGuidance } from './guidance.js';
import { conditions, type Actor } from './authorization.js';
import { findDuplicates, matchReasons } from './lead-merge.js';
import { LONG_TEXT_LIMIT, TEXT_LIMIT } from './limits.js';
import { normalizePhone } from './phone.js';
import { CrmError, object, toText } from './schema.js';
import type { CrmService } from './service.js';

// "New opportunity" with the AI, as "new lead" is (lead-capture.ts): a
// salesperson pastes what they have (a customer's email about buying more,
// a renewal, a tender notice) and the CRM assistant turns it into one
// opportunity, filling only what the text states. A deal belongs to an
// company, so the company the text names is matched against the companies
// here, not by the model; the people it names are matched against that
// company's contacts, the rest offered to create; and the company's open
// deals are shown, so the same business is not opened twice. Nothing is
// saved: the result prefills the opportunity form, which the salesperson
// checks and submits. They may then tell the AI what to change.

const OPEN_STAGES = [
  'contact',
  'qualification',
  'validation',
  'proposal',
  'negotiation',
  'contract',
] as const;
export const ROLES = [
  'decisionMaker',
  'champion',
  'evaluator',
  'influencer',
  'user',
  'blocker',
  'other',
] as const;

const text = z.string().nullable();
const person = z.object({
  name: z.string().describe("The person's name, as written"),
  jobTitle: text.default(null).describe('Job title'),
  phone: text.default(null).describe('Phone number, as written'),
  email: text.default(null).describe('Email address, as written'),
  role: z
    .enum(ROLES)
    .nullable()
    .catch(null)
    .describe('Their part in the decision, when the material shows it'),
});
// The answer: the opportunity form's values, the customer's people beside
// them, and what to tell the person. The values are checked field by field
// below, so one value the model got wrong costs that value alone.
const dealShape = z.object({
  deal: z.object({
    values: z.record(z.string(), z.unknown()).default({}),
    people: z.array(person).default([]),
    uncertain: z.array(z.string()).default([]),
  }),
  said: z.string().nullable().default(null),
});

// The form's fields as the request gives them, in the form's order. The
// company is the customer by its name, matched against the CRM's
// companies afterwards.
const FORM_FIELDS = [
  'name',
  'company',
  'stage',
  'amount',
  'currency',
  'expectedCloseAt',
  'source',
  'businessType',
  'description',
] as const;

// The opportunity form's own rules, each field's `hint`.
const HINTS: Readonly<Record<string, string>> = {
  name: 'What is being built or bought, with the edition when the material gives it, in its language, e.g. "Field service ticketing system (Professional)".',
  company:
    "The customer company, as the material writes it; it is matched against the CRM's companies afterwards, so never make one up.",
  businessType:
    'newBusiness for a first purchase; expansion when an existing customer buys more of the same; crossSell when they buy something else; renewal for a renewal; tender for a bid or tender; other otherwise; left out when the material does not show it.',
  amount:
    "Only a figure the material gives for this business (a budget or a quoted price), in the currency's units (50 万 → 500000).",
  currency:
    'Only when the material names it (yuan, RMB or ¥ → CNY; US dollars or $ → USD).',
  expectedCloseAt:
    'Only when the material gives a date or a time for the decision ("decided by the end of the month" → the last day of this month); a date worked out is uncertain.',
  stage:
    'Follows the evidence in the material and leans to the earlier stage when in doubt: contact when there is only interest; qualification when the scenario, scale and deployment or edition are clear; validation when a demo, trial or proof of concept already took place (one only planned or asked for, "they want to see a demo next week", is not: the stage before it stands); proposal when a formal quote was sent; negotiation when price, payment or contract terms are being discussed; contract when the contract is being signed.',
  source:
    'As for a lead: met at an exhibition → exhibition; a website enquiry → website; introduced by a customer → customerReferral, by a colleague → employeeReferral, by a partner → partner; we contacted them first → outbound; a customer writing or calling in themselves is not outbound. Left out when it cannot be told: other is only for a source the material names that no option fits.',
  description:
    'What the material says about this business — needs, scale, timing, budget, terms, competitors, concerns — close to its own words; never a one-line summary, and no judgement of yours.',
};

const PEOPLE = `Beside \`values\`, \`people\` are the customer's people the material names, each with what it gives (name, jobTitle, phone, email) and their role when it shows it: decisionMaker who decides, champion who pushes it inside, evaluator who assesses it technically, influencer, user, blocker, other. People of our own company are not listed.`;

const TASK = `Organise the material into one sales opportunity for the new opportunity form, by the form-capture method, in \`deal\` as { values, people, uncertain }: the business the material is about. When it covers several, take the main one and say so in \`said\`. ${PEOPLE} Call no tools.`;

const ADJUST_TASK = `The opportunity in \`form\` was organised from the material, by the form-capture method, and the person has checked it. Return it, changed as the person asks, in \`deal\` as { values, people, uncertain }. ${PEOPLE} \`form\` has everyone on the opportunity, whether the material named them or the person added them: return each one, changed only as asked, and drop one only when the request removes them. Call no tools.`;

// A person the text names: a contact of the chosen company when they match
// one (by email, phone or name), else someone to create.
export interface CapturedPerson {
  name: string;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  contactId: string | null;
  // The matched contact's name, when it differs from the text's.
  contactName?: string;
}

export interface CapturedDeal {
  // The opportunity form's values, the company and the matched contacts
  // included.
  input: Row;
  // The company as the text writes it.
  company: string | null;
  // The CRM's companies it may be.
  companies: { id: string; name: string }[];
  people: CapturedPerson[];
  // The chosen company's open deals.
  duplicates: { id: string; name: string; stage: string }[];
  uncertain: string[];
}

// The opportunity's contacts as the review's form holds them: a contact of
// the company by its id, a person new to the CRM by what the text gives,
// created as the company's contact when the opportunity is.
export function contactRows(people: readonly CapturedPerson[]): Row[] {
  return people.map((p) =>
    p.contactId
      ? { contactId: p.contactId, role: p.role }
      : {
          contactId: '',
          role: p.role,
          person: {
            name: p.name,
            jobTitle: p.jobTitle,
            phone: p.phone,
            email: p.email,
          },
        },
  );
}

// The people the review sends back (the rows of its contacts field, or the
// people of a capture): a new person as written, a contact by its id.
export function peopleOf(raw: unknown): (Omit<
  CapturedPerson,
  'contactId' | 'contactName'
> & {
  contactId: string | null;
})[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((item) => {
    const row = object(item);
    const p = object(row.person ?? row);
    const line = (value: unknown): string | null =>
      toText(value ?? '')
        .trim()
        .slice(0, TEXT_LIMIT) || null;
    const phone = line(p.phone);
    const person = {
      name: line(p.name) ?? '',
      jobTitle: line(p.jobTitle),
      phone: phone ? normalizePhone(phone) || null : null,
      email: line(p.email),
      role: toText(row.role ?? p.role ?? '') || 'other',
      contactId: toText(row.contactId ?? '') || null,
    };
    // A row with neither a contact nor a name is an empty pick.
    return person.name || person.contactId ? [person] : [];
  });
}

const bare = (value: unknown): string =>
  toText(value ?? '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');

// The people matched against a company's contacts, and its open deals: on
// the capture, and again whenever the user picks another company.
export async function matchCompany(
  service: CrmService,
  actor: Actor,
  companyId: string,
  people: readonly (Omit<CapturedPerson, 'contactId' | 'contactName'> & {
    contactId?: string | null;
  })[],
): Promise<{
  people: CapturedPerson[];
  contacts: Row[];
  duplicates: CapturedDeal['duplicates'];
}> {
  const contacts = companyId
    ? await service
        .list(actor, 'contacts', { companyId, pageSize: 500 })
        .then((r) => r.data)
        .catch(() => [])
    : [];
  const matched = people.flatMap((p): CapturedPerson[] => {
    // A contact already chosen stays when it is the company's.
    const chosen = p.contactId
      ? contacts.find((c) => toText(c.id) === p.contactId)
      : undefined;
    if (p.contactId && !chosen && !p.name) return [];
    const contact =
      chosen ??
      contacts.find(
        (c) =>
          matchReasons(
            { email: p.email, phone: p.phone },
            { email: c.email, phone: c.phone },
          ).length > 0 ||
          (bare(p.name) && bare(p.name) === bare(c.name)),
      );
    const name = p.name || toText(contact?.name ?? '');
    return [
      {
        name,
        jobTitle: p.jobTitle,
        phone: p.phone,
        email: p.email,
        role: p.role,
        contactId: contact ? toText(contact.id) : null,
        ...(contact && toText(contact.name) !== name
          ? { contactName: toText(contact.name) }
          : {}),
      },
    ];
  });
  const duplicates = companyId
    ? await service
        .list(actor, 'opportunities', { companyId, pageSize: 50 })
        .then((r) =>
          r.data
            .filter((d) => !['won', 'lost'].includes(toText(d.stage)))
            .map((d) => ({
              id: toText(d.id),
              name: toText(d.name),
              stage: toText(d.stage),
            })),
        )
        .catch(() => [])
    : [];
  return { people: matched, contacts: contactRows(matched), duplicates };
}

function amountOf(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n =
    typeof value === 'number'
      ? value
      : Number(toText(value).replace(/[,\s，]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function captureOpportunity(
  service: CrmService,
  container: ServiceResolver,
  actor: Actor,
  body: unknown,
  timeZone: string,
): Promise<{ deal: CapturedDeal; reply?: string }> {
  await conditions(actor, 'opportunities', 'create');
  const input = object(body);
  const pasted = toText(input.text ?? '').trim();
  if (!pasted) throw new CrmError('required', 400, 'text');
  if (pasted.length > LONG_TEXT_LIMIT)
    throw new CrmError('invalidInput', 400, 'text');
  const instruction = toText(input.instruction ?? '').trim();
  if (instruction.length > TEXT_LIMIT * 4)
    throw new CrmError('invalidInput', 400, 'instruction');
  const { contacts: rows, ...current } = object(input.deal ?? {});
  const adjusting = Boolean(instruction);
  if (adjusting && !Object.keys(current).length)
    throw new CrmError('required', 400, 'deal');
  // The people on the opportunity as the review has them, a contact named
  // by the company's record, for the model to keep or change by name.
  const onDeal = peopleOf(rows);
  const companyOf = toText(input.companyId ?? current.companyId ?? '');
  const known = onDeal.some((p) => p.contactId && !p.name)
    ? (await matchCompany(service, actor, companyOf, onDeal)).people
    : onDeal;
  const settings = await service.settings();
  const language = settings.aiLanguage;
  const fields = captureFields(
    'opportunities',
    FORM_FIELDS,
    settings,
    captureLabels(input.labels),
    HINTS,
    {
      company: { type: 'reference', reference: 'companies', required: true },
      amount: { type: 'money' },
      // A new opportunity is never won, lost or paused.
      stage: { options: OPEN_STAGES },
    },
  );
  if (!(await service.assistantEnabled()))
    throw new CrmError('assistantUnavailable', 409);
  // The form as it stands, its company by name.
  const companyName = companyOf
    ? await service
        .get(actor, 'companies', companyOf)
        .then((c) => toText(c.name))
        .catch(() => null)
    : null;
  const formValues: Row = Object.fromEntries(
    FORM_FIELDS.map((key) => [
      key,
      key === 'company' ? companyName : (current[key] ?? null),
    ]),
  );
  const session = await openSession(container, {
    timeZone,
    guidance: settingsGuidance(settings),
    work: 'opportunities',
    method: await readSkill(container, 'form-capture'),
  });
  if (!session) throw new CrmError('assistantUnavailable', 409);
  const logger = container
    .resolve(loggingToken)
    .getLogger('crm-opportunity-capture');
  let answer: z.infer<typeof dealShape> | null;
  try {
    answer = await session.askJson(
      captureRequest({
        task: adjusting ? ADJUST_TASK : TASK,
        language,
        context: {
          fields,
          ...(adjusting
            ? {
                form: {
                  values: formValues,
                  people: known.map(
                    ({ name, jobTitle, phone, email, role }) => ({
                      name,
                      jobTitle,
                      phone,
                      email,
                      role,
                    }),
                  ),
                },
              }
            : {}),
          today: todayIn(timeZone),
        },
        material: pasted,
        ...(adjusting ? { instruction } : {}),
      }),
      dealShape,
      AbortSignal.timeout(120_000),
    );
  } catch (error) {
    throw modelFailure(error, 'captureFailed');
  }
  if (!answer) {
    logger.warn('opportunity capture returned no usable opportunity');
    throw new CrmError('captureFailed', 502);
  }
  const d = answer.deal;
  // An adjustment's fields the reply does not return keep the form's.
  const found: Record<string, unknown> = adjusting
    ? { ...formValues, ...d.values }
    : d.values;
  const line = (value: unknown, limit = TEXT_LIMIT) =>
    toText(value ?? '')
      .trim()
      .slice(0, limit) || null;
  const among = (key: string): string | null => {
    const value = line(found[key]);
    return value && optionsOf(fields, key).includes(value) ? value : null;
  };
  const company = line(found.company);
  // The company: the one the user picked, else the only one the name
  // matches.
  const companies = company
    ? (await findDuplicates(service, actor, { company }))
        .filter((match) => match.entity === 'companies')
        .map((match) => ({ id: match.id, name: match.name }))
    : [];
  const companyId =
    companyOf || (companies.length === 1 ? companies[0].id : '');
  const people = d.people
    .map((p) => ({
      name: toText(p.name).trim().slice(0, TEXT_LIMIT),
      jobTitle: line(p.jobTitle),
      phone: p.phone ? normalizePhone(toText(p.phone)) || null : null,
      email: line(p.email),
      role: p.role ?? 'other',
    }))
    .filter((p) => p.name)
    .slice(0, 20);
  const match = await matchCompany(service, actor, companyId, people);
  const date = line(found.expectedCloseAt);
  const expectedCloseAt =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const values: Row = {
    name: line(found.name),
    ...(companyId ? { companyId } : {}),
    businessType: among('businessType'),
    amount: amountOf(found.amount),
    currency: among('currency'),
    expectedCloseAt,
    stage: among('stage'),
    source: among('source'),
    description: line(found.description, LONG_TEXT_LIMIT),
    contacts: match.contacts,
  };
  // A first organise carries only what the text gave; an adjustment every
  // field, null where cleared.
  const filled = Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        adjusting ||
        key === 'contacts' ||
        (value !== null && value !== undefined && value !== ''),
    ),
  );
  const reply = toText(answer.said ?? '').trim();
  return {
    deal: {
      input: filled,
      company,
      companies,
      people: match.people,
      duplicates: match.duplicates,
      // The company's doubt is its match's, under the form's field.
      uncertain: [...new Set(d.uncertain)]
        .map((key) => (key === 'company' ? 'companyId' : key))
        .filter((key) => key in filled),
    },
    ...(reply ? { reply: reply.slice(0, TEXT_LIMIT * 4) } : {}),
  };
}
