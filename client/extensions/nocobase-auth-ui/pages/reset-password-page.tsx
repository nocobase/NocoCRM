import { AuthLink } from '@nocobase/app-plugin-authentication/client/ui';
import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../components/auth-layout';
import { PasswordResetForm } from '../forms/password-reset-form';

export default function ResetPasswordPage(): ReactElement {
  const { t } = useTranslation();
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  return (
    <AuthLayout
      description={t('auth.reset.description')}
      footer={
        <p className='text-center text-muted-foreground'>
          {t('auth.reset.back')}{' '}
          <AuthLink
            className='font-semibold text-foreground underline underline-offset-4'
            to='/login'
          >
            {t('auth.reset.signIn')}
          </AuthLink>
        </p>
      }
      title={t('auth.reset.title')}
    >
      <PasswordResetForm token={token} />
    </AuthLayout>
  );
}
