import { randomUUID } from 'node:crypto';
import type { Row } from '@nocobase/db';
import {
  createServiceToken,
  type ServiceResolver,
  type ServiceToken,
} from '@nocobase/service-provider';
import { openSession, readSkill, recordUse, sourceOf } from './ai-model.js';
import { agentOn, agentSwitches, AGENT_TRIGGERS } from './agents.js';
import { compileFilter, conditions, type Actor } from './authorization.js';
import {
  PROFILE_URL_FIELDS,
  profileJsonQuestion,
  profileQuestion,
  readProfile,
  type CompanyProfile,
  PROFILE_FIELDS,
  PROFILE_HINTS,
  profileOf,
  profileReadingShape,
  profileTask,
} from './company-profile.js';
import {
  captureFields,
  captureLabels,
  captureRequest,
  todayIn,
} from './form-capture.js';
import { sameCompany } from './lead-merge.js';
import { CrmError, toText } from './schema.js';
import type { CrmService } from './service.js';
import {
  readSignals,
  signalJsonQuestion,
  signalQuestion,
  type FoundSignal,
} from './signal-reading.js';
import { jsonValue } from './values.js';
import {
  citesUrls,
  searchWeb,
  WebSearchError,
  type WebAnswer,
  type WebSearcher,
} from './web-research.js';

// Company signals: what happened to a customer's company that a salesperson
// would act on (a funding round, hiring, a new executive, a launch, a risk),
// found on the web and put before the company's owner with the pages that
// say so. The company's collaborator in the guideline's terms (1.1): it
// watches the company and hands what it finds to its owner; a signal changes
// no field of the company and starts nothing on its own.
//
// Which companies: those with an open deal, and those someone switched
// `signalsWatched` on; each looked at again a week after the last check,
// the longest unchecked first, at most `limit` a pass. The daily pass is a
// scheduler task (CrmProvider), so administrators see each pass and may
// switch it off; someone who may edit a company may also check it at once.
// A signal is found once: its event key stays when it is dismissed, and the
// events already known are named to the search, which should not repeat
// them. Each found signal is a line on the company's timeline (action
// `signal`) and a notice to the company's owner and its open deals' owners.

const DAY = 86_400_000;
export const CHECK_EVERY_DAYS = 7;
// The method skill (ai/skills/company-signals).
export const SIGNALS_SKILL = 'company-signals';
// The kinds worth a deal's follow-up; hiring is only told.
export const ACTING_TYPES: readonly string[] = [
  'funding',
  'leadership',
  'business',
  'risk',
];
const KNOWN_NAMED = 20;
// `seen` is history: people once marked a signal seen, which only said it
// was read; now a signal stays as found until someone dismisses it, and is
// new by when it was found (the client's seven days).
const STATUSES = ['new', 'seen', 'dismissed'] as const;
export type SignalStatus = (typeof STATUSES)[number];

export interface SignalView {
  id: string;
  companyId: string;
  type: string;
  title: string;
  summary: string;
  occurredOn: string;
  sources: { title: string; url: string; site: string }[];
  status: SignalStatus;
  createdAt: string;
  decidedById: string | null;
  decidedAt: string | null;
}

export interface CompanySignalsView {
  // Whether anything can search: a configured Qwen service with a key.
  available: boolean;
  watched: boolean;
  // Watched by the daily check, by an open deal or by the switch.
  inDailyCheck: boolean;
  checkedAt: string | null;
  canEdit: boolean;
  // All of them, those not dismissed, and those new (found in the last
  // week, not dismissed), whatever the page.
  total: number;
  open: number;
  fresh: number;
  page: number;
  pageSize: number;
  // A page of them: those not dismissed first, the newest events first.
  signals: SignalView[];
}

// How long a signal reads as new after it was found (the client's isNew).
export const NEW_FOR_DAYS = 7;
const DEFAULT_SIGNAL_PAGE = 20;

export interface SignalPass {
  available: boolean;
  checked: number;
  found: number;
  failed: number;
  // Stopped at its time budget, the companies left for the next pass.
  stopped: boolean;
}

// How long the daily pass may run: it starts at 08:00 so its news is in by
// the deals' daily pass at 09:00; a slow search should not hold it past.
export const SCAN_BUDGET_MS = 50 * 60_000;

