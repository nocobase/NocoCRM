import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { DatabaseManager } from '@nocobase/db';
import { BACKGROUND_INSTRUCTIONS, BACKGROUND_MARKER } from './background.js';

// The CRM's work agents, one for each kind of work the AI does on its own,
// as the Agent work page's tabs are: lead follow-up, opportunity follow-up,
// approval review, task preparation and company research. Each is how an
// administrator configures its work on that page: the model the work asks
// and the instructions that open each run's system prompt; its method skill
// is the library's (crm/ai-model.ts reads it). The work is one model call
// each, made by the CRM's code with the material it gathered, never a
// conversation, and nobody chats with them. The things people ask of the AI
// on a record go to the agent of that record's work: a lead's capture and
// merge to the lead follow-up, a deal's capture to the opportunity
// follow-up, a task's outcome write-up to the task preparation.
//
// They are the CRM's own since the Agents plugin 1.0 (template 1.0.0-beta.74),
// which keeps no online agents: its agents are the coding tools runners
// report. What an administrator set on the agents the CRM had made there
// (their first model, instructions they changed) was taken over once
// (adoptLegacyWorkAgents); the plugin keeps those rows disabled.

// Where their settings are kept, in `crmSettings`.
export const WORK_AGENTS_SETTINGS = 'ai-work-agents';
// The plugin agents an earlier release made for them, by work.
export const WORK_AGENTS_MARKER = 'agents-work-v1';

export const WORKS = [
  'leads',
  'opportunities',
  'approvals',
  'tasks',
  'signals',
] as const;
export type Work = (typeof WORKS)[number];

export type ModelRef = { modelService: string; model: string };

// The model every work asks first when its service is configured
// (server/config/ai.ts): DeepSeek's fast one, the company research's too
// since 2026-10-19, when it searches through DeepSeek's Search API
// (web-research.ts; Qwen's fast one led that work before). A model that
// reasons at length (Qwen Max) spent minutes and thousands of tokens of
// thinking on each follow-up, which the work does not need.
const FIRST_MODEL = { provider: 'deepseek', model: 'deepseek-flash' };

// The providers whose models can search the web (web-research.ts); a
// DeepSeek service through DeepSeek's Search API since 2026-10-19.
const SEARCHING = new Set([
  'alibaba',
  'deepseek',
  'openai',
  'anthropic',
  'google',
]);

export const WORK_AGENTS: Record<
  Work,
  { name: string; skill: string; task: string }
> = {
  leads: {
    name: 'Lead follow-up',
    skill: 'lead-follow-up',
    task: 'following leads up, organising pasted text into leads and proposing how to merge duplicate leads',
  },
  opportunities: {
    name: 'Opportunity follow-up',
    skill: 'opportunity-follow-up',
    task: 'following opportunities up and organising pasted text into opportunities',
  },
  approvals: {
    name: 'Approval review',
    skill: 'approval-review',
    task: 'reviewing approval requests for their approvers',
  },
  tasks: {
    // Named for both of its works, the preparation and the outcome's
    // write-up, unlike the Agent work tab, which shows the first.
    name: 'Task assistant',
    skill: 'task-preparation',
    task: 'preparing tasks for their owners and writing up what came of a task',
  },
  signals: {
    name: 'Company research',
    skill: 'company-signals',
    task: "finding on the web what the team needs to know about the companies it sells to: a new company's particulars, a lead's company before its follow-up, and what happened lately at the companies it watches",
  },
};

// A work's shipped instructions: what it does, then the rules every work
// keeps.
export function workInstructions(work: Work): string {
  const rules = BACKGROUND_INSTRUCTIONS.split('\n').slice(1).join('\n');
  return `You do one part of the CRM's work: ${WORK_AGENTS[work].task}. Nobody reads your answer as a chat: the CRM reads it and shows the result to the people who decide.\n${rules}`;
}

// What an administrator set for a work: its model (null: the default) and
// its instructions (null: the shipped ones).
export interface WorkAgentSetting {
  model: ModelRef | null;
  instructions: string | null;
}

type Stored = {
  version: 1;
  works: Partial<Record<Work, WorkAgentSetting>>;
  // Set once the plugin agents of an earlier release were read.
  adopted?: boolean;
};

