import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The assistant's dock at the bottom of the page: what it shows on a page and
// a record, what it asks the panel for, and when it stays out of the way.

const state = vi.hoisted(() => ({
  panelOpen: false,
  mobile: false,
  // The company's switch in Settings → General (assistantDock).
  dock: true,
  // A read-only demo site (Demo Mode).
  demoSite: false,
}));

// The crm locale's English text by its dotted key, with {{name}} filled in.
function english(key: string, options: Record<string, unknown> = {}): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  const textValue = typeof value === 'string' ? value : key;
  return textValue.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
    String(options[name] ?? ''),
  );
}

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmText: () => ({ text: english, language: 'en-US' }),
    // No workspace here but the dock's switch: no background agent to
    // leave out of the chat.
    useMetadata: () => ({
      data: state.demoSite
        ? { demoSite: true, settings: {} }
        : state.dock
          ? undefined
          : { settings: { assistantDock: false } },
    }),
  };
});
// The assistant on the Agents plugin, with two models (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');
const MODEL = { modelService: 'qwen', model: 'qwen-max' };
vi.mock('../../client/hooks/use-mobile.js', () => ({
  useIsMobile: () => state.mobile,
}));

const { AssistantDock } =
  await import('../../client/components/crm/assistant-dock.js');
const { useAnnounceRecord } =
  await import('../../client/components/crm/current-record.js');

function RecordPage({ name }: { name?: string }) {
  useAnnounceRecord({ entity: 'leads', recordId: 'l1', name });
  return null;
}

// What was asked of the assistant: each question as created and sent.
function asked(): Record<string, unknown>[] {
  return chatFake.sent.map((message, index) => {
    const context = message.context as
      { items: { kind: string; id: string }[] } | undefined;
    return {
      text: message.content,
      model: chatFake.created[index]?.selectedModel,
      items: (context?.items ?? []).map((item) => `${item.kind}:${item.id}`),
      files: message.attachmentIds ?? [],
    };
  });
}

function renderDock(path = '/', record?: { name?: string }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {record && <RecordPage name={record.name} />}
      <AssistantDock />
    </MemoryRouter>,
  );
}