export interface CheckResult {
  found: SignalView[];
}

function view(row: Row): SignalView {
  const sources = jsonValue(row.sources);
  return {
    id: toText(row.id),
    companyId: toText(row.companyId),
    type: toText(row.type),
    title: toText(row.title),
    summary: toText(row.summary ?? ''),
    occurredOn: toText(row.occurredOn),
    sources: Array.isArray(sources) ? (sources as SignalView['sources']) : [],
    status: STATUSES.includes(row.status as SignalStatus)
      ? (row.status as SignalStatus)
      : 'new',
    createdAt: toText(row.createdAt),
    decidedById: row.decidedById ? toText(row.decidedById) : null,
    decidedAt: row.decidedAt ? toText(row.decidedAt) : null,
  };
}

// The day an instant falls on in the CRM's time zone (YYYY-MM-DD).
function dayIn(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export const companySignalsToken: ServiceToken<CompanySignals> =
  createServiceToken<CompanySignals>('crm.companySignals');

export class CompanySignals {
  constructor(
    private readonly service: CrmService,
    // The search the checks ask, read when asked so a configuration change
    // applies at the next restart without wiring; null when there is none.
    private readonly searcher: () =>
      WebSearcher | null | Promise<WebSearcher | null>,
    private readonly options: {
      container?: ServiceResolver;
      fetch?: typeof fetch;
    } = {},
  ) {}

  async available(): Promise<boolean> {
    return (await this.searcher()) !== null;
  }

  // A company's signals, newest first, for whoever may read the company.
  // A page of the company's signals, those not dismissed first and the
  // newest events first, with how many there are. `until` widens the page
  // to reach that signal (a timeline line opening the list at it).
  async of(
    actor: Actor,
    companyId: string,
    options: { page?: number; pageSize?: number; until?: string } = {},
  ): Promise<CompanySignalsView> {
    // Read for its access check: only who may read the company.
    await this.service.get(actor, 'companies', companyId);
    const query = this.service.database.query();
    const page = Math.max(1, options.page ?? 1);
    let pageSize = Math.min(
      100,
      Math.max(1, options.pageSize ?? DEFAULT_SIGNAL_PAGE),
    );
    const [all, stored, openDeal, canEdit] = await Promise.all([
      // Their order and counts from the light columns alone; the page's
      // rows are read whole below.
      query
        .selectFrom('crmSignals')
        .select(['id', 'status', 'occurredOn', 'createdAt'])
        .where('companyId', '=', companyId)
        .execute(),
      query
        .selectFrom('crmCompanies')
        .select(['signalsWatched', 'signalsCheckedAt'])
        .where('id', '=', companyId)
        .executeTakeFirst(),
      query
        .selectFrom('crmOpportunities')
        .select('id')
        .where('companyId', '=', companyId)
        .where('stage', 'not in', ['won', 'lost'])
        .executeTakeFirst(),
      this.service
        .get(actor, 'companies', companyId, query, 'update')
        .then(() => true)
        .catch(() => false),
    ]);
    const watched = Boolean(stored?.signalsWatched);
    const dismissed = (row: { status?: unknown }) =>
      toText(row.status) === 'dismissed';
    const ordered = [...all].sort(
      (a, b) =>
        Number(dismissed(a)) - Number(dismissed(b)) ||
        toText(b.occurredOn).localeCompare(toText(a.occurredOn)) ||
        toText(b.createdAt).localeCompare(toText(a.createdAt)) ||
        toText(b.id).localeCompare(toText(a.id)),
    );
    // Wide enough, from the first page, to reach the signal asked for.
    if (options.until && page === 1) {
      const at = ordered.findIndex((row) => toText(row.id) === options.until);
      if (at >= pageSize) pageSize = Math.min(ordered.length, at + 1);
    }
    const ids = ordered
      .slice((page - 1) * pageSize, page * pageSize)
      .map((row) => toText(row.id));
    const rows = ids.length
      ? await query
          .selectFrom('crmSignals')
          .selectAll()
          .where('id', 'in', ids)
          .execute()
      : [];
    const byId = new Map(rows.map((row) => [toText(row.id), row]));
    const since = Date.now() - NEW_FOR_DAYS * DAY;
    const open = ordered.filter((row) => !dismissed(row));
    return {
      available: await this.available(),
      watched,
      inDailyCheck: watched || Boolean(openDeal),
      checkedAt: stored?.signalsCheckedAt
        ? toText(stored.signalsCheckedAt)
        : null,
      canEdit,
      total: ordered.length,
      open: open.length,
      fresh: open.filter((row) => Date.parse(toText(row.createdAt)) >= since)
        .length,
      page,
      pageSize,
      signals: ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [view(row)] : [];
      }),
    };
  }

  // Someone who may edit the company switches its watching on or off.
  async watch(
    actor: Actor,
    companyId: string,
    watched: boolean,
  ): Promise<CompanySignalsView> {
    await this.service.get(actor, 'companies', companyId, undefined, 'update');
    await this.service.database
      .query()
      .updateTable('crmCompanies')
      .set({ signalsWatched: watched })
      .where('id', '=', companyId)
      .execute();
    return this.of(actor, companyId);
  }

  // Someone who may edit the company dismisses a signal, a dismissed event
  // not proposed again, or undoes that.
  async decide(
    actor: Actor,
    signalId: string,
    status: SignalStatus,
  ): Promise<SignalView> {
    // Dismissing is the one decision (the event is wrong, not this
    // company's or of no concern, and is not proposed again); `new` undoes
    // it, the signal standing as found.
    if (status !== 'dismissed' && status !== 'new')
      throw new CrmError('invalidInput', 400, 'status');
    const query = this.service.database.query();
    const row = await query
      .selectFrom('crmSignals')
      .selectAll()
      .where('id', '=', signalId)
      .executeTakeFirst();
    if (!row) throw new CrmError('notFound', 404);
    await this.service.get(
      actor,
      'companies',
      toText(row.companyId),
      query,
      'update',
    );
    const now = new Date().toISOString();
    // Undone, nobody decided it.
    const decided =
      status === 'dismissed'
        ? { decidedById: actor.id, decidedAt: now }
        : { decidedById: null, decidedAt: null };
    await query
      .updateTable('crmSignals')
      .set({ status, ...decided, updatedAt: now })
      .where('id', '=', signalId)
      .execute();
    return view({ ...row, status, ...decided, updatedAt: now });
  }

  // New company with the AI (company-profile.ts): what the web says of the
  // company named, read into the form, with the pages it read and the
  // companies the reader may see by that name. For whoever may create a
  // company; nothing is saved.
  // A look-up asked by an agent: refused at once when the person may not
  // create companies, gives no name, or no model searches the web;
  // otherwise started, `done` settling with what it finds.
  async startProfile(
    actor: Actor,
    input: { name: string; note?: string },
  ): Promise<{ done: ReturnType<CompanySignals['profile']> }> {
    await conditions(actor, 'companies', 'create');
    if (!input.name.trim()) throw new CrmError('required', 400, 'name');
    if (!(await this.searcher())) throw new CrmError('signalsUnavailable', 409);
    return { done: this.profile(actor, input) };
  }

  async profile(
    actor: Actor,
    input: { name: string; note?: string; labels?: unknown },
  ): Promise<CompanyProfile & { duplicates: { id: string; name: string }[] }> {
    await conditions(actor, 'companies', 'create');
    const name = input.name.trim();
    if (!name) throw new CrmError('required', 400, 'name');
    const searcher = await this.searcher();
    if (!searcher) throw new CrmError('signalsUnavailable', 409);
    const settings = await this.service.settings();
    // In the language the name was typed in, as a capture writes in its
    // text's: a name in Chinese characters is looked up in Chinese, any
    // other in the AI's language.
    const chinese =
      /\p{Script=Han}/u.test(name) || settings.aiLanguage.startsWith('zh');
    try {
      const answer = await this.ask(
        searcher,
        profileQuestion(
          { name, note: (input.note ?? '').trim() },
          chinese,
          citesUrls(searcher) ? 'urls' : 'refs',
        ),
        true,
        '',
        PROFILE_URL_FIELDS,
      );
      // The form filled from what the search found, by the form-capture
      // skill as a new lead's or opportunity's; without a model to read
      // it, the search's own answer as the form's.
      let profile =
        (await this.readProfileFound(answer, {
          name,
          note: (input.note ?? '').trim(),
          chinese,
          labels: captureLabels(input.labels),
          settings,
        })) ?? readProfile(answer);
      // An answer in prose: reshaped without searching, its [ref_n] marks
      // still naming the first answer's pages.
      if (!profile) {
        const reshaped = await this.ask(
          searcher,
          profileJsonQuestion(answer.text, chinese),
          false,
        );
        profile = readProfile({ ...reshaped, pages: answer.pages });
      }
      if (!profile) throw new CrmError('signalsFailed', 503);
      // By the name asked and the one found, among the companies the
      // reader may see.
      const access = await conditions(actor, 'companies', 'read').catch(
        () => null,
      );
      const duplicates = access
        ? (
            await this.service.database
              .query()
              .selectFrom('crmCompanies')
              .select(['id', 'name'])
              .where((eb) => compileFilter(eb, access.scope))
              .execute()
          )
            .filter(
              (row) =>
                sameCompany(name, row.name) ||
                sameCompany(profile?.input.name, row.name),
            )
            .slice(0, 5)
            .map((row) => ({ id: toText(row.id), name: toText(row.name) }))
        : [];
      return { ...profile, duplicates };
    } catch (error) {
      throw error instanceof WebSearchError
        ? new CrmError('signalsFailed', 503, undefined, error.message)
        : error;
    }
  }

  // The search's findings read into the company form by the form-capture
  // skill, with the work agent's model (recorded as its use); null when
  // there is none to ask or its reply cannot be read, the search's own
  // answer then standing.
  private async readProfileFound(
    answer: WebAnswer,
    input: {
      name: string;
      note: string;
      chinese: boolean;
      labels: Record<string, string>;
      settings: Awaited<ReturnType<CrmService['settings']>>;
    },
  ): Promise<CompanyProfile | null> {
    const container = this.options.container;
    if (!container) return null;
    const session = await openSession(container, {
      timeZone: input.settings.timeZone,
      guidance: '',
      work: 'signals',
      method: await readSkill(container, 'form-capture'),
    }).catch(() => null);
    if (!session) return null;
    const fields = captureFields(
      'companies',
      PROFILE_FIELDS,
      input.settings,
      input.labels,
      PROFILE_HINTS,
      // Required on the form, not of what the web may tell.
      { name: { required: true } },
    );
    const read = await session
      .askJson(
        captureRequest({
          task: profileTask(input.chinese),
          language: input.chinese ? 'zh-CN' : 'en-US',
          context: {
            fields,
            web: {
              found: answer.text,
              pages: answer.pages.map(({ index, title, url, site }) => ({
                ref: index,
                title,
                site,
                url,
              })),
            },
            today: todayIn(input.settings.timeZone),
          },
          material: [input.name, input.note].filter(Boolean).join('\n'),
        }),
        profileReadingShape,
        AbortSignal.timeout(120_000),
      )
      .catch(() => null);
    if (!read) return null;
    return profileOf(
      { ...read.values, uncertain: read.uncertain, sources: read.sources },
      answer.pages,
    );
  }

  // A lead follow-up's look-up of its company (lead-research.ts), asked
  // with this agent's search and recorded as its use; null when no model
  // searches. The question is written for how the searcher cites. A failed
  // search throws its WebSearchError.
  async lookUp(
    question: (cite: 'refs' | 'urls') => string,
  ): Promise<WebAnswer | null> {
    const searcher = await this.searcher();
    if (!searcher) return null;
    return this.ask(searcher, question(citesUrls(searcher) ? 'urls' : 'refs'));
  }

  // Someone who may edit the company has it checked now, whether or not
  // the daily check watches it.
  async checkNow(actor: Actor, companyId: string): Promise<CheckResult> {
    return (await this.startCheck(actor, companyId)).done;
  }

  // A check asked for now: refused at once when the person may not edit
  // the company or no model searches the web; otherwise started, `done`
  // settling with what it finds (an agent's request waits on it in the
  // background, the Signals tab's button at once).
  async startCheck(
    actor: Actor,
    companyId: string,
  ): Promise<{ done: Promise<CheckResult> }> {
    await this.service.get(actor, 'companies', companyId, undefined, 'update');
    const searcher = await this.searcher();
    if (!searcher) throw new CrmError('signalsUnavailable', 409);
    const company = await this.company(companyId);
    if (!company) throw new CrmError('notFound', 404);
    return {
      done: this.check(searcher, company, new Date(), {
        trigger: 'asked',
        actorId: actor.id,
      }).catch((error: unknown) => {
        throw error instanceof WebSearchError
          ? new CrmError('signalsFailed', 503, undefined, error.message)
          : error;
      }),
    };
  }

  // The daily pass over the watched companies.
  // At most 100 companies a day: with each checked once a week, 700 in the
  // daily check before their weeks stretch; each check is a web search. It
  // starts no company once `budgetMs` has passed: those left keep their
  // last check's time, so the next pass takes them first.
  async scan(
    now = new Date(),
    limit = 100,
    budgetMs = SCAN_BUDGET_MS,
    clock: () => number = Date.now,
  ): Promise<SignalPass> {
    const searcher = await this.searcher();
    const pass: SignalPass = {
      available: Boolean(searcher),
      checked: 0,
      found: 0,
      failed: 0,
      stopped: false,
    };
    const started = clock();
    if (!searcher) return pass;
    // Switched off on the Auto follow-up page (agents.ts).
    if (!(await agentOn(this.service, 'signals', 'daily'))) return pass;
    for (const company of await this.due(now, limit)) {
      if (clock() - started >= budgetMs) {
        pass.stopped = true;
        break;
      }
      pass.checked += 1;
      try {
        pass.found += (
          await this.check(searcher, company, now, {
            trigger: 'daily',
            actorId: null,
          })
        ).found.length;
      } catch {
        // Left unchecked, so the next pass looks at it first; the pass's
        // counts say how many failed.
        pass.failed += 1;
      }
    }
    return pass;
  }

  // The companies the daily check looks at now, longest unchecked first.
  async due(now: Date, limit: number): Promise<Row[]> {
    const query = this.service.database.query();
    const withDeals = new Set(
      (
        await query
          .selectFrom('crmOpportunities')
          .select('companyId')
          .where('stage', 'not in', ['won', 'lost'])
          .where('companyId', 'is not', null)
          .execute()
      ).map((row) => toText(row.companyId)),
    );
    const companies = await query
      .selectFrom('crmCompanies')
      .selectAll()
      .execute();
    const since = now.getTime() - CHECK_EVERY_DAYS * DAY;
    const at = (row: Row) =>
      row.signalsCheckedAt ? Date.parse(toText(row.signalsCheckedAt)) : 0;
    return companies
      .filter(
        (row) =>
          (row.signalsWatched || withDeals.has(toText(row.id))) &&
          at(row) < since,
      )
      .sort((a, b) => at(a) - at(b))
      .slice(0, limit);
  }

  private async company(id: string): Promise<Row | undefined> {
    return this.service.database
      .query()
      .selectFrom('crmCompanies')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  // One company searched, logged as a check whatever came of it.
  private async check(
    searcher: WebSearcher,
    company: Row,
    now: Date,
    by: { trigger: 'daily' | 'asked'; actorId: string | null },
  ): Promise<CheckResult> {
    const checkId = randomUUID();
    // `followUps` stays 0: a check starts no follow-up since the deals'
    // daily pass takes the news (deal-signals.ts); the column keeps what
    // checks before started.
    const log = (row: {
      status: 'found' | 'nothing' | 'failed';
      found: number;
      error?: string;
    }) =>
      this.service.database
        .query()
        .insertInto('crmSignalChecks')
        .values({
          id: checkId,
          companyId: toText(company.id),
          trigger: by.trigger,
          actorId: by.actorId,
          status: row.status,
          found: row.found,
          followUps: 0,
          error: row.error ? row.error.slice(0, 500) : null,
          createdAt: now.toISOString(),
        })
        .execute();
    let result: CheckResult;
    try {
      result = await this.search(searcher, company, now, checkId);
    } catch (error) {
      await log({
        status: 'failed',
        found: 0,
        error: error instanceof Error ? error.message : String(error),
      }).catch(() => undefined);
      throw error;
    }
    await log({
      status: result.found.length ? 'found' : 'nothing',
      found: result.found.length,
    });
    return { found: result.found };
  }

  // One company searched: its new signals kept, put on its timeline and told
  // to the people who sell to it. The ones worth acting on reach its open
  // deals through their daily pass (deal-signals.ts), not from here.
  private async search(
    searcher: WebSearcher,
    company: Row,
    now: Date,
    checkId: string,
  ): Promise<CheckResult> {
    const service = this.service;
    const settings = await service.settings();
    const today = dayIn(now, settings.timeZone);
    const companyId = toText(company.id);
    const query = service.database.query();
    const known = await query
      .selectFrom('crmSignals')
      .select(['eventKey', 'title', 'createdAt'])
      .where('companyId', '=', companyId)
      .orderBy('createdAt', 'desc')
      .execute();
    // The method an administrator may edit on the Skills page, as the
    // system message.
    const method = this.options.container
      ? await readSkill(this.options.container, SIGNALS_SKILL)
      : '';
    const question = signalQuestion(
      {
        name: toText(company.name),
        website: company.website ? toText(company.website) : null,
        industry: company.industry ? toText(company.industry) : null,
        city: company.city ? toText(company.city) : null,
      },
      today,
      known.slice(0, KNOWN_NAMED).map((row) => toText(row.title)),
      settings.aiLanguage.startsWith('zh'),
      Boolean(method),
      citesUrls(searcher) ? 'urls' : 'refs',
    );
    const keys = new Set(known.map((row) => toText(row.eventKey)));
    const answer = await this.ask(searcher, question, true, method);
    let read = readSignals(answer, today, keys);
    // An answer in prose: reshaped without searching, its [ref_n] marks
    // still naming the first answer's pages.
    if (read.unreadable) {
      const reshaped = await this.ask(
        searcher,
        signalJsonQuestion(answer.text),
        false,
      );
      read = readSignals({ ...reshaped, pages: answer.pages }, today, keys);
    }
    const found: SignalView[] = [];
    for (const signal of read.signals)
      found.push(await this.keep(companyId, signal, now, checkId));
    await query
      .updateTable('crmCompanies')
      .set({ signalsCheckedAt: now.toISOString() })
      .where('id', '=', companyId)
      .execute();
    if (found.length) await this.tell(company, found);
    return { found };
  }

  // The Auto follow-up page's tab (agents.ts's agentOverview, for this
  // agent): the switches, the last 7 and 30 days, and the checks of the
  // last 90 days on companies the reader may read, newest first. A check's
  // runs count as an agent's runs; in a card's slots, its signals found as
  // accepted, those dismissed, those worth acting on as pending, and the
  // acceptance the share dismissed.
  async overview(
    actor: Actor,
    options: {
      page?: number;
      pageSize?: number;
      trigger?: string;
      status?: string;
    },
  ): Promise<Row> {
    const query = this.service.database.query();
    const now = Date.now();
    const since = new Date(now - 90 * DAY).toISOString();
    const checks = await query
      .selectFrom('crmSignalChecks')
      .selectAll()
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .execute();
    const signals = await query
      .selectFrom('crmSignals')
      .select(['companyId', 'status', 'type', 'createdAt', 'title', 'checkId'])
      .where('createdAt', '>=', since)
      .execute();
    const ids = [
      ...new Set([...checks, ...signals].map((r) => toText(r.companyId))),
    ];
    const readable = new Map<string, Row>();
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await this.service.list(actor, 'companies', {
        ids: ids.slice(i, i + 500).join(','),
        pageSize: 1000,
      });
      for (const record of data) readable.set(toText(record.id), record);
    }
    const mine = checks.filter((c) => readable.has(toText(c.companyId)));
    const theirs = signals.filter((s) => readable.has(toText(s.companyId)));
    const stats = (days: number): Row => {
      const from = now - days * DAY;
      const within = <T extends Row>(rows: T[]) =>
        rows.filter((r) => Date.parse(toText(r.createdAt)) >= from);
      const runs = within(mine);
      const found = within(theirs);
      const dismissed = found.filter((s) => s.status === 'dismissed').length;
      // Worth acting on: what the deals' daily pass follows up.
      const acting = found.filter((s) =>
        ACTING_TYPES.includes(toText(s.type)),
      ).length;
      // In the page's slots: the checks, the signals found, those
      // dismissed, those worth acting on, the failed checks, and the share
      // dismissed (how often it found the wrong thing).
      return {
        runs: runs.length,
        accepted: found.length,
        dismissed,
        pending: acting,
        failed: runs.filter((r) => r.status === 'failed').length,
        found: found.length,
        acting,
        acceptance: found.length ? dismissed / found.length : null,
      };
    };
    const listed = mine.filter(
      (c) =>
        (!options.trigger || c.trigger === options.trigger) &&
        (!options.status || c.status === options.status),
    );
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const titlesOf = new Map<string, string[]>();
    for (const signal of theirs) {
      const key = toText(signal.checkId ?? '');
      if (key)
        titlesOf.set(key, [...(titlesOf.get(key) ?? []), toText(signal.title)]);
    }
    return {
      agent: 'signals',
      switches: (await agentSwitches(this.service)).signals,
      triggers: AGENT_TRIGGERS.signals,
      week: stats(7),
      month: stats(30),
      total: listed.length,
      page,
      pageSize,
      runs: listed.slice((page - 1) * pageSize, page * pageSize).map((c) => {
        const company = readable.get(toText(c.companyId));
        return {
          id: toText(c.id),
          recordId: toText(c.companyId),
          name: toText(company?.name ?? ''),
          ownerId: company?.ownerId ?? null,
          createdAt: toText(c.createdAt),
          trigger: toText(c.trigger),
          status: toText(c.status),
          recommendation: null,
          grade: null,
          // What it found, or why it failed.
          summary:
            c.status === 'failed'
              ? toText(c.error ?? '')
              : (titlesOf.get(toText(c.id)) ?? []).join('；') || null,
        };
      }),
    };
  }

  private async ask(
    searcher: WebSearcher,
    prompt: string,
    search = true,
    system = '',
    urlFields: readonly string[] = [],
  ): Promise<WebAnswer> {
    const answer = await searchWeb(searcher, prompt, {
      search,
      ...(system ? { system } : {}),
      ...(urlFields.length ? { urlFields } : {}),
      ...(this.options.fetch ? { fetch: this.options.fetch } : {}),
    });
    // Recorded as the CRM's other model calls are, on the usage page.
    if (this.options.container)
      await recordUse(
        this.options.container,
        { modelService: searcher.service, model: searcher.model },
        {
          inputTokens: answer.usage.inputTokens,
          outputTokens: answer.usage.outputTokens,
        } as Parameters<typeof recordUse>[2],
        sourceOf('signals'),
      ).catch(() => undefined);
    return answer;
  }

  private async keep(
    companyId: string,
    signal: FoundSignal,
    now: Date,
    checkId: string,
  ): Promise<SignalView> {
    const id = randomUUID();
    const runId = randomUUID();
    const at = now.toISOString();
    const row = {
      id,
      companyId,
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      occurredOn: signal.occurredOn,
      sources: JSON.stringify(signal.sources),
      eventKey: signal.eventKey,
      status: 'new',
      runId,
      checkId,
      createdAt: at,
      updatedAt: at,
    };
    await this.service.database.transaction(async ({ query }) => {
      await query.insertInto('crmSignals').values(row).execute();
      // The company's timeline line, the AI's finding (source `ai`).
      await query
        .insertInto('crmHistory')
        .values({
          id: runId,
          entity: 'companies',
          recordId: companyId,
          actorId: 'system',
          action: 'signal',
          fromValue: null,
          toValue: signal.type,
          changes: JSON.stringify({
            signalId: id,
            type: signal.type,
            title: signal.title,
            occurredOn: signal.occurredOn,
            source: signal.sources[0] ?? null,
          }),
          previous: null,
          source: 'ai',
          origin: null,
          createdAt: at,
        })
        .execute();
    });
    return view({ ...row, decidedById: null, decidedAt: null });
  }

  // A notice to the company's owner and its open deals' owners, once per
  // signal and person.
  private async tell(company: Row, found: SignalView[]): Promise<void> {
    const companyId = toText(company.id);
    const recipients = new Set<string>();
    if (company.ownerId) recipients.add(toText(company.ownerId));
    for (const deal of await this.service.database
      .query()
      .selectFrom('crmOpportunities')
      .select('ownerId')
      .where('companyId', '=', companyId)
      .where('stage', 'not in', ['won', 'lost'])
      .execute())
      if (deal.ownerId) recipients.add(toText(deal.ownerId));
    for (const signal of found)
      for (const recipientId of recipients)
        await this.service
          .notifySignal(companyId, signal.id, recipientId)
          .catch(() => false);
  }
}
