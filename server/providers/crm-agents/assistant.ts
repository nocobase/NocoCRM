import { randomBytes, randomUUID } from 'node:crypto';
import {
  authenticationToken,
  type AuthSession,
} from '@nocobase/app-plugin-authentication';
import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type {
  OnlineAgentContext,
  OnlineAgentJson,
  OnlineAgentToolContext,
} from '@nocobase/app-plugin-agents/server/online-agent';
import {
  CliParseError,
  commandWords,
  helpColumns,
  needsLocalFiles,
  parseCommandLine,
  renderCommandHelp,
  renderTopicHelp,
  type CliCommand,
} from '@nocobase/app-cli-client/parse';
import { fillRequest, requestText } from '@nocobase/app-cli-client/request';
import type { Application } from '@nocobase/app-server/application';
import { loggingToken } from '@nocobase/app-server/logging';
import { ApiError, apiDocsToken, cliToken } from '@nocobase/app-server/router';
import { z } from 'zod';
import { readSkill } from '../crm/ai-model.js';
import type { CrmSettings } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';
import { AGENT_ACTIONS, GRANTABLE } from './actions.js';
import { heldActions } from './gate.js';
import { assistantInstructions } from './preset.js';
import { crmRuleLines } from './rules.js';
import { crmPlansSkill, METHOD_SKILLS } from './skill.js';
import { chatModels } from './work-agents.js';

// The assistant people talk to, Sales Expert: a native chat of the Agents
// plugin's OnlineAgentService (template 1.0.0-beta.74, Agents 1.0, which
// keeps no online agents of its own), configured here as the scope `crm`
// that every CRM conversation is created with. The model answers in the
// application's process with the CRM's system prompt (its instructions, the
// conversation rules, how to work with commands and plans, the business
// guidance) and two tools:
//
// - `crm` runs the CRM's command lines (`crm leads list --q acme`), the
//   commands the API document declares (`runCommand` on the routes), each
//   one request through the application itself. It authenticates with a
//   credential the CRM issues for that request alone (ASSISTANT_SCHEME),
//   acting as the person whose conversation it is, so a route checks them as
//   it would any request; the CRM's guard keeps it to the agent actions they
//   hold and answers every write but a plan with PLAN_REQUIRED
//   (routes/context.ts).
// - `crm_skill` reads a method skill (lead follow-up and the others) from
//   the library, as the background runs follow it.
//
// What a plan, an agent's card or a company look-up came to reaches the
// conversation as a notice (plan-news.ts, ai-work-news.ts); the plugin no
// longer wakes the chat with it, so the CRM does (wakeAssistant): a message
// marked as the CRM's news, which the conversation does not show as the
// person's.

export const ASSISTANT_SCOPE = 'crm';
// Who proposed a plan the assistant made, as plans record it.
export const ASSISTANT_ID = 'crm-assistant';
export const ASSISTANT_NAME = 'Sales Expert';
// The credential of one command the assistant runs.
export const ASSISTANT_TOKEN_HEADER = 'x-crm-assistant-token';
export const ASSISTANT_SCHEME = 'crmAssistantToken';
const ASSISTANT_CREDENTIAL = 'crm-assistant';
// What marks the CRM's news in a conversation (client: agent-chat/news.ts).
export const NEWS_OPEN = '<crm-news>';
export const NEWS_CLOSE = '</crm-news>';

// The CLI's name in the commands' help.
const BIN = 'crm';
// How long a command's credential lives: the request it is made for.
const TOKEN_MS = 2 * 60_000;
// How much of one command's answer the model reads.
const ANSWER_LIMIT = 30_000;
// The virtual file a command's body is read from (`--file`).
const BODY_FILE = 'body.json';

type Token = { userId: string; conversationId: string; expiresAt: number };
const tokens = new Map<string, Token>();

