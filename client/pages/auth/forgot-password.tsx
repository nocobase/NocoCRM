import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../../extensions/nocobase-auth-ui/components/auth-layout.js';
import { PasswordResetRequestForm } from '../../extensions/nocobase-auth-ui/forms/password-reset-request-form.js';
import { AuthLogo, AuthMarketing } from './shared.js';

export default function ForgotPasswordPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthLayout
      description={t('auth.forgot.description')}
      form={<PasswordResetRequestForm />}
      logo={<AuthLogo />}
      marketing={<AuthMarketing />}
      title={t('auth.forgot.title')}
    />
  );
}
