import { usePasswordReset } from '@nocobase/app-plugin-authentication/client/actions';
import { useTranslation } from '@nocobase/i18n/client';
import { useState, type FormEvent, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { FormStatus } from '../components/form-status';

export interface PasswordResetFormProps {
  readonly token: string;
}

export function PasswordResetForm({
  token,
}: PasswordResetFormProps): ReactElement {
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const action = usePasswordReset();
  const { t } = useTranslation();
  const errorMessage =
    validationError ??
    (!token ? t('auth.reset.invalid') : undefined) ??
    action.error?.message;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmation) {
      setValidationError(t('auth.reset.mismatch'));
      return;
    }
    setValidationError(undefined);
    void action.submit({ password, token });
  };

  return (
    <form className='space-y-5' onSubmit={handleSubmit}>
      <div className='space-y-2'>
        <Label htmlFor='new-password'>{t('auth.reset.password')}</Label>
        <Input
          id='new-password'
          autoComplete='new-password'
          disabled={!token}
          onChange={(event) => setPassword(event.target.value)}
          required
          type='password'
          value={password}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='confirm-new-password'>{t('auth.reset.confirm')}</Label>
        <Input
          id='confirm-new-password'
          autoComplete='new-password'
          disabled={!token}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type='password'
          value={confirmation}
        />
      </div>
      {errorMessage ? (
        <FormStatus type='error'>{errorMessage}</FormStatus>
      ) : null}
      <Button
        className='w-full'
        disabled={!token || action.isPending}
        type='submit'
      >
        {action.isPending ? t('auth.reset.submitting') : t('auth.reset.submit')}
      </Button>
    </form>
  );
}