function mint(userId: string, conversationId: string): string {
  const now = Date.now();
  for (const [key, token] of tokens)
    if (token.expiresAt < now) tokens.delete(key);
  const value = `crma_${randomBytes(24).toString('base64url')}`;
  tokens.set(value, { userId, conversationId, expiresAt: now + TOKEN_MS });
  return value;
}

// The person and the conversation a request of the assistant acts for; none
// for any other request.
export function assistantIdentityOf(
  auth: AuthSession | undefined,
): { userId: string; conversationId: string } | undefined {
  const credential = auth?.credential;
  if (credential?.type !== ASSISTANT_CREDENTIAL) return undefined;
  const data = credential.data as { conversationId?: unknown } | undefined;
  return {
    userId: credential.userId,
    conversationId:
      typeof data?.conversationId === 'string' ? data.conversationId : '',
  };
}

// What the assistant may do for `userId`: the agents' actions, within what
// they hold, and never one an agent may not be given.
export async function assistantActions(
  service: CrmService,
  userId: string,
): Promise<Set<string>> {
  const held = await heldActions(service, userId);
  return new Set(
    AGENT_ACTIONS.filter((action) => held.has(action) && GRANTABLE.has(action)),
  );
}

// A command line as a shell splits it: words apart by spaces, kept together
// by quotes, a backslash escaping the next character.
export function splitLine(line: string): string[] {
  const words: string[] = [];
  let word = '';
  let started = false;
  let quote: '"' | "'" | null = null;
  for (let at = 0; at < line.length; at++) {
    const char = line[at];
    if (quote) {
      if (char === quote) quote = null;
      else if (char === '\\' && quote === '"' && at + 1 < line.length)
        word += line[++at];
      else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (char === '\\' && at + 1 < line.length) {
      word += line[++at];
      started = true;
    } else if (/\s/u.test(char)) {
      if (started) words.push(word);
      word = '';
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  if (quote) throw new Error('A quote is not closed.');
  if (started) words.push(word);
  return words;
}

type Failure = { code: string; message: string; details?: unknown };
type Answer =
  | { line: string; ok: true; result: { data: unknown; meta?: unknown } }
  | { line: string; ok: true; help: string }
  | { line: string; ok: false; error: Failure };

// The command whose words start `args`, the longest one, and what follows.
function resolveCommand(
  commands: readonly CliCommand[],
  args: readonly string[],
): { command: CliCommand; rest: string[] } | null {
  const leading: string[] = [];
  for (const word of args) {
    if (word.startsWith('-')) break;
    leading.push(word);
  }
  for (let length = leading.length; length > 0; length--) {
    const id = leading.slice(0, length).join(':');
    const command = commands.find((candidate) => candidate.id === id);
    if (command) return { command, rest: args.slice(length) };
  }
  return null;
}

function commandList(
  commands: readonly CliCommand[],
  prefix: readonly string[],
): string | null {
  const topic = renderTopicHelp(BIN, commands, prefix);
  return topic === undefined
    ? null
    : `${topic}\n\nRun \`${BIN} <command> --help\` for a command's arguments and flags, \`${BIN} docs <command>\` for all it does.`;
}

function commandDocs(command: CliCommand): string {
  const output =
    command.output.kind === 'list'
      ? 'A list: the items in `result.data`, paging in `result.meta`.'
      : command.output.kind === 'empty'
        ? 'Nothing: `result.data` is null on success.'
        : 'One record, in `result.data`.';
  return [
    renderCommandHelp(command, { bin: BIN, localFiles: false }),
    '',
    'OUTPUT',
    `  ${output}`,
    ...(command.body?.file
      ? [
          '',
          'BODY',
          `  Give the whole body as the command's \`body\` (in place of --${command.body.file}).`,
        ]
      : []),
  ].join('\n');
}

function areas(commands: readonly CliCommand[]): string {
  const counts = new Map<string, number>();
  for (const command of commands) {
    const area = command.id.split(':')[0] ?? command.id;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return [
    `\`${BIN} docs <command words>\` documents one command; \`${BIN} <area> --help\` lists an area's commands.`,
    '',
    'AREAS',
    ...helpColumns(
      [...counts].map(
        ([area, count]) =>
          [area, `${count} command${count === 1 ? '' : 's'}`] as const,
      ),
    ),
  ].join('\n');
}

// An answer the model can read whole: a long list cut to the items that
// fit, anything else to its first characters.
function bounded(result: { data: unknown; meta?: unknown }): {
  data: unknown;
  meta?: unknown;
} {
  if (JSON.stringify(result).length <= ANSWER_LIMIT) return result;
  if (Array.isArray(result.data)) {
    const items = [...(result.data as unknown[])];
    const total = items.length;
    while (
      items.length > 1 &&
      JSON.stringify({ ...result, data: items }).length > ANSWER_LIMIT
    )
      items.pop();
    return {
      data: items,
      meta: {
        ...(result.meta ?? {}),
        cut: { shown: items.length, of: total },
      },
    };
  }
  return {
    data: {
      cut: true,
      json: JSON.stringify(result.data).slice(0, ANSWER_LIMIT),
    },
    ...(result.meta === undefined ? {} : { meta: result.meta }),
  };
}

// An error body (`{ error: { … } }`) as the reason, message and metadata.
function errorOf(answer: unknown, status: number): Failure {
  const error = (answer as { error?: Record<string, unknown> } | null)?.error;
  const details = Array.isArray(error?.details)
    ? (error.details as Record<string, unknown>[])
    : [];
  const info = details.find((detail) => typeof detail.reason === 'string');
  const reason =
    (typeof info?.reason === 'string' && info.reason) ||
    (typeof error?.reason === 'string' && error.reason) ||
    (typeof error?.status === 'string' && error.status) ||
    `HTTP_${String(status)}`;
  const metadata = info?.metadata ?? error?.metadata;
  return {
    code: reason,
    message:
      typeof error?.message === 'string'
        ? error.message
        : `The request answered ${String(status)}.`,
    ...(metadata === undefined ? {} : { details: metadata }),
  };
}

// A request body: JSON, or a form for a `multipart/form-data` command (no
// files: the assistant has none to send).
function bodyOf(
  command: CliCommand,
  fields: Record<string, unknown>,
): string | FormData | undefined {
  if (!command.body) return undefined;
  if (command.body.media !== 'multipart/form-data')
    return JSON.stringify(fields);
  const form = new FormData();
  for (const [field, value] of Object.entries(fields))
    for (const item of Array.isArray(value) ? value : [value])
      if (item !== undefined && item !== null)
        form.append(field, requestText(item));
  return form;
}

// One command line of the `crm` tool, run as the person whose conversation
// it is.
async function runLine(
  app: Application,
  service: CrmService,
  context: OnlineAgentToolContext,
  input: { line: string; body?: Record<string, unknown> },
): Promise<Answer> {
  const line = input.line.trim();
  const fail = (code: string, message: string, details?: unknown): Answer => ({
    line,
    ok: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  });
  let words: string[];
  try {
    words = splitLine(line);
  } catch (error) {
    return fail('INVALID_USAGE', (error as Error).message);
  }
  if (words[0] === BIN) words = words.slice(1);
  if (words.some((word) => ['|', '||', '&&', ';', '>', '<'].includes(word)))
    return fail(
      'INVALID_USAGE',
      'One command per item, without pipes or redirection: the answer is JSON already.',
    );
  words = words.filter((word) => word !== '--json');
  const userId = context.user.id;
  const document = await app.container.resolve(apiDocsToken).getDocument();
  const { commands } = app.container.resolve(cliToken).manifestFor(document, {
    kind: 'run',
    userId,
    displayName: ASSISTANT_NAME,
    actions: await assistantActions(service, userId),
  });
  const help = (text: string): Answer => ({ line, ok: true, help: text });
  if (!words.length || words[0] === '--help' || words[0] === '-h')
    return help(commandList(commands, []) ?? areas(commands));
  if (words[0] === 'docs') {
    const target = words.slice(1).filter((word) => !word.startsWith('-'));
    if (!target.length) return help(areas(commands));
    const found = resolveCommand(commands, target);
    if (found && !found.rest.length) return help(commandDocs(found.command));
    const list = commandList(commands, target);
    return list
      ? help(list)
      : fail('COMMAND_UNKNOWN', `There is no command ${target.join(' ')}.`);
  }
  const found = resolveCommand(commands, words);
  if (!found) {
    const prefix = words.filter((word) => !word.startsWith('-'));
    const list = commandList(commands, prefix);
    return list
      ? help(list)
      : fail(
          'COMMAND_UNKNOWN',
          `There is no command ${prefix.join(' ')} for you. Run \`${BIN} --help\` for the ones you may run.`,
        );
  }
  const { command } = found;
  let rest = found.rest;
  if (rest.includes('--help') || rest.includes('-h'))
    return help(renderCommandHelp(command, { bin: BIN, localFiles: false }));
  if (needsLocalFiles(command))
    return fail(
      'FILES_UNAVAILABLE',
      `${BIN} ${commandWords(command)} sends or saves a file, which the assistant cannot.`,
    );
  const bodyText = input.body ? JSON.stringify(input.body) : undefined;
  const flag = command.body?.file;
  if (bodyText !== undefined && flag && !rest.includes(`--${flag}`))
    rest = [...rest, `--${flag}`, BODY_FILE];
  let parsed;
  try {
    parsed = await parseCommandLine(command, rest, {
      bin: BIN,
      io: {
        readText: (path) =>
          Promise.resolve(path === BODY_FILE ? bodyText : undefined),
        env: () => undefined,
      },
    });
  } catch (error) {
    if (error instanceof CliParseError)
      return fail(error.code, error.message, error.details ?? undefined);
    throw error;
  }
  const filled = fillRequest(command, parsed.values, parsed.bodyFile);
  const body = bodyOf(command, filled.fields);
  const base = app.publicBasePath.replace(/\/+$/u, '');
  const path =
    base && filled.path.startsWith(`${base}/`)
      ? filled.path.slice(base.length)
      : filled.path;
  const token = mint(userId, context.sessionId);
  let response: Response;
  try {
    response = await app.router.fetch(
      new Request(`http://application${path}`, {
        method: filled.method,
        headers: {
          [ASSISTANT_TOKEN_HEADER]: token,
          accept: 'application/json',
          ...(typeof body === 'string'
            ? { 'content-type': 'application/json' }
            : {}),
        },
        ...(body === undefined ? {} : { body }),
        signal: context.signal,
      }),
    );
  } finally {
    tokens.delete(token);
  }
  const text = await response.text();
  let answer: unknown;
  try {
    answer = text === '' ? undefined : JSON.parse(text);
  } catch {
    answer = undefined;
  }
  if (!response.ok) {
    const error = errorOf(answer, response.status);
    return {
      line,
      ok: false,
      error:
        error.code === 'PLAN_REQUIRED'
          ? {
              ...error,
              message: `${error.message} Run \`${BIN} plan create\` with the plan as the command's body.`,
            }
          : error,
    };
  }
  const record =
    answer && typeof answer === 'object'
      ? (answer as Record<string, unknown>)
      : {};
  return {
    line,
    ok: true,
    result: bounded({
      data: record.data ?? null,
      ...(record.meta && typeof record.meta === 'object'
        ? { meta: record.meta }
        : {}),
    }),
  };
}

// The JSON a tool answers: what JSON.stringify keeps, so a Date becomes its
// ISO text and an undefined field goes.
const asJson = (value: unknown): OnlineAgentJson =>
  JSON.parse(JSON.stringify(value)) as OnlineAgentJson;

// The assistant's system prompt for `userId`, read when a conversation is
// created and kept with it.
async function systemPrompt(
  service: CrmService,
  settings: () => CrmSettings | null,
  userId: string,
): Promise<string> {
  const user = await service.database
    .query()
    .selectFrom('user')
    .select(['name'])
    .where('id', '=', userId)
    .executeTakeFirst()
    .catch(() => undefined);
  const { rules, sections } = crmRuleLines(
    settings(),
    typeof user?.name === 'string' ? user.name : null,
    'tool',
  );
  const skill = crmPlansSkill('tool')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '')
    .trim();
  return [
    assistantInstructions('tool'),
    ['# Rules', ...rules.map((rule) => `- ${rule}`)].join('\n'),
    skill,
    [
      '# Method skills',
      `The \`crm_skill\` tool reads one of the CRM's method skills, the method its agents follow: ${METHOD_SKILLS.filter((name) => name !== 'company-signals').join(', ')}.`,
    ].join('\n'),
    ...sections.map((section) => section.join('\n')),
  ].join('\n\n');
}

// The scope and tools of the assistant's conversations, the credential its
// commands carry, and that credential in the API document and the CLI.
export function configureAssistant(
  app: Application,
  agents: Agents,
  service: CrmService,
  settings: () => CrmSettings | null,
): void {
  const { container } = app;
  container.resolve(authenticationToken).addCredentialResolver((headers) => {
    const value = headers.get(ASSISTANT_TOKEN_HEADER);
    if (!value) return Promise.resolve(undefined);
    const token = tokens.get(value);
    if (!token || token.expiresAt < Date.now())
      throw new ApiError({
        status: 'UNAUTHENTICATED',
        reason: 'ASSISTANT_TOKEN_INVALID',
        domain: 'crm',
        message: "The assistant's credential is not valid.",
      });
    return Promise.resolve({
      type: ASSISTANT_CREDENTIAL,
      id: token.conversationId,
      userId: token.userId,
      scheme: ASSISTANT_SCHEME,
      expiresAt: new Date(token.expiresAt),
      data: { conversationId: token.conversationId },
    });
  });
  if (container.has(apiDocsToken))
    container.resolve(apiDocsToken).addFragment({
      owner: 'nococrm',
      namespace: 'crm',
      components: {
        securitySchemes: {
          [ASSISTANT_SCHEME]: {
            type: 'apiKey',
            in: 'header',
            name: ASSISTANT_TOKEN_HEADER,
            description:
              "The CRM assistant's credential for one command it runs in a person's conversation: it acts as that person, within the actions an agent may hold.",
          },
        },
      },
    });
  if (container.has(cliToken))
    container.resolve(cliToken).addIdentityScheme(ASSISTANT_SCHEME, 'run');
  const online = agents.onlineAgent;
  online.configurator.registerTool('crm', {
    version: '1',
    definition: {
      description:
        'Runs CRM command lines as the person you work for, such as `crm leads list --q acme`, `crm opportunities get <id>` or `crm docs plan create`. Several independent commands go in one call. A command that takes a body from a file (`--file`, such as `crm plan create`) takes it as `body`.',
      inputSchema: z.object({
        commands: z
          .array(
            z.object({
              line: z
                .string()
                .min(1)
                .max(4000)
                .describe('One command line, as typed in a shell.'),
              body: z
                .record(z.string(), z.unknown())
                .optional()
                .describe("The command's request body, such as a plan."),
            }),
          )
          .min(1)
          .max(8),
      }),
      // What the conversation shows of a call: the command lines, which
      // its live line words (agent-chat/conversation.tsx), and whether each
      // went through; the answers stay the model's.
      public: {
        input: (value: { commands: { line: string }[] }) => ({
          lines: value.commands.map((command) => command.line),
        }),
        output: (value: OnlineAgentJson) => ({
          ok: (
            ((value as { results?: { ok?: unknown }[] } | null)?.results ??
              []) as { ok?: unknown }[]
          ).map((result) => result.ok === true),
        }),
      },
      execute: async ({ commands }, options) => {
        const context = (options as { context: OnlineAgentToolContext })
          .context;
        const results = await Promise.all(
          commands.map((input) =>
            runLine(app, service, context, input).catch(
              (error: unknown): Answer => ({
                line: input.line,
                ok: false,
                error: {
                  code: 'UNEXPECTED',
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              }),
            ),
          ),
        );
        return asJson({ results });
      },
    },
  });
  online.configurator.registerTool('crm_skill', {
    version: '1',
    definition: {
      description:
        "Reads one of the CRM's method skills: how its agents follow a lead or an opportunity up, review an approval or prepare a task.",
      inputSchema: z.object({
        name: z.enum(
          METHOD_SKILLS.filter((name) => name !== 'company-signals') as [
            string,
            ...string[],
          ],
        ),
      }),
      execute: async ({ name }) =>
        asJson({ name, text: await readSkill(container, name) }),
    },
  });
  online.configurator.registerOnlineAgentScope(
    ASSISTANT_SCOPE,
    async (context) => ({
      agentId: 'online',
      tool: ['crm', 'crm_skill'],
      // Every chat model of the enabled services, DeepSeek's first: the
      // first is a new conversation's, the rest what it may pick.
      model: (await chatModels(agents, 'deepseek')).map(
        (model) => `${model.modelService}/${model.model}`,
      ),
      systemPromptTemplate: await systemPrompt(
        service,
        settings,
        context.user.id,
      ),
    }),
  );
}

// A person as the CRM acts for them in their own conversation, outside a
// request of theirs: the news it is told, the demo's conversations.
export function assistantActor(
  service: CrmService,
  userId: string,
): OnlineAgentContext {
  return {
    user: { id: userId },
    authorization: service.authz.for({
      principal: { type: 'user', id: userId },
      subjects: [{ type: 'authenticated', id: '*' }],
    }),
    // No request of theirs: the CRM itself, which the plugin requires to
    // be named; the assistant's tools issue their own credential.
    credentials: { issuer: 'crm', userId },
  };
}

// Tells a conversation's assistant what happened in it (wakeAssistant),
// without waiting for it.
export type AssistantWake = (conversationId: string, text: string) => void;
export const assistantWake =
  (app: Application, service: CrmService, agents: Agents): AssistantWake =>
  (conversationId, text) => {
    void wakeAssistant(app, service, agents, conversationId, text);
  };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms).unref();
  });

// Tells the assistant of a conversation what happened in it (`text`, the
// CRM's own words), as a message marked as news, so it answers: once the
// conversation is idle, trying for a few minutes while it is busy. A
// conversation that is not the assistant's, or gone, is left alone; the
// notice the person sees is written either way.
export async function wakeAssistant(
  app: Application,
  service: CrmService,
  agents: Agents,
  conversationId: string,
  text: string,
): Promise<void> {
  const row = await service.database
    .query()
    .selectFrom('agConversations')
    .select(['userId', 'metadata'])
    .where('id', '=', conversationId)
    .executeTakeFirst()
    .catch(() => undefined);
  if (!row?.metadata) return;
  const actor = assistantActor(service, String(row.userId));
  const logger = app.container.resolve(loggingToken).getLogger('crm-agents');
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const chat = await agents.onlineAgent.realtime(actor, {
        sessionId: conversationId,
      });
      if (chat.backend !== 'native') return;
      if ((await chat.status()) === 'running') {
        await sleep(15_000);
        continue;
      }
      const id = randomUUID();
      // The answer streams to whoever has the conversation open, which
      // picks it up; nothing here reads it.
      await chat.send(
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${NEWS_OPEN}\n${text}\n${NEWS_CLOSE}` },
            ],
          },
        ],
        { clientId: id, messageId: id },
      );
      return;
    } catch (error) {
      // Refused for what it is, not for being busy: trying again changes
      // nothing.
      if (
        attempt === 11 ||
        (error as { code?: unknown }).code === 'INVALID_REQUEST'
      ) {
        logger.warn({ conversationId, error }, 'assistant not told the news');
        return;
      }
      await sleep(15_000);
    }
  }
}
