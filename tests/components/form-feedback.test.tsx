import { ApiClientError } from '@nocobase/app-client';
import { useState } from 'react';
import { I18nRuntime } from '@nocobase/i18n';
import { I18nProvider } from '@nocobase/i18n/client';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackForm } from '../../client/components/feedback-form.js';
import locales from '../../client/locales/index.js';

async function mount(children: React.ReactNode) {
  const runtime = new I18nRuntime({
    applicationNamespace: 'app',
    defaultLocale: 'en-US',
    locales: ['en-US', 'zh-CN'],
  });
  runtime.registerApplicationNamespace('app', locales);
  await runtime.init('en-US');
  const view = render(
    <I18nProvider runtime={runtime}>{children}</I18nProvider>,
  );
  return { ...view, runtime };
}
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Application change: the template's React Hook Form cases and its
// registration form's case are left out; the CRM has neither React Hook Form
// nor a registration page (the sign-up endpoint is off).
describe('feedback forms', () => {
  it('keeps trusted business copy in one form message and clears it after retry', async () => {
    function BusinessForm() {
      const [error, setError] = useState<unknown>();
      const [attempts, setAttempts] = useState(0);
      return (
        <FeedbackForm
          error={error}
          errorContent='Business rule: review the request.'
          onSubmit={(event) => {
            event.preventDefault();
            setAttempts(attempts + 1);
            setError(
              attempts === 0 ? new Error('private server details') : undefined,
            );
          }}
        >
          <label htmlFor='business-name'>Name</label>
          <input id='business-name' name='name' defaultValue='Draft' />
          <button>Save</button>
        </FeedbackForm>
      );
    }
    await mount(<BusinessForm />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Business rule: review the request.',
      ),
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByLabelText('Name')).toHaveValue('Draft');
    expect(document.body.textContent).not.toContain('private server details');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Corrected' },
    });
    expect(screen.getByLabelText('Name')).toHaveValue('Corrected');
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });

  it('ignores a superseded rejection without moving focus on the next edit', async () => {
    let rejectFirst!: (error: unknown) => void;
    let attempts = 0;
    await mount(
      <FeedbackForm
        onSubmit={async (event) => {
          event.preventDefault();
          if (++attempts === 1)
            return new Promise<void>((_resolve, reject) => {
              rejectFirst = reject;
            });
          throw new ApiClientError('private', {
            status: 400,
            method: 'POST',
            url: '/api/items',
            payload: {
              error: {
                fieldViolations: [{ field: 'first' }, { field: 'second' }],
              },
            },
          });
        }}
      >
        <div>
          <label htmlFor='overlap-first'>First</label>
          <input id='overlap-first' name='first' defaultValue='draft' />
        </div>
        <div>
          <label htmlFor='overlap-second'>Second</label>
          <input id='overlap-second' name='second' defaultValue='draft' />
        </div>
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByLabelText('First')).toHaveFocus());
    await act(() => {
      rejectFirst(new TypeError('obsolete request'));
    });
    fireEvent.change(screen.getByLabelText('First'), {
      target: { value: 'corrected' },
    });
    expect(screen.getByLabelText('First')).toHaveFocus();
  });

  it('shows inline native errors, preserves help associations and focuses by layout order', async () => {
    const save = vi.fn();
    await mount(
      <FeedbackForm
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div>
          <label htmlFor='first'>First</label>
          <input name='first' id='first' required aria-describedby='help' />
          <p id='help'>Help</p>
        </div>
        <div>
          <label htmlFor='last'>Last</label>
          <input name='last' id='last' required />
        </div>
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByLabelText('First')).toHaveFocus());
    const first = screen.getByLabelText('First');
    expect(first.getAttribute('aria-describedby')).toContain('help');
    const ids = first.getAttribute('aria-describedby')!.split(' ');
    expect(
      ids.some(
        (id) =>
          document.getElementById(id)?.textContent ===
          'Constraints not satisfied',
      ),
    ).toBe(true);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(first, { target: { value: 'retained' } });
    expect(first).not.toHaveAttribute('aria-invalid');
    expect(first).toHaveAttribute('aria-describedby', 'help');
  });

  it('retains input and selected files through request failure, then retries successfully', async () => {
    let fail = true;
    const saved = vi.fn();
    await mount(
      <FeedbackForm
        onSubmit={async (event) => {
          event.preventDefault();
          if (fail) throw new TypeError('network internals');
          saved();
        }}
      >
        <div>
          <label htmlFor='name'>Name</label>
          <input
            id='name'
            name='name'
            required
            defaultValue='Custom equipment'
          />
        </div>
        <label htmlFor='file'>Attachment</label>
        <input id='file' name='attachment' type='file' />
        <button>Save</button>
      </FeedbackForm>,
    );
    const upload = new File(['equipment'], 'equipment.txt', {
      type: 'text/plain',
    });
    fireEvent.change(screen.getByLabelText('Attachment'), {
      target: { files: [upload] },
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to connect');
    expect(screen.getByLabelText('Name')).toHaveValue('Custom equipment');
    expect(
      (screen.getByLabelText('Attachment') as HTMLInputElement).files?.[0],
    ).toBe(upload);
    fail = false;
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('maps structured errors without displaying server details and associates inline text', async () => {
    await mount(
      <FeedbackForm
        onSubmit={async (event) => {
          event.preventDefault();
          throw new ApiClientError('private stack', {
            status: 400,
            method: 'POST',
            url: '/api/equipment',
            payload: {
              error: {
                fieldViolations: [
                  { field: 'name', description: 'private payload' },
                ],
              },
            },
          });
        }}
      >
        <div>
          <label htmlFor='name'>Name</label>
          <input name='name' id='name' defaultValue='Equipment' />
        </div>
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(screen.getByLabelText('Name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    const errorId = screen
      .getByLabelText('Name')
      .getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)).toHaveTextContent(
      'This value was rejected',
    );
    expect(document.body.textContent).not.toContain('private');
  });

  it('localizes form errors without replacing business translations', async () => {
    const { runtime } = await mount(
      <FeedbackForm
        onSubmit={async (event) => {
          event.preventDefault();
          throw new Error('private');
        }}
      >
        <button>Save</button>
      </FeedbackForm>,
    );
    await act(() => runtime.changeLanguage('zh-CN'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('保存失败'),
    );
  });
  it('places a group error beside its editable entry without a top message or navigation', async () => {
    await mount(
      <FeedbackForm
        noValidate
        validationErrors={{
          items: { root: { message: 'Add at least two equipment items.' } },
        }}
        onSubmit={() => {}}
      >
        <h2 id='equipment-group'>Equipment group</h2>
        <button
          type='button'
          data-field-path='items'
          aria-labelledby='equipment-group'
        >
          Add equipment
        </button>
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    const entry = screen.getByRole('button', { name: 'Equipment group' });
    await waitFor(() => expect(entry).toHaveFocus());
    const id = entry.getAttribute('aria-describedby')!;
    expect(document.getElementById(id)).toHaveTextContent(
      'Add at least two equipment items.',
    );
    expect(entry.parentElement).toContainElement(document.getElementById(id));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('keeps unknown and inaccessible request errors at form level without leaking paths, labels or descriptions', async () => {
    await mount(
      <FeedbackForm
        onSubmit={() => {
          throw new ApiClientError('private stack', {
            status: 400,
            method: 'POST',
            url: '/api/items',
            payload: {
              error: {
                fieldViolations: [
                  { field: 'secret', description: 'Private equipment value' },
                  { field: 'unknown', description: 'Secret fix' },
                ],
              },
            },
          });
        }}
      >
        <div hidden>
          <label htmlFor='secret'>Restricted equipment</label>
          <input id='secret' name='secret' />
        </div>
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    const summary = screen.getByRole('alert');
    expect(within(summary).queryByRole('button')).not.toBeInTheDocument();
    expect(summary).toHaveTextContent(
      'Unable to save. Your input has been kept. Try again.',
    );
    expect(summary.textContent).not.toMatch(
      /Restricted|Private|Secret|unknown/,
    );
  });

  it('keeps trusted controlled errors associated once and respects corrected attributes and new help', async () => {
    function ControlledForm() {
      const [invalid, setInvalid] = useState(false);
      const [edited, setEdited] = useState(false);
      return (
        <FeedbackForm noValidate onSubmit={() => setInvalid(true)}>
          <div data-slot='field'>
            <label htmlFor='controlled'>Name</label>
            <input
              id='controlled'
              name='name'
              defaultValue='taken'
              aria-invalid={invalid}
              aria-describedby={edited ? 'new-help' : 'help'}
              onChange={() => {
                setInvalid(false);
                setEdited(true);
              }}
            />
            <p id='help'>Original help</p>
            <p id='new-help'>Updated help</p>
            {invalid && <p data-slot='field-error'>Choose a unique name.</p>}
          </div>
          <button>Save</button>
        </FeedbackForm>
      );
    }
    await mount(<ControlledForm />);
    fireEvent.click(screen.getByText('Save'));
    const input = screen.getByLabelText('Name');
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getAllByText('Choose a unique name.')).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(
      ids.some(
        (id) =>
          document.getElementById(id)?.textContent === 'Choose a unique name.',
      ),
    ).toBe(true);
    expect(document.querySelector('[data-form-feedback-error]')).toBeNull();
    fireEvent.change(input, { target: { value: 'unique' } });
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'new-help');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveValue('unique');
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    fireEvent.change(input, { target: { value: 'another' } });
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
  it('uses a safe focusable form message when a registered error has no editable target', async () => {
    await mount(
      <FeedbackForm
        noValidate
        validationErrors={{ name: { message: 'Business rule.' } }}
        onSubmit={() => {}}
      >
        <label htmlFor='disabled-name'>Name</label>
        <input
          id='disabled-name'
          name='name'
          disabled
          defaultValue='Retained'
        />
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save.');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Business rule.')).toBeVisible();
    expect(screen.getByLabelText('Name')).toHaveValue('Retained');
  });

  it('shows an independent unmapped failure alongside inline errors and keeps it after correction', async () => {
    await mount(
      <FeedbackForm
        noValidate
        validationErrors={{
          name: { message: 'Choose another name.' },
          unknown: { message: 'Private rule' },
        }}
        onSubmit={() => {}}
      >
        <label htmlFor='mixed'>Name</label>
        <input id='mixed' name='name' defaultValue='Retained' />
        <button>Save</button>
      </FeedbackForm>,
    );
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(screen.getByRole('alert')).not.toHaveTextContent('Private rule');
    expect(screen.getByText('Choose another name.')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Corrected' },
    });
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText('Choose another name.')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
