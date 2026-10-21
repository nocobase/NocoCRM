import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { databaseManagerToken } from '@nocobase/db';
import { ServiceContainer } from '@nocobase/service-provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  crmModel,
  daysWithin,
  modelFailure,
  openSession,
  readSkill,
  runFailure,
} from '../../server/providers/crm/ai-model.js';
import { languageModelOf, type ModelCall } from '../setup/model-fake.js';

// The CRM's AI on the Agents plugin's model gateway: which model each work
// asks, how a run of turns reads, and how a failure reads.

type Call = ModelCall;

// A chat service of the catalog, offering `models`.
const service = (name: string, provider: string, models: string[]) => ({
  name,
  title: name,
  provider,
  models: models.map((value) => ({
    value,
    label: value,
    kind: 'chat',
    dimensions: null,
  })),
});

const gatewayWith = (
  options: {
    services?: ReturnType<typeof service>[];
    replies?: string[];
  } = {},
) => {
  const calls: Call[] = [];
  const replies = [...(options.replies ?? [])];
  const container = new ServiceContainer();
  container.instance(agentsToken, {
    models: {
      gateway: {
        catalog: async () => ({
          services: options.services ?? [
            service('qwen', 'alibaba', ['qwen-max']),
          ],
        }),
        languageModel: async (model: unknown) =>
          languageModelOf(model, async (call) => {
            calls.push(call);
            return replies.shift() ?? '';
          }),
      },
    },
  } as unknown as ReturnType<typeof container.resolve<typeof agentsToken>>);
  return { container, calls };
};

// The work agents' settings as `crmSettings` keeps them.
const storedSettings = (
  container: ServiceContainer,
  works: Record<string, unknown>,
) =>
  container.instance(databaseManagerToken, {
    query: () => {
      const chain = {
        selectFrom: () => chain,
        select: () => chain,
        where: () => chain,
        executeTakeFirst: async () => ({
          value: JSON.stringify({ version: 1, works, adopted: true }),
        }),
      };
      return chain;
    },
  } as unknown as ReturnType<
    typeof container.resolve<typeof databaseManagerToken>
  >);

describe("the CRM's model", () => {
  it("answers with DeepSeek's fast model when it is offered, else the first chat model, the company research's among those that search", async () => {
    const services = [
      service('qwen', 'alibaba', ['qwen-max']),
      service('deepseek', 'deepseek', ['deepseek-pro', 'deepseek-flash']),
    ];
    expect(
      await crmModel(gatewayWith({ services }).container, 'leads'),
    ).toEqual({ modelService: 'deepseek', model: 'deepseek-flash' });
    expect(await crmModel(gatewayWith().container, 'leads')).toEqual({
      modelService: 'qwen',
      model: 'qwen-max',
    });
    // The company research searches the web with its model: one whose
    // provider can.
    expect(
      await crmModel(
        gatewayWith({
          services: [
            service('local', 'ollama', ['llama']),
            service('qwen', 'alibaba', ['qwen-max']),
          ],
        }).container,
        'signals',
      ),
    ).toEqual({ modelService: 'qwen', model: 'qwen-max' });
    // No model anywhere, or no Agents plugin: the AI is off.
    expect(
      await crmModel(gatewayWith({ services: [] }).container, 'leads'),
    ).toBeNull();
    expect(await crmModel(new ServiceContainer(), 'leads')).toBeNull();
  });

  it('carries earlier turns into the next, and asks once more for JSON in another shape', async () => {
    const { container, calls } = gatewayWith({
      replies: ['Not JSON.', '```json\n{"grade":"A"}\n```'],
    });
    const session = await openSession(container, {
      timeZone: 'Asia/Shanghai',
      guidance: '# Company\n- NocoBase',
      work: 'leads',
    });
    const answer = await session!.askJson(
      'Grade this lead.',
      z.object({ grade: z.enum(['A', 'B']) }),
    );
    expect(answer).toEqual({ grade: 'A' });
    expect(calls).toHaveLength(2);
    // The model the work follows, its reasoning turned off.
    expect(calls[0]).toMatchObject({
      model: { modelService: 'qwen', model: 'qwen-max' },
      reasoning: 'none',
    });
    // Told the time where the CRM works, and the business guidance.
    expect(calls[0].system).toContain('(Asia/Shanghai)');
    expect(calls[0].system).toContain('# Company\n- NocoBase');
    expect(calls[0].prompt).toContain('Grade this lead.');
    expect(calls[0].prompt).toContain('JSON Schema');
    // The second turn carries the first, question and reply.
    expect(calls[1].prompt).toContain('User:\nGrade this lead.');
    expect(calls[1].prompt).toContain('Assistant:\nNot JSON.');
    expect(calls[1].prompt).toContain('not in the required format');
    // Neither reply readable: null.
    const failing = gatewayWith({ replies: ['no', 'still no'] });
    const again = await openSession(failing.container, {
      timeZone: 'UTC',
      guidance: '',
      work: 'leads',
    });
    expect(
      await again!.askJson('Grade.', z.object({ grade: z.string() })),
    ).toBeNull();
  });

  it("follows its work's setup: the model chosen while a service offers it, its instructions first in the system prompt; else the defaults", async () => {
    const services = [
      service('qwen', 'alibaba', ['qwen-max']),
      service('openai', 'openai', ['mini']),
    ];
    const { container, calls } = gatewayWith({
      services,
      replies: ['ok', 'ok'],
    });
    storedSettings(container, {
      leads: {
        model: { modelService: 'openai', model: 'mini' },
        instructions: 'Follow leads up.',
      },
      opportunities: {
        model: { modelService: 'gone', model: 'old' },
        instructions: null,
      },
    });
    const session = await openSession(container, {
      timeZone: 'UTC',
      guidance: '# Company',
      work: 'leads',
    });
    await session!.ask('Hello');
    expect(calls[0].model).toEqual({ modelService: 'openai', model: 'mini' });
    // The work's instructions, then how to settle what the material leaves
    // open, then the guidance.
    expect(calls[0].system).toMatch(
      /UTC\)\.\n\nFollow leads up\.\n\nDecide once and move on:\n[^]*\n\n# Company$/u,
    );
    // A model no service offers any more: the default, with the shipped
    // instructions.
    expect(await crmModel(container, 'opportunities')).toEqual({
      modelService: 'qwen',
      model: 'qwen-max',
    });
    const again = await openSession(container, {
      timeZone: 'UTC',
      guidance: '# Company',
      work: 'opportunities',
    });
    await again!.ask('Hello');
    expect(calls[1].system).toContain(
      "You do one part of the CRM's work: following opportunities up",
    );
  });

  it('has no session without a model, and reads a refused key as the AI unavailable', async () => {
    expect(
      await openSession(new ServiceContainer(), {
        timeZone: 'UTC',
        guidance: '',
        work: 'leads',
      }),
    ).toBeNull();
    const refused = Object.assign(new Error('bad key'), {
      name: 'ModelError',
      code: 'auth',
    });
    expect(modelFailure(refused, 'captureFailed')).toMatchObject({
      code: 'assistantUnavailable',
      status: 409,
    });
    expect(modelFailure(new Error('timeout'), 'captureFailed')).toMatchObject({
      code: 'captureFailed',
      status: 502,
    });
  });

  it("reads a method skill's text without its frontmatter, the library's before the file", async () => {
    const skill = await readSkill(new ServiceContainer(), 'lead-follow-up');
    expect(skill.startsWith('# Lead follow-up')).toBe(true);
    expect(await readSkill(new ServiceContainer(), 'no-such-skill')).toBe('');
    // The library's version first, where people edit it.
    const { container } = gatewayWith();
    const agents = container.resolve(agentsToken) as unknown as Record<
      string,
      unknown
    >;
    agents.skills = {
      list: async () => [{ id: 's1', slug: 'lead-follow-up' }],
      get: async () => ({
        content: '---\nname: lead-follow-up\ndescription: x\n---\n# Edited',
      }),
    };
    expect(await readSkill(container, 'lead-follow-up')).toBe('# Edited');
  });
});

