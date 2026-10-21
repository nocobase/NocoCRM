import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { idGeneratorToken } from '@nocobase/app-server/id-generator';
import { databaseManagerToken } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import {
  WORK_AGENTS,
  workAgentRun,
  type Work,
} from '../crm-agents/work-agents.js';
import { generateText, type LanguageModelUsage } from 'ai';
import { z, type ZodType } from 'zod';
import { TEXT_LIMIT } from './limits.js';
import { CrmError, toText } from './schema.js';

// The CRM's own model calls (migration step 1): the follow-ups, the reviews,
// the captures, the merge proposals and the feedback write-ups ask the
// Agents plugin's model gateway's language models, which keep the keys,
// with their reasoning turned off (generateQuietly), the use recorded in
// the plugin's usage table under the work agent's name. Each call is a
// work's (crm-agents/work-agents.ts: the lead and opportunity follow-ups,
// approval review, task preparation, company research), whose settings on
// the Agent work page are how an administrator configures it: the model
// asked, and the instructions that open the system prompt. A run is a
// session of turns, each one call: a reply in another shape than asked is
// asked once more with what came before. Results are JSON in the reply,
// checked against the shape the caller gives; the gateway's `generate` has
// no structured output of its own.

// Who the usage page records a work's use as: its agent, by name.
export const sourceOf = (work: Work): string => WORK_AGENTS[work].name;

type ModelRef = { modelService: string; model: string };

// The model a work's run answers with and the instructions it opens with,
// or null when there is no model to ask (no agents plugin, no enabled chat
// model): the CRM's AI is then off.
async function crmRun(
  container: ServiceResolver,
  work: Work,
): Promise<{ model: ModelRef; instructions: string } | null> {
  if (!container.has(agentsToken)) return null;
  return workAgentRun(
    container.resolve(agentsToken),
    container.has(databaseManagerToken)
      ? container.resolve(databaseManagerToken)
      : null,
    work,
  );
}

// The model a work's run answers with, or null when there is none to ask.
export async function crmModel(
  container: ServiceResolver,
  work: Work,
): Promise<ModelRef | null> {
  return (await crmRun(container, work))?.model ?? null;
}

// Whether the CRM's AI can run: there is a model to ask (the follow-ups'
// standing for every work's, which differ only by an agent's model).
export async function aiAvailable(
  container: ServiceResolver,
): Promise<boolean> {
  return (await crmModel(container, 'leads').catch(() => null)) !== null;
}

