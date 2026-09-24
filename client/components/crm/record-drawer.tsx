import {
  createContext,
  useCallback,
  useContext,
  useState,
  type MouseEvent,
} from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { toText, type Entity } from './api.js';

// A detail page (and the workspace) opens the records it links to in a
// drawer over itself, so the reader keeps their place. The page provides this; links inside
// it (and inside the drawer's own content) open through it, while pages
// without a drawer keep navigating.
export interface RecordDrawerApi {
  // Shows a record in the drawer, replacing whatever it showed before.
  open: (entity: Entity, id: string) => void;
  close: () => void;
  // True for the content rendered inside the drawer, which after deleting
  // its record closes instead of leaving the page.
  inDrawer: boolean;
}

export const RecordDrawerContext = createContext<RecordDrawerApi | undefined>(
  undefined,
);

export function useRecordDrawer(): RecordDrawerApi | undefined {
  return useContext(RecordDrawerContext);
}

// Link props for a record: the full-page href stays, so a new tab or a
// middle click still works, and a plain click opens the drawer where one
// is available.
export function useRecordLink(
  entity: Entity,
  id: string,
): { to: string; onClick?: (event: MouseEvent<HTMLAnchorElement>) => void } {
  const drawer = useRecordDrawer();
  const to = `/crm/${toText(entity)}/${toText(id)}`;
  if (!drawer) return { to };
  return {
    to,
    onClick: (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      drawer.open(entity, id);
    },
  };
}

// The drawer's state for a page that hosts one: the record it shows lives in
// the URL ("?open=entity/id"), so a reload, the back button and a copied link
// all restore it. A phone has no room for a drawer over a page, so opening
// goes to the record instead.
export function useRecordDrawerState(): {
  opened: string;
  open: RecordDrawerApi['open'];
  close: () => void;
} {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const opened = toText(searchParams.get('open') ?? '');
  const open = useCallback<RecordDrawerApi['open']>(
    (target, id) => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        void navigate(`/crm/${toText(target)}/${toText(id)}`);
        return;
      }
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('open', `${toText(target)}/${toText(id)}`);
        return next;
      });
    },
    [navigate, setSearchParams],
  );
  const close = useCallback(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('open');
      return next;
    });
  }, [setSearchParams]);
  return { opened, open, close };
}

// A detail page's tab is the last segment of its address
// (/crm/accounts/<id>/contacts, the record route's child), so a link or a
// reload opens it and Back returns to the tab before. A record in the drawer
// keeps its tab to itself and leaves the page's alone. The address says "history" and "contacts" where the pages' own names
// are historyTab and opportunityContacts.
const tabSlugs: Record<string, string> = {
  historyTab: 'history',
  opportunityContacts: 'contacts',
};
// The page's tab named by an address segment, among the tabs it shows.
export function resolveTab(
  slug: string | undefined,
  names: readonly string[],
): string | undefined {
  return names.find((name) => name === slug || tabSlugs[name] === slug);
}
export function useDetailTab(): [string | undefined, (tab: string) => void] {
  const inDrawer = useRecordDrawer()?.inDrawer ?? false;
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [local, setLocal] = useState<string>();
  const setTab = useCallback(
    (name: string) => {
      const slug = tabSlugs[name] ?? name;
      if (inDrawer) {
        setLocal(slug);
        return;
      }
      void navigate({
        pathname: `/crm/${toText(params.entity)}/${toText(params.id)}/${slug}`,
        search: location.search,
      });
    },
    [inDrawer, navigate, params.entity, params.id, location.search],
  );
  // Read from the path: the tab is the child route's segment, which the
  // record page's own params do not carry.
  const pageTab = location.pathname.split('/')[4] || undefined;
  return [inDrawer ? local : pageTab, setTab];
}
