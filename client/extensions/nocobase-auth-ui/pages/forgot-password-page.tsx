import { AuthLink } from '@nocobase/app-plugin-authentication/client/ui';
import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../components/auth-layout';
import { PasswordResetRequestForm } from '../forms/password-reset-request-form';

export default function ForgotPasswordPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthLayout
      description={t('auth.forgot.description')}
      footer={
        <p className='text-center text-muted-foreground'>
          {t('auth.forgot.remember')}{' '}
          <AuthLink
            className='font-semibold text-foreground underline underline-offset-4'
            to='/login'
          >
            {t('auth.forgot.signIn')}
          </AuthLink>
        </p>
      }
      title={t('auth.forgot.title')}
    >
      <PasswordResetRequestForm />
    </AuthLayout>
  );
}
