// A stand-in for the Agents plugin's model gateway in server tests: the CRM's
// background AI (server/providers/crm/ai-model.ts) asks its language model,
// through `agentsToken`, for the reply to each turn. `reply` gives a turn's answer:
// a value is answered as its JSON, `{ asText }` as that text, and a function
// is called with the turn's prompt (the latest question alone) and the
// call. The container also gets a logger whose warnings are kept.
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { loggingToken } from '@nocobase/app-server/logging';
import type { ServiceContainer } from '@nocobase/service-provider';

export interface ModelCall {
  // The model asked, as the gateway was given it.
  readonly model: unknown;
  // The whole prompt the model was given (earlier turns as a transcript).
  readonly prompt: string;
  readonly system?: string;
  readonly signal?: AbortSignal;
  // The reasoning setting the call asked for ('none': turned off).
  readonly reasoning?: string;
}

// A language model as the gateway hands one out (AI SDK's v4 model), whose
// every call is answered by `answer` with the call as the gateway's own
// `generate` would have been given it.
export function languageModelOf(
  model: unknown,
  answer: (call: ModelCall) => Promise<string>,
): unknown {
  return {
    specificationVersion: 'v4',
    provider: 'test',
    modelId: 'test-model',
    supportedUrls: {},
    doGenerate: async (options: {
      prompt: { role: string; content: unknown }[];
      abortSignal?: AbortSignal;
      reasoning?: string;
    }) => {
      const textOf = (content: unknown) =>
        typeof content === 'string'
          ? content
          : (content as { type: string; text?: string }[])
              .map((part) => part.text ?? '')
              .join('');
      const system = options.prompt.find((m) => m.role === 'system');
      const user = options.prompt.filter((m) => m.role === 'user').at(-1);
      const text = await answer({
        model,
        prompt: textOf(user?.content ?? ''),
        ...(system ? { system: textOf(system.content) } : {}),
        ...(options.abortSignal ? { signal: options.abortSignal } : {}),
        ...(options.reasoning ? { reasoning: options.reasoning } : {}),
      });
      return {
        content: [{ type: 'text', text }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: {
            total: 1,
            noCache: 1,
            cacheRead: 0,
            cacheWrite: 0,
          },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        warnings: [],
      };
    },
    doStream: () => Promise.reject(new Error('not streamed')),
  };
}

type Reply =
  unknown | ((prompt: string, call: ModelCall) => unknown | Promise<unknown>);

// The latest question of a prompt that carries earlier turns.
function latest(prompt: string): string {
  const at = prompt.lastIndexOf('\n\nUser:\n');
  return at === -1 ? prompt : prompt.slice(at + '\n\nUser:\n'.length);
}

function asText(answer: unknown): string {
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object' && 'asText' in answer)
    return String((answer as { asText: unknown }).asText);
  return JSON.stringify(answer);
}

export function fakeModel(
  container: ServiceContainer,
  reply: Reply,
): { prompts: string[]; calls: ModelCall[]; warnings: unknown[] } {
  const prompts: string[] = [];
  const calls: ModelCall[] = [];
  const warnings: unknown[] = [];
  container.instance(agentsToken, {
    models: {
      gateway: {
        catalog: async () => ({
          services: [
            {
              name: 'test',
              title: 'Test',
              provider: 'test',
              models: [
                {
                  value: 'test-model',
                  label: 'Test model',
                  kind: 'chat',
                  dimensions: null,
                },
              ],
            },
          ],
          defaultModel: { modelService: 'test', model: 'test-model' },
        }),
        languageModel: async (model: unknown) =>
          languageModelOf(model, async (call) => {
            // A model call gives up on a signal already aborted, as one does
            // when the application stops.
            if (call.signal?.aborted) throw new Error('aborted');
            calls.push(call);
            const prompt = latest(call.prompt);
            prompts.push(prompt);
            const answer =
              typeof reply === 'function'
                ? await (reply as (p: string, c: ModelCall) => unknown)(
                    prompt,
                    call,
                  )
                : reply;
            return asText(answer);
          }),
      },
    },
  } as unknown as ReturnType<typeof container.resolve<typeof agentsToken>>);
  container.instance(loggingToken, {
    getLogger: () => ({
      warn: (entry: unknown) => warnings.push(entry),
      info: () => undefined,
      debug: () => undefined,
      error: () => undefined,
    }),
  } as unknown as ReturnType<typeof container.resolve<typeof loggingToken>>);
  return { prompts, calls, warnings };
}
