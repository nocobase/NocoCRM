import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { Database, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, buttonVariants } from '../ui/button.js';
import { Progress } from '../ui/progress.js';
import { useCrmQuery, useCrmScopeKey, useCrmText, useMetadata } from './api.js';
import type { DemoStatus } from './demo-status.js';

// The banner at the top of the CRM's pages that offers the demo dataset,
// shown only to whoever may import it (the settings capability) while none
// is imported. It links to the settings page's demo tab and goes away by
// itself once the import is done; dismissed, it stays away in this browser.
// While an import runs it shows how far it has got instead, dismissed or
// not, asking the server every second (the settings card marks the import
// under way the moment it starts it).
// The dismissal is a convenience kept in the browser, so a blocked or
// cleared storage only means the banner shows again.
const DISMISSED_KEY = 'nococrm:demo-banner-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function DemoBanner(): ReactElement | null {
  const { text } = useCrmText();
  const metadata = useMetadata().data;
  const demoMode = useCrmQuery<{ enabled: boolean }>('demoMode/status').data;
  const [dismissed, setDismissed] = useState(readDismissed);
  const queryClient = useQueryClient();
  const scopeKey = useCrmScopeKey();
  const offered =
    demoMode?.enabled === false &&
    Boolean(metadata?.settingsAccess) &&
    metadata?.demoPresent === false;
  const status = useCrmQuery<DemoStatus>('demoData', offered, {
    refetchInterval: (data) => (data?.importing ? 1000 : false),
  }).data;
  const importing = status?.importing ?? null;
  // Done, wherever it was started: the workspace learns the dataset is
  // there, and the banner goes.
  const done = Boolean(status?.present);
  useEffect(() => {
    if (done)
      void queryClient.invalidateQueries({
        queryKey: [...scopeKey, 'workspace'],
      });
  }, [done, queryClient, scopeKey]);
  if (!offered || (dismissed && !importing)) return null;
  const dismiss = (): void => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage unavailable: hidden until the page is loaded again.
    }
    setDismissed(true);
  };
  if (importing)
    return (
      <div
        role='region'
        aria-label={text('demoData')}
        className='flex items-center gap-3 border-b bg-info/8 px-4 py-2 text-sm sm:px-6'
      >
        <Database className='size-4 shrink-0 text-info' aria-hidden />
        <p className='min-w-0 flex-1 text-foreground'>
          {text('demoImporting')}
        </p>
        {/* Indeterminate while another server process runs it. */}
        <Progress
          value={importing.percent}
          aria-label={text('demoImporting')}
          className='w-40 shrink-0 sm:w-56 [&_[data-slot=progress-indicator]]:bg-info [&_[data-slot=progress-track]]:bg-info/15'
        />
        {importing.percent !== null ? (
          <span className='w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums'>
            {importing.percent}%
          </span>
        ) : null}
      </div>
    );
  return (
    <div
      role='region'
      aria-label={text('demoData')}
      className='flex items-center gap-3 border-b bg-info/8 px-4 py-2 text-sm sm:px-6'
    >
      <Database className='size-4 shrink-0 text-info' aria-hidden />
      <p className='min-w-0 flex-1 text-foreground'>{text('demoBanner')}</p>
      {/* A link drawn as a button: it goes to another page. */}
      <Link
        to='/settings/demo-data'
        className={buttonVariants({ size: 'sm', className: 'shrink-0' })}
      >
        {text('demoBannerAction')}
      </Link>
      <Button
        size='icon'
        variant='ghost'
        className='size-8 shrink-0 text-muted-foreground'
        aria-label={text('demoBannerDismiss')}
        onClick={dismiss}
      >
        <X />
      </Button>
    </div>
  );
}
