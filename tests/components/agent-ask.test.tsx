import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// Asking the assistant from outside its panel: a card's Discuss pins the record and
// the card in a new conversation without sending; a question starts a
// conversation of the CRM's scope and opens the panel on it, and one whose
// conversation could not be started says so and opens nothing.

function english(key: string): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  return typeof value === 'string' ? value : key;
}

const toasts = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  useToaster: () => ({
    show: (toast: Record<string, unknown>) => toasts.push(toast),
    close: () => undefined,
  }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  // No workspace here: no background agent to leave out of the chat.
  useMetadata: () => ({ data: undefined }),
}));
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake, AI_AGENT } = await import('../setup/agent-chat-fake.js');
const { DiscussButton } =
  await import('../../client/components/crm/agent-chat/discuss-button.js');
const { cardPin, recordPin, useAskAgent } =
  await import('../../client/components/crm/agent-chat/ask.js');
const { Composer } =
  await import('../../client/components/crm/agent-chat/composer.js');

function Ask({ text }: { text: string }) {
  const ask = useAskAgent();
  return (
    <button
      type='button'
      onClick={() =>
        void ask({
          text,
          agent: AI_AGENT as never,
          items: [recordPin('leads', 'l1', 'Tang Rui')],
        }).catch(() => undefined)
      }
    >
      ask
    </button>
  );
}

describe('asking the assistant from outside its panel', () => {
  beforeEach(() => {
    chatFake.reset();
    toasts.length = 0;
  });

  it("pins the record and its card for a card's Discuss, replacing earlier pins, and sends nothing", async () => {
    const user = userEvent.setup();
    chatFake.pinned = [{ kind: 'leads', id: 'old', label: 'Earlier' }];
    render(
      <DiscussButton
        pins={[
          recordPin('leads', 'l1', 'Tang Rui'),
          cardPin('e1', 'AI follow-up · Follow up'),
        ]}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: english('evaluation.ask') }),
    );
    expect(chatFake.cleared).toBe(1);
    expect(chatFake.pinned).toEqual([
      { kind: 'leads', id: 'l1', label: 'Tang Rui' },
      { kind: 'crm-evaluation', id: 'e1', label: 'AI follow-up · Follow up' },
    ]);
    // A new conversation, nothing created or sent until the person writes.
    expect(chatFake.opened[0]).toMatchObject({
      conversationId: null,
      view: 'chat',
    });
    expect(chatFake.created).toHaveLength(0);
    expect(chatFake.focused).toBe(1);
  });

  it('sends a question with the record in a conversation of its own, then opens the panel on it', async () => {
    const user = userEvent.setup();
    render(<Ask text='Who decides?' />);
    await user.click(screen.getByRole('button', { name: 'ask' }));
    await waitFor(() => expect(chatFake.sent).toHaveLength(1));
    // The assistant: the plugin's native chat with the CRM's scope.
    expect(chatFake.created[0]).toMatchObject({
      agentId: 'online',
      source: 'crm',
      config: { scope: ['crm'] },
    });
    expect(chatFake.sent[0]).toMatchObject({
      conversationId: 'c1',
      content: 'Who decides?',
      context: { items: [{ kind: 'leads', id: 'l1' }] },
    });
    expect(chatFake.opened).toEqual([{ conversationId: 'c1', view: 'chat' }]);
  });

  it('says so when the conversation could not be started, and opens nothing', async () => {
    const user = userEvent.setup();
    chatFake.sendFails = true;
    render(<Ask text='Who decides?' />);
    await user.click(screen.getByRole('button', { name: 'ask' }));
    await waitFor(() =>
      expect(toasts).toEqual([
        { type: 'error', title: english('agentPanel.sendFailed') },
      ]),
    );
    expect(chatFake.opened).toEqual([]);
  });

  it('opens a new conversation for a Discuss with nothing to pin', async () => {
    const user = userEvent.setup();
    render(<DiscussButton pins={[]} />);
    await user.click(
      screen.getByRole('button', { name: english('evaluation.ask') }),
    );
    expect(chatFake.opened).toEqual([{ conversationId: null, view: 'chat' }]);
  });

  it('puts a draft the panel holds into a composer mounted after it, once', () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    chatFake.draft = { text: 'Who decides?', nonce: 7 };
    const first = render(
      <Composer disabled={false} reason={null} onSend={() => undefined} />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('Who decides?');
    first.unmount();
    // Another conversation's composer does not take it again.
    render(
      <Composer disabled={false} reason={null} onSend={() => undefined} />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});
