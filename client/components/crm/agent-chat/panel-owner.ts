import {
  agentsQueryClient,
  CHAT_PANEL_STORAGE_KEY,
} from '@nocobase/app-plugin-agents/client/chat';

// Who the assistant panel's stored state belongs to, beside it in the tab's
// session storage. The plugin keeps the panel's state (open, its
// conversation) for the tab and leaves it to the application to drop it when
// another person signs in; without this, the next person opened the panel on
// a conversation that is not theirs ("This conversation does not exist").

const PANEL_OWNER_KEY = 'nococrm:agents-chat-panel-owner';

// For the person signed in now (null: nobody): when the stored state is
// someone else's, it goes, and so does the chat's cache. A tab that never
// recorded an owner keeps what it has.
export function settlePanelOwner(userId: string | null): void {
  try {
    const owner = window.sessionStorage.getItem(PANEL_OWNER_KEY);
    if (owner === (userId ?? '')) return;
    if (owner !== null) {
      window.sessionStorage.removeItem(CHAT_PANEL_STORAGE_KEY);
      agentsQueryClient().clear();
    }
    window.sessionStorage.setItem(PANEL_OWNER_KEY, userId ?? '');
  } catch {
    // Storage may be unavailable; the panel then keeps nothing anyway.
  }
}
