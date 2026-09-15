import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthLayout } from '../../extensions/nocobase-auth-ui/components/auth-layout.js';
import { PasswordResetForm } from '../../extensions/nocobase-auth-ui/forms/password-reset-form.js';
import { AuthLogo, AuthMarketing } from './shared.js';

export default function ResetPasswordPage(): ReactElement {
  const { t } = useTranslation();
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  return (
    <AuthLayout
      description={t('auth.reset.description')}
      form={<PasswordResetForm token={token} />}
      logo={<AuthLogo />}
      marketing={<AuthMarketing />}
      title={t('auth.reset.title')}
    />
  );
}
