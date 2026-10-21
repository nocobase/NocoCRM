import {
  appUIMessageText,
  type AppUIMessage,
} from '@nocobase/app-plugin-agents/client/chat';

// What the CRM tells the assistant of a conversation (a plan decided, an
// agent's card ready, a look-up done) arrives as a message marked as its
// news (wakeAssistant in server/providers/crm-agents/assistant.ts), which
// the conversation does not show as the person's: the notice beside it
// says what happened, and the assistant's answer follows.
const NEWS_OPEN = '<crm-news>';

export function isNews(message: AppUIMessage): boolean {
  return (
    message.role === 'user' &&
    appUIMessageText(message).trimStart().startsWith(NEWS_OPEN)
  );
}
