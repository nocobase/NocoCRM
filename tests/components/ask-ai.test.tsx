import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ assistant: true }));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useAssistantAvailable: () => state.assistant,
    useCrmText: () => ({ text: () => '问 AI', language: 'zh-CN' }),
  };
});

const { AskAIButton } = await import('../../client/components/crm/ask-ai.js');

it('starts a new conversation about the record it is on', async () => {
  const events: unknown[] = [];
  const listen = (event: Event) => events.push((event as CustomEvent).detail);
  window.addEventListener('crm-assistant', listen);
  try {
    render(
      <AskAIButton entity='activities' recordId='a-1' name='需求确认电话' />,
    );
    await userEvent.click(screen.getByRole('button', { name: '问 AI' }));
    // The record as the starting point, nothing typed or sent for the user.
    expect(events).toEqual([
      {
        prompt: '',
        entity: 'activities',
        recordId: 'a-1',
        name: '需求确认电话',
        send: false,
        newConversation: true,
      },
    ]);
  } finally {
    window.removeEventListener('crm-assistant', listen);
  }
});

it('is not there while the assistant is off', () => {
  state.assistant = false;
  render(<AskAIButton entity='leads' recordId='l-1' />);
  expect(screen.queryByRole('button')).toBeNull();
  state.assistant = true;
});
