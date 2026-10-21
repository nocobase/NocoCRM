import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

// The agent a person chats with (client/components/crm/agent-chat/ask.ts):
// the plugin's native chat, which the CRM's scope makes its assistant, named
// as the CRM names it; the agents runners report are not offered.
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@nocobase/app-plugin-agents/client/chat')
  >()),
  useChatAgents: () => ({
    data: ['claude-opus', 'online', 'codex'].map((id) => ({
      id,
      name: id,
      nameText: null,
      descriptionText: null,
    })),
    isLoading: false,
  }),
}));
const { useCrmChatAgents } =
  await import('../../client/components/crm/agent-chat/ask.js');

it('offers the native chat alone, named as the CRM names its assistant', () => {
  const { result } = renderHook(() => useCrmChatAgents());
  expect(result.current.data).toMatchObject([
    {
      id: 'online',
      name: 'Sales Expert',
      nameText: { key: 'crm.agentPreset.agentName', ns: 'crm' },
    },
  ]);
});