describe('the assistant dock', () => {
  beforeEach(() => {
    chatFake.open = false;
    state.mobile = false;
    state.demoSite = false;
    chatFake.reset();
    localStorage.clear();
  });

  it("shows the page's suggested questions when focused, and sends one with a click", async () => {
    const user = userEvent.setup();
    renderDock('/leads');
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    expect(screen.queryByRole('list')).toBeNull();
    await user.click(input);
    const list = screen.getByRole('list', {
      name: english('dock.suggestions'),
    });
    expect(list.querySelectorAll('li')).toHaveLength(2);
    await user.click(
      screen.getByRole('button', { name: english('dock.q.leads.first') }),
    );
    await waitFor(() =>
      expect(asked()).toEqual([
        {
          text: english('dock.q.leads.first'),
          model: MODEL,
          items: [],
          files: [],
        },
      ]),
    );
    // The panel opens on the conversation.
    expect(chatFake.opened).toEqual([{ conversationId: 'c1', view: 'chat' }]);
  });

  it("asks about the page's record, its kind named in the placeholder, and clears itself", async () => {
    const user = userEvent.setup();
    renderDock('/leads/l1', { name: 'Tang Rui' });
    const input = screen.getByRole('textbox', {
      name: 'Ask anything about this lead…',
    });
    await user.click(input);
    // The lead's own questions.
    expect(
      screen.getByRole('button', { name: english('dock.q.lead.summary') }),
    ).toBeTruthy();
    const send = screen.getByRole('button', { name: english('send') });
    expect(send).toBeDisabled();
    await user.type(input, 'Who decides?');
    // Typing hides the suggestions.
    expect(screen.queryByRole('list')).toBeNull();
    await user.click(send);
    expect(input).toHaveValue('');
    await waitFor(() =>
      expect(asked()).toEqual([
        { text: 'Who decides?', model: MODEL, items: ['leads:l1'], files: [] },
      ]),
    );
  });

  it('sends with Enter, but not while an input method is composing', async () => {
    const user = userEvent.setup();
    renderDock('/tasks');
    const input = screen.getByRole('textbox');
    await user.type(input, '逾期');
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    await user.keyboard('{Enter}');
    await waitFor(() => expect(asked()).toHaveLength(1));
    expect(asked()[0]?.text).toBe('逾期');
    // Sent, the emptied box does not bring its suggestions back.
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('opens into the composer when clicked, and Tab goes through its tools to the suggestions', async () => {
    const user = userEvent.setup();
    renderDock('/leads');
    // One line: no files or model until it is used.
    expect(
      screen.queryByRole('button', { name: english('dock.attach') }),
    ).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: english('dock.model') }),
    ).toBeNull();
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(input).toHaveFocus();
    // The send button is disabled while the box is empty, so Tab skips it.
    await user.tab();
    expect(
      screen.getByRole('button', { name: english('dock.attach') }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('combobox', { name: english('dock.model') }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('button', { name: english('dock.q.leads.first') }),
    ).toHaveFocus();
    expect(screen.getByRole('list')).toBeTruthy();
    // Leaving an empty box closes it to one line again.
    const outside = document.createElement('button');
    document.body.append(outside);
    act(() => outside.focus());
    outside.remove();
    expect(
      screen.queryByRole('button', { name: english('dock.attach') }),
    ).toBeNull();
  });

  it('closes on a press outside even when the page keeps focus, as the board does when it drags', async () => {
    const user = userEvent.setup();
    renderDock('/opportunities');
    await user.click(screen.getByRole('textbox'));
    expect(
      screen.getByRole('button', { name: english('dock.attach') }),
    ).toBeTruthy();
    // A board that starts a drag on a press: focus does not move.
    const board = document.createElement('div');
    board.addEventListener('mousedown', (event) => event.preventDefault());
    document.body.append(board);
    act(() => {
      fireEvent.pointerDown(board);
      fireEvent.mouseDown(board);
    });
    board.remove();
    expect(
      screen.queryByRole('button', { name: english('dock.attach') }),
    ).toBeNull();
  });

  it('veils the page while in use, a click on the veil closing it and reaching nothing below', async () => {
    const user = userEvent.setup();
    const { container } = renderDock('/contacts');
    await user.click(screen.getByRole('textbox'));
    const veil = container.querySelector('[data-dock-veil]');
    expect(veil).not.toBeNull();
    await user.click(veil as Element);
    expect(container.querySelector('[data-dock-veil]')).toBeNull();
    expect(
      screen.queryByRole('button', { name: english('dock.attach') }),
    ).toBeNull();
  });

  it('keeps itself open while it holds a file, and sends the file with the record', async () => {
    const user = userEvent.setup();
    renderDock('/leads/l1', { name: 'Tang Rui' });
    await user.click(screen.getByRole('textbox'));
    await user.upload(
      screen.getByTestId('ask-files'),
      new File(['x'], 'quote.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByText('quote.pdf')).toBeTruthy();
    const send = screen.getByRole('button', { name: english('send') });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    await waitFor(() =>
      expect(asked()).toEqual([
        { text: '', model: MODEL, items: ['leads:l1'], files: ['f-quote.pdf'] },
      ]),
    );
  });

  it('keeps the text when Esc closes the suggestions', async () => {
    const user = userEvent.setup();
    renderDock('/leads');
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(screen.getByRole('list')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('list')).toBeNull();
    expect(input).toHaveFocus();
    await user.type(input, 'draft');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('draft');
  });

  it('stays one line when a panel opened from elsewhere closes', () => {
    // Opened from the header's button, then back from the conversations
    // page: the dock comes back with the panel open, and the panel closes.
    const header = document.createElement('button');
    document.body.append(header);
    act(() => header.focus());
    chatFake.open = true;
    const { rerender } = renderDock('/contacts');
    header.remove();
    chatFake.open = false;
    act(() =>
      rerender(
        <MemoryRouter initialEntries={['/contacts']}>
          <AssistantDock />
        </MemoryRouter>,
      ),
    );
    expect(screen.getByRole('textbox')).not.toHaveFocus();
    expect(
      screen.queryByRole('button', { name: english('dock.attach') }),
    ).toBeNull();
  });

  it('gets focus back, still one line, when the panel it opened closes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDock('/contacts');
    const input = screen.getByRole('textbox');
    await user.type(input, 'Who is new?');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(asked()).toHaveLength(1));
    // The panel takes focus, then closes.
    chatFake.open = true;
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      rerender(
        <MemoryRouter initialEntries={['/contacts']}>
          <AssistantDock />
        </MemoryRouter>,
      );
    });
    chatFake.open = false;
    act(() =>
      rerender(
        <MemoryRouter initialEntries={['/contacts']}>
          <AssistantDock />
        </MemoryRouter>,
      ),
    );
    const back = screen.getByRole('textbox');
    expect(back).toHaveFocus();
    // Not opened by itself: no tools, no suggestions.
    expect(
      screen.queryByRole('button', { name: english('dock.attach') }),
    ).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    // A press opens it.
    await user.click(back);
    expect(
      screen.getByRole('button', { name: english('dock.attach') }),
    ).toBeTruthy();
  });

  it('stays out of the way: agents loading, panel open, the overview, filled pages', () => {
    chatFake.loading = true;
    const loading = renderDock('/leads');
    expect(screen.queryByRole('textbox')).toBeNull();
    loading.unmount();

    chatFake.loading = false;
    // The overview has an ask box of its own.
    for (const path of [
      '/',
      '/mail',
      '/inbox',
      '/whatsapp',
      '/whatsapp/c1',
      '/whatsapp/connection',
      '/agent-chat',
      '/agent-chat/c1',
      '/settings/users',
      '/foundation',
    ]) {
      const page = renderDock(path);
      expect(screen.queryByRole('textbox')).toBeNull();
      page.unmount();
    }
    const accounts = renderDock('/mail/accounts');
    expect(screen.getByRole('textbox')).toBeTruthy();
    accounts.unmount();

    chatFake.open = true;
    renderDock('/leads');
    // Hidden, not unmounted, so text being typed survives.
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('textbox', { hidden: true }).closest('[hidden]'),
    ).toBeTruthy();
  });

  it('is not shown when the company switched it off', () => {
    state.dock = false;
    try {
      renderDock('/leads');
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
    } finally {
      state.dock = true;
    }
  });

  it('says why when the chat cannot start, and sends nothing', async () => {
    const user = userEvent.setup();
    chatFake.agents = [
      {
        ...chatFake.agents[0],
        availability: {
          online: false,
          reason: 'modelUnavailable',
          onlineRunners: 0,
        },
      },
    ];
    renderDock('/leads');
    const reason = english('agentChat.offline.modelUnavailable');
    const input = screen.getByRole('textbox', { name: reason });
    expect(input).toBeDisabled();
    await user.click(input);
    expect(screen.queryByRole('list')).toBeNull();
    expect(chatFake.created).toHaveLength(0);
  });

  it('opens the panel on the question about the record on a demo site, sending nothing', async () => {
    const user = userEvent.setup();
    state.demoSite = true;
    renderDock('/leads/l1', { name: 'Tang Rui' });
    const input = screen.getByRole('textbox', {
      name: 'Ask anything about this lead…',
    });
    expect(input).toBeEnabled();
    await user.click(input);
    await user.click(
      screen.getByRole('button', { name: english('dock.q.lead.summary') }),
    );
    expect(chatFake.created).toHaveLength(0);
    expect(chatFake.sent).toHaveLength(0);
    expect(chatFake.opened[0]).toEqual({
      conversationId: null,
      view: 'chat',
      draft: english('dock.q.lead.summary'),
    });
    expect(chatFake.pinned).toHaveLength(1);
    expect(chatFake.pinned[0]).toMatchObject({ id: 'l1' });
  });

  it('is a round button on a phone that opens a new conversation from the record', async () => {
    const user = userEvent.setup();
    state.mobile = true;
    renderDock('/leads/l1', { name: 'Tang Rui' });
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: english('dock.open') }),
    );
    // A new conversation with the lead pinned, nothing sent.
    expect(chatFake.created).toHaveLength(0);
    expect(chatFake.pinned).toEqual([
      { kind: 'leads', id: 'l1', label: 'Tang Rui' },
    ]);
  });

  it('asks about the newest record when one record page replaces another', async () => {
    const user = userEvent.setup();
    function Swap({ first }: { first: boolean }) {
      return (
        <>
          {first ? (
            <RecordPage key='a' name='Lin Yue' />
          ) : (
            <RecordPage key='b' name='Wu Yichen' />
          )}
          <AssistantDock />
        </>
      );
    }
    const { rerender } = render(
      <MemoryRouter initialEntries={['/leads/l1']}>
        <Swap first />
      </MemoryRouter>,
    );
    act(() =>
      rerender(
        <MemoryRouter initialEntries={['/leads/l1']}>
          <Swap first={false} />
        </MemoryRouter>,
      ),
    );
    const input = screen.getByRole('textbox', {
      name: 'Ask anything about this lead…',
    });
    await user.type(input, 'Next?{Enter}');
    // The page that went away withdrew only its own announcement.
    await waitFor(() => expect(chatFake.sent).toHaveLength(1));
    const context = chatFake.sent[0]?.context as {
      items: { id: string }[];
    };
    expect(context.items).toHaveLength(1);
    expect(asked()[0]?.items).toEqual(['leads:l1']);
  });
});
