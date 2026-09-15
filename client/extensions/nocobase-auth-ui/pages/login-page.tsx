import { AuthLink } from '@nocobase/app-plugin-authentication/client/ui';
import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../components/auth-layout';
import { PasswordLoginForm } from '../forms/password-login-form';

export default function LoginPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthLayout
      description={t('auth.login.description')}
      footer={
        <nav className='flex items-center justify-between text-muted-foreground'>
          <AuthLink
            className='hover:text-foreground hover:underline'
            to='/forgot-password'
          >
            {t('auth.login.forgot')}
          </AuthLink>
          <AuthLink
            className='font-semibold text-foreground underline underline-offset-4'
            to='/register'
          >
            {t('auth.login.register')}
          </AuthLink>
        </nav>
      }
      title={t('auth.login.title')}
    >
      <PasswordLoginForm />
    </AuthLayout>
  );
}
