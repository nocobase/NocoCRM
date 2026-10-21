// The API key dialog's limited access (client/pages/settings/api-keys/new.tsx)
// drawn by the UI Library's permission editor it shares with Settings → Roles:
// one row a scope group, ticked on with the level the key gets.
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PermissionEditor } from '../../client/components/permission-editor.js';

it('lists the scope groups with their levels and ticks one on', () => {
  const onEnabledChange = vi.fn();
  const onLevelChange = vi.fn();
  render(
    <PermissionEditor
      sections={[
        {
          id: 'business',
          title: 'Business operations',
          groups: [
            {
              id: 'business-rows',
              rows: [
                {
                  id: 'crm.leads',
                  label: 'Leads',
                  enabled: false,
                  levels: [
                    { value: 'read', label: 'Read' },
                    { value: 'write', label: 'Read and write' },
                  ],
                },
                {
                  id: 'crm.companies',
                  label: 'Companies',
                  enabled: true,
                  level: 'read',
                  levels: [{ value: 'read', label: 'Read' }],
                },
              ],
            },
          ],
        },
      ]}
      labels={{ levelFor: (label) => `Scope for ${label}` }}
      onEnabledChange={onEnabledChange}
      onLevelChange={onLevelChange}
    />,
  );
  expect(screen.getByText('Leads')).toBeTruthy();
  expect(screen.getByText('Companies')).toBeTruthy();
  const leads = screen.getByRole('checkbox', { name: 'Leads' });
  fireEvent.click(leads);
  expect(onEnabledChange).toHaveBeenCalledWith('crm.leads', true);
});
