// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  dayBefore,
  eventKey,
  readSignals,
  signalQuestion,
} from '../../server/providers/crm/signal-reading.js';
import { MockLanguageModelV4 } from 'ai/test';
import {
  citePages,
  searchWeb,
  siteName,
  WebSearchError,
  type WebSearcher,
} from '../../server/providers/crm/web-research.js';

// The company signals' reading of a web search's answer
// (server/providers/crm/signal-reading.ts): only events that cite the
// search's own pages, happened on a real day within the last 30 days and
// are of a tracked kind are kept, their links taken from those pages.

const pages = [
  {
    index: 1,
    title: 'Acme raises Series B',
    url: 'https://news.example.cn/acme-b',
    site: 'Example News',
  },
  {
    index: 2,
    title: 'Acme names a new CTO',
    url: 'https://tech.example.cn/acme-cto',
    site: 'Example Tech',
  },
];
const answer = (events: unknown[], text?: string) => ({
  text: text ?? `\`\`\`json\n${JSON.stringify({ events })}\n\`\`\``,
  pages,
  usage: { inputTokens: 3000, outputTokens: 400 },
});
const TODAY = '2026-10-14';

describe('reading company signals', () => {
  it('keeps sourced events within the window, linking the search pages, newest first', () => {
    const result = readSignals(
      answer([
        {
          type: 'funding',
          title: 'Acme raised a Series B of 200 million yuan.',
          summary: 'Led by Example Capital.',
          date: '2026-10-02',
          refs: [1],
        },
        {
          type: 'leadership',
          title: 'Acme appointed a new CTO.',
          date: '2026-10-10',
          refs: [2, 2, 9],
        },
      ]),
      TODAY,
      new Set(),
    );
    expect(result.unreadable).toBe(false);
    expect(result.signals.map((s) => s.type)).toEqual([
      'leadership',
      'funding',
    ]);
    expect(result.signals[0]!.sources).toEqual([
      {
        title: 'Acme names a new CTO',
        url: 'https://tech.example.cn/acme-cto',
        site: 'Example Tech',
      },
    ]);
    expect(result.signals[1]!.summary).toBe('Led by Example Capital.');
  });

  it('drops events without a search page, outside the window, undated or of another kind', () => {
    const result = readSignals(
      answer([
        // A link the model made up is not a source.
        { type: 'funding', title: 'Made up', date: '2026-10-01', refs: [] },
        { type: 'business', title: 'Wrong ref', date: '2026-10-01', refs: [7] },
        { type: 'business', title: 'Too old', date: '2026-08-01', refs: [1] },
        { type: 'business', title: 'Future', date: '2026-11-01', refs: [1] },
        { type: 'risk', title: 'No date', date: 'last week', refs: [1] },
        { type: 'award', title: 'An award', date: '2026-10-01', refs: [1] },
      ]),
      TODAY,
      new Set(),
    );
    expect(result.signals).toEqual([]);
    expect(result.dropped.map((d) => d.reason)).toEqual([
      'sources',
      'sources',
      'window',
      'window',
      'date',
      'type',
    ]);
  });

  it('does not keep an event already known, nor the same event twice', () => {
    const known = eventKey('funding', '2026-10-02', 'Acme raised a Series B.');
    const result = readSignals(
      answer([
        {
          type: 'funding',
          title: 'Acme raised a Series B.',
          date: '2026-10-02',
          refs: [1],
        },
        {
          type: 'leadership',
          title: 'Acme appointed a new CTO',
          date: '2026-10-10',
          refs: [2],
        },
        {
          type: 'leadership',
          title: 'Acme appointed a new CTO!',
          date: '2026-10-11',
          refs: [2],
        },
      ]),
      TODAY,
      new Set([known]),
    );
    expect(result.signals.map((s) => s.title)).toEqual([
      'Acme appointed a new CTO',
    ]);
    expect(result.dropped.map((d) => d.reason)).toEqual(['known', 'known']);
  });

  it('reports an answer without JSON as unreadable', () => {
    expect(
      readSignals(answer([], 'Acme had a busy month.'), TODAY, new Set())
        .unreadable,
    ).toBe(true);
  });

  it('asks about the window, the kinds of event and what is already known', () => {
    expect(dayBefore(TODAY, 30)).toBe('2026-09-14');
    const question = signalQuestion(
      { name: 'Acme', website: 'acme.cn', city: 'Hangzhou' },
      TODAY,
      ['Acme raised a Series B.'],
      true,
    );
    expect(question).toContain('"Acme" (website acme.cn, based in Hangzhou)');
    expect(question).toContain('from 2026-09-14 to 2026-10-14');
    expect(question).toContain('"Acme raised a Series B."');
    expect(question).toContain('Simplified Chinese');
    expect(question).toContain('Never write a URL');
    // With the method (the company-signals skill) as the system message,
    // the question keeps the rules and leaves what to omit to it.
    const guided = signalQuestion({ name: 'Acme' }, TODAY, [], false, true);
    expect(guided).toContain('funding, hiring, leadership, business, risk');
    expect(guided).toContain('cite the pages that state it as [ref_n]');
    expect(guided).not.toContain('Leave out routine news');
    expect(question).toContain('Leave out routine news');
  });

  it("asks a model that cites by URL for a report naming each event's pages", () => {
    const question = signalQuestion(
      { name: 'Acme' },
      TODAY,
      [],
      false,
      true,
      'urls',
    );
    expect(question).toContain('write the full URL of every page');
    expect(question).toContain('Answer as a short report');
    expect(question).not.toContain('Return only one JSON object');
    expect(question).not.toContain('Never write a URL');
  });

  it('marks the URLs the search read as [ref_n] and drops any other', () => {
    const { text, pages } = citePages(
      'Acme raised a round <https://news.example/acme?utm_source=openai>. ' +
        'A rumour (https://made-up.example/x). Also https://www.wire.example/a/.',
      [
        { url: 'https://news.example/acme', title: 'Acme raises' },
        { url: 'https://news.example/acme#top' },
        { url: 'https://www.wire.example/a', title: 'Wire' },
        { url: 'ftp://files.example/x' },
      ],
    );
    expect(pages).toEqual([
      {
        index: 1,
        title: 'Acme raises',
        url: 'https://news.example/acme',
        site: 'news.example',
      },
      {
        index: 2,
        title: 'Wire',
        url: 'https://www.wire.example/a',
        site: 'wire.example',
      },
    ]);
    expect(text).toBe('Acme raised a round [ref_1]. A rumour . Also [ref_2]');
  });
});

