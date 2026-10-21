import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { render, screen } from '@testing-library/react';
import {
  TestI18nProvider,
  createTestI18nRuntime,
} from '@nocobase/i18n/testing';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { RouteNavigationItem } from '../../client/routing/route-navigation.js';
import {
  AppSidebar,
  AppSidebarProvider,
} from '../../client/layouts/components/app-sidebar.js';
import { NavigationMenu } from '../../client/layouts/components/navigation-menu.js';
import {
  createAppSidebarPreferenceStore,
  SidebarPreferenceProvider,
} from '../../client/layouts/use-sidebar-preference.js';

// Menu-only groups drawn as headed sections (`sections`, which the CRM's
// layout turns on), and a count beside an entry from the menu's `badges`, as
// the CRM's Waiting on me shows.
const runtime = await createTestI18nRuntime({ strict: false });

function I18n({ children }: { readonly children: ReactNode }) {
  return <TestI18nProvider runtime={runtime}>{children}</TestI18nProvider>;
}

function page(name: string): AppClientRegisteredRoute {
  return {
    name,
    id: name,
    path: `/${name}`,
    auth: 'required',
    packageName: 'test',
    source: 'application',
    navigation: { title: name },
    componentLoader: async () => ({ default: () => null }),
  };
}

const items: RouteNavigationItem[] = [
  { route: page('home'), children: [] },
  {
    route: { ...page('AI'), componentLoader: undefined },
    children: [
      { route: page('decisions'), children: [] },
      { route: page('skills'), children: [] },
    ],
  },
];

const sidebarPreference = createAppSidebarPreferenceStore('/main');

function shell(badges: Readonly<Record<string, number>>) {
  return (
    <MemoryRouter>
      <SidebarPreferenceProvider value={sidebarPreference}>
        <AppSidebarProvider>
          <AppSidebar label='Navigation'>
            <NavigationMenu
              items={items}
              label='Menu'
              selectedKey={undefined}
              sections
              badges={badges}
            />
          </AppSidebar>
        </AppSidebarProvider>
      </SidebarPreferenceProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

it('draws a menu-only group as a heading over entries that are always shown', () => {
  render(shell({}), { wrapper: I18n });
  expect(screen.getByText('AI')).toBeInTheDocument();
  // A heading, not a toggle: nothing collapses the section.
  expect(screen.queryByRole('button', { name: 'AI' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'decisions' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'skills' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'home' })).toBeInTheDocument();
});

it('shows a count beside the entry it belongs to, and none at zero', () => {
  const { rerender } = render(shell({ decisions: 3 }), { wrapper: I18n });
  // The link is named with the count; the badge beside it is drawn for the eye.
  expect(screen.getByRole('link', { name: 'decisions · 3' })).toBeVisible();
  expect(screen.getByText('3')).toHaveAttribute('aria-hidden');
  rerender(shell({ decisions: 120 }));
  expect(screen.getByText('99+')).toBeInTheDocument();
  rerender(shell({ decisions: 0 }));
  expect(screen.getByRole('link', { name: 'decisions' })).toBeVisible();
  expect(screen.queryByText('99+')).not.toBeInTheDocument();
});
