import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../../extensions/nocobase-auth-ui/components/auth-layout.js';
import { PasswordLoginForm } from '../../extensions/nocobase-auth-ui/forms/password-login-form.js';
import { AuthLogo, AuthMarketing } from './shared.js';

export default function LoginPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthLayout
      description={t('auth.login.description')}
      form={<PasswordLoginForm />}
      logo={<AuthLogo />}
      marketing={<AuthMarketing />}
      title={t('auth.login.title')}
    />
  );
}