export interface ModelSession {
  // Asks the next turn and returns the reply's text.
  ask(content: string, signal?: AbortSignal): Promise<string>;
  // Asks for one JSON object in the given shape, spelled out after the
  // content; once more when the reply does not hold it. Null when neither
  // did.
  askJson<T>(
    content: string,
    shape: ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T | null>;
}

// How long one turn of a background run (a follow-up, a review, a
// preparation) may take: a model that reasons at length (Qwen Max) takes
// minutes over a follow-up's material, and the gateway's call cannot turn
// that off. Within the ten minutes after which a running card reads as
// failed.
export const RUN_TURN_MS = 8 * 60_000;

// How a background run settles what the material leaves open, in every
// run whatever the agent's instructions say. A reasoning model given
// material that contradicts itself (an approved term and a mail naming
// another) deliberated without end: a deal's follow-up thought for minutes
// and gave no answer within the output limit or the turn's time.
const DECIDING = [
  'Decide once and move on:',
  '- When the material contradicts itself, go by the newest source, name the contradiction among the risks, and do not try to reconcile it further.',
  '- When a judgement is close (a confidence, whether a value is contradicted, whether a term is covered), take the more cautious reading at once: medium confidence, no update, the term needing approval.',
  '- Weigh each point once; never return to a point already decided. Keep your reasoning short and give the answer.',
].join('\n');

// One turn of a background run, asked with the model's reasoning turned
// off. @temporary(nocobase-official): the gateway's `generate` cannot turn
// it off, and a reasoning model (Qwen, DeepSeek) then thought for minutes
// over a deal's follow-up, past the turn's limit or its output limit,
// giving no answer; so the turn asks the gateway's language model itself
// (`reasoning: 'none'`, which each provider maps to its own switch) and
// records the use as the gateway would, until the gateway takes a
// reasoning option. A model that refuses the setting (one that cannot
// answer without its reasoning) is asked again as it is.
async function generateQuietly(
  container: ServiceResolver,
  request: {
    model: ModelRef;
    system: string;
    prompt: string;
    source: string;
    signal?: AbortSignal;
  },
): Promise<string> {
  const { model, system, prompt, source, signal } = request;
  const languageModel = await container
    .resolve(agentsToken)
    .models.gateway.languageModel(model);
  const ask = (quiet: boolean) =>
    generateText({
      model: languageModel,
      system,
      prompt,
      maxOutputTokens: 16_000,
      maxRetries: 2,
      ...(quiet ? { reasoning: 'none' as const } : {}),
      ...(signal ? { abortSignal: signal } : {}),
    });
  let result: Awaited<ReturnType<typeof ask>>;
  try {
    result = await ask(true).catch((error: unknown) => {
      if (!signal?.aborted && statusOf(error) === 400) return ask(false);
      throw error;
    });
  } catch (error) {
    throw asModelError(error, signal);
  }
  await recordUse(container, model, result.totalUsage, source).catch(
    () => undefined,
  );
  return result.text;
}

// An HTTP status a provider answered with, when the error carries one.
function statusOf(error: unknown): number | undefined {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === 'number' ? status : undefined;
}

// A failed call as the gateway's `ModelError` would describe it, which
// modelFailure and runFailure read by name and code: stopped by the
// signal (the turn's limit, or the application stopping), refused for its
// key, or the provider's own failure in its words.
function asModelError(error: unknown, signal?: AbortSignal): Error {
  if (error instanceof Error && error.name === 'ModelError') return error;
  const status = statusOf(error);
  const code = signal?.aborted
    ? 'aborted'
    : status === 401 || status === 403
      ? 'auth'
      : 'provider';
  return Object.assign(
    new Error(
      code === 'aborted'
        ? 'The call was stopped.'
        : error instanceof Error
          ? error.message
          : String(error),
      { cause: error },
    ),
    { name: 'ModelError', code, status: status ?? null },
  );
}

// A turn's use in the Agents plugin's usage table, as the gateway records a
// `generate` (purpose `text`, the background source), so its usage page
// still lists the background work. @temporary(nocobase-official), with
// generateQuietly.
export async function recordUse(
  container: ServiceResolver,
  model: ModelRef,
  usage: LanguageModelUsage,
  // The work's agent, by name (sourceOf).
  source: string,
): Promise<void> {
  if (!container.has(databaseManagerToken) || !container.has(idGeneratorToken))
    return;
  const count = (value: number | undefined) =>
    Number.isFinite(value) && (value ?? 0) > 0 ? Math.round(value ?? 0) : 0;
  await container
    .resolve(databaseManagerToken)
    .query()
    .insertInto('agModelUsage')
    .values({
      id: container.resolve(idGeneratorToken).generate(),
      purpose: 'text',
      source,
      modelService: model.modelService,
      model: model.model.slice(0, 200),
      inputTokens: count(usage.inputTokens),
      outputTokens: count(usage.outputTokens),
      units: 1,
      createdAt: new Date().toISOString(),
    })
    .execute();
}

// A run of turns with the CRM's model, its system prompt the current time
// in the CRM's time zone (dates such as "next Tuesday" in what it reads are
// reckoned from it), the work's agent's instructions, how to settle
// what the material leaves open (DECIDING) and the deployment's business
// guidance (guidance.ts); null when there is no
// model to ask.
export async function openSession(
  container: ServiceResolver,
  {
    timeZone,
    guidance,
    work,
  }: { timeZone: string; guidance: string; work: Work },
): Promise<ModelSession | null> {
  const run = await crmRun(container, work).catch(() => null);
  if (!run) return null;
  const { model, instructions } = run;
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const system = [
    `The current time is ${now} (${timeZone}).`,
    instructions,
    DECIDING,
    guidance,
  ]
    .filter(Boolean)
    .join('\n\n');
  const turns: { role: 'user' | 'assistant'; text: string }[] = [];
  const ask = async (content: string, signal?: AbortSignal) => {
    turns.push({ role: 'user', text: content });
    // One prompt: the earlier turns as a transcript, then the question.
    const prompt =
      turns.length === 1
        ? content
        : `${turns
            .slice(0, -1)
            .map(
              (turn) =>
                `${turn.role === 'user' ? 'User' : 'Assistant'}:\n${turn.text}`,
            )
            .join('\n\n')}\n\nUser:\n${content}`;
    const text = await generateQuietly(container, {
      model,
      system,
      prompt,
      source: sourceOf(work),
      ...(signal ? { signal } : {}),
    });
    turns.push({ role: 'assistant', text });
    return text;
  };
  return {
    ask,
    async askJson<T>(
      content: string,
      shape: ZodType<T>,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const read = (text: string) => shape.safeParse(jsonIn(text));
      const first = read(
        await ask(
          `${content}\n\nReturn only one JSON object, with no other text, matching this JSON Schema:\n${shapeOf(shape)}`,
          signal,
        ),
      );
      if (first.success) return first.data;
      const again = read(
        await ask(
          `The previous reply was not in the required format. Keeping the same answer, return only one JSON object and nothing else, matching this JSON Schema:\n${shapeOf(shape)}`,
          signal,
        ),
      );
      return again.success ? again.data : null;
    },
  };
}

// A zod shape as the JSON Schema a prompt shows the model.
// A number of days a reply gives, brought within [min, max] and rounded
// before it is checked, so a model that writes 45 where at most 30 is
// asked (as one answering without reasoning does) loses that much rather
// than the whole card; the JSON Schema the model is shown keeps the bounds.
export function daysWithin(min: number, max: number) {
  return z.preprocess(
    (value) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.min(max, Math.max(min, Math.round(value)))
        : value,
    z.number().int().min(min).max(max),
  );
}

export function shapeOf(shape: ZodType): string {
  try {
    return JSON.stringify(z.toJSONSchema(shape, { unrepresentable: 'any' }));
  } catch {
    return '{}';
  }
}

// A method skill's text without its frontmatter: the Agents plugin's
// library's current version, where people edit it (crm-agents/library.ts
// puts it there), else its SKILL.md as shipped (ai/skills/<name>, beside the
// server in development, copied into dist by the build). Empty when
// neither has it.
export const SKILLS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'ai',
  'skills',
);
export async function readSkill(
  container: ServiceResolver,
  name: string,
): Promise<string> {
  let text: string | null = null;
  if (container.has(agentsToken))
    try {
      const skills = container.resolve(agentsToken).skills;
      const skill = (await skills.list()).find((s) => s.slug === name);
      if (skill) text = (await skills.get(skill.id)).content;
    } catch {
      // The library cannot be read: the shipped file below.
    }
  text ??= await readFile(join(SKILLS_DIR, name, 'SKILL.md'), 'utf8').catch(
    () => '',
  );
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim();
}

