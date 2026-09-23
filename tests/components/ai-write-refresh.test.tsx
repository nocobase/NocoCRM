import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRefresh: () => refresh,
}));

const { useRefreshAfterWrite } =
  await import('../../client/components/crm/ai-write-refresh.js');

beforeEach(() => refresh.mockClear());

it('reloads the CRM pages once when a proposal it saw waiting is written', () => {
  const view = renderHook(
    ({ state, written }: { state: string; written: boolean }) =>
      useRefreshAfterWrite('call-written', state, written),
    { initialProps: { state: 'input-available', written: false } },
  );
  expect(refresh).not.toHaveBeenCalled();
  view.rerender({ state: 'output-available', written: true });
  expect(refresh).toHaveBeenCalledOnce();
  // Later renders of the settled card do not reload again.
  view.rerender({ state: 'output-available', written: true });
  view.unmount();
  renderHook(() =>
    useRefreshAfterWrite('call-written', 'output-available', true),
  );
  expect(refresh).toHaveBeenCalledOnce();
});

it('leaves the pages alone for a card read back from history', () => {
  renderHook(() =>
    useRefreshAfterWrite('call-from-history', 'output-available', true),
  );
  expect(refresh).not.toHaveBeenCalled();
});

it('leaves the pages alone when the write was refused or denied', () => {
  const view = renderHook(
    ({ state }: { state: string }) =>
      useRefreshAfterWrite('call-refused', state, false),
    { initialProps: { state: 'input-available' } },
  );
  view.rerender({ state: 'output-error' });
  expect(refresh).not.toHaveBeenCalled();
});
