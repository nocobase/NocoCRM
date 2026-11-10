import { useSyncServerLocale } from '@nocobase/app-plugin-i18n/client';
import { useMemo, type ReactElement } from 'react';
import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { Outlet, useLocation } from 'react-router';

import { BrandWatermark } from '#components/brand-watermark';
import { Breadcrumbs } from '#components/breadcrumbs';

import { RouteTreeProvider } from '../routing/route-context.js';
import { RouteLeaveBoundary } from '../routing/route-leave-boundary.js';

import { PageBreadcrumbProvider } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import { LayoutHeader } from './components/layout-header.js';
import {
  AppSidebar,
  AppSidebarProvider,
  AppSidebarToggle,
} from './components/app-sidebar.js';
import {
  NavigationMenu,
  type NavigationBadge,
} from './components/navigation-menu.js';
// Application changes: what the counts beside "Inbox", "Approvals",
// "Mailbox" and "Auto follow-up" read (waiting-count.ts, mail-unread.ts),
// passed to the template's menu in its `badges`, and the banner offering the
// demo dataset.
import {
  useApprovalsToDecide,
  useInboxCount,
  useRunningAgents,
} from '../components/crm/waiting-count.js';
import { useCrmText } from '../components/crm/api.js';
import { useMailUnreadCount } from '../components/crm/mail-unread.js';
import { DemoBanner } from '../components/crm/demo-banner.js';
import { AssistantDock } from '../components/crm/assistant-dock.js';
import {
  GlobalSearchDialog,
  SearchHeaderButton,
  SearchNavButton,
} from '../components/crm/search-dialog.js';
import { AppBrand } from './components/app-brand.js';
import { HeaderActions } from './components/header-actions.js';
import { AppSidebarFooter } from './components/sidebar-footer.js';
import {
  useRouteNavigation,
  selectedNavigationId,
} from '../routing/route-navigation.js';

export interface AppLayoutProps {
  readonly routes: readonly AppClientRegisteredRoute[];
}

export function AppLayout({ routes }: AppLayoutProps): ReactElement {
  // The browser decides what it renders; this tells the server the same language so its messages match.
  useSyncServerLocale();

  const { t } = useTranslation();
  const { items: menuItems, denied, loading } = useRouteNavigation(routes);
  const access = useMemo(() => ({ denied, loading }), [denied, loading]);
  const { pathname } = useLocation();
  const selectedKey = selectedNavigationId(routes, pathname, denied);
  // Application change: the template's brand tint and watermark on the
  // overview alone; the record pages keep a plain ground.
  const brandSurface = pathname === '/';
  const navigationLabel = t('navigation.label', {
    defaultValue: 'Application navigation',
  });
  // Application change: the count beside the inbox in the menu and in the
  // tab's title.
  const inbox = useInboxCount();
  // And beside Approvals, those waiting on the reader's decision.
  const toDecide = useApprovalsToDecide();
  // And beside Auto follow-up, the four agents' runs under way, as a live
  // badge.
  const running = useRunningAgents();
  const { text: crmText } = useCrmText();
  const runningCount = Object.values(running).reduce(
    (sum, count) => sum + count,
    0,
  );
  const runningBadges: Record<string, NavigationBadge> =
    runningCount > 0
      ? {
          'crm-agents': {
            count: runningCount,
            live: true as const,
            hint: crmText('agents.runningHint', { count: runningCount }),
          },
        }
      : {};
  const unreadMail = useMailUnreadCount();

  return (
    // The shell owns the business route tree used by its pages and navigation.
    <RouteTreeProvider routes={routes} access={access}>
      <PageBreadcrumbProvider>
        <AppSidebarProvider>
          <AppSidebar
            // Application change: the search beside the brand
            // (search-dialog.tsx); in the collapsed sidebar, under the
            // overview.
            action={<SearchHeaderButton />}
            label={navigationLabel}
            footer={<AppSidebarFooter />}
          >
            {/* Application change: the CRM's menu-only groups are headed sections (navigation-menu.tsx). */}
            <NavigationMenu
              items={menuItems}
              label={navigationLabel}
              selectedKey={selectedKey}
              sections
              // Application change: in the collapsed sidebar, Search under
              // the overview, which opens the global search's dialog
              // (search-dialog.tsx); expanded, it sits beside the brand.
              after={{ home: <SearchNavButton /> }}
              badges={{
                inbox,
                'crm-approvals': toDecide,
                ...runningBadges,
                'crm-mail': unreadMail,
              }}
            />
          </AppSidebar>
          {/* Application change: crm-page-main lets the assistant panel push header and page aside (styles.css). */}
          <div className='crm-page-main flex min-w-0 flex-1 flex-col'>
            <LayoutHeader className='sticky top-0 z-40 justify-between gap-2'>
              {/* Application change: on a phone the brand sits closer to
                  the sidebar's toggle, the toggle's own padding being gap
                  enough. */}
              <div className='flex min-w-0 items-center gap-1.5 sm:gap-3'>
                <AppSidebarToggle />
                {/* Application change, kept where template 1.0.0-beta.92
                    dropped the phone header's brand: on a phone the header shows the
                    brand, a size smaller below sm, and no page trail, which with the
                    demo entry and the actions beside it is wider than the
                    screen; the brand draws smaller still when even it is
                    (app-brand.tsx). */}
                <div className='min-w-0 md:hidden'>
                  <AppBrand small />
                </div>
                <div className='hidden h-5 w-px shrink-0 bg-border sm:block' />
                {/* The current page's trail: the route tree's, or the one the page declares (`usePageBreadcrumb`). */}
                <Breadcrumbs className='hidden sm:block' denied={denied} />
              </div>
              <HeaderActions />
            </LayoutHeader>
            {/* Application change: the CRM's demo banner, under the header
                and above every page, for whoever may import the dataset. */}
            <DemoBanner />
            {/* Application change: the global search's dialog, which ⌘K or
                the menu's Search opens (search-dialog.tsx). */}
            <GlobalSearchDialog />
            <main
              className={
                brandSurface
                  ? 'app-brand-surface relative isolate min-w-0 flex-1 overflow-hidden'
                  : 'relative min-w-0 flex-1 overflow-hidden'
              }
            >
              {brandSurface ? (
                <BrandWatermark className='-z-10 text-primary' />
              ) : null}
              {/* main only positions; the page scrolls in here, so a child page layer laid over main is neither
            moved by the page's scrolling nor stretched by its height. */}
              <div className='h-full overflow-y-auto'>
                <RouteLeaveBoundary hidden={loading}>
                  <Outlet />
                </RouteLeaveBoundary>
              </div>
              {/* Application change: the assistant's entry, floating over the
                  bottom of this column (assistant-dock.tsx). */}
              <AssistantDock />
            </main>
          </div>
        </AppSidebarProvider>
      </PageBreadcrumbProvider>
    </RouteTreeProvider>
  );
}
