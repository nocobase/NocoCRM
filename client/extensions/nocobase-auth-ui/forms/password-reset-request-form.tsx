import { usePasswordResetRequest } from '@nocobase/app-plugin-authentication/client/actions';
import { useTranslation } from '@nocobase/i18n/client';
import { useState, type FormEvent, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { FormStatus } from '../components/form-status';

export function PasswordResetRequestForm(): ReactElement {
  const [email, setEmail] = useState('');
  const action = usePasswordResetRequest();
  const { t } = useTranslation();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void action.submit({ email });
  };

  return (
    <form className='space-y-5' onSubmit={handleSubmit}>
      <div className='space-y-2'>
        <Label htmlFor='email'>{t('auth.forgot.email')}</Label>
        <Input
          id='email'
          autoComplete='email'
          autoFocus
          onChange={(event) => setEmail(event.target.value)}
          required
          type='email'
          value={email}
        />
      </div>
      {action.error ? (
        <FormStatus type='error'>{action.error.message}</FormStatus>
      ) : action.isSuccess ? (
        <FormStatus type='success'>{t('auth.forgot.sent')}</FormStatus>
      ) : null}
      <Button className='w-full' disabled={action.isPending} type='submit'>
        {action.isPending
          ? t('auth.forgot.submitting')
          : t('auth.forgot.submit')}
      </Button>
    </form>
  );
}
