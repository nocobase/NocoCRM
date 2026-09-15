import { resolveAppUrl } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { AuthBrand } from '../../extensions/nocobase-auth-ui/components/auth-brand.js';
import { AuthMarketingPanel } from '../../extensions/nocobase-auth-ui/components/auth-marketing-panel.js';

export function AuthLogo(): ReactElement {
  return (
    <AuthBrand
      light={
        <img
          alt='NocoBase'
          className='h-10 w-auto object-contain'
          src={resolveAppUrl('/assets/logo.png')}
        />
      }
      dark={
        <img
          alt='NocoBase'
          className='h-10 w-auto object-contain'
          src={resolveAppUrl('/assets/logo-dark.png')}
        />
      }
    />
  );
}

// The template's panel with its text read from the locale files, so the
// sign-in pages follow the visitor's language like the rest of the app.
export function AuthMarketing(): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthMarketingPanel
      ariaLabel={t('auth.panel.label')}
      eyebrow={t('auth.panel.eyebrow')}
      title={
        <span className='whitespace-pre-line'>{t('auth.panel.heading')}</span>
      }
      description={t('auth.panel.body')}
      features={[
        {
          id: 'frontend',
          title: t('auth.panel.frontendTitle'),
          description: t('auth.panel.frontendBody'),
        },
        {
          id: 'foundation',
          title: t('auth.panel.foundationTitle'),
          description: t('auth.panel.foundationBody'),
        },
      ]}
      footer={t('auth.panel.footer')}
    />
  );
}
