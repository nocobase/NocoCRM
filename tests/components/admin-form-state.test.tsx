import { fireEvent, render, screen } from '@testing-library/react';
import { useMemo } from 'react';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { useFormState } from '../../client/pages/settings/common/hooks.js';

// The administration dialogs validate on submit (guideline T3.3): nothing
// shows while a form is first filled in; after a failed submit a change
// revalidates, so an error goes once it is corrected.
function Form(): React.ReactElement {
  const schema = useMemo(
    () => z.object({ name: z.string().trim().min(1, 'Enter a name') }),
    [],
  );
  const form = useFormState(schema, { name: '' }, 'test');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.validate();
      }}
    >
      <input
        id='test-name'
        aria-label='Name'
        value={form.values.name}
        onChange={(event) => form.set('name', event.target.value)}
      />
      <p role='alert'>{form.errors.name ?? ''}</p>
      <button type='submit'>Save</button>
    </form>
  );
}

it('shows an error only after a submit, and clears it as the field is corrected', () => {
  render(<Form />);
  const input = screen.getByLabelText('Name');
  fireEvent.change(input, { target: { value: 'a' } });
  fireEvent.change(input, { target: { value: '' } });
  expect(screen.getByRole('alert')).toHaveTextContent('');
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a name');
  fireEvent.change(input, { target: { value: 'Li' } });
  expect(screen.getByRole('alert')).toHaveTextContent('');
});
