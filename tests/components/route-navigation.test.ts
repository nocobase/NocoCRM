import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { expect, it } from 'vitest';
import { selectedNavigationId } from '../../client/routing/route-navigation.js';

const page = (
  id: string,
  path: string,
  title?: string,
): AppClientRegisteredRoute =>
  ({
    id,
    path,
    packageName: 'app',
    componentLoader: () => Promise.resolve({ default: () => null }),
    ...(title ? { navigation: { title } } : {}),
  }) as unknown as AppClientRegisteredRoute;

const routes = [
  page('home', '/', 'navigation.home'),
  page('crm-leads', '/crm/leads', 'leads'),
  page('crm-record', '/crm/:entity/:id'),
  page('crm-notifications', '/crm/notifications'),
];
const key = (route: AppClientRegisteredRoute): string =>
  `app:${route.path}:${route.id}`;

it('selects the object a record page belongs to, never the home entry', () => {
  expect(selectedNavigationId(routes, '/crm/leads')).toBe(key(routes[1]!));
  // The record page has no entry of its own: its object's entry is selected.
  expect(selectedNavigationId(routes, '/crm/leads/42')).toBe(key(routes[1]!));
  // A page without an entry under no menu path selects nothing, not home.
  expect(selectedNavigationId(routes, '/crm/notifications')).toBeUndefined();
  expect(selectedNavigationId(routes, '/')).toBe(key(routes[0]!));
});
