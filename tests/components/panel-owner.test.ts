import { beforeEach, expect, it } from 'vitest';
import {
  agentsQueryClient,
  CHAT_PANEL_STORAGE_KEY,
} from '@nocobase/app-plugin-agents/client/chat';
import { settlePanelOwner } from '../../client/components/crm/agent-chat/panel-owner.js';

// The assistant panel's stored state follows the person signed in: another
// person, or signing out, drops it with the chat's cache.

const stored = (conversationId: string) =>
  JSON.stringify({ open: true, view: 'chat', conversationId });

beforeEach(() => sessionStorage.clear());

it("drops the panel's state and the chat's cache when another person signs in", () => {
  settlePanelOwner('admin');
  sessionStorage.setItem(CHAT_PANEL_STORAGE_KEY, stored('c-admin'));
  agentsQueryClient().setQueryData(['probe'], 1);
  // The same person, a reload: kept.
  settlePanelOwner('admin');
  expect(sessionStorage.getItem(CHAT_PANEL_STORAGE_KEY)).toBe(
    stored('c-admin'),
  );
  // Signed out, then someone else: gone.
  settlePanelOwner(null);
  expect(sessionStorage.getItem(CHAT_PANEL_STORAGE_KEY)).toBeNull();
  expect(agentsQueryClient().getQueryData(['probe'])).toBeUndefined();
  sessionStorage.setItem(CHAT_PANEL_STORAGE_KEY, stored('c-stale'));
  settlePanelOwner('oliver');
  expect(sessionStorage.getItem(CHAT_PANEL_STORAGE_KEY)).toBeNull();
});

it('keeps what a tab that never recorded an owner has', () => {
  sessionStorage.setItem(CHAT_PANEL_STORAGE_KEY, stored('c-mine'));
  settlePanelOwner('admin');
  expect(sessionStorage.getItem(CHAT_PANEL_STORAGE_KEY)).toBe(stored('c-mine'));
});
