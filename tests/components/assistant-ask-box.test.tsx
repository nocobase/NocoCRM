import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The overview's ask box: its suggested questions always shown, what it asks
// the panel for, and how it waits for the metadata and the chat.

// The crm locale's English text by its dotted key.
function english(key: string): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  return typeof value === 'string' ? value : key;
}

// The startup mode is independent of workspace loading.
const demo = vi.hoisted(() => ({ enabled: false }));
vi.mock('@nocobase/app-plugin-demo-mode/client', () => ({
  useDemoMode: () => demo.enabled,
}));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmText: () => ({ text: english, language: 'en-US' }),
    // No workspace here: no background agent to leave out of the chat.
    useMetadata: () => ({ data: undefined }),
  };
});
// The assistant on the Agents plugin, with two models (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');
const { CHAT_PANEL_ATTRIBUTE } =
  await import('@nocobase/app-plugin-agents/client/chat');
const QWEN = { modelService: 'qwen', model: 'qwen-max' };

const { AssistantAskBox } =
  await import('../../client/components/crm/assistant-ask-box.js');

// What was asked of the assistant: each question as created and sent.
function asked(): Record<string, unknown>[] {
  return chatFake.sent.map((message, index) => ({
    text: message.content,
    model: chatFake.created[index]?.selectedModel,
    files: message.attachmentIds ?? [],
  }));
}

describe("the overview's ask box", () => {
  beforeEach(() => {
    chatFake.open = false;
    chatFake.reset();
    localStorage.clear();
  });

  it('offers no question of its own, only those the page gives, sending one with a click', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AssistantAskBox />);
    expect(
      screen.queryByRole('list', { name: english('dock.suggestions') }),
    ).toBeNull();
    unmount();
    render(
      <AssistantAskBox
        questions={[
          { key: 'closingSoon', text: '3 deals are due to close soon' },
        ]}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: '3 deals are due to close soon' }),
    );
    await waitFor(() =>
      expect(asked()).toEqual([
        { text: '3 deals are due to close soon', model: QWEN, files: [] },
      ]),
    );
  });

  it('sends what is typed with Enter, not while an input method composes, and clears itself', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    await user.type(input, '本月');
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    expect(chatFake.created).toHaveLength(0);
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('');
    await waitFor(() =>
      expect(asked()).toEqual([{ text: '本月', model: QWEN, files: [] }]),
    );
  });

  it('moves from the box through its tools with Tab', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    await user.click(screen.getByRole('textbox'));
    // Then the paperclip and the model; the send button is disabled while
    // the box is empty, so Tab skips it.
    await user.tab();
    expect(
      screen.getByRole('button', { name: english('dock.attach') }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('combobox', { name: english('dock.model') }),
    ).toHaveFocus();
  });

  it('keeps its place disabled while the agents load', () => {
    chatFake.loading = true;
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
    ).toBeDisabled();
  });

  it('says why when the chat cannot start, and sends nothing', async () => {
    const user = userEvent.setup();
    // No agent at all: the assistant is not set up.
    chatFake.agents = [];
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('textbox', { name: english('agentPanel.notSetUp') }),
    ).toBeDisabled();
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('Hello{Enter}');
    expect(chatFake.created).toHaveLength(0);
  });

  it('opens the panel on the question on a read-only demo site, sending nothing', async () => {
    const user = userEvent.setup();
    demo.enabled = true;
    try {
      render(<AssistantAskBox />);
      const input = screen.getByRole('textbox', {
        name: english('dock.placeholder'),
      });
      expect(input).toBeEnabled();
      await user.click(input);
      await user.keyboard('Hello{Enter}');
      expect(chatFake.created).toHaveLength(0);
      expect(chatFake.sent).toHaveLength(0);
      expect(chatFake.opened).toContainEqual({
        conversationId: null,
        view: 'chat',
        draft: 'Hello',
      });
      expect(input).toHaveValue('');
    } finally {
      demo.enabled = false;
    }
  });

  it('takes focus back when the panel it opened closes with focus left in it', () => {
    const { rerender } = render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    act(() => input.focus());
    // The panel opens on the question, and its composer takes focus.
    chatFake.open = true;
    const panel = document.createElement('div');
    panel.setAttribute(CHAT_PANEL_ATTRIBUTE, '');
    const composer = document.createElement('textarea');
    panel.append(composer);
    document.body.append(panel);
    act(() => rerender(<AssistantAskBox />));
    act(() => composer.focus());
    // The panel unmounts as it closes, taking the focused composer along.
    chatFake.open = false;
    panel.remove();
    act(() => rerender(<AssistantAskBox />));
    expect(input).toHaveFocus();
  });

  it('leaves focus alone when a panel opened from elsewhere closes', () => {
    const button = document.createElement('button');
    document.body.append(button);
    const { rerender } = render(<AssistantAskBox />);
    act(() => button.focus());
    chatFake.open = true;
    act(() => rerender(<AssistantAskBox />));
    button.remove();
    chatFake.open = false;
    act(() => rerender(<AssistantAskBox />));
    expect(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
    ).not.toHaveFocus();
  });

  it('grows past one line: Shift+Enter breaks the line, Enter sends both', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    expect(input.tagName).toBe('TEXTAREA');
    await user.type(input, 'First{Shift>}{Enter}{/Shift}second');
    expect(chatFake.created).toHaveLength(0);
    expect(input).toHaveValue('First\nsecond');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(asked()[0]?.text).toBe('First\nsecond'));
  });

  it('uploads files as they are picked and sends them with the question', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    await user.upload(
      screen.getByTestId('ask-files'),
      new File(['x'], 'brief.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByText('brief.pdf')).toBeTruthy();
    // A file alone is enough to send.
    const send = screen.getByRole('button', { name: english('send') });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    await waitFor(() =>
      expect(asked()).toEqual([
        { text: '', model: QWEN, files: ['f-brief.pdf'] },
      ]),
    );
    // Sent files leave the box.
    expect(screen.queryByText('brief.pdf')).toBeNull();
  });

  it('runs the new conversation on the model picked, remembered in the browser', async () => {
    const user = userEvent.setup();
    const first = render(<AssistantAskBox />);
    await user.click(
      screen.getByRole('combobox', { name: english('dock.model') }),
    );
    await user.click(await screen.findByRole('option', { name: 'GPT 5' }));
    await user.type(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
      'Today{Enter}',
    );
    await waitFor(() =>
      expect(asked()[0]?.model).toEqual({
        modelService: 'openai',
        model: 'gpt-5',
      }),
    );
    first.unmount();
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('combobox', { name: english('dock.model') }),
    ).toHaveTextContent('GPT 5');
  });
});