// The JSON a reply wrote, alone, in a ```json fence or among other text.
export function jsonIn(content: unknown): unknown {
  const text =
    typeof content === 'string'
      ? content
      : toText((content as { content?: unknown } | null)?.content ?? '');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text)?.[1];
  const candidates = [
    fenced,
    text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
  ];
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Not JSON; try the next reading.
    }
  }
  return undefined;
}

// What a background run that failed records as its card's error: `timedOut`
// when the model did not answer within the turn's limit (`RUN_TURN_MS`),
// which the gateway reports as a stopped call (the application stopping is
// handed back before this), otherwise the provider's words.
export function runFailure(error: unknown): string {
  if (
    error instanceof Error &&
    error.name === 'ModelError' &&
    (error as Error & { code?: unknown }).code === 'aborted'
  )
    return 'timedOut';
  return error instanceof Error ? error.message.slice(0, TEXT_LIMIT) : 'failed';
}

// A model call that failed, as the CRM's error: no usable model (no
// service, a refused key) is the AI being unavailable, anything else the
// operation failing, the provider's words kept as its detail. The gateway's
// `ModelError` is known by its name and code; the plugin does not export it.
export function modelFailure(error: unknown, failed: string): CrmError {
  const code =
    error instanceof Error && error.name === 'ModelError'
      ? toText((error as Error & { code?: unknown }).code ?? '')
      : '';
  const detail = error instanceof Error ? error.message : undefined;
  return code === 'config' || code === 'auth'
    ? new CrmError('assistantUnavailable', 409, undefined, detail)
    : new CrmError(failed, 502, undefined, detail);
}
