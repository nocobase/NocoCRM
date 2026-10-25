import type { ReactElement } from 'react';
import { TooltipProvider } from '#components/ui/tooltip';

import { AssistantHeaderButton } from '../../components/crm/assistant-header-button.js';
import { ThemeSettings } from '../../theme/index.js';
import { DemoModeBadge } from './demo-mode-badge.js';
import { UserMenu } from './user-menu.js';

/**
 * The header's right-hand actions, shared by every authenticated page.
 * Application change: the CRM's assistant leads them, reachable from every
 * page, the ones without the floating dock included (assistant-header-button.tsx).
 */
export function HeaderActions(): ReactElement {
  return (
    <TooltipProvider>
      <div className='flex shrink-0 items-center gap-2'>
        {/* Application change (2026-10-25): a Demo Mode deployment says
            so, with its accounts to switch to. */}
        <DemoModeBadge />
        <AssistantHeaderButton />
        <ThemeSettings />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}
