import { describe, expect, it } from 'vitest';

import type { User } from '../../client/components/crm/api.js';
import { approverChoices } from '../../client/components/crm/approver-choices.js';

const user = (id: string, canApprove: boolean, disabled = false): User => ({
  id,
  name: id,
  roles: ['sales-manager'],
  disabled,
  canApprove,
});

describe('approverChoices', () => {
  it('offers the others who may approve, not oneself', () => {
    const users = [user('me', true), user('boss', true), user('rep', false)];
    expect(approverChoices(users, 'me').map((u) => u.id)).toEqual(['boss']);
  });

  it('offers oneself when no one else may approve', () => {
    const users = [
      user('me', true),
      user('away', true, true),
      user('rep', false),
    ];
    expect(approverChoices(users, 'me').map((u) => u.id)).toEqual(['me']);
  });

  it('offers no one when no one may approve', () => {
    expect(approverChoices([user('me', false)], 'me')).toEqual([]);
  });
});
