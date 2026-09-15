import { resolveAppUrl } from '@nocobase/app-client';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

export interface AppBrandProps {
  readonly compact?: boolean;
}

// Application change to the template's brand: the mark is the template's own
// logo image from /assets (light and dark variants, the way the sign-in page
// shows it), while the wordmark is the application's name rather than the
// template's.
export function AppBrand({ compact = false }: AppBrandProps): ReactElement {
  return (
    <Link
      aria-label='NocoCRM home'
      className='flex min-w-0 items-center gap-2 text-foreground'
      to='/'
    >
      <img
        alt=''
        aria-hidden='true'
        className='h-7 w-auto shrink-0 object-contain dark:hidden'
        src={resolveAppUrl('/assets/logo-mark.png')}
      />
      <img
        alt=''
        aria-hidden='true'
        className='hidden h-7 w-auto shrink-0 object-contain dark:block'
        src={resolveAppUrl('/assets/logo-mark-dark.png')}
      />
      {!compact && (
        <span className='truncate font-heading text-lg tracking-wide'>
          {/* The template's wordmark weighting: "Noco" heavy, the product
              name light. */}
          <span className='font-black'>Noco</span>
          <span className='font-normal'>CRM</span>
        </span>
      )}
    </Link>
  );
}
