import { AuthLink } from '@nocobase/app-plugin-authentication/client/ui';
import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../components/auth-layout';
import { PasswordRegistrationForm } from '../forms/password-registration-form';

export default function RegisterPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthLayout
      description={t('auth.register.description')}
      footer={
        <p className='text-center text-muted-foreground'>
          {t('auth.register.haveAccount')}{' '}
          <AuthLink
            className='font-semibold text-foreground underline underline-offset-4'
            to='/login'
          >
            {t('auth.register.signIn')}
          </AuthLink>
        </p>
      }
      title={t('auth.register.title')}
    >
      <PasswordRegistrationForm />
    </AuthLayout>
  );
}
