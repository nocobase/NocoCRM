import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../../extensions/nocobase-auth-ui/components/auth-layout.js';
import { PasswordRegistrationForm } from '../../extensions/nocobase-auth-ui/forms/password-registration-form.js';
import { AuthLogo, AuthMarketing } from './shared.js';

export default function RegisterPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthLayout
      description={t('auth.register.description')}
      form={<PasswordRegistrationForm />}
      logo={<AuthLogo />}
      marketing={<AuthMarketing />}
      title={t('auth.register.title')}
    />
  );
}