describe('the search through the model gateway', () => {
  const searcher = (
    provider: string,
    model: MockLanguageModelV4,
  ): WebSearcher => ({
    kind: 'gateway',
    service: 'svc',
    model: 'm',
    provider,
    languageModel: () => Promise.resolve(model),
  });
  const answer = (text: string, sources: { url: string; title: string }[]) =>
    new MockLanguageModelV4({
      doGenerate: {
        content: [
          { type: 'text', text },
          ...sources.map((source, i) => ({
            type: 'source' as const,
            sourceType: 'url' as const,
            id: String(i),
            ...source,
          })),
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 5, text: 5, reasoning: 0 },
        },
        warnings: [],
      },
    });

  it("searches with the provider's own tool and cites the pages it read", async () => {
    const model = answer('Hired a CFO <https://a.example/cfo>.', [
      { url: 'https://a.example/cfo', title: 'New CFO' },
    ]);
    const result = await searchWeb(searcher('anthropic', model), 'question', {
      system: 'method',
    });
    expect(result.text).toBe('Hired a CFO [ref_1].');
    expect(result.pages).toEqual([
      {
        index: 1,
        title: 'New CFO',
        url: 'https://a.example/cfo',
        site: 'a.example',
      },
    ]);
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 5 });
    const call = model.doGenerateCalls[0];
    expect(call?.tools?.map((tool) => tool.name)).toEqual(['web_search']);
  });

  it('asks without the tool when not searching, keeping the text', async () => {
    const model = answer('{"events":[]} [ref_1]', []);
    const result = await searchWeb(searcher('openai', model), 'reshape', {
      search: false,
    });
    expect(result.text).toBe('{"events":[]} [ref_1]');
    expect(model.doGenerateCalls[0]?.tools ?? []).toEqual([]);
  });

  it('says a model whose provider cannot search cannot, for good', async () => {
    const model = answer('x', []);
    const failure = await searchWeb(searcher('deepseek', model), 'q').catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(WebSearchError);
    expect((failure as WebSearchError).transient).toBe(false);
    expect((failure as WebSearchError).message).toContain(
      'cannot search the web',
    );
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});