describe('a background turn', () => {
  const containerWith = (answer: (call: ModelCall) => Promise<string>) => {
    const calls: ModelCall[] = [];
    const container = new ServiceContainer();
    container.instance(agentsToken, {
      models: {
        gateway: {
          catalog: async () => ({
            services: [service('qwen', 'alibaba', ['qwen-flash'])],
          }),
          languageModel: async (model: unknown) =>
            languageModelOf(model, async (call) => {
              calls.push(call);
              return answer(call);
            }),
        },
      },
    } as unknown as ReturnType<typeof container.resolve<typeof agentsToken>>);
    return { container, calls };
  };

  it('asks a model that refuses to turn its reasoning off again as it is', async () => {
    const { container, calls } = containerWith(async (call) => {
      if (call.reasoning === 'none')
        throw Object.assign(new Error('reasoning cannot be disabled'), {
          statusCode: 400,
        });
      return 'ok';
    });
    const session = await openSession(container, {
      timeZone: 'UTC',
      guidance: '',
      work: 'leads',
    });
    expect(await session!.ask('Hello')).toBe('ok');
    expect(calls.map((call) => call.reasoning ?? 'default')).toEqual([
      'none',
      'default',
    ]);
  });

  it('reports a turn its limit stopped as a stopped call, which reads as timed out', async () => {
    const limit = new AbortController();
    const { container } = containerWith(async () => {
      limit.abort();
      throw new Error('This operation was aborted');
    });
    const session = await openSession(container, {
      timeZone: 'UTC',
      guidance: '',
      work: 'leads',
    });
    const failure = await session!
      .ask('Hello', limit.signal)
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: 'ModelError', code: 'aborted' });
    expect(runFailure(failure)).toBe('timedOut');
  });
});

describe('daysWithin', () => {
  it('brings a day count within its bounds before checking it, and shows the model the bounds', () => {
    const shape = z.object({ inDays: daysWithin(0, 30) });
    expect(shape.parse({ inDays: 45 })).toEqual({ inDays: 30 });
    expect(shape.parse({ inDays: -2 })).toEqual({ inDays: 0 });
    expect(shape.parse({ inDays: 2.4 })).toEqual({ inDays: 2 });
    expect(shape.safeParse({ inDays: 'soon' }).success).toBe(false);
    expect(z.toJSONSchema(shape)).toMatchObject({
      properties: { inDays: { type: 'integer', minimum: 0, maximum: 30 } },
    });
  });
});

describe('runFailure', () => {
  // The gateway's error, known by its name and code.
  const modelError = (code: string, message: string): Error =>
    Object.assign(new Error(message), { name: 'ModelError', code });

  it('records a call the turn limit stopped as timedOut', () => {
    expect(runFailure(modelError('aborted', 'The call was stopped.'))).toBe(
      'timedOut',
    );
  });

  it("keeps any other failure in the provider's words", () => {
    expect(runFailure(modelError('provider', 'Bad gateway'))).toBe(
      'Bad gateway',
    );
    expect(runFailure('nope')).toBe('failed');
  });
});
