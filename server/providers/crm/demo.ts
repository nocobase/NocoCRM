import type { QueryAdapter, Row } from '@nocobase/db';
import { randomUUID } from 'node:crypto';
import { eventKey } from './signal-reading.js';
import type { AppAuthorization } from '@nocobase/app-plugin-authorization/server';
import { convertLead } from './conversion.js';
import {
  CrmError,
  type CrmSettings,
  definitions,
  object,
  stages,
  toText,
} from './schema.js';
import { EVALUATION } from './ai-entries.js';
import { CrmService } from './service.js';
import {
  demoContent,
  type DemoCity,
  type DemoLanguage,
  type DemoSeat,
} from './demo-content/index.js';
import type { DemoMailTopic } from './demo-content/types.js';
import {
  DEMO_MAIL_ROW,
  buildDemoMail,
  setDemoMailLanguage,
  type DemoConversation,
  type DemoMailbox,
} from './demo-mail.js';
import {
  listUsers,
  requireCapability,
  roleKey,
  type Actor,
} from './authorization.js';
import { DEFAULT_TIME_ZONE } from './zone-time.js';
import {
  populateDemoWhatsApp,
  removeDemoWhatsApp,
  type DemoWhatsAppManifest,
} from './demo-whatsapp.js';
import type { WhatsAppService } from './whatsapp/service.js';

// The demo dataset: NocoBase selling its own licences and services (the
// editions and prices of nocobase.com/cn/commercial) to fictional customers,
// with companies, contacts, leads, opportunities, tasks and approvals
// dated relative to the day it is imported. It follows the business guidance
// in server/providers/crm/guidance.ts. Imported and removed from the settings
// page by an administrator; a manifest row in crm_settings records exactly
// which rows the import created, so removal touches nothing else.

// Each demo lead's gender, by place (the content files' leads, in both
// languages, are the same people in the same order).
const LEAD_GENDERS = [
  'female',
  'male',
  'female',
  'male',
  'female',
  'male',
  'female',
  'male',
  'female',
  'male',
  'female',
  'male',
  'male',
  'male',
  'female',
  'male',
] as const;

