import { useListLocation } from '#hooks/use-list-location';
import { RecordLink } from '#components/record-link';
import { BackButton } from '#components/back-button';
import { safeReturnTo } from '../../lib/return-to.js';
import {
  readTableUrlState,
  useTableUrlState,
} from '#hooks/use-table-url-state';
import { DataTable, DataTableColumnHeader } from '#components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { useSettingsData, useUserPermission } from './hooks.js';
import {
  resolveListState,
  useApiClient,
  useSubmission,
  useToaster,
} from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  UsersClient,
  type ManagedUser,
  type UsersOptions,
} from '@nocobase/app-plugin-users/client/user-client';
import {
  useCallback,
  useRef,
  useMemo,
  useState,
  useEffect,
  type ReactElement,
} from 'react';
import { Link, Outlet, useLocation, useResolvedPath } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { cn } from 'cn';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button } from '#components/ui/button';
import { StatusBadge } from '#components/status-badge';
import { type FilterDimension, FilterMenu } from '#components/filter-menu';
import { RowActions } from '#components/row-actions';
import { ConfirmAction, SettingsError } from './shared.js';
// Application change: inviting, resetting a password and deleting, which
// this prepared page leaves out (accounts/user-extras.tsx,
// accounts/user-row-extras.tsx).
import {
  InviteUsersButton,
  PendingInvitations,
} from './accounts/user-extras.js';
import { useUserExtras } from './accounts/user-row-extras.js';

function UserName({ user }: { readonly user: ManagedUser }): ReactElement {
  const canUpdate = useUserPermission('update', user.id);
  const canAssign = useUserPermission('assign-role', user.id);
  const location = useLocation();
  return canUpdate || canAssign ? (
    <RecordLink to={{ pathname: `${user.id}/edit`, search: location.search }}>
      {user.name}
    </RecordLink>
  ) : (
    <span className='font-medium'>{user.name}</span>
  );
}

function UserActions({
  user,
  reload,
}: {
  readonly user: ManagedUser;
  readonly reload: (updated?: ManagedUser) => void;
}): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const client = useMemo(() => new UsersClient(api), [api]);
  const canDisable = useUserPermission('disable', user.id);
  const canEnable = useUserPermission('enable', user.id);
  const canRevoke = useUserPermission('revoke-sessions', user.id);
  const extras = useUserExtras(user, () => reload());
  const [action, setAction] = useState<
    'disable' | 'enable' | 'revokeSessions'
  >();
  const [requestBusy, setRequestBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const submission = useSubmission();
  const busy = requestBusy || submission.submitting;
  const run = async () => {
    if (!action) return;
    setRequestBusy(true);
    setError(undefined);
    try {
      const outcome = await submission.run(
        { action, id: user.id },
        async (key) => ({ updated: await client[action](user.id, key) }),
      );
      if (!outcome) return;
      const updated = outcome.updated;
      toaster.show({
        type: 'success',
        title: t(`settings.userActionSaved.${action}`, { name: user.name }),
      });
      setAction(undefined);
      reload(updated ?? undefined);
    } catch (next) {
      setError(next);
    } finally {
      setRequestBusy(false);
    }
  };
  return (
    <>
      <RowActions
        label={t('settings.actionsFor', { name: user.name })}
        actions={[
          !user.disabledAt &&
            canDisable && {
              key: 'disable',
              label: t('settings.disable'),
              onClick: () => setAction('disable'),
            },
          Boolean(user.disabledAt) &&
            canEnable && {
              key: 'enable',
              label: t('settings.enable'),
              onClick: () => setAction('enable'),
            },
          canRevoke && {
            key: 'revokeSessions',
            label: t('settings.revokeSessions'),
            onClick: () => setAction('revokeSessions'),
          },
          // Application change: Reset password and Delete
          // (accounts/user-row-extras.tsx), Delete last as destructive.
          ...extras.actions,
        ]}
      />
      {extras.dialogs}
      <ConfirmAction
        open={Boolean(action)}
        title={t(
          `settings.${action === 'disable' ? 'disableTitle' : action === 'enable' ? 'enableTitle' : 'revokeTitle'}`,
          { name: user.name },
        )}
        description={
          <>
            <p>
              {t(
                action === 'disable'
                  ? 'settings.disableHint'
                  : action === 'enable'
                    ? 'settings.enableHint'
                    : 'settings.revokeHint',
              )}
            </p>
            <SettingsError error={error} />
          </>
        }
        confirmLabel={t(`settings.${action ?? 'confirm'}`)}
        busy={busy}
        onCancel={() => setAction(undefined)}
        onConfirm={() => void run()}
      />
    </>
  );
}

// The account states the status filter offers, as the URL and the server take them.
const STATUSES = ['enabled', 'disabled'] as const;

