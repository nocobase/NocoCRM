import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { HeaderActions } from '../../client/layouts/components/header-actions.js';
import { AssistantHeaderButton } from '../../client/components/crm/assistant-header-button.js';

vi.mock('../../client/theme/index.js', () => ({
  ThemeSettings: () => null,
}));
vi.mock('../../client/layouts/components/user-menu.js', () => ({
  UserMenu: () => null,
}));
vi.mock('../../client/layouts/components/demo-mode-badge.js', () => ({
  DemoModeBadge: () => null,
}));

const state = vi.hoisted(() => ({
  readiness: { state: 'ready' } as { state: string; reason?: string },
  open: false,
  demoSite: false,
  conversationId: null as string | null,
  toggleChat: vi.fn(),
  openChat: vi.fn(),
}));
vi.mock('@nocobase/app-plugin-agents/client/chat', () => ({
  useChatPanel: () => ({
    open: state.open,
    conversationId: state.conversationId,
    toggleChat: state.toggleChat,
    openChat: state.openChat,
  }),
  useConversationList: () => ({
    data: {
      pages: [
        {
          items: [
            { id: 'c1', source: 'crm' },
            { id: 'c2', source: 'crm' },
          ],
        },
      ],
    },
  }),
}));
vi.mock('../../client/components/crm/agent-chat/ask.js', () => ({
  useAgentReadiness: () => state.readiness,
  useDemoSite: () => state.demoSite,
  listedConversations: (pages: { items: unknown[] }[] | undefined) =>
    (pages ?? []).flatMap((page) => page.items),
}));
vi.mock('../../client/components/crm/api.js', () => ({
  toText: (value: unknown) => String(value ?? ''),
  useCrmText: () => ({ text: (key: string) => key }),
}));

beforeEach(() => {
  state.readiness = { state: 'ready' };
  state.open = false;
  state.demoSite = false;
  state.conversationId = null;
  state.toggleChat.mockReset();
  state.openChat.mockReset();
});

// The header carries no Settings or Inbox entry: the settings pages are a
// section of the menu and the inbox is the menu's, right under the overview
// (client/routes.ts). It leads with the assistant, from every page.
it('has the assistant, and neither a settings nor an inbox entry', () => {
  render(
    <MemoryRouter initialEntries={['/settings/crm']}>
      <HeaderActions />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Inbox/u })).toBeNull();
  expect(screen.getByRole('button', { name: 'dock.open' })).toBeTruthy();
});

it('opens the panel where it was left, as ⌘J does, and closes it again', () => {
  const { rerender } = render(<AssistantHeaderButton />);
  const button = screen.getByRole('button', { name: 'dock.open' });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(button);
  expect(state.toggleChat).toHaveBeenCalledTimes(1);
  state.open = true;
  rerender(<AssistantHeaderButton />);
  expect(
    screen
      .getByRole('button', { name: 'dock.open' })
      .getAttribute('aria-expanded'),
  ).toBe('true');
});

it('says why, disabled, while the assistant cannot answer, and waits while it loads', () => {
  state.readiness = { state: 'unavailable', reason: 'Not set up' };
  const { rerender } = render(<AssistantHeaderButton />);
  const button = screen.getByRole('button', { name: 'Not set up' });
  expect(button.hasAttribute('disabled')).toBe(true);
  state.readiness = { state: 'loading' };
  rerender(<AssistantHeaderButton />);
  expect(screen.queryByRole('button')).toBeNull();
});

it('opens the first conversation on a demo site, where they can be read', () => {
  state.readiness = { state: 'unavailable', reason: 'Demo site' };
  state.demoSite = true;
  const { rerender } = render(<AssistantHeaderButton />);
  const button = screen.getByRole('button', { name: 'dock.open' });
  expect(button.hasAttribute('disabled')).toBe(false);
  fireEvent.click(button);
  expect(state.openChat).toHaveBeenCalledWith({
    conversationId: 'c1',
    view: 'chat',
  });
  expect(state.toggleChat).not.toHaveBeenCalled();
  // One already open stays; an open panel closes.
  state.conversationId = 'c2';
  rerender(<AssistantHeaderButton />);
  fireEvent.click(screen.getByRole('button', { name: 'dock.open' }));
  expect(state.toggleChat).toHaveBeenCalledTimes(1);
  expect(state.openChat).toHaveBeenCalledTimes(1);
  // One remembered but gone (the demo reset, another account's): the
  // first again.
  state.conversationId = 'gone';
  rerender(<AssistantHeaderButton />);
  fireEvent.click(screen.getByRole('button', { name: 'dock.open' }));
  expect(state.openChat).toHaveBeenLastCalledWith({
    conversationId: 'c1',
    view: 'chat',
  });
});