// A demo person's LinkedIn profile, by their mailbox: the people are made
// up, so the address is one no real profile has (nococrm-demo-…), as their
// email is at a .example domain, and opens LinkedIn's "page not found".
export const demoProfile = (mailbox: string): string =>
  `https://www.linkedin.com/in/nococrm-demo-${mailbox.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// The leads that came in through prospecting, where a salesperson keeps the
// person's LinkedIn profile: met at an exhibition, found by outreach, or
// introduced by a partner.
const PROSPECTED = new Set(['exhibition', 'outbound', 'partner']);

export const DEMO_MARKER = 'demo-dataset-v1';

export const demoPassword = (username: string): string => `${username}123`;

export interface DemoAccount {
  readonly seat: DemoSeat;
  readonly username: string;
  readonly name: string;
  readonly role: 'sales-manager' | 'sales-representative';
}

// The people the dataset belongs to, each language its own. The
// administrator importing it sells too: a sales manager besides (granted for
// the import's lifetime unless already held), owning a share of the records
// beside the manager and the two sellers, and projects of their own at real
// companies, and deciding the sellers' and the manager's approvals, so
// signing in as the administrator shows every part of the CRM at work. The password is the username followed by 123
// (liming123): the users plugin wants eight characters, and the platform's
// own administrator is admin123.
const demoSeats: readonly (readonly [DemoSeat, DemoAccount['role']])[] = [
  ['manager', 'sales-manager'],
  ['secondManager', 'sales-manager'],
  ['firstSeller', 'sales-representative'],
  ['secondSeller', 'sales-representative'],
];

// The demo accounts of a language.
export const demoAccountsIn = (
  language: DemoLanguage,
): readonly DemoAccount[] =>
  demoSeats.map(([seat, role]) => ({
    seat,
    ...demoContent(language).accounts[seat],
    role,
  }));

export const demoAccounts: readonly DemoAccount[] = demoAccountsIn('zh-CN');

// How the import gets an account it needs: the users plugin in the running
// application, a stub in tests.
export interface DemoAccountCreator {
  create(input: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
  }): Promise<{ id: string }>;
  // An account that already exists is reused, and its password set back to
  // the demo one, so the password the settings page states always holds.
  resetPassword(id: string, password: string): Promise<void>;
  // And its name set back to the demo one, should it have been changed.
  rename(id: string, name: string): Promise<void>;
  // Removing the demo data disables its accounts (the users plugin keeps a
  // deleted account's address, so a deleted one could not be made again on
  // the next import); importing again enables them.
  disable(id: string): Promise<void>;
  enable(id: string): Promise<void>;
}

// How the import gets its demo mailboxes (demo-mail.ts): through the Mail
// plugin in the running application, a stub in tests, absent without the
// plugin, when the dataset comes without mail.
export interface DemoMailboxes {
  // The account's id, or nothing when the plugin refused it (an address
  // already connected to another user).
  connect(userId: string, mailbox: DemoMailbox): Promise<string | undefined>;
  remove(userId: string, accountId: string): Promise<void>;
}

// How the removal clears from everyone's inbox the in-app notifications
// about records that no longer exist, the demo's among them: through the
// in-app notification plugin's store in the running application, absent
// without the plugin.
export interface DemoInbox {
  removeOrphans(): Promise<void>;
}

// How the import writes the importer's finished conversations with the
// assistant: through the Agents plugin in the running application, a stub in
// tests, absent without the plugin or before the assistant exists.
export interface DemoChats {
  // The conversation's id, or nothing when it could not be made.
  create(
    userId: string,
    chat: {
      title: string;
      messages: readonly {
        role: 'user' | 'assistant';
        text: string;
        at: string;
      }[];
      // The record the first question was asked from, as a question from
      // the dock on its page carries it: its kind, id, title and page.
      context?: { kind: string; id: string; title: string; path: string };
    },
  ): Promise<string | undefined>;
  remove(ids: readonly string[]): Promise<void>;
}

export interface DemoStatus {
  present: boolean;
  // The language the present import was made in.
  language: DemoLanguage | null;
  createdAt: string | null;
  records: number;
  accounts: readonly { username: string; name: string; role: string }[];
  // Each language's accounts, so the settings page lists the ones the
  // import it is about to make will create.
  accountsByLanguage: Record<
    DemoLanguage,
    readonly { username: string; name: string; role: string }[]
  >;
  // An import under way: how far it has got, 0 to 100, when this process
  // runs it (null when another does); null when none runs.
  importing: { percent: number | null } | null;
  // The business settings the present import set (demoSettings).
  settings: DemoSetting[];
}

// The business settings a dataset is written for: its amounts are in yuan,
// its people work in Shanghai or in New York, and the AI writes in its
// language. The import sets only those still at their shipped default, so
// an administrator's own choice stands; a removal leaves them as they are.
type DemoSetting = 'currency' | 'timeZone' | 'aiLanguage';
const demoSettings = (
  language: DemoLanguage,
): Pick<CrmSettings, DemoSetting> => ({
  currency: 'CNY',
  timeZone: language === 'zh-CN' ? 'Asia/Shanghai' : 'America/New_York',
  aiLanguage: language,
});

// How far the import this process runs has got, 0 to 100, for the banner
// that shows it while it runs (demoStatus); none while no import runs here.
let importPercent: number | undefined;
const reached = (percent: number): void => {
  importPercent = percent;
};

// What an import wrote so far, for taking it back should it fail: its
// records, and the settings it changed with the values they had.
interface Claim {
  manifest?: Manifest;
  settings?: Partial<Pick<CrmSettings, DemoSetting>>;
}

interface Manifest {
  version: number;
  // Absent on an import made before the dataset had a language: Chinese.
  language?: DemoLanguage;
  label: string;
  createdAt: string;
  businessDate: string;
  ownerId: string;
  // The importer was made a sales manager by the import, which removal
  // undoes; absent when they already were one.
  importerManager?: boolean;
  records: { entity: string; id: string; name: string }[];
  // The demo mailboxes the import connected, which removal disconnects;
  // absent on an import made before the dataset had mail.
  mailAccounts?: { userId: string; accountId: string }[];
  // The importer's conversations with the assistant, which removal deletes;
  // absent on an import made before the dataset had them.
  chats?: string[];
  // The demo's WhatsApp numbers and their customers, which removal deletes;
  // absent on an import made before the dataset had them.
  whatsapp?: DemoWhatsAppManifest;
  // The business settings the import set; absent on one made before it set
  // any.
  settings?: DemoSetting[];
}

// Whether a demo dataset is imported, for the banner that offers one to
// whoever may import it (the metadata route asks only for them).
// An import under way is not one yet: the banner stays, showing its
// progress.
export async function demoPresent(service: CrmService): Promise<boolean> {
  const row = await service.database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  return Boolean(row) && !isImporting(row?.value);
}

// The marker an import claims before it writes anything, until its manifest
// replaces it.
function isImporting(value: unknown): boolean {
  const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  return object(parsed).importing === true;
}

// A claim no import holds any more: last moved on ten minutes ago or more
// and not run by this process, as when the server was stopped mid-import
// (one that fails takes its claim back). It counts as none: nothing shows
// it under way, and a new import takes back what it recorded (each step
// keeps it in the claim) and claims the marker again.
const STALE_IMPORT_MS = 10 * 60 * 1000;
function abandoned(row: Row): boolean {
  if (!isImporting(row.value) || importPercent !== undefined) return false;
  const at = Date.parse(toText(row.updatedAt));
  return !Number.isNaN(at) && Date.now() - at >= STALE_IMPORT_MS;
}

// The language of the demo imported, if any (the demo mailboxes' label
// follows it).
export async function demoLanguageOf(
  service: CrmService,
): Promise<string | undefined> {
  const row = await service.database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const manifest = row ? parseManifest(row.value) : undefined;
  return manifest ? (manifest.language ?? 'zh-CN') : undefined;
}

export async function demoStatus(
  service: CrmService,
  actor: Actor,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const found = await service.database
    .query()
    .selectFrom('crmSettings')
    .select(['value', 'updatedAt'])
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const row = found && !abandoned(found) ? found : undefined;
  const importing = row ? isImporting(row.value) : false;
  const manifest =
    row && !importing ? (parseManifest(row.value) ?? null) : null;
  // The accounts of the language of the import present, else of the
  // reader's.
  const language: DemoLanguage | null = manifest
    ? (manifest.language ?? 'zh-CN')
    : null;
  const names = language ?? (actor.locale.startsWith('zh') ? 'zh-CN' : 'en-US');
  return {
    present: Boolean(manifest),
    language,
    createdAt: manifest?.createdAt ?? null,
    records: manifest?.records.length ?? 0,
    accounts: listed(names),
    accountsByLanguage: { 'zh-CN': listed('zh-CN'), 'en-US': listed('en-US') },
    importing: importing ? { percent: importPercent ?? null } : null,
    settings: manifest?.settings ?? [],
  };
}
const listed = (language: DemoLanguage) =>
  demoAccountsIn(language).map(({ username, name, role }) => ({
    username,
    name,
    role,
  }));

function parseManifest(value: unknown): Manifest | undefined {
  const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  const record = object(parsed);
  return Array.isArray(record.records)
    ? (record as unknown as Manifest)
    : undefined;
}

// The offset of a zone on a given instant, so days can be built at local
// midnight in the business timezone without a calendar library.
function zoneOffsetMinutes(timeZone: string, date: Date): number {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

export interface DemoImportOptions {
  /** Demo Mode has already reconciled credentials without revoking carried sessions. */
  identitiesPrepared?: boolean;
  progress?: (fraction: number) => Promise<void>;
  strict?: boolean;
}

export async function populateDemo(
  service: CrmService,
  authz: AppAuthorization,
  actor: Actor,
  accounts: DemoAccountCreator,
  language: DemoLanguage = 'zh-CN',
  mailboxes?: DemoMailboxes,
  chats?: DemoChats,
  whatsapp?: WhatsAppService,
  options: DemoImportOptions = {},
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  // The marker is claimed before anything is written, so a second import
  // started beside this one (a double click, another administrator) is
  // refused at once instead of writing a second dataset that no manifest
  // records. An import that fails takes back what it wrote.
  const query = service.database.query();
  const claimed = await query
    .selectFrom('crmSettings')
    .select(['value', 'updatedAt'])
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  if (claimed && abandoned(claimed)) {
    // An import cut off: what its claim recorded goes first, as a removal
    // would take it, so the new one does not write a second dataset.
    const recorded = parseManifest(claimed.value);
    if (recorded) {
      if (mailboxes)
        for (const { userId, accountId } of recorded.mailAccounts ?? [])
          await mailboxes.remove(userId, accountId).catch(() => undefined);
      if (chats && recorded.chats?.length)
        await chats.remove(recorded.chats).catch(() => undefined);
      await deleteRecords(service, recorded);
    }
    await query
      .deleteFrom('crmSettings')
      .where('id', 'in', [DEMO_MARKER, DEMO_MAIL_ROW])
      .execute();
  }
  try {
    await query
      .insertInto('crmSettings')
      .values({
        id: DEMO_MARKER,
        value: JSON.stringify({ version: 8, importing: true, records: [] }),
        updatedAt: new Date(),
      })
      .execute();
  } catch {
    throw new CrmError('demoExists', 409);
  }
  const claim: Claim = {};
  reached(0);
  try {
    return await populate(
      service,
      authz,
      actor,
      accounts,
      language,
      mailboxes,
      chats,
      whatsapp,
      claim,
      options,
    );
  } catch (error) {
    if (claim.manifest) await deleteRecords(service, claim.manifest);
    if (claim.settings)
      await service.saveSettings(actor, claim.settings).catch(() => undefined);
    await query
      .deleteFrom('crmSettings')
      .where('id', 'in', [DEMO_MARKER, DEMO_MAIL_ROW])
      .execute();
    throw error;
  } finally {
    importPercent = undefined;
  }
}

async function populate(
  service: CrmService,
  authz: AppAuthorization,
  actor: Actor,
  accounts: DemoAccountCreator,
  language: DemoLanguage,
  mailboxes: DemoMailboxes | undefined,
  chats: DemoChats | undefined,
  whatsapp: WhatsAppService | undefined,
  // What the import wrote so far, for taking it back should it fail.
  claim: Claim,
  options: DemoImportOptions,
): Promise<DemoStatus> {
  const text = demoContent(language);
  const query = service.database.query();

  // Accounts: reuse one that exists by username, create the rest, and make
  // sure each holds its demo role and nothing else among the CRM roles.
  const existing = await listUsers(service.database);
  const disabled = new Set(
    (
      await query
        .selectFrom('user')
        .select('id')
        .where('disabledAt', 'is not', null)
        .where('deletedAt', 'is', null)
        .execute()
    ).map((row) => toText(row.id)),
  );
  const userIds = {} as Record<DemoSeat, string>;
  for (const account of demoAccountsIn(language)) {
    const found = existing.find((u) => u.username === account.username);
    if (found) {
      // One a removal disabled is the demo's again.
      if (disabled.has(found.id)) await accounts.enable(found.id);
      if (!options.identitiesPrepared)
        await accounts.resetPassword(found.id, demoPassword(account.username));
      if (found.name !== account.name)
        await accounts.rename(found.id, account.name);
    }
    const id = found
      ? found.id
      : (
          await accounts.create({
            name: account.name,
            username: account.username,
            email: `${account.username}@demo.example`,
            password: demoPassword(account.username),
            role: roleKey(account.role),
          })
        ).id;
    await authz.permissionSets.replaceSubjectAssignments({
      subject: { type: 'user', id },
      managedPermissionSets: [
        'sales-representative',
        'sales-manager',
        'system-administrator',
      ].map(roleKey),
      permissionSets: [roleKey(account.role)],
    });
    userIds[account.seat] = id;
  }
  // The importer becomes a sales manager too, keeping every set they hold.
  const managerSet = roleKey('sales-manager');
  const importerManager = !(
    await authz.permissionSets.listAssignments(managerSet)
  ).some((a) => a.subject.type === 'user' && a.subject.id === actor.id);
  if (importerManager)
    await authz.permissionSets.replaceSubjectAssignments({
      subject: { type: 'user', id: actor.id },
      managedPermissionSets: [managerSet],
      permissionSets: [managerSet],
    });
  reached(5);
  const actorFor = (id: string): Actor => ({
    id,
    locale: language,
    scope: authz.for({
      principal: { type: 'user', id },
      subjects: [{ type: 'authenticated', id: '*' }],
    }),
  });
  const owner = actorFor(actor.id);
  const managerActor = actorFor(userIds.manager);
  const sellerActors = [
    actorFor(userIds.firstSeller),
    actorFor(userIds.secondSeller),
  ];

  // The settings the dataset is written for, before anything is dated by
  // the business time zone.
  const before = await service.settings();
  const adopted = Object.fromEntries(
    Object.entries(demoSettings(language)).filter(
      ([key, value]) =>
        before[key as DemoSetting] === service.defaults[key as DemoSetting] &&
        before[key as DemoSetting] !== value,
    ),
  ) as Partial<Pick<CrmSettings, DemoSetting>>;
  const settingsSet = Object.keys(adopted) as DemoSetting[];
  if (settingsSet.length) {
    claim.settings = Object.fromEntries(
      settingsSet.map((key) => [key, before[key]]),
    );
    await service.saveSettings(actor, adopted);
  }
  const settings = await service.settings();
  const timeZone = settings.timeZone || DEFAULT_TIME_ZONE;
  const now = new Date();
  const calendarDay = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // Local midnight of today in the business timezone.
  const base =
    Date.parse(`${calendarDay}T00:00:00Z`) -
    zoneOffsetMinutes(timeZone, now) * 60000;
  const at = (day: number, hour = 10, minute = 0): string =>
    new Date(
      base + day * 86400000 + hour * 3600000 + minute * 60000,
    ).toISOString();
  const started = now.toISOString();
  const manifest: Manifest = {
    // 7: the demo mailboxes (mailAccounts); 8: the WhatsApp number.
    version: 8,
    language,
    label: text.label,
    createdAt: started,
    businessDate: calendarDay,
    ownerId: actor.id,
    ...(importerManager ? { importerManager } : {}),
    ...(settingsSet.length ? { settings: settingsSet } : {}),
    records: [],
  };
  claim.manifest = manifest;
  // Each step's progress, with what the import has written so far kept in
  // its claim, so an import cut off (the server stopped mid-way) can be
  // taken back by the next (populateDemo).
  const progress = async (percent: number): Promise<void> => {
    reached(percent);
    await options.progress?.(percent / 100);
    await query
      .updateTable('crmSettings')
      .set({
        value: JSON.stringify({ ...manifest, importing: true }),
        updatedAt: new Date(),
      })
      .where('id', '=', DEMO_MARKER)
      .execute();
  };
  const track = (entity: string, record: Row): Row => {
    if (!manifest.records.some((r) => r.id === record.id))
      manifest.records.push({
        entity,
        id: toText(record.id),
        name: toText(record.name),
      });
    return record;
  };
  const ids = (): string[] => manifest.records.map((r) => r.id);
  const historyAt = async (q: QueryAdapter, date: string): Promise<void> => {
    if (manifest.records.length)
      await q
        .updateTable('crmHistory')
        .set({ createdAt: date })
        .where('recordId', 'in', ids())
        .where('createdAt', '>=', started)
        .execute();
  };
  type Entity = keyof typeof definitions;
  const saver =
    (prepared: Actor, q: QueryAdapter) =>
    async (entity: Entity, input: Row, day = -1, id?: string): Promise<Row> => {
      // A task done or cancelled is written as it happened: created open,
      // then closed at its time with what came of it, so its timeline reads
      // as one a person kept, the result under the entry that closed it.
      const closing =
        entity === 'tasks' &&
        !id &&
        ['completed', 'cancelled'].includes(toText(input.status));
      const record = track(
        entity,
        await service.save(
          prepared,
          entity,
          closing ? { ...input, status: 'open', result: null } : input,
          id,
          q,
        ),
      );
      const date = at(day);
      const patch: Row = { updatedAt: date };
      if (!id) patch.createdAt = date;
      if (
        entity === 'opportunities' &&
        ['won', 'lost'].includes(toText(record.stage))
      )
        patch.closedAt = date;
      if (entity === 'tasks' && record.status === 'completed')
        patch.completedAt = record.dueAt ?? date;
      await q
        .updateTable(definitions[entity].table)
        .set(patch)
        .where('id', '=', record.id)
        .execute();
      await historyAt(q, date);
      if (closing) {
        await service.save(
          prepared,
          'tasks',
          { status: input.status, result: input.result ?? null },
          toText(record.id),
          q,
        );
        // Closed when it was due, or when it was written down.
        const when = record.dueAt ? toText(record.dueAt) : date;
        await q
          .updateTable('crmTasks')
          .set({
            updatedAt: when,
            completedAt: input.status === 'completed' ? when : null,
          })
          .where('id', '=', record.id)
          .execute();
        await historyAt(q, when);
      }
      return service.get(prepared, entity, toText(record.id), q);
    };

  // Who owns which company (by index): the first seller 0,1,4 · the second
  // seller 2,5 · the manager 3 · the importing administrator 6,7.
  // Leads rotate among the four by position; tasks follow their record.
  const companyOwner = (i: number): Actor =>
    [0, 1, 4].includes(i)
      ? sellerActors[0]
      : [2, 5].includes(i)
        ? sellerActors[1]
        : i === 3
          ? managerActor
          : owner;
  const leadOwner = (i: number): Actor =>
    [sellerActors[0], sellerActors[1], managerActor, owner][i % 4];
  const companies_: Row[] = [];
  const contacts: Row[][] = [];
  const opportunities: Row[] = [];
  const leads: Row[] = [];
  // [industry, city, status, source, employees, annual revenue in CNY,
  // as the deals are kept]; the names, domains and descriptions are the
  // language's, and so are the contacts.
  // Real, well-known companies (Shanghai Electric, Intime, United Family
  // Healthcare, Digital China, XJTLU, XGIMI, NARI, Guangzhou Restaurant),
  // their sizes and revenues of the public order of magnitude; what the
  // demo says happened with them is invented, and kept neutral.
  const companies: [string, DemoCity, string, string, string, number][] = [
    ['manufacturing', 'shanghai', 'qualified', 'exhibition', '5000+', 110e9],
    ['retail', 'hangzhou', 'qualified', 'customerReferral', '5000+', 8e9],
    ['healthcare', 'beijing', 'qualified', 'website', '1001-5000', 3e9],
    ['technology', 'shenzhen', 'qualified', 'partner', '5000+', 120e9],
    ['education', 'suzhou', 'prospect', 'marketing', '1001-5000', 2e9],
    ['technology', 'chengdu', 'qualified', 'outbound', '1001-5000', 3.5e9],
    ['energy', 'nanjing', 'inactive', 'search', '5000+', 50e9],
    ['foodAndBeverage', 'guangzhou', 'qualified', 'partner', '5000+', 5e9],
  ];
  // [company, amount, stage, close day, business type, created day, last
  // change day, lost reason]; the names are the language's, by index.
  const deals: [
    number,
    number,
    string,
    number,
    string,
    number,
    number,
    string?,
  ][] = [
    [0, 280000, 'proposal', 28, 'newBusiness', -28, -4],
    [1, 45000, 'contract', 5, 'expansion', -25, -2],
    [2, 360000, 'negotiation', -3, 'newBusiness', -22, -3],
    [3, 150000, 'validation', 20, 'newBusiness', -18, -5],
    [4, 50000, 'contact', 45, 'newBusiness', -5, -5],
    [5, 45000, 'won', -18, 'expansion', -42, -18],
    [1, 88000, 'won', -3, 'crossSell', -30, -3],
    [6, 260000, 'paused', 60, 'tender', -26, -8],
    [7, 65000, 'lost', -22, 'newBusiness', -48, -22],
    [0, 42000, 'lost', -4, 'renewal', -20, -4],
    // Closed in the five months before: enough won and lost each month for the
    // workspace's trend to have a shape. Appended so the indexes above hold.
    [5, 16000, 'won', -152, 'newBusiness', -185, -152],
    [3, 50000, 'lost', -148, 'newBusiness', -178, -148, 'price'],
    [1, 36000, 'won', -140, 'newBusiness', -172, -140],
    [2, 50000, 'won', -122, 'newBusiness', -160, -122],
    [7, 47000, 'lost', -118, 'newBusiness', -150, -118, 'timing'],
    [4, 50000, 'lost', -112, 'newBusiness', -145, -112, 'timing'],
    [0, 175000, 'won', -95, 'newBusiness', -130, -95],
    [6, 230000, 'won', -88, 'tender', -125, -88],
    [3, 50000, 'won', -84, 'crossSell', -115, -84],
    [5, 39000, 'lost', -80, 'expansion', -110, -80, 'noDecision'],
    [1, 118000, 'lost', -62, 'newBusiness', -95, -62, 'requirementMismatch'],
    [2, 64000, 'won', -55, 'expansion', -90, -55],
    [7, 150000, 'won', -40, 'newBusiness', -75, -40],
    [0, 98000, 'lost', -36, 'newBusiness', -70, -36, 'other'],
    // Early-stage deals, so the first board columns carry more than one card.
    [6, 50000, 'qualification', 35, 'newBusiness', -6, -2],
    [6, 35000, 'contact', 55, 'newBusiness', -2, -2],
    [2, 68000, 'contact', 50, 'newBusiness', -3, -3],
    [4, 52000, 'qualification', 40, 'crossSell', -9, -4],
    [3, 50000, 'validation', 32, 'crossSell', -14, -6],
    [1, 156000, 'proposal', 24, 'newBusiness', -20, -5],
  ];
  // [status, source, created day]; the name, mailbox, company and message
  // are the language's, by index.
  const leadSpecs: [string, string, number][] = [
    ['new', 'exhibition', -16],
    ['working', 'website', -7],
    ['new', 'website', -1],
    ['new', 'exhibition', -6],
    ['new', 'marketing', -2],
    ['working', 'outbound', -9],
    ['working', 'customerReferral', -12],
    ['working', 'partner', -8],
    ['nurturing', 'search', -17],
    ['nurturing', 'exhibition', -19],
    ['nurturing', 'marketing', -8],
    ['invalid', 'website', -10],
    ['invalid', 'outbound', -13],
    ['working', 'employeeReferral', -4],
    ['new', 'partner', -5],
    ['working', 'search', -3],
  ];
  // The province of each demo city (ISO 3166-2, as the region field
  // stores it), so a demo record carries the whole region: country,
  // province and city.
  const provinceOf: Record<DemoCity, string> = {
    beijing: 'CN-11',
    shanghai: 'CN-31',
    nanjing: 'CN-32',
    suzhou: 'CN-32',
    hangzhou: 'CN-33',
    guangzhou: 'CN-44',
    shenzhen: 'CN-44',
    chengdu: 'CN-51',
  };
  const phone = (n: number): string =>
    `138 0${String(100 + n).slice(-3)} ${String(2000 + n * 37).slice(-4)}`;

  await service.mutate(owner, async (prepared, q) => {
    const save = saver(prepared, q);
    for (let i = 0; i < companies.length; i++) {
      const [industry, city, status, source, employees, revenue] = companies[i];
      const { name, domain, description, address } = text.companies[i];
      const ownerId = companyOwner(i).id;
      const company = await save(
        'companies',
        {
          name,
          ownerId,
          industry,
          city: text.cities[city],
          state: provinceOf[city],
          country: 'CN',
          status,
          source,
          employees,
          annualRevenue: revenue,
          currency: 'CNY',
          type: i === 3 ? 'partner' : 'direct',
          website: text.companies[i].website,
          linkedin: text.companies[i].linkedin ?? null,
          address,
          description,
        },
        -75 + i * 5,
      );
      companies_.push(company);
      const pair: Row[] = [];
      for (let j = 0; j < 2; j++) {
        const { name: personName, mailbox } = text.people[i][j];
        pair.push(
          await save(
            'contacts',
            {
              name: personName,
              ownerId,
              companyId: company.id,
              jobTitle: text.contactJobTitles[j],
              gender: j === 0 ? 'female' : 'male',
              source,
              email: i === 4 && j === 1 ? null : `${mailbox}@${domain}.example`,
              phone: i === 4 && j === 1 ? null : phone(i * 2 + j),
              employed: !(i === 7 && j === 1),
              primary: j === 0,
              // The primary contact's profile, and the other's at every
              // other company.
              linkedin: j === 0 || i % 2 === 0 ? demoProfile(mailbox) : null,
            },
            i === 4 ? -4 - j : -70 + i * 5 + j,
          ),
        );
      }
      contacts.push(pair);
    }
    for (const [
      d,
      [
        a,
        amount,
        stage,
        close,
        businessType,
        created,
        changed,
        // Built in-house instead (the content's story): a neutral reason for
        // a real company.
        lostReason = 'other',
      ],
    ] of deals.entries()) {
      const name = text.deals[d];
      const ownerId = companyOwner(a).id;
      let deal = await save(
        'opportunities',
        {
          name,
          ownerId,
          companyId: companies_[a].id,
          amount,
          currency: 'CNY',
          source: companies[a][3],
          businessType,
          expectedCloseAt: at(close, 17),
          description: text.companies[a].description,
          contacts: [
            { contactId: contacts[a][0].id, role: 'decisionMaker' },
            { contactId: contacts[a][1].id, role: 'evaluator' },
          ],
        },
        created,
      );
      const progression = ['won', 'lost', 'paused'].includes(stage)
        ? ['qualification', 'proposal', stage]
        : stages.slice(1, stages.indexOf(stage) + 1);
      for (let i = 0; i < progression.length; i++) {
        const next = progression[i];
        const day = Math.round(
          created + ((changed - created) * (i + 1)) / progression.length,
        );
        deal = await save(
          'opportunities',
          {
            stage: next,
            ...(next === 'lost' ? { lostReason } : {}),
            ...(next === 'paused'
              ? { pauseReason: 'budgetDeferred', resumeAt: at(30) }
              : {}),
          },
          day,
          toText(deal.id),
        );
      }
      opportunities.push(deal);
    }
    await save(
      'companies',
      {
        status: 'churned',
        churnReason: 'businessChange',
      },
      -20,
      toText(companies_[7].id),
    );
    // Chronology on automatically promoted companies follows the associated won deal.
    for (const [i, day] of [
      [5, -18],
      [1, -3],
    ] as const)
      await q
        .updateTable('crmCompanies')
        .set({ updatedAt: at(day) })
        .where('id', '=', companies_[i].id)
        .execute();
    // Each lead's real company's industry and city, by index (the content
    // files name the companies in the same order).
    const leadPlaces: [string, DemoCity][] = [
      ['manufacturing', 'shanghai'],
      ['education', 'suzhou'],
      ['retail', 'hangzhou'],
      ['logistics', 'shenzhen'],
      ['retail', 'shanghai'],
      ['agriculture', 'chengdu'],
      ['healthcare', 'beijing'],
      ['technology', 'beijing'],
      ['education', 'beijing'],
      ['manufacturing', 'shenzhen'],
      ['realEstate', 'shenzhen'],
      ['professionalServices', 'shanghai'],
      ['manufacturing', 'suzhou'],
      ['technology', 'beijing'],
      ['agriculture', 'beijing'],
      ['manufacturing', 'shanghai'],
    ];
    for (let i = 0; i < leadSpecs.length; i++) {
      const [status, source, day] = leadSpecs[i];
      const { name, mailbox, company, message, companyDescription, address } =
        text.leads[i];
      leads.push(
        await save(
          'leads',
          {
            name,
            company,
            status,
            source,
            ownerId: leadOwner(i).id,
            email: `${mailbox}@lead-${i + 1}.example`,
            phone: i % 4 === 0 ? null : phone(40 + i),
            linkedin: PROSPECTED.has(source) ? demoProfile(mailbox) : null,
            jobTitle: text.leadJobTitles[i % 2],
            // The same person in either language, by place: the names in
            // the content files are chosen to match.
            gender: LEAD_GENDERS[i] ?? 'unknown',
            country: 'CN',
            state: provinceOf[leadPlaces[i][1]],
            city: text.cities[leadPlaces[i][1]],
            industry: leadPlaces[i][0],
            // Half of them say what their company turns over, in CNY.
            ...(i % 2 === 0
              ? {
                  annualRevenue: (5 + ((i * 7) % 40)) * 1_000_000,
                  currency: 'CNY',
                }
              : {}),
            message,
            companyDescription,
            address,
            ...(status === 'invalid'
              ? { invalidReason: i === 12 ? 'badContact' : 'notTarget' }
              : {}),
          },
          day,
        ),
      );
    }
    // A task is named by what is to be done, without the customer's name:
    // the record it is linked to shows beside it wherever it is listed.
    const task = async (
      name: string,
      links: Row,
      day: number,
      hour: number,
      status = 'open',
      result?: string | null,
    ): Promise<Row> =>
      save(
        'tasks',
        {
          name,
          ...links,
          dueAt: at(day, hour),
          status,
          description: text.taskDescription,
          result: result ?? null,
        },
        Math.min(day - 2, -1),
      );
    // A call or a meeting that took place is a comment on the record it was
    // about, written by whoever held it, at the time it ended, headed by
    // what it was without the customer's name.
    const comment = async (
      entity: 'leads' | 'opportunities' | 'companies' | 'contacts',
      recordId: unknown,
      authorId: unknown,
      heading: string,
      body: string,
      day: number,
      hour: number,
    ): Promise<void> => {
      await q
        .insertInto('crmHistory')
        .values({
          id: randomUUID(),
          entity,
          recordId: toText(recordId),
          actorId: toText(authorId),
          action: 'comment',
          changes: JSON.stringify({
            // The heading as a line of its own, not bold: a comment is
            // what a person writes, without formatting.
            text: heading ? `${heading}\n\n${body}` : body,
          }),
          createdAt: at(day, hour + 1),
        })
        .execute();
    };
    // What is known of each contact, and why the churned company left: comments
    // by their owners, written when the record was.
    for (const [i, pair] of contacts.entries())
      for (const [j, contact] of pair.entries())
        await comment(
          'contacts',
          contact.id,
          contact.ownerId,
          '',
          text.contactComments[j],
          i === 4 ? -4 - j : -70 + i * 5 + j,
          9,
        );
    await comment(
      'companies',
      companies_[7].id,
      companies_[7].ownerId,
      '',
      text.churnComments,
      -20,
      9,
    );
    // What took place with each company, written by its owner over the
    // life of its first deal, each answered, where the content has a reply,
    // by a colleague: the manager, or the importer on the manager's own.
    for (const [i, notes] of text.companyNotes.entries()) {
      const first = deals.find(([company]) => company === i);
      if (!first) continue;
      const [, , , , , createdDay, changedDay] = first;
      const span = Math.max(changedDay - createdDay, notes.length + 1);
      const author = companyOwner(i);
      const colleague = author.id === managerActor.id ? owner : managerActor;
      for (const [k, note] of notes.entries()) {
        const day = Math.min(
          createdDay + Math.round((span * (k + 1)) / (notes.length + 1)),
          -1,
        );
        const id = randomUUID();
        await q
          .insertInto('crmHistory')
          .values({
            id,
            entity: 'companies',
            recordId: toText(companies_[i].id),
            actorId: toText(author.id),
            action: 'comment',
            changes: JSON.stringify({
              text: `${note.heading}\n\n${note.body}`,
            }),
            createdAt: at(day, 11),
          })
          .execute();
        if (note.reply)
          await q
            .insertInto('crmHistory')
            .values({
              id: randomUUID(),
              entity: 'companies',
              recordId: toText(companies_[i].id),
              actorId: toText(colleague.id),
              action: 'comment',
              replyToId: id,
              changes: JSON.stringify({ text: note.reply }),
              createdAt: at(day, 15),
            })
            .execute();
      }
    }
    const leadLinks = (i: number): Row => ({
      leadId: leads[i].id,
      ownerId: leadOwner(i).id,
    });
    await comment(
      'leads',
      leads[0].id,
      leadOwner(0).id,
      text.discoveryCall.name,
      text.discoveryCall.feedback,
      -12,
      10,
    );
    await comment(
      'leads',
      leads[1].id,
      leadOwner(1).id,
      text.productDemo.name,
      text.productDemo.feedback,
      -5,
      14,
    );
    // What was done on the leads before they were decided: two tasks on
    // each lead converted, which the conversion gives its company too, and
    // a first contact on each invalid one, with what came of it.
    // Each [day, hour]: after the lead came in (a task is created two days
    // before it is due), and before the conversion's morning.
    for (const [i, times] of [
      [
        0,
        [
          [-14, 10],
          [-11, 15],
        ],
      ],
      [
        1,
        [
          [-5, 9],
          [-4, 9],
        ],
      ],
    ] as const)
      for (const [k, done] of text.convertedLeadTasks[i].entries())
        await task(
          done.name,
          leadLinks(i),
          times[k]?.[0] ?? -2,
          times[k]?.[1] ?? 10,
          'completed',
          done.result,
        );
    for (const [k, i, day] of [
      [0, 11, -8],
      [1, 12, -11],
    ] as const)
      await task(
        text.invalidLeadTasks[k].name,
        leadLinks(i),
        day,
        11,
        'completed',
        text.invalidLeadTasks[k].result,
      );
    for (const [i, companyIndex, contactIndex, day] of [
      [0, 0, 0, -10],
      [1, 4, 0, -4],
    ] as const) {
      const converted = await convertLead(
        service,
        prepared,
        toText(leads[i].id),
        {
          companyId: companies_[companyIndex].id,
          contactId: contacts[companyIndex][contactIndex].id,
          createOpportunity: false,
        },
        q,
      );
      await q
        .updateTable('crmLeads')
        .set({ convertedAt: at(day), updatedAt: at(day) })
        .where('id', '=', converted.id)
        .execute();
      await q
        .updateTable('crmTasks')
        .set({ updatedAt: at(day) })
        .where('leadId', '=', converted.id)
        .execute();
      await historyAt(q, at(day));
      leads[i] = converted;
    }
    // Completed comments and upcoming meetings across the active pipeline.
    for (let i = 0; i < 6; i++) {
      const a = deals[i][0];
      const links: Row = {
        companyId: companies_[a].id,
        opportunityId: opportunities[i].id,
        ownerId: companyOwner(a).id,
      };
      await comment(
        'opportunities',
        links.opportunityId,
        links.ownerId,
        text.completedMatters[i],
        text.completedFeedback[i],
        -6 - i,
        10,
      );
      // The importer joins two of the colleagues' meetings ahead, so the
      // task list's "ones I take part in" has something to show.
      const joins = (i === 0 || i === 3) && links.ownerId !== actor.id;
      if (i < 5)
        await task(
          text.plannedMatters[i],
          joins ? { ...links, internalParticipants: [actor.id] } : links,
          [0, 0, -2, 2, 5][i],
          [10, 15, 11, 14, 10][i],
          'open',
        );
    }
    // Two late-evening calls today, so the workspace's "upcoming today" list
    // still has entries at the end of the working day.
    await task(
      text.eveningCall,
      {
        companyId: companies_[0].id,
        opportunityId: opportunities[0].id,
        ownerId: companyOwner(0).id,
      },
      0,
      21.5,
      'open',
    );
    await task(
      text.ssoConfirmation,
      {
        companyId: companies_[1].id,
        opportunityId: opportunities[1].id,
        ownerId: companyOwner(1).id,
      },
      0,
      23.5,
      'open',
    );
    const leadTasks: [number, number, number, string][] = [
      [2, 1, 11, 'open'],
      [5, -5, 10, 'completed'],
      [5, 0, 16, 'open'],
      [6, -7, 14, 'completed'],
      [7, 3, 11, 'open'],
      [8, -10, 10, 'completed'],
      [9, -14, 15, 'completed'],
      [10, -3, 10, 'completed'],
      [13, -2, 11, 'completed'],
      [13, 2, 15, 'open'],
      [15, 4, 10, 'open'],
      [4, -1, 14, 'cancelled'],
      [14, -2, 11, 'cancelled'],
      [7, -1, 16, 'open'],
      [6, 7, 10, 'open'],
    ];
    const taskLabel = (status: string): string =>
      status === 'completed'
        ? text.leadTaskMatters.completed
        : status === 'cancelled'
          ? text.leadTaskMatters.cancelled
          : text.leadTaskMatters.planned;
    // A contact that took place is a comment; what is still to do, or called
    // off, a task.
    for (const [i, day, hour, status] of leadTasks)
      if (status === 'completed')
        await comment(
          'leads',
          leads[i].id,
          leadOwner(i).id,
          taskLabel(status),
          text.leadTaskFeedback,
          day,
          hour,
        );
      else await task(taskLabel(status), leadLinks(i), day, hour, status);
    // A steady cadence beyond the hand-placed fortnight, so the calendar
    // and the day's agenda have something on every working day from a
    // month back to three months ahead, whichever day the demo is opened
    // on: past days are completed (with the odd no-show or cancellation),
    // future days are planned. The work rotates over the live deals and
    // the open leads, owned by whoever owns the record.
    const activeDeals = opportunities
      .map((deal, index) => ({ deal, index }))
      .filter(
        ({ index }) => !['won', 'lost', 'paused'].includes(deals[index][2]),
      );
    const openLeads = leads
      .map((lead, index) => ({ lead, index }))
      .filter(
        ({ lead }) => !['converted', 'invalid'].includes(toText(lead.status)),
      );
    // Which of the past matters took place with the customer (a comment of
    // it) and which were the team's own work (a task done).
    const cadenceExchange = [true, true, true, false, true, false];
    const weekdayOf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    let n = 0;
    for (let day = -30; day <= 90; day++) {
      if (day >= -14 && day <= 7) continue;
      // Noon, so the weekday is the business day whatever the zone offset.
      const weekday = weekdayOf.format(
        new Date(base + day * 86400000 + 12 * 3600000),
      );
      if (weekday === 'Sat' || weekday === 'Sun') continue;
      const perDay = day % 3 === 0 ? 2 : 1;
      for (let k = 0; k < perDay; k++, n++) {
        const hour = [9, 10, 11, 14, 15, 16][n % 6];
        const name = text.cadenceMatters[n % text.cadenceMatters.length];
        const exchange = cadenceExchange[n % cadenceExchange.length];
        const status =
          day < 0
            ? n % 9 === 4 || n % 11 === 6
              ? 'cancelled'
              : 'completed'
            : 'open';
        const feedback =
          status === 'completed'
            ? text.cadenceFeedback[n % text.cadenceFeedback.length]
            : null;
        if (n % 3 === 2 && openLeads.length) {
          const { lead, index } = openLeads[n % openLeads.length];
          if (status === 'completed' && exchange && feedback)
            await comment(
              'leads',
              lead.id,
              leadOwner(index).id,
              name,
              feedback,
              day,
              hour,
            );
          else await task(name, leadLinks(index), day, hour, status, feedback);
        } else {
          const { deal, index } = activeDeals[n % activeDeals.length];
          const a = deals[index][0];
          if (status === 'completed' && exchange && feedback)
            await comment(
              'opportunities',
              deal.id,
              companyOwner(a).id,
              name,
              feedback,
              day,
              hour,
            );
          else
            await task(
              name,
              {
                companyId: companies_[a].id,
                opportunityId: deal.id,
                ownerId: companyOwner(a).id,
                // Now and then the importer takes part in a colleague's.
                ...(n % 4 === 1 && companyOwner(a).id !== actor.id
                  ? { internalParticipants: [actor.id] }
                  : {}),
              },
              day,
              hour,
              status,
              feedback,
            );
        }
      }
    }
  });

  // Approvals are raised by whoever owns the deal. The importing
  // administrator, a sales manager for the demo, decides the sellers' and the
  await progress(35);
  // manager's: two wait on them, one they have decided; their own go to the
  // manager. So the importer's inbox holds approvals to decide, each with the
  // AI's review, as well as approvals of their own waiting on someone else.
  const raise = (
    who: Actor,
    input: Row,
    day: number,
    submitDay: number,
  ): Promise<Row> =>
    service.mutate(who, async (prepared, q) => {
      const save = saver(prepared, q);
      const record = await save('approvals', input, day);
      // Demo data starts no AI review (Actor.quiet).
      await service.approvalAction(
        { ...prepared, quiet: true },
        toText(record.id),
        'submit',
        '',
        q,
      );
      await q
        .updateTable('crmApprovals')
        .set({ submittedAt: at(submitDay, 11), updatedAt: at(submitDay, 11) })
        .where('id', '=', record.id)
        .execute();
      await historyAt(q, at(submitDay, 11));
      return record;
    });
  const discountApproval = await raise(
    companyOwner(0),
    {
      name: text.approvals.discount.name,
      opportunityId: opportunities[0].id,
      topic: 'discount',
      approverId: owner.id,
      description: text.approvals.discount.description,
    },
    -1,
    -1,
  );
  const paymentTerms = await raise(
    companyOwner(1),
    {
      name: text.approvals.paymentTerms.name,
      opportunityId: opportunities[1].id,
      topic: 'paymentTerms',
      approverId: owner.id,
      description: text.approvals.paymentTerms.description,
    },
    -6,
    -6,
  );
  await service.mutate(owner, async (prepared, q) => {
    await service.approvalAction(
      { ...prepared, quiet: true },
      toText(paymentTerms.id),
      'approve',
      text.approvals.paymentTerms.comment,
      q,
    );
    await q
      .updateTable('crmApprovals')
      .set({ decidedAt: at(-5, 15), updatedAt: at(-5, 15) })
      .where('id', '=', paymentTerms.id)
      .execute();
    await historyAt(q, at(-5, 15));
  });
  const contractApproval = await raise(
    managerActor,
    {
      name: text.approvals.contractTerms.name,
      opportunityId: opportunities[3].id,
      topic: 'contractTerms',
      approverId: owner.id,
      description: text.approvals.contractTerms.description,
    },
    -2,
    -2,
  );
  await raise(
    owner,
    {
      name: text.approvals.commitment.name,
      opportunityId: opportunities[24].id,
      topic: 'commitment',
      approverId: managerActor.id,
      description: text.approvals.commitment.description,
    },
    -1,
    -1,
  );

  // The importing administrator's own projects, at real companies
  // (projects-*.ts): SF Express's new lead, H World's deal at proposal (a
  // converted lead, a discount out for approval, tomorrow's review), GAC's
  // deal in negotiation (an approved payment term, an overdue task) and New
  // Hope, won, with an expansion. The AI's work on them is written as its
  // cards keep it, below, so the import needs no model.
  const project = text.projects;
  // A comment written straight into the record's timeline, its id returned.
  const commentIn =
    (q: QueryAdapter) =>
    async (
      entity: 'leads' | 'opportunities' | 'companies',
      recordId: unknown,
      authorId: unknown,
      heading: string,
      body: string,
      day: number,
      hour: number,
    ): Promise<string> => {
      const id = randomUUID();
      await q
        .insertInto('crmHistory')
        .values({
          id,
          entity,
          recordId: toText(recordId),
          actorId: toText(authorId),
          action: 'comment',
          changes: JSON.stringify({
            // The heading as a line of its own, not bold: a comment is
            // what a person writes, without formatting.
            text: heading ? `${heading}\n\n${body}` : body,
          }),
          createdAt: at(day, hour),
        })
        .execute();
      return id;
    };
  await progress(45);
  type ProjectCompany = typeof project.hworld.company;
  type ProjectPerson = (typeof project.hworld.people)[number];
  const projects = await service.mutate(owner, async (prepared, q) => {
    const save = saver(prepared, q);
    const comment = commentIn(q);
    const company = async (
      about: ProjectCompany,
      industry: string,
      city: DemoCity,
      source: string,
      day: number,
    ): Promise<Row> =>
      save(
        'companies',
        {
          name: about.name,
          ownerId: owner.id,
          industry,
          city: text.cities[city],
          state: provinceOf[city],
          country: 'CN',
          status: 'qualified',
          source,
          employees: '5000+',
          type: 'direct',
          website: about.website,
          linkedin: about.linkedin ?? null,
          address: about.address,
          description: about.description,
        },
        day,
      );
    const contact = async (
      person: ProjectPerson,
      employer: Row,
      domain: string,
      gender: string,
      primary: boolean,
      n: number,
      day: number,
    ): Promise<Row> =>
      save(
        'contacts',
        {
          name: person.name,
          ownerId: owner.id,
          companyId: employer.id,
          jobTitle: person.jobTitle,
          gender,
          source: employer.source,
          email: `${person.mailbox}@${domain}.example`,
          phone: phone(n),
          employed: true,
          primary,
          linkedin: primary ? demoProfile(person.mailbox) : null,
        },
        day,
      );
    // A deal created on a day and moved stage by stage to the one it holds.
    const deal = async (
      input: Row,
      stage: string,
      created: number,
      changed: number,
      // A deal a conversion opened, filled in and moved on from there.
      id?: string,
    ): Promise<Row> => {
      let record = await save('opportunities', input, created, id);
      const progression = ['won', 'lost', 'paused'].includes(stage)
        ? ['qualification', 'proposal', stage]
        : stages.slice(1, stages.indexOf(stage) + 1);
      for (let i = 0; i < progression.length; i++)
        record = await save(
          'opportunities',
          { stage: progression[i] },
          Math.round(
            created + ((changed - created) * (i + 1)) / progression.length,
          ),
          toText(record.id),
        );
      return record;
    };
    const task = async (
      name: string,
      links: Row,
      day: number,
      hour: number,
      status = 'open',
      result: string | null = null,
      description = text.taskDescription,
    ): Promise<Row> =>
      save(
        'tasks',
        {
          name,
          ...links,
          ownerId: owner.id,
          dueAt: at(day, hour),
          status,
          description,
          result,
        },
        Math.min(day - 2, -1),
      );

    // SF Express: a new lead from yesterday, followed up by the AI at once.
    const sf = await save(
      'leads',
      {
        name: project.sf.person.name,
        company: project.sf.company,
        status: 'new',
        source: 'website',
        ownerId: owner.id,
        email: `${project.sf.person.mailbox}@${project.sf.domain}.example`,
        phone: phone(60),
        jobTitle: project.sf.person.jobTitle,
        gender: 'male',
        country: 'CN',
        state: provinceOf.shenzhen,
        city: text.cities.shenzhen,
        message: project.sf.message,
      },
      -1,
    );

    // H World: a lead from the expo, converted, now a deal at proposal.
    const hworld = await company(
      project.hworld.company,
      'hospitality',
      'shanghai',
      'exhibition',
      -40,
    );
    const hworldPeople = [
      await contact(
        project.hworld.people[0],
        hworld,
        project.hworld.company.domain,
        'male',
        true,
        61,
        -40,
      ),
      await contact(
        project.hworld.people[1],
        hworld,
        project.hworld.company.domain,
        'male',
        false,
        62,
        -30,
      ),
    ];
    let hworldLead = await save(
      'leads',
      {
        name: project.hworld.people[0].name,
        company: project.hworld.company.name,
        status: 'working',
        source: 'exhibition',
        ownerId: owner.id,
        email: `${project.hworld.people[0].mailbox}@${project.hworld.company.domain}.example`,
        phone: phone(61),
        jobTitle: project.hworld.people[0].jobTitle,
        gender: 'male',
        country: 'CN',
        state: provinceOf.shanghai,
        city: text.cities.shanghai,
        industry: 'hospitality',
        message: project.hworld.message,
      },
      -42,
    );
    await task(
      project.hworld.leadTask.name,
      { leadId: hworldLead.id },
      -40,
      10,
      'completed',
      project.hworld.leadTask.result,
    );
    await comment(
      'leads',
      hworldLead.id,
      owner.id,
      project.hworld.discovery.heading,
      project.hworld.discovery.body,
      -36,
      10,
    );
    // Converted with its deal, as a person converting it would: the deal
    // the conversion opens is the one taken on to proposal below, and the
    // lead's task is given the company and the deal with it.
    hworldLead = await convertLead(
      service,
      prepared,
      toText(hworldLead.id),
      {
        companyId: hworld.id,
        contactId: hworldPeople[0].id,
        createOpportunity: true,
        opportunityName: project.hworld.deal,
      },
      q,
    );
    const hworldDealId = toText(hworldLead.convertedOpportunityId);
    track(
      'opportunities',
      await service.get(prepared, 'opportunities', hworldDealId, q),
    );
    await q
      .updateTable('crmLeads')
      .set({ convertedAt: at(-33), updatedAt: at(-33) })
      .where('id', '=', hworldLead.id)
      .execute();
    await q
      .updateTable('crmOpportunities')
      .set({ createdAt: at(-33), updatedAt: at(-33) })
      .where('id', '=', hworldDealId)
      .execute();
    await q
      .updateTable('crmTasks')
      .set({ updatedAt: at(-33) })
      .where('leadId', '=', hworldLead.id)
      .execute();
    await historyAt(q, at(-33));
    const hworldDeal = await deal(
      {
        name: project.hworld.deal,
        ownerId: owner.id,
        companyId: hworld.id,
        amount: 680000,
        currency: 'CNY',
        source: 'exhibition',
        businessType: 'newBusiness',
        expectedCloseAt: at(25, 17),
        description: project.hworld.company.description,
        contacts: [
          { contactId: hworldPeople[0].id, role: 'decisionMaker' },
          { contactId: hworldPeople[1].id, role: 'evaluator' },
        ],
      },
      'proposal',
      -33,
      -2,
      hworldDealId,
    );
    const hworldLinks = {
      companyId: hworld.id,
      opportunityId: hworldDeal.id,
    };
    await comment(
      'opportunities',
      hworldDeal.id,
      owner.id,
      project.hworld.poc.heading,
      project.hworld.poc.body,
      -6,
      14,
    );
    const quoteSent = await task(
      project.hworld.quoteSent.heading,
      hworldLinks,
      -2,
      15,
      'completed',
      project.hworld.quoteSent.body,
    );
    const review = await task(
      project.hworld.review,
      hworldLinks,
      1,
      10,
      'open',
      null,
      project.hworld.reviewDescription,
    );

    // GAC: in negotiation, the contract under review.
    const gac = await company(
      project.gac.company,
      'automotive',
      'guangzhou',
      'partner',
      -75,
    );
    const gacPeople = [
      await contact(
        project.gac.people[0],
        gac,
        project.gac.company.domain,
        'male',
        true,
        63,
        -72,
      ),
      await contact(
        project.gac.people[1],
        gac,
        project.gac.company.domain,
        'female',
        false,
        64,
        -20,
      ),
    ];
    const gacDeal = await deal(
      {
        name: project.gac.deal,
        ownerId: owner.id,
        companyId: gac.id,
        amount: 1200000,
        currency: 'CNY',
        source: 'partner',
        businessType: 'newBusiness',
        expectedCloseAt: at(12, 17),
        description: project.gac.company.description,
        contacts: [
          { contactId: gacPeople[0].id, role: 'decisionMaker' },
          { contactId: gacPeople[1].id, role: 'influencer' },
        ],
      },
      'negotiation',
      -60,
      -10,
    );
    const gacLinks = { companyId: gac.id, opportunityId: gacDeal.id };
    const alignment = await task(
      project.gac.alignment.heading,
      gacLinks,
      -9,
      14,
      'completed',
      project.gac.alignment.body,
    );
    await comment(
      'opportunities',
      gacDeal.id,
      owner.id,
      project.gac.legal.heading,
      project.gac.legal.body,
      -4,
      11,
    );
    const gacNote = await comment(
      'opportunities',
      gacDeal.id,
      owner.id,
      '',
      project.gac.note,
      -3,
      17,
    );
    await task(project.gac.signing, gacLinks, -1, 16);
    await task(project.gac.followLegal, gacLinks, 0, 15);

    // New Hope: won, live, and an extension the AI advised pausing.
    const newHope = await company(
      project.newHope.company,
      'agriculture',
      'chengdu',
      'customerReferral',
      -120,
    );
    const newHopePeople = [
      await contact(
        project.newHope.people[0],
        newHope,
        project.newHope.company.domain,
        'female',
        true,
        65,
        -118,
      ),
      await contact(
        project.newHope.people[1],
        newHope,
        project.newHope.company.domain,
        'male',
        false,
        66,
        -110,
      ),
    ];
    const newHopeContacts = [
      { contactId: newHopePeople[0].id, role: 'decisionMaker' },
      { contactId: newHopePeople[1].id, role: 'champion' },
    ];
    const newHopeDeal = await deal(
      {
        name: project.newHope.deal,
        ownerId: owner.id,
        companyId: newHope.id,
        amount: 360000,
        currency: 'CNY',
        source: 'customerReferral',
        businessType: 'newBusiness',
        expectedCloseAt: at(-20, 17),
        description: project.newHope.company.description,
        contacts: newHopeContacts,
      },
      'won',
      -110,
      -20,
    );
    await comment(
      'opportunities',
      newHopeDeal.id,
      owner.id,
      project.newHope.kickoff.heading,
      project.newHope.kickoff.body,
      -18,
      10,
    );
    await comment(
      'companies',
      newHope.id,
      owner.id,
      project.newHope.training.heading,
      project.newHope.training.body,
      -12,
      15,
    );
    const expansion = await deal(
      {
        name: project.newHope.expansion,
        ownerId: owner.id,
        companyId: newHope.id,
        amount: 150000,
        currency: 'CNY',
        source: 'customerReferral',
        businessType: 'expansion',
        expectedCloseAt: at(60, 17),
        description: project.newHope.company.description,
        contacts: newHopeContacts,
      },
      'qualification',
      -8,
      -7,
    );
    await task(
      project.newHope.interview,
      { companyId: newHope.id, opportunityId: expansion.id },
      3,
      10,
    );
    return {
      sf,
      hworldLead,
      hworld,
      hworldDeal,
      hworldPeople,
      quoteSent,
      review,
      gac,
      gacDeal,
      gacPeople,
      gacNote,
      alignment,
      newHope,
      newHopeDeal,
      newHopePeople,
      expansion,
    };
  });
  // The importer's approvals go to the manager: H World's discount waits on
  // them; GAC's payment terms, which the AI's follow-up proposed, they
  // approved.
  await raise(
    owner,
    {
      name: project.hworld.approval.name,
      opportunityId: projects.hworldDeal.id,
      topic: 'discount',
      approverId: managerActor.id,
      description: project.hworld.approval.description,
    },
    -1,
    -1,
  );
  const gacApproval = await raise(
    owner,
    {
      name: project.gac.approval.name,
      opportunityId: projects.gacDeal.id,
      topic: 'paymentTerms',
      approverId: managerActor.id,
      description: project.gac.approval.description,
    },
    -10,
    -10,
  );
  await service.mutate(managerActor, async (prepared, q) => {
    await service.approvalAction(
      { ...prepared, quiet: true },
      toText(gacApproval.id),
      'approve',
      project.gac.approval.comment,
      q,
    );
    await q
      .updateTable('crmApprovals')
      .set({ decidedAt: at(-8, 16), updatedAt: at(-8, 16) })
      .where('id', '=', gacApproval.id)
      .execute();
    await historyAt(q, at(-8, 16));
  });

  // The AI's work, as its cards keep it (crmHistory, action `ai`): waiting
  // on the importer, a new lead's follow-up, H World's deal and tomorrow's
  // review prepared, and two approvals reviewed for them to decide; handled,
  // H World's lead converted, GAC's follow-up accepted, New Hope's extension
  // ignored and an approval decided as the review advised. Written straight
  // in, so nothing runs a model; the agents' pages count them as runs.
  await progress(60);
  const ai = project.ai;
  const aiEntry = async (
    entity: 'leads' | 'opportunities' | 'tasks' | 'approvals',
    record: Row,
    status: 'pending' | 'accepted' | 'dismissed',
    createdAt: string,
    entry: Row,
  ): Promise<void> => {
    await query
      .insertInto('crmHistory')
      .values({
        id: randomUUID(),
        entity,
        recordId: toText(record.id),
        actorId: owner.id,
        action: 'ai',
        source: 'ai',
        aiStatus: status,
        ai: JSON.stringify({
          kind: EVALUATION,
          startedAt: createdAt,
          ...entry,
        }),
        changes: JSON.stringify({}),
        createdAt,
      })
      .execute();
  };
  const decided = (day: number, hour: number): Row => ({
    decidedById: owner.id,
    decidedAt: at(day, hour),
  });
  await aiEntry('leads', projects.sf, 'pending', at(-1, 10, 6), {
    trigger: 'created',
    researchedAt: at(-1, 10, 6),
    result: ai.sfLead,
  });
  await aiEntry('leads', projects.hworldLead, 'accepted', at(-34, 9), {
    researchedAt: at(-34, 9),
    result: ai.hworldLead,
    ...decided(-33, 10),
  });
  // Run after Chen Lu's last WhatsApp messages went quiet (the SLA he asked
  // for, the remote presentation), as a customer's reply starts one.
  await aiEntry(
    'opportunities',
    projects.hworldDeal,
    'pending',
    at(-1, 21, 40),
    {
      trigger: 'customerReplied',
      result: ai.hworldDeal,
    },
  );
  await aiEntry('tasks', projects.review, 'pending', at(-1, 18), {
    result: ai.hworldPrep,
  });
  await aiEntry('opportunities', projects.gacDeal, 'accepted', at(-11, 9), {
    trigger: 'customerReplied',
    result: ai.gacDeal,
    taskId: toText(projects.alignment.id),
    submittedApprovals: [{ index: 0, id: toText(gacApproval.id) }],
    ...decided(-10, 10),
  });
  await aiEntry('opportunities', projects.expansion, 'dismissed', at(-6, 9), {
    trigger: 'opened',
    result: ai.newHopeExpansion,
    ...decided(-5, 10),
  });
  await aiEntry('approvals', discountApproval, 'pending', at(-1, 11, 6), {
    result: ai.reviewDiscount,
  });
  await aiEntry('approvals', contractApproval, 'pending', at(-2, 11, 6), {
    result: ai.reviewContract,
  });
  await aiEntry('approvals', paymentTerms, 'accepted', at(-6, 11, 6), {
    result: ai.reviewPayment,
    decision: 'approve',
    comment: ai.reviewPayment.comment,
    ...decided(-5, 15),
  });

  // The companies' signals (company-signals.ts), with their timeline lines,
  // as a check would have left them: real, neutral events a search found
  // on them, with their real sources and dates.
  for (const signal of project.signals) {
    const companyId = toText(
      typeof signal.company === 'number'
        ? companies_[signal.company]?.id
        : projects[signal.company].id,
    );
    const createdAt = at(-signal.foundDaysAgo, 9, 30);
    const occurredOn = signal.occurredOn;
    const id = randomUUID();
    const runId = randomUUID();
    await query
      .insertInto('crmSignals')
      .values({
        id,
        companyId,
        type: signal.type,
        title: signal.title,
        summary: signal.summary,
        occurredOn,
        sources: JSON.stringify(signal.sources),
        eventKey: eventKey(signal.type, occurredOn, signal.title),
        status: signal.status,
        runId,
        decidedById: null,
        decidedAt: null,
        createdAt,
        updatedAt: createdAt,
      })
      .execute();
    await query
      .insertInto('crmHistory')
      .values({
        id: runId,
        entity: 'companies',
        recordId: companyId,
        actorId: 'system',
        action: 'signal',
        source: 'ai',
        toValue: signal.type,
        changes: JSON.stringify({
          signalId: id,
          type: signal.type,
          title: signal.title,
          occurredOn,
          source: signal.sources[0] ?? null,
        }),
        createdAt,
      })
      .execute();
  }

  // The company's WhatsApp numbers, with conversations as the webhook would
  // have kept them (demo-whatsapp.ts).
  if (whatsapp)
    await populateDemoWhatsApp(
      query,
      whatsapp,
      {
        text: text.whatsapp,
        at,
        contacts,
        leads,
        hworldPeople: projects.hworldPeople,
      },
      (part) => {
        manifest.whatsapp = part;
      },
    );

  await progress(65);
  setDemoMailLanguage(language);
  // The demo mailboxes: the messages first, which the plugin reads as soon
  // as a mailbox connects, then a mailbox for each demo account and the
  // importer, holding the conversations of the records they own.
  if (mailboxes) {
    const people = await query
      .selectFrom('user')
      .select(['id', 'username', 'email', 'name'])
      .where('id', 'in', [actor.id, ...Object.values(userIds)])
      .execute();
    // Every demo mailbox is at the demo's own domain, the importer's too:
    // a demo mailbox sends only to the demo's addresses, and one at the
    // importer's real address would collide with their real mailbox.
    const mailboxOf = (id: string, name?: string): DemoMailbox => {
      const person = people.find((p) => toText(p.id) === id);
      const username = toText(person?.username ?? '') || id;
      return {
        address: `${username.toLowerCase()}@demo.example`,
        name: name ?? (toText(person?.name ?? '') || username),
      };
    };
    const seatName = (seat: DemoSeat): string => text.accounts[seat].name;
    const seat = (key: DemoSeat): DemoMailbox =>
      mailboxOf(userIds[key], seatName(key));
    const own = mailboxOf(actor.id);
    const demoSeats = {
      manager: {
        ...seat('manager'),
        address: `${text.accounts.manager.username}@demo.example`,
      },
      secondManager: {
        ...seat('secondManager'),
        address: `${text.accounts.secondManager.username}@demo.example`,
      },
      firstSeller: {
        ...seat('firstSeller'),
        address: `${text.accounts.firstSeller.username}@demo.example`,
      },
      secondSeller: {
        ...seat('secondSeller'),
        address: `${text.accounts.secondSeller.username}@demo.example`,
      },
    };
    const ownerBox = (id: string): DemoMailbox =>
      id === actor.id
        ? own
        : (Object.entries(userIds)
            .map(([key, value]) =>
              value === id ? demoSeats[key as DemoSeat] : undefined,
            )
            .find(Boolean) ?? own);
    const money = (amount: number): string =>
      new Intl.NumberFormat(language, {
        style: 'currency',
        currency: 'CNY',
        maximumFractionDigits: 0,
      }).format(amount);
    const person = (row: Row): DemoMailbox => ({
      address: toText(row.email).toLowerCase(),
      name: toText(row.name),
    });
    // A deal's conversation with one of its company's contacts.
    const aboutDeal = (
      topic: DemoMailTopic,
      d: number,
      contact: 0 | 1,
      lastDay: number,
    ): DemoConversation => {
      const a = deals[d][0];
      return {
        topic,
        owner: ownerBox(toText(opportunities[d].ownerId)),
        other: person(contacts[a][contact]),
        company: text.companies[a].name,
        deal: text.deals[d],
        amount: money(deals[d][1]),
        lastDay,
      };
    };
    const aboutLead = (
      topic: DemoMailTopic,
      i: number,
      lastDay: number,
    ): DemoConversation => ({
      topic,
      owner: ownerBox(toText(leads[i].ownerId)),
      other: person(leads[i]),
      company: toText(leads[i].company),
      lastDay,
    });
    // The importer's projects' threads, each with one of the deal's
    // people; SF Express's lead is new and has none.
    const aboutProject = (): DemoConversation[] =>
      (
        [
          [
            'quotation',
            projects.hworldDeal,
            projects.hworldPeople[0],
            680000,
            2,
          ],
          [
            'securityReview',
            projects.hworldDeal,
            projects.hworldPeople[1],
            680000,
            5,
          ],
          [
            'contractClause',
            projects.gacDeal,
            projects.gacPeople[0],
            1200000,
            3,
          ],
          [
            'onboarding',
            projects.newHopeDeal,
            projects.newHopePeople[0],
            360000,
            16,
          ],
          [
            'invoice',
            projects.newHopeDeal,
            projects.newHopePeople[0],
            360000,
            12,
          ],
        ] as const
      ).map(([topic, deal, contact, amount, lastDay]) => ({
        topic,
        owner: own,
        other: person(contact),
        company: toText(
          [projects.hworld, projects.gac, projects.newHope].find(
            (company) => company.id === deal.companyId,
          )?.name,
        ),
        deal: toText(deal.name),
        amount: money(amount),
        lastDay,
      }));
    // Between two people of the team, both keeping a copy.
    const between = (
      topic: DemoMailTopic,
      from: DemoMailbox,
      to: DemoMailbox,
      lastDay: number,
      about: Partial<DemoConversation> = {},
    ): DemoConversation => ({
      topic,
      owner: from,
      other: to,
      internal: true,
      lastDay,
      ...about,
    });
    const dealOf = (d: number): Partial<DemoConversation> => ({
      company: text.companies[deals[d][0]].name,
      deal: text.deals[d],
      amount: money(deals[d][1]),
    });
    // The mail every salesperson gets that concerns no record.
    const everyday = [own, ...Object.values(demoSeats)].flatMap(
      (mailbox): DemoConversation[] =>
        (
          [
            ['newsletter', 'newsletter', 3],
            ['eventInvite', 'events', 6],
            ['release', 'product', 4],
            ['officeNotice', 'office', 2],
          ] as const
        ).map(([topic, sender, lastDay]) => ({
          topic,
          owner: mailbox,
          other: text.mailSenders[sender],
          lastDay,
        })),
    );
    // A customer's last message is at least two days old, so none reads as
    // a reply just received (which would start an AI follow-up), and only
    // working, nurtured and invalid leads have mail (mail would turn a new
    // one working). The closed deals' mail is dated around their closing.
    const conversations: DemoConversation[] = [
      // The open deals, a thread each and the busiest two.
      aboutDeal('quotation', 0, 0, 2),
      aboutDeal('deploymentRequirements', 0, 1, 5),
      aboutDeal('contractClause', 1, 0, 1),
      aboutDeal('vendorOnboarding', 1, 1, 3),
      aboutDeal('discount', 2, 0, 3),
      aboutDeal('securityReview', 2, 1, 6),
      aboutDeal('trialFeedback', 3, 1, 4),
      aboutDeal('needsRecap', 4, 0, 2),
      aboutDeal('budgetPaused', 7, 0, 8),
      aboutDeal('discovery', 24, 0, 3),
      aboutDeal('introduction', 25, 1, 1),
      aboutDeal('requirementCall', 26, 0, 2),
      aboutDeal('questionnaire', 27, 0, 4),
      aboutDeal('pocSetup', 28, 1, 6),
      aboutDeal('proposalFollowUp', 29, 0, 5),
      // Won and lost.
      aboutDeal('onboarding', 5, 0, 15),
      aboutDeal('supportQuestion', 5, 1, 6),
      aboutDeal('kickoff', 6, 0, 1),
      aboutDeal('invoice', 6, 0, 2),
      aboutDeal('declined', 8, 0, 21),
      aboutDeal('renewalDeclined', 9, 0, 4),
      aboutDeal('acceptance', 16, 0, 93),
      aboutDeal('tenderWon', 17, 0, 86),
      aboutDeal('requirementGap', 20, 0, 61),
      aboutDeal('goLiveCheck', 22, 0, 30),
      aboutDeal('competitorChosen', 23, 0, 35),
      // The leads.
      aboutLead('leadMigration', 5, 2),
      aboutLead('firstReply', 6, 2),
      aboutLead('meeting', 7, 3),
      aboutLead('pricing', 8, 9),
      aboutLead('nurtureCheckIn', 9, 20),
      aboutLead('nurtureCase', 10, 25),
      aboutLead('jobSeeker', 11, 10),
      aboutLead('bounce', 12, 12),
      aboutLead('leadTechnical', 13, 2),
      aboutLead('leadBudget', 15, 2),
      // The importer's projects.
      ...aboutProject(),
      // Between colleagues.
      between('internal', demoSeats.secondManager, demoSeats.manager, 2, {
        deal: text.deals[3],
      }),
      between(
        'discountPrep',
        ownerBox(toText(opportunities[2].ownerId)),
        demoSeats.manager,
        3,
        dealOf(2),
      ),
      between(
        'forecast',
        demoSeats.manager,
        ownerBox(toText(opportunities[1].ownerId)),
        1,
        dealOf(1),
      ),
      between(
        'handover',
        ownerBox(toText(leads[7].ownerId)),
        ownerBox(toText(leads[13].ownerId)),
        2,
        { company: toText(leads[7].company) },
      ),
      ...everyday,
    ].filter(
      // A conversation with oneself, should two parts fall to one person.
      (conversation) =>
        conversation.owner.address !== conversation.other.address,
    );
    // A store an interrupted removal left behind gives way to this one.
    await query
      .deleteFrom('crmSettings')
      .where('id', '=', DEMO_MAIL_ROW)
      .execute();
    await query
      .insertInto('crmSettings')
      .values({
        id: DEMO_MAIL_ROW,
        value: JSON.stringify(buildDemoMail(text, conversations, at)),
        updatedAt: new Date(),
      })
      .execute();
    const owners: [string, DemoMailbox][] = [
      [actor.id, own],
      ...(Object.entries(userIds) as [DemoSeat, string][]).map(
        ([key, id]): [string, DemoMailbox] => [id, demoSeats[key]],
      ),
    ];
    manifest.mailAccounts = [];
    for (const [index, [userId, mailbox]] of owners.entries()) {
      const accountId = await mailboxes
        .connect(userId, mailbox)
        .catch((error: unknown) => {
          if (options.strict) throw error;
          return undefined;
        });
      if (accountId) manifest.mailAccounts.push({ userId, accountId });
      // The mailboxes take the longest, the plugin copying each one's mail.
      await progress(70 + Math.round(((index + 1) / owners.length) * 20));
    }
  }
  await progress(90);

  // The import queued a notification for every assignment; a demo inbox
  // full of "assigned to you" would drown what the demo is meant to show.
  await query.deleteFrom('crmOutbox').where('recordId', 'in', ids()).execute();
  // What the importer is told of, as it happens now, the manager writing:
  // a comment on H World's deal that @-mentions them, a reply to their own
  // comment on GAC's, and a task on New Hope given to them. Each is
  // delivered to their inbox by the notification pass.
  const ownName =
    toText(
      (
        await query
          .selectFrom('user')
          .select(['name', 'username'])
          .where('id', '=', actor.id)
          .executeTakeFirst()
      )?.name ?? '',
    ) || actor.id;
  await service.addComment(
    managerActor,
    'opportunities',
    toText(projects.hworldDeal.id),
    project.hworld.mention.replace('{{name}}', ownName),
    [actor.id],
  );
  await service.addComment(
    managerActor,
    'opportunities',
    toText(projects.gacDeal.id),
    project.gac.reply,
    [],
    projects.gacNote,
  );
  await service.mutate(managerActor, async (prepared, q) => {
    track(
      'tasks',
      await service.save(
        prepared,
        'tasks',
        {
          name: project.newHope.renewal,
          companyId: projects.newHope.id,
          opportunityId: projects.newHopeDeal.id,
          ownerId: owner.id,
          dueAt: at(4, 10),
          status: 'open',
          description: text.taskDescription,
        },
        undefined,
        q,
      ),
    );
  });

  // The importer's conversations with the assistant about their projects,
  // each a few minutes long, over the last days.
  await progress(95);
  if (chats) {
    manifest.chats = [];
    const when: readonly [number, number][] = [
      [-3, 16],
      [-2, 9.5],
      [-1, 11],
      [-1, 17],
    ];
    for (const [index, chat] of project.chats.entries()) {
      const [day, hour] = when[index] ?? [-1, 9];
      const about = [projects.hworldDeal, null, projects.gacDeal, projects.sf][
        index
      ];
      const kind = about === projects.sf ? 'leads' : 'opportunities';
      const id = await chats
        .create(actor.id, {
          title: chat.title,
          ...(about
            ? {
                context: {
                  kind,
                  id: toText(about.id),
                  title: toText(about.name),
                  path: `/${kind}/${toText(about.id)}`,
                },
              }
            : {}),
          messages: chat.messages.map((message, place) => ({
            ...message,
            at: at(day, hour, place * 2),
          })),
        })
        .catch(() => undefined);
      if (id) manifest.chats.push(id);
    }
  }

  // The manifest makes the import repeat-safe and records exactly which rows
  // it created, so removal can find them again.
  await query
    .updateTable('crmSettings')
    .set({ value: JSON.stringify(manifest), updatedAt: new Date() })
    .where('id', '=', DEMO_MARKER)
    .execute();
  reached(100);
  return demoStatus(service, actor);
}

// Removes exactly the rows the import created, in dependency order. The demo
// accounts stay: they are ordinary accounts now, and deleting people is the
// Users page's job.
export async function resetDemo(
  service: CrmService,
  actor: Actor,
  accounts?: DemoAccountCreator,
  mailboxes?: DemoMailboxes,
  chats?: DemoChats,
  inbox?: DemoInbox,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const query = service.database.query();
  const row = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const manifest = row ? parseManifest(row.value) : undefined;
  if (!manifest) throw new CrmError('demoMissing', 404);
  // The demo mailboxes go first, while the manifest still records them;
  // the plugin deletes their mail. One the user removed already is passed
  // over. An import made before the dataset had mail has none.
  if (mailboxes)
    for (const { userId, accountId } of manifest.mailAccounts ?? [])
      await mailboxes.remove(userId, accountId).catch(() => undefined);
  if (chats && manifest.chats?.length)
    await chats.remove(manifest.chats).catch(() => undefined);
  await deleteRecords(service, manifest);
  // The notifications already in people's inboxes about its records, and
  // any other about a record gone, which would only open nothing.
  if (inbox) await inbox.removeOrphans().catch(() => undefined);
  await query
    .deleteFrom('crmSettings')
    .where('id', 'in', [DEMO_MARKER, DEMO_MAIL_ROW])
    .execute();
  setDemoMailLanguage(undefined);
  if (accounts) await disableDemoAccounts(service, actor, accounts);
  // The sales manager role the import gave its importer goes with it.
  if (manifest.importerManager)
    await service.authz.permissionSets.replaceSubjectAssignments({
      subject: { type: 'user', id: manifest.ownerId },
      managedPermissionSets: [roleKey('sales-manager')],
      permissionSets: [],
    });
  return demoStatus(service, actor);
}

// The demo's accounts go with its data: those an import created (a demo
// username at the demo's own mail domain; an existing account an import
// reused keeps its own address and stays as it was), of either language, are
// disabled: they no longer sign in, nor are they offered as owners or
// participants. Never the reader's own account.
const DEMO_DOMAIN = '@demo.example';
async function disableDemoAccounts(
  service: CrmService,
  actor: Actor,
  accounts: DemoAccountCreator,
): Promise<void> {
  const usernames = new Set(
    (['zh-CN', 'en-US'] as const).flatMap((language) =>
      demoAccountsIn(language).map((account) => account.username),
    ),
  );
  const rows = await service.database
    .query()
    .selectFrom('user')
    .select(['id', 'username', 'email'])
    .where('deletedAt', 'is', null)
    .where('disabledAt', 'is', null)
    .execute();
  for (const user of rows)
    if (
      toText(user.id) !== actor.id &&
      usernames.has(toText(user.username)) &&
      toText(user.email).toLowerCase().endsWith(DEMO_DOMAIN)
    )
      await accounts.disable(toText(user.id));
}

// Deletes the rows a manifest records, with their history and queued
// messages, in dependency order.
async function deleteRecords(
  service: CrmService,
  manifest: Manifest,
): Promise<void> {
  const byEntity = new Map<string, string[]>();
  for (const record of manifest.records) {
    const list = byEntity.get(record.entity) ?? [];
    list.push(record.id);
    byEntity.set(record.entity, list);
  }
  const all = manifest.records.map((r) => r.id);
  await service.database.transaction(async ({ query: q }) => {
    if (all.length) {
      await q.deleteFrom('crmHistory').where('recordId', 'in', all).execute();
      await q.deleteFrom('crmOutbox').where('recordId', 'in', all).execute();
    }
    // The companies' signals (company-signals.ts) go with them.
    const companies = byEntity.get('companies') ?? [];
    if (companies.length)
      await q
        .deleteFrom('crmSignals')
        .where('companyId', 'in', companies)
        .execute();
    if (companies.length)
      await q
        .deleteFrom('crmSignalChecks')
        .where('companyId', 'in', companies)
        .execute();
    // The approvals' lifecycle log (server/lifecycles/approvals.ts) goes
    // with them.
    const approvals = byEntity.get('approvals') ?? [];
    if (approvals.length) {
      await q
        .deleteFrom('lifecycleEffectRuns')
        .where('lifecycle', '=', 'approvals')
        .where('recordId', 'in', approvals)
        .execute();
      await q
        .deleteFrom('lifecycleTransitions')
        .where('lifecycle', '=', 'approvals')
        .where('recordId', 'in', approvals)
        .execute();
    }
    for (const [entity, table] of [
      ['tasks', 'crmTasks'],
      ['approvals', 'crmApprovals'],
      ['opportunities', 'crmOpportunities'],
      ['contacts', 'crmContacts'],
      ['leads', 'crmLeads'],
      ['companies', 'crmCompanies'],
    ] as const) {
      const ids = byEntity.get(entity) ?? [];
      if (ids.length)
        await q.deleteFrom(table).where('id', 'in', ids).execute();
    }
    if (manifest.whatsapp) await removeDemoWhatsApp(q, manifest.whatsapp);
    // A WhatsApp customer someone linked to a demo lead or contact is
    // unlinked again, its record gone.
    for (const [entity, column] of [
      ['leads', 'leadId'],
      ['contacts', 'contactId'],
    ] as const) {
      const ids = byEntity.get(entity) ?? [];
      if (ids.length)
        await q
          .updateTable('crmWaContacts')
          .set({
            state: 'unlinked',
            leadId: null,
            contactId: null,
            matchedBy: null,
            updatedAt: new Date().toISOString(),
          })
          .where(column, 'in', ids)
          .execute();
    }
  });
}
