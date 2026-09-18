import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { RecordLink } from '../../client/components/crm/common.js';
import { RecordDrawerContext } from '../../client/components/crm/record-drawer.js';

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmText: () => ({ text: (key: string) => key, language: 'en-US' }),
  };
});

const record = { id: 'acc-1', name: 'Acme' };

function Where(): ReactElement {
  return <p data-testid='where'>{useLocation().pathname}</p>;
}

describe('RecordLink', () => {
  it('navigates like a plain link where no drawer is available', () => {
    render(
      <MemoryRouter>
        <RecordLink entity='accounts' record={record} />
        <Where />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Acme/ });
    expect(link).toHaveAttribute('href', '/crm/accounts/acc-1');
    fireEvent.click(link);
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/crm/accounts/acc-1',
    );
  });

  it('opens the drawer on a plain click and keeps the href for new tabs', () => {
    const open = vi.fn();
    render(
      <MemoryRouter>
        <RecordDrawerContext.Provider
          value={{ open, close: vi.fn(), inDrawer: false }}
        >
          <RecordLink entity='accounts' record={record} />
          <Where />
        </RecordDrawerContext.Provider>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Acme/ });
    expect(link).toHaveAttribute('href', '/crm/accounts/acc-1');
    fireEvent.click(link);
    expect(open).toHaveBeenCalledWith('accounts', 'acc-1');
    // The page did not navigate: the drawer took the click.
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    // A modified click is the browser's (new tab): the drawer stays out.
    fireEvent.click(link, { metaKey: true });
    expect(open).toHaveBeenCalledTimes(1);
  });
});
