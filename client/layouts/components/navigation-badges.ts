import { createContext, useContext } from 'react';

// Application change to the template's navigation: a count beside a menu
// entry, keyed by route name, which the application layout provides (the
// CRM's "Waiting on me", crm-decisions). The template's navigation object
// has no field for one, and a count changes while the page is open, so it
// comes from the layout rather than from the route declaration.
export const NavigationBadgesContext = createContext<
  Readonly<Record<string, number>>
>({});

export function useNavigationBadge(routeName: string | undefined): number {
  const badges = useContext(NavigationBadgesContext);
  return routeName ? (badges[routeName] ?? 0) : 0;
}
