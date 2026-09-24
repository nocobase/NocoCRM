import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SortableTable } from '../../client/components/crm/sortable-table.js';

type Row = { name: string; won?: number };

const rows: Row[] = [
  { name: 'Li', won: 10 },
  { name: 'Wang' },
  { name: 'Chen', won: 30 },
];

const names = (): string[] =>
  within(screen.getAllByRole('rowgroup')[1]!)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent ?? '');

it('sorts by a column on a header click, with no menu in between', () => {
  render(
    <SortableTable
      rows={rows}
      rowKey={(row) => row.name}
      columns={[
        {
          id: 'name',
          title: 'Name',
          sortValue: (row) => row.name,
          cell: (row) => row.name,
        },
        {
          id: 'won',
          title: 'Won',
          sortValue: (row) => row.won,
          cell: (row) => row.won ?? '—',
        },
      ]}
    />,
  );
  const won = screen.getByRole('button', { name: /Won/ });
  const header = won.closest('th')!;
  // The rows keep their given order until a header is clicked.
  expect(names()).toEqual(['Li', 'Wang', 'Chen']);
  // A number column starts from the largest; a blank stays last.
  fireEvent.click(won);
  expect(names()).toEqual(['Chen', 'Li', 'Wang']);
  expect(header).toHaveAttribute('aria-sort', 'descending');
  expect(screen.queryByRole('menu')).toBeNull();
  fireEvent.click(won);
  expect(names()).toEqual(['Li', 'Chen', 'Wang']);
  expect(header).toHaveAttribute('aria-sort', 'ascending');
  // A third click restores the original order.
  fireEvent.click(won);
  expect(names()).toEqual(['Li', 'Wang', 'Chen']);
  expect(header).toHaveAttribute('aria-sort', 'none');
  // A text column starts from A.
  fireEvent.click(screen.getByRole('button', { name: /Name/ }));
  expect(names()).toEqual(['Chen', 'Li', 'Wang']);
});