function parse(value: unknown): unknown {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

// A stored text, or a date as the database hands it back.
function textOf(value: unknown): string {
  return typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : '';
}

function modelOf(value: unknown): ModelRef | null {
  const found = value as { modelService?: unknown; model?: unknown } | null;
  return typeof found?.modelService === 'string' &&
    found.modelService &&
    typeof found.model === 'string' &&
    found.model
    ? { modelService: found.modelService, model: found.model }
    : null;
}

function storedOf(value: unknown): Stored {
  const parsed = parse(value) as {
    works?: Record<string, unknown>;
    adopted?: unknown;
  } | null;
  const works: Partial<Record<Work, WorkAgentSetting>> = {};
  for (const work of WORKS) {
    const entry = parsed?.works?.[work] as {
      model?: unknown;
      instructions?: unknown;
    } | null;
    if (!entry) continue;
    works[work] = {
      model: modelOf(entry.model),
      instructions:
        typeof entry.instructions === 'string' && entry.instructions.trim()
          ? entry.instructions
          : null,
    };
  }
  return { version: 1, works, ...(parsed?.adopted ? { adopted: true } : {}) };
}

async function readStored(database: DatabaseManager): Promise<Stored | null> {
  const row = await database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', WORK_AGENTS_SETTINGS)
    .executeTakeFirst()
    .catch(() => undefined);
  return row ? storedOf(row.value) : null;
}

async function writeStored(
  database: DatabaseManager,
  stored: Stored,
  exists: boolean,
): Promise<void> {
  const query = database.query();
  const value = JSON.stringify(stored);
  if (exists)
    await query
      .updateTable('crmSettings')
      .set({ value, updatedAt: new Date() })
      .where('id', '=', WORK_AGENTS_SETTINGS)
      .execute();
  else
    await query
      .insertInto('crmSettings')
      .values({ id: WORK_AGENTS_SETTINGS, value, updatedAt: new Date() })
      .execute();
}

// What an administrator set for each work.
export async function workAgentSettings(
  database: DatabaseManager,
): Promise<Partial<Record<Work, WorkAgentSetting>>> {
  return (await readStored(database))?.works ?? {};
}

// Sets a work's model and instructions; null for either goes back to the
// default.
export async function saveWorkAgent(
  database: DatabaseManager,
  work: Work,
  setting: WorkAgentSetting,
): Promise<void> {
  const stored = await readStored(database);
  const instructions = setting.instructions?.trim()
    ? setting.instructions.trim()
    : null;
  await writeStored(
    database,
    {
      version: 1,
      works: {
        ...stored?.works,
        [work]: {
          model: setting.model,
          // The shipped text kept as such, so a later release's applies.
          instructions:
            instructions === workInstructions(work) ? null : instructions,
        },
      },
      ...(stored?.adopted ? { adopted: true } : {}),
    },
    stored !== null,
  );
}

// Every chat model of the enabled services, in their order, the services of
// `preferred`'s provider first.
export async function chatModels(
  agents: Agents,
  preferred?: string,
): Promise<(ModelRef & { provider: string })[]> {
  const { services } = await agents.models.gateway.catalog('chat');
  return [
    ...services.filter((service) => service.provider === preferred),
    ...services.filter((service) => service.provider !== preferred),
  ].flatMap((service) =>
    service.models
      .filter((model) => model.kind === 'chat')
      .map((model) => ({
        modelService: service.name,
        model: model.value,
        provider: service.provider,
      })),
  );
}

// The model a work asks while nobody chose one: DeepSeek's fast one, else
// the first chat model, the company research's among those that can search
// first; null while no service offers a chat model.
function defaultModel(
  models: readonly (ModelRef & { provider: string })[],
  work: Work,
): ModelRef | null {
  const usable =
    work === 'signals'
      ? [
          ...models.filter((model) => SEARCHING.has(model.provider)),
          ...models.filter((model) => !SEARCHING.has(model.provider)),
        ]
      : models;
  const first =
    usable.find(
      (model) =>
        model.provider === FIRST_MODEL.provider &&
        model.model === FIRST_MODEL.model,
    ) ?? usable[0];
  return first
    ? { modelService: first.modelService, model: first.model }
    : null;
}

// The model a work asks and the instructions its runs open with: the one an
// administrator chose while an enabled service still offers it, else the
// default; null when there is no chat model at all.
export async function workAgentRun(
  agents: Agents,
  // Null where there is none (tests): the defaults.
  database: DatabaseManager | null,
  work: Work,
): Promise<{ model: ModelRef; instructions: string } | null> {
  const setting = database
    ? (await workAgentSettings(database))[work]
    : undefined;
  const models = await chatModels(agents, FIRST_MODEL.provider);
  const chosen = setting?.model;
  const offered =
    chosen &&
    models.some(
      (model) =>
        model.modelService === chosen.modelService &&
        model.model === chosen.model,
    );
  const model = offered ? chosen : defaultModel(models, work);
  if (!model) return null;
  return {
    model,
    instructions: (setting?.instructions ?? workInstructions(work)).trim(),
  };
}

// The work agents as the CRM names the one doing their work: the name and
// description as references the client translates (the English name is the
// usage page's source), the model each asks now and whether an
// administrator chose it, and its instructions.
export interface WorkAgentName {
  name: string;
  nameText: { key: string; ns: string } | null;
  description: string | null;
  descriptionText: { key: string; ns: string } | null;
  model: ModelRef | null;
}
export async function workAgentNames(
  agents: Agents | null,
  database: DatabaseManager,
): Promise<Partial<Record<Work, WorkAgentName>>> {
  const names: Partial<Record<Work, WorkAgentName>> = {};
  for (const work of WORKS) {
    const run = agents
      ? await workAgentRun(agents, database, work).catch(() => null)
      : null;
    names[work] = {
      name: WORK_AGENTS[work].name,
      nameText: { key: `crm.agentWork.names.${work}`, ns: 'crm' },
      description: null,
      descriptionText: { key: `crm.agentWork.${work}`, ns: 'crm' },
      model: run?.model ?? null,
    };
  }
  return names;
}

// Once: what an administrator set on the plugin agents an earlier release
// made for the work (their first model, and their instructions where they
// changed them), and on the Background AI before those, taken over as the
// work's settings. The plugin's upgrade disabled those agents and keeps
// their rows, read here directly; one an administrator had archived before
// is left out, its work having followed the assistant's model since.
export async function adoptLegacyWorkAgents(
  database: DatabaseManager,
): Promise<void> {
  const stored = await readStored(database);
  if (stored?.adopted) return;
  const query = database.query();
  const markerValue = async (id: string): Promise<unknown> =>
    parse(
      (
        await query
          .selectFrom('crmSettings')
          .select('value')
          .where('id', '=', id)
          .executeTakeFirst()
          .catch(() => undefined)
      )?.value,
    );
  const idsValue = (await markerValue(WORK_AGENTS_MARKER)) as {
    agentIds?: Record<string, unknown>;
  } | null;
  const ids: Partial<Record<Work, string>> = {};
  for (const work of WORKS) {
    const id = idsValue?.agentIds?.[work];
    if (typeof id === 'string' && id) ids[work] = id;
  }
  const background = (await markerValue(BACKGROUND_MARKER)) as {
    agentId?: unknown;
  } | null;
  const backgroundId =
    typeof background?.agentId === 'string' && background.agentId
      ? background.agentId
      : null;
  const wanted = [
    ...Object.values(ids),
    ...(backgroundId ? [backgroundId] : []),
  ];
  const rows = wanted.length
    ? await query
        .selectFrom('agAgents')
        .selectAll()
        .where('id', 'in', wanted)
        .execute()
        .catch(() => [])
    : [];
  const rowOf = (id: string | null | undefined) =>
    id ? (rows.find((row) => row.id === id) as Record<string, unknown>) : null;
  // Archived by a person before the upgrade archived every agent at once.
  const archivedBefore = (row: Record<string, unknown>): boolean => {
    const archived = Date.parse(textOf(row.archivedAt));
    const deleted = Date.parse(textOf(row.deletedAt));
    return (
      Number.isFinite(archived) &&
      (!Number.isFinite(deleted) || deleted - archived > 60_000)
    );
  };
  const backgroundRow = rowOf(backgroundId);
  const backgroundEdited =
    backgroundRow && !archivedBefore(backgroundRow)
      ? textOf(backgroundRow.instructions).trim()
      : '';
  const works: Partial<Record<Work, WorkAgentSetting>> = { ...stored?.works };
  for (const work of WORKS) {
    if (works[work]) continue;
    const row = rowOf(ids[work]);
    if (row && !archivedBefore(row)) {
      const entries = parse(row.modelEntries);
      const instructions = textOf(row.instructions).trim();
      works[work] = {
        model: modelOf(Array.isArray(entries) ? entries[0] : null),
        instructions:
          instructions && instructions !== workInstructions(work)
            ? instructions
            : null,
      };
    } else if (
      !row &&
      backgroundEdited &&
      backgroundEdited !== BACKGROUND_INSTRUCTIONS
    )
      works[work] = { model: null, instructions: backgroundEdited };
  }
  await writeStored(database, { version: 1, works, adopted: true }, !!stored);
}