describe('the search through DeepSeek', () => {
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 4, text: 4, reasoning: 0 },
  };
  const searching = (query: string) => ({
    content: [
      {
        type: 'tool-call' as const,
        toolCallId: 'c1',
        toolName: 'web_search',
        input: JSON.stringify({ query }),
      },
    ],
    finishReason: { unified: 'tool-calls' as const, raw: 'tool_calls' },
    usage,
    warnings: [],
  });
  const answering = (text: string) => ({
    content: [{ type: 'text' as const, text }],
    finishReason: { unified: 'stop' as const, raw: 'stop' },
    usage,
    warnings: [],
  });
  const searcher = (model: MockLanguageModelV4): WebSearcher => ({
    kind: 'deepseek',
    service: 'deepseek',
    model: 'deepseek-flash',
    apiKey: 'sk-test',
    languageModel: () => Promise.resolve(model),
  });
  // DeepSeek's Search API: each call answers with the next response.
  const searchApi = (...responses: Response[]) => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const fetcher = ((url: string, init: RequestInit) => {
      calls.push({
        url,
        body: JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get('Authorization'),
      });
      return Promise.resolve(responses.shift() ?? Response.json({}));
    }) as typeof fetch;
    return { fetcher, calls };
  };

  it("searches with DeepSeek's Search API, numbering the pages it returns", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        searching('Acme funding'),
        answering('{"website":"https://acme.example","sources":[1]}'),
      ],
    });
    const api = searchApi(
      Response.json({
        results: [
          {
            title: 'Acme raises a round',
            url: 'https://news.example/acme',
            site_name: 'Example News',
            date: '2026-10-18T16:00:00+00:00',
            summary: 'Acme raised 10 million.',
          },
          { title: 'Not a page', url: 'ftp://nope' },
        ],
      }),
    );
    const result = await searchWeb(searcher(model), 'Look up Acme', {
      fetch: api.fetcher,
      system: 'method',
    });
    // The answer stays as written: a website in it is data.
    expect(result.text).toBe(
      '{"website":"https://acme.example","sources":[1]}',
    );
    expect(result.pages).toEqual([
      {
        index: 1,
        title: 'Acme raises a round',
        url: 'https://news.example/acme',
        site: 'Example News',
      },
    ]);
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 8 });
    expect(api.calls).toEqual([
      {
        url: 'https://api.deepseek.com/v1/tools/search',
        body: { query: 'Acme funding', count: 6 },
        auth: 'Bearer sk-test',
      },
    ]);
    // The first turn must search, with the model's reasoning off; the
    // model reads each page under its number.
    const [first, second] = model.doGenerateCalls;
    expect(first?.toolChoice).toEqual({ type: 'required' });
    expect(first?.tools?.map((tool) => tool.name)).toEqual(['web_search']);
    expect(first?.reasoning).toBe('none');
    expect(JSON.stringify(second?.prompt)).toContain(
      '[ref_1] Acme raises a round',
    );
  });

  it('fails the question when its searches failed and found nothing', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [searching('Acme'), answering('{}')],
    });
    const api = searchApi(
      Response.json(
        { error: { message: 'Authentication Fails' } },
        { status: 401 },
      ),
    );
    const failure = await searchWeb(searcher(model), 'Look up Acme', {
      fetch: api.fetcher,
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(WebSearchError);
    expect((failure as WebSearchError).transient).toBe(false);
    expect((failure as WebSearchError).message).toContain(
      'Authentication Fails',
    );
  });

  it('asks without the search when not searching', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [answering('{"events":[]}')],
    });
    const api = searchApi();
    const result = await searchWeb(searcher(model), 'reshape', {
      search: false,
      fetch: api.fetcher,
    });
    expect(result.text).toBe('{"events":[]}');
    expect(result.pages).toEqual([]);
    expect(model.doGenerateCalls[0]?.tools ?? []).toEqual([]);
    expect(api.calls).toEqual([]);
  });
});

describe("a search result's site", () => {
  it('reads a name DeepSeek sent as the hex of its bytes', () => {
    const url = 'https://www.yto.net.cn/about';
    expect(siteName('e59c86e9809ae9809fe98092', url)).toBe('圆通速递');
    expect(siteName('e4b8ade59bbde5aeb6e4babae6898de7bd91', url)).toBe(
      '中国家人才网',
    );
    // A name as written stays, one that only looks like hex included.
    expect(siteName('东方财富', url)).toBe('东方财富');
    expect(siteName('facade', url)).toBe('facade');
    // No name: the page's domain.
    expect(siteName('', url)).toBe('yto.net.cn');
    expect(siteName(undefined, url)).toBe('yto.net.cn');
  });
});
