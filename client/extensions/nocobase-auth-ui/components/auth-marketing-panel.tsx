import { Blocks, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

export function AuthMarketingPanel(): ReactElement {
  const { t } = useTranslation();
  return (
    <aside
      aria-label={t('auth.panel.label')}
      className='relative hidden overflow-hidden bg-neutral-950 p-12 text-white md:grid md:place-items-center'
    >
      <div className='pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:48px_48px]' />
      <div className='relative w-full max-w-xl'>
        <p className='text-xs font-semibold tracking-[0.16em] text-white/55 uppercase'>
          {t('auth.panel.eyebrow')}
        </p>
        <h2 className='mt-4 max-w-xl text-5xl leading-[1.05] font-semibold tracking-[-0.045em] whitespace-pre-line'>
          {t('auth.panel.heading')}
        </h2>
        <p className='mt-5 max-w-xl text-sm leading-6 text-white/60'>
          {t('auth.panel.body')}
        </p>
        <div className='mt-8 overflow-hidden rounded-2xl bg-white text-neutral-950 shadow-2xl'>
          <div className='space-y-5 p-6'>
            <div className='flex gap-4'>
              <span className='grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700'>
                <Sparkles aria-hidden='true' className='size-5' />
              </span>
              <div>
                <p className='font-semibold'>{t('auth.panel.frontendTitle')}</p>
                <p className='mt-1 text-sm leading-6 text-neutral-500'>
                  {t('auth.panel.frontendBody')}
                </p>
              </div>
            </div>
            <div className='h-px bg-neutral-200' />
            <div className='flex gap-4'>
              <span className='grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700'>
                <ShieldCheck aria-hidden='true' className='size-5' />
              </span>
              <div>
                <p className='font-semibold'>
                  {t('auth.panel.foundationTitle')}
                </p>
                <p className='mt-1 text-sm leading-6 text-neutral-500'>
                  {t('auth.panel.foundationBody')}
                </p>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-3 bg-neutral-100 px-6 py-4 text-sm font-medium text-neutral-600'>
            <Blocks aria-hidden='true' className='size-4' />
            <span>{t('auth.panel.footer')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
