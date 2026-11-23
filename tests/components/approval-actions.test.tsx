import { renderWithApp } from '@nocobase/app-testing/client';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import metadata from '../../package.json' with { type: 'json' };
import enUS from '../../client/locales/en-US.js';

// An approval's steps (client/components/crm/approval-actions.tsx): the
// confirmation before submitting names the approver it goes to, from the
// CRM's users, which the record titles the page passes do not hold.

vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmApi: () => vi.fn(),
  useRefresh: () => async () => undefined,
  useMetadata: () => ({
    data: {
      userId: 'rep',
      approve: false,
      settingsAccess: false,
      permissions: { approvals: { delete: false } },
      users: [
        { id: 'rep', name: 'Riley Rep' },
        { id: 'manager', name: 'Morgan Manager' },
      ],
    },
  }),
}));

const { ApprovalActions } =
  await import('../../client/components/crm/approval-actions.js');

const namespaces = {
  [metadata.name]: { 'en-US': async () => ({ default: enUS }) },
};

const draft = (approverId: string) => ({
  id: 'approval-1',
  name: 'Discount for Acme',
  status: 'draft',
  ownerId: 'rep',
  approverId,
});

it('names the approver in the confirmation before submitting', async () => {
  const user = userEvent.setup();
  await renderWithApp(
    <ApprovalActions
      approval={draft('manager')}
      names={{ 'deal-1': 'Acme / Platform' }}
    />,
    { locale: 'en-US', namespace: metadata.name, namespaces },
  );
  await user.click(await screen.findByRole('button', { name: /submit/iu }));
  const dialog = await screen.findByRole('dialog');
  expect(
    within(dialog).getByText(/It goes to Morgan Manager for a decision/u),
  ).toBeTruthy();
});

it('falls back to the word for an approver who is not listed', async () => {
  const user = userEvent.setup();
  await renderWithApp(<ApprovalActions approval={draft('gone')} names={{}} />, {
    locale: 'en-US',
    namespace: metadata.name,
    namespaces,
  });
  await user.click(await screen.findByRole('button', { name: /submit/iu }));
  const dialog = await screen.findByRole('dialog');
  expect(
    within(dialog).getByText(/It goes to Approver for a decision/u),
  ).toBeTruthy();
});