export default function UsersPage(): ReactElement {
  const { t } = useTranslation();
  const { params, setParams, active } = useListLocation();
  const location = useLocation();
  const listPath = useResolvedPath('.').pathname;
  // Application change: the list filters through the header's Filters
  // menu, its search box among the conditions, as the CRM's lists do. Focus
  // that would have returned to the search box (back from a drawer, after
  // an update) lands on the Filters button.
  const filtersRef = useRef<HTMLDivElement>(null);
  const focusFilters = useCallback(
    () => filtersRef.current?.querySelector<HTMLElement>('button')?.focus(),
    [],
  );
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    const returned =
      previousPathRef.current !== location.pathname &&
      location.pathname === listPath;
    previousPathRef.current = location.pathname;
    if (!returned) return;
    const frame = requestAnimationFrame(() => {
      if (
        document.activeElement === document.body ||
        !document.activeElement?.isConnected
      )
        focusFilters();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusFilters, listPath, location.pathname]);
  const [queryDraft, setQueryDraft] = useState<{
    key: string;
    value: string;
  }>();
  const query =
    queryDraft?.key === location.key
      ? queryDraft.value
      : (params.get('q') ?? '');
  const setQuery = (value: string) =>
    setQueryDraft({ key: location.key, value });
  const [composing, setComposing] = useState(false);
  const options = useSettingsData<{ data: UsersOptions }>('users/options');
  const roleScopes = useMemo(
    () => options.data?.data.roleScopes ?? [],
    [options.data],
  );
  const returnTo = safeReturnTo(params.get('returnTo'));
  const roleScope = params.get('roleScope') ?? '';
  const role = params.get('role') ?? '';
  const roleText = useCallback(
    (option: { label: string; labelI18nKey?: string; labelI18nNs?: string }) =>
      option.labelI18nKey
        ? t(option.labelI18nKey, {
            ns: option.labelI18nNs,
            defaultValue: option.label,
          })
        : option.label,
    [t],
  );
  const roleChoices = roleScopes.flatMap((scope) =>
    scope.options.map((option) => ({
      value: JSON.stringify([scope.key, option.value]),
      label: `${roleText(scope)} · ${roleText(option)}`,
    })),
  );
  const selectedRole =
    roleScope && role ? JSON.stringify([roleScope, role]) : null;
  if (
    selectedRole &&
    !roleChoices.some((option) => option.value === selectedRole)
  )
    roleChoices.push({ value: selectedRole, label: `${roleScope} · ${role}` });
  const { paginationState, sortingState } = readTableUrlState(params, {
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    sortColumns: ['name'],
  });
  const page = paginationState.pageIndex + 1;
  const status = STATUSES.find((value) => value === params.get('status'));
  const pageSize = paginationState.pageSize;
  const update = (key: string, value: string) => {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (value && value !== 'all') next.set(key, value);
        else next.delete(key);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  };
  useEffect(() => {
    if (composing || query === (params.get('q') ?? '')) return;
    const timer = setTimeout(() => {
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          if (query) next.set('q', query);
          else next.delete('q');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [query, composing, params, setParams]);
  const remote = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(params.get('q') ? { q: params.get('q')! } : {}),
    ...(status ? { status } : {}),
    ...(roleScope ? { roleScope } : {}),
    ...(role ? { role } : {}),
    ...(sortingState[0]
      ? {
          sort: sortingState[0].id,
          order: sortingState[0].desc ? 'desc' : 'asc',
        }
      : {}),
  });
  const requestPath = `users?${remote}`;
  const request = useSettingsData<{
    data: readonly ManagedUser[];
    meta: { total: number };
  }>(requestPath, { keepPreviousData: true, active });
  const hasCurrentResponse = request.path === requestPath;
  const tableState = useTableUrlState({
    active,
    revision: request.revision,
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    sortColumns: ['name'],
    rowCount:
      hasCurrentResponse && !request.loading && !request.error
        ? request.data?.meta.total
        : undefined,
  });
  const clearFilters = () => {
    setQuery('');
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        for (const key of ['q', 'status', 'roleScope', 'role', 'page'])
          next.delete(key);
        return next;
      },
      { replace: true },
    );
  };
  const { data: pageData, replaceData, reload: refreshUsers } = request;
  const reload = useCallback(
    (updated?: ManagedUser) => {
      if (updated && pageData)
        replaceData({
          ...pageData,
          data: pageData.data.map((row) =>
            row.id === updated.id ? updated : row,
          ),
        });
      refreshUsers();
      if (updated && location.pathname === listPath)
        requestAnimationFrame(focusFilters);
    },
    [
      pageData,
      replaceData,
      refreshUsers,
      location.pathname,
      listPath,
      focusFilters,
    ],
  );
  const canCreate = useUserPermission('create');
  const canAssign = useUserPermission('assign-role');
  const rows = request.data?.data ?? [];
  const filtered = Boolean(params.get('q') || roleScope || role || status);
  const listState = resolveListState(
    {
      data: hasCurrentResponse ? request.data : undefined,
      error: tableState.error ?? request.error,
      isPending: request.loading && !hasCurrentResponse,
    },
    hasCurrentResponse ? (request.data?.meta.total ?? rows.length) : 0,
    filtered,
  );
  const canShowCreate =
    canCreate &&
    canAssign &&
    (listState === 'empty' ||
      listState === 'ready' ||
      listState === 'no-results' ||
      listState === 'refresh-failed');
  const columns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('settings.name')} />
        ),
        enableHiding: false,
        cell: ({ row }) => <UserName user={row.original} />,
      },
      {
        accessorKey: 'email',
        header: t('settings.email'),
        enableSorting: false,
        cell: ({ row }) => (
          <span className='block max-w-64 truncate' title={row.original.email}>
            {row.original.email}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('settings.status'),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge tone={row.original.disabledAt ? 'neutral' : 'success'}>
            {t(
              row.original.disabledAt
                ? 'settings.disabled'
                : 'settings.enabled',
            )}
          </StatusBadge>
        ),
      },
      {
        id: 'roles',
        header: t('settings.assignedRoles'),
        enableSorting: false,
        cell: ({ row }) =>
          Object.entries(row.original.roleScopes)
            .flatMap(([scopeKey, value]) => {
              const scope = roleScopes.find((entry) => entry.key === scopeKey);
              return (typeof value === 'string' ? [value] : value).map(
                (key) => {
                  const option = scope?.options.find(
                    (entry) => entry.value === key,
                  );
                  return option ? roleText(option) : key;
                },
              );
            })
            .join(', ') || t('settings.noAssignedRoles'),
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>{t('settings.actions')}</span>,
        enableSorting: false,
        cell: ({ row }) => <UserActions user={row.original} reload={reload} />,
      },
    ],
    [t, reload, roleScopes, roleText],
  );
  const create =
    canCreate && canAssign ? (
      <Button
        nativeButton={false}
        render={<Link to={{ pathname: 'create', search: location.search }} />}
      >
        <PlusIcon />
        {t('settings.newUser')}
      </Button>
    ) : null;
  // Application change: Invite users beside New user, shown as New user
  // is, once the list has answered (accounts/user-extras.tsx).
  const actions =
    listState === 'empty' ||
    listState === 'ready' ||
    listState === 'no-results' ||
    listState === 'refresh-failed' ? (
      <>
        <InviteUsersButton />
        {canShowCreate ? create : null}
      </>
    ) : undefined;
  // The filters, a menu in the header beside New user.
  const filterDimensions: FilterDimension[] = [
    {
      key: 'status',
      label: t('settings.status'),
      options: STATUSES.map((value) => ({
        value,
        label: t(`settings.${value}`),
      })),
      value: status ?? null,
      onChange: (value) => update('status', value ?? ''),
    },
    {
      key: 'role',
      label: t('settings.assignedRoles'),
      options: roleChoices,
      value: selectedRole,
      onChange: (value) =>
        setParams(
          (old) => {
            const next = new URLSearchParams(old);
            next.delete('page');
            if (!value) {
              next.delete('roleScope');
              next.delete('role');
            } else {
              const [scope, key] = JSON.parse(value) as [string, string];
              next.set('roleScope', scope);
              next.set('role', key);
            }
            return next;
          },
          { replace: true },
        ),
    },
  ];
  return (
    <>
      <PageContainer>
        {returnTo && (
          <BackButton to={returnTo}>{t('settings.backToSource')}</BackButton>
        )}
        <PageHeader
          title={t('settings.users')}
          description={t('settings.usersDescription')}
          actions={
            <>
              <div ref={filtersRef} className='contents'>
                <FilterMenu
                  dimensions={filterDimensions}
                  keyword={{
                    applied: params.get('q') ?? '',
                    inputProps: {
                      value: query,
                      onCompositionStart: () => setComposing(true),
                      onCompositionEnd: () => setComposing(false),
                      onChange: (event) => setQuery(event.target.value),
                    },
                    onClear: () => {
                      setQuery('');
                      update('q', '');
                    },
                    placeholder: t('settings.userSearch'),
                  }}
                  onClear={clearFilters}
                />
              </div>
              {actions}
            </>
          }
        />
        {Boolean(roleScope) !== Boolean(role) && (
          <p role='alert' className='text-sm text-destructive'>
            {t('settings.roleFilterIncomplete')}
          </p>
        )}
        <SettingsError error={options.error} retry={options.reload} />
        <DataTable<ManagedUser>
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          manualPagination
          rowCount={request.data?.meta.total ?? 0}
          {...tableState}
          manualSorting
          showSelectedCount={false}
          // A background refresh shows in the table itself (since template
          // 1.0.0-beta.92), in place of the header's own "Loading" line.
          loading={active && request.loading}
          loadingIdentity={requestPath}
          listState={listState}
          onRetry={request.reload}
          onClearFilters={clearFilters}
        />
        {request.data && (
          // A previous query's total keeps its line but is never shown as the current one.
          <p
            className={cn(
              'text-sm text-muted-foreground',
              !hasCurrentResponse && 'invisible',
            )}
            aria-hidden={!hasCurrentResponse || undefined}
          >
            {t('settings.total', { count: request.data.meta.total })}
          </p>
        )}
        <PendingInvitations />
      </PageContainer>
      <Outlet context={{ reload }} />
    </>
  );
}
