import {
  ApiClientError,
  useNavigationGuard,
  useToaster,
} from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CopyIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link, Outlet } from 'react-router';
import { BackButton } from '#components/back-button';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Alert, AlertDescription } from '#components/ui/alert';
import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#components/ui/card';
import { Skeleton } from '#components/ui/skeleton';
import { Spinner } from '#components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import {
  errorCode,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
} from '../../components/crm/api.js';
import { ConfirmDialog } from '../../components/crm/confirm-dialog.js';
import { useBusinessZone } from '../../components/crm/whatsapp/api.js';
import { LoadFailure, TextField } from '../settings/common/shared.js';

// The WhatsApp connection (/whatsapp/connection, from the WhatsApp page's
// "Manage connection", as the mail accounts are reached from the mailbox):
// the Meta app every number is connected through (its secret, sealed on the
// server and never shown again), the company's numbers on it, each with its
// own token and mode, added and changed in a dialog at its own address
// (number.tsx), what to enter in the Meta app's webhook settings, and how the
// deliveries are processed. The status changes on its own, so the page has a
// Refresh (R4); the app secret is saved by its card's Save (T4).

const FORM_ID = 'crm-whatsapp-app';

export interface WhatsAppNumber {
  id: string;
  phoneNumberId: string;
  wabaId: string | null;
  mode: 'api' | 'coexistence' | 'demo';
  displayPhone: string | null;
  displayName: string | null;
  qualityRating: string | null;
  status: string | null;
  messagingLimit: string | null;
  hasAccessToken: boolean;
  connectedAt: string | null;
  lastWebhookAt: string | null;
  conversations: number;
}
export interface Connection {
  configured: boolean;
  hasAppSecret: boolean;
  verifyToken: string | null;
  webhookPath: string;
  secretsReady: boolean;
  numbers: WhatsAppNumber[];
  // The demo dataset's, shown read-only.
  demoNumbers: WhatsAppNumber[];
}
// What the number dialog stacked on the page reads and reports back.
export interface ConnectionContext {
  connection: Connection;
  saved: (next: Connection) => void;
}
interface Health {
  received: number;
  processed: number;
  pending: number;
  failed: number;
  failures: { error: string; count: number }[];
  mediaPending: number;
  mediaUnavailable: number;
}

export default function WhatsAppSettingsPage(): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const queryClient = useQueryClient();
  const connectionKey = [...scopeKey, 'whatsapp/connection'];
  const healthKey = [...scopeKey, 'whatsapp/health'];
  const connection = useQuery({
    queryKey: connectionKey,
    queryFn: () =>
      api<{ data: Connection }>('whatsapp/connection').then((r) => r.data),
  });
  const health = useQuery({
    queryKey: healthKey,
    queryFn: () => api<{ data: Health }>('whatsapp/health').then((r) => r.data),
  });
  const refreshing = connection.isFetching || health.isFetching;
  const refresh = () => {
    void connection.refetch();
    void health.refetch();
  };
  const saved = (next: Connection) => {
    queryClient.setQueryData(connectionKey, next);
    void queryClient.invalidateQueries({
      queryKey: [...scopeKey, 'workspace'],
    });
    void queryClient.invalidateQueries({
      queryKey: [...scopeKey, 'whatsapp/numbers'],
    });
  };
  const failure = (
    <CardContent>
      <LoadFailure
        error={connection.error}
        what={toText(text('whatsappSettings.whatConnection'))}
        onRetry={() => void connection.refetch()}
      />
    </CardContent>
  );
  return (
    <PageContainer>
      <BackButton to='/whatsapp' />
      <PageHeader
        title={toText(text('whatsappSettings.title'))}
        description={toText(text('whatsappSettings.description'))}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  size='icon'
                  aria-label={toText(text('refresh'))}
                  disabled={refreshing}
                  onClick={refresh}
                />
              }
            >
              <RefreshCwIcon className={refreshing ? 'animate-spin' : ''} />
            </TooltipTrigger>
            <TooltipContent>{text('refresh')}</TooltipContent>
          </Tooltip>
        }
      />
      <div className='flex max-w-4xl flex-col gap-6'>
        {connection.data && !connection.data.secretsReady ? (
          <Alert variant='destructive'>
            <AlertDescription>{text('errors.secretsMissing')}</AlertDescription>
          </Alert>
        ) : null}
        <SettingsCard
          title={toText(text('whatsappSettings.app'))}
          description={toText(text('whatsappSettings.appBody'))}
        >
          {connection.data ? (
            <AppForm connection={connection.data} onSaved={saved} />
          ) : connection.error ? (
            failure
          ) : (
            <FieldsSkeleton rows={1} />
          )}
        </SettingsCard>
        <SettingsCard
          title={toText(text('whatsappSettings.numbers'))}
          description={toText(text('whatsappSettings.numbersBody'))}
          action={
            connection.data ? (
              <Button
                variant='outline'
                nativeButton={false}
                render={<Link to='numbers/new' />}
              >
                <PlusIcon data-icon='inline-start' />
                {text('whatsappSettings.addNumber')}
              </Button>
            ) : null
          }
        >
          {connection.data ? (
            <Numbers connection={connection.data} onChanged={saved} />
          ) : connection.error ? (
            failure
          ) : (
            <FieldsSkeleton rows={2} />
          )}
        </SettingsCard>
        <SettingsCard
          title={toText(text('whatsappSettings.webhook'))}
          description={toText(text('whatsappSettings.webhookBody'))}
        >
          {connection.data ? (
            <Webhook connection={connection.data} />
          ) : connection.error ? (
            failure
          ) : (
            <FieldsSkeleton rows={2} />
          )}
        </SettingsCard>
        <SettingsCard
          title={toText(text('whatsappSettings.status'))}
          description={toText(text('whatsappSettings.statusBody'))}
        >
          {health.error && !health.data ? (
            <CardContent>
              <LoadFailure
                error={health.error}
                what={toText(text('whatsappSettings.whatStatus'))}
                onRetry={() => void health.refetch()}
              />
            </CardContent>
          ) : health.data ? (
            <Status
              health={health.data}
              lastDelivery={
                connection.data?.numbers
                  .map((n) => n.lastWebhookAt)
                  .filter((at): at is string => Boolean(at))
                  .sort()
                  .at(-1) ?? null
              }
              refresh={refresh}
            />
          ) : (
            <FieldsSkeleton rows={3} />
          )}
        </SettingsCard>
      </div>
      {connection.data ? (
        <Outlet
          context={
            { connection: connection.data, saved } satisfies ConnectionContext
          }
        />
      ) : null}
    </PageContainer>
  );
}

function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <Card className='border border-border shadow-xs ring-0'>
      <CardHeader>
        <CardTitle className='text-base font-medium'>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children}
    </Card>
  );
}

function FieldsSkeleton({ rows }: { rows: number }): ReactElement {
  const { text } = useCrmText();
  return (
    <CardContent>
      <div
        role='status'
        aria-label={toText(text('loading'))}
        className='flex flex-col gap-4'
      >
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-9 w-full' />
          </div>
        ))}
      </div>
    </CardContent>
  );
}

// The Meta app's secret: required until saved, then left empty to keep it.
function AppForm({
  connection,
  onSaved,
}: {
  connection: Connection;
  onSaved: (next: Connection) => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const [appSecret, setAppSecret] = useState('');
  const [error, setError] = useState<string>();
  const [rootError, setRootError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLFormElement>(null);
  const dirty = appSecret !== '';
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useNavigationGuard(
    () =>
      !dirtyRef.current ||
      window.confirm(toText(text('whatsappSettings.leaveConfirm'))),
  );
  // Closing or reloading the tab asks too.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async () => {
    if (!appSecret.trim()) {
      if (connection.hasAppSecret) return;
      setError(toText(text('whatsappSettings.enterSecret')));
      inputRef.current
        ?.querySelector<HTMLElement>(`#${FORM_ID}-appSecret`)
        ?.focus();
      return;
    }
    setSaving(true);
    setRootError(undefined);
    try {
      const { data } = await api<{ data: Connection }>(
        'whatsapp/connection',
        'PUT',
        { appSecret: appSecret.trim() },
      );
      setAppSecret('');
      setError(undefined);
      onSaved(data);
      toaster.show({
        type: 'success',
        title: toText(text('whatsappSettings.appSaved')),
      });
    } catch (caught) {
      const { code } = errorCode(caught);
      setRootError(
        toText(
          text(`errors.${code}`, { defaultValue: text('errors.serverError') }),
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      ref={inputRef}
      id={FORM_ID}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <CardContent>
        <fieldset disabled={saving} className='flex min-w-0 flex-col gap-5'>
          {rootError ? (
            <Alert variant='destructive'>
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          ) : null}
          <TextField
            formId={FORM_ID}
            name='appSecret'
            type='password'
            autoComplete='new-password'
            label={toText(text('whatsappSettings.appSecret'))}
            required={!connection.hasAppSecret}
            hint={
              connection.hasAppSecret
                ? toText(text('whatsappSettings.secretSet'))
                : undefined
            }
            maxLength={256}
            value={appSecret}
            onChange={(value) => {
              setAppSecret(value);
              if (error && value.trim()) setError(undefined);
            }}
            error={error}
          />
          <div className='flex justify-end'>
            <Button type='submit' disabled={saving}>
              {saving ? <Spinner data-icon='inline-start' /> : null}
              {text('whatsappSettings.save')}
            </Button>
          </div>
        </fieldset>
      </CardContent>
    </form>
  );
}

const QUALITIES = ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'];
const LIMITS = [
  'TIER_250',
  'TIER_1K',
  'TIER_10K',
  'TIER_100K',
  'TIER_UNLIMITED',
];

// The company's numbers, each with its standing, Check, Edit and Remove;
// one holding conversations stays, to keep its customers' history.
function Numbers({
  connection,
  onChanged,
}: {
  connection: Connection;
  onChanged: (next: Connection) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const zone = useBusinessZone();
  const api = useCrmApi();
  const toaster = useToaster();
  const [checking, setChecking] = useState<string>();
  const [removing, setRemoving] = useState<WhatsAppNumber>();
  const [busy, setBusy] = useState(false);
  const known = (value: string | null, list: string[], group: string) =>
    value
      ? toText(
          text(
            `whatsappSettings.${group}.${list.includes(value) ? value : 'other'}`,
          ),
        )
      : '—';
  const time = (at: string | null) =>
    at
      ? new Intl.DateTimeFormat(language, {
          timeZone: zone,
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(at))
      : toText(text('whatsappSettings.never'));
  const label = (number: WhatsAppNumber) =>
    number.displayPhone ?? number.phoneNumberId;
  const check = (number: WhatsAppNumber) => {
    setChecking(number.id);
    api<{
      data: {
        ok: boolean;
        reason?: string;
        standing?: { displayName?: string };
      };
    }>(`whatsapp/numbers/${encodeURIComponent(number.id)}/check`, 'POST')
      .then(async ({ data }) => {
        if (data.ok)
          toaster.show({
            type: 'success',
            title: toText(
              text('whatsappSettings.checked', {
                name: data.standing?.displayName ?? label(number),
              }),
            ),
          });
        else {
          const reason = data.reason ?? 'other';
          toaster.show({
            type: 'error',
            title: toText(
              text(`whatsappSettings.checkReason.${reason}`, {
                defaultValue: text('whatsappSettings.checkReason.other'),
              }),
            ),
          });
        }
        onChanged(
          (await api<{ data: Connection }>('whatsapp/connection')).data,
        );
      })
      .catch((error: unknown) =>
        toaster.show({
          type: 'error',
          title: toText(
            text(
              error instanceof ApiClientError && error.status === 403
                ? 'errors.forbidden'
                : 'whatsappSettings.checkReason.other',
            ),
          ),
        }),
      )
      .finally(() => setChecking(undefined));
  };
  const remove = (number: WhatsAppNumber) => {
    setBusy(true);
    api<{ data: Connection }>(
      `whatsapp/numbers/${encodeURIComponent(number.id)}`,
      'DELETE',
    )
      .then(({ data }) => {
        onChanged(data);
        setRemoving(undefined);
        toaster.show({
          type: 'success',
          title: toText(text('whatsappSettings.numberRemoved')),
        });
      })
      .catch((error: unknown) => {
        const { code } = errorCode(error);
        toaster.show({
          type: 'error',
          title: toText(
            text(`errors.${code}`, {
              defaultValue: text('errors.serverError'),
            }),
          ),
        });
      })
      .finally(() => setBusy(false));
  };
  return (
    <CardContent className='flex flex-col gap-3'>
      {connection.numbers.length ? null : (
        <p className='text-sm text-muted-foreground'>
          {text('whatsappSettings.notConnected')}
        </p>
      )}
      <ul className='flex flex-col gap-3 empty:hidden'>
        {connection.numbers.map((number) => (
          <li
            key={number.id}
            className='flex flex-col gap-3 rounded-lg border border-border p-4'
          >
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div className='flex min-w-0 flex-col gap-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>{label(number)}</span>
                  <Badge variant='muted'>
                    {text(`whatsappSettings.modes.${number.mode}`)}
                  </Badge>
                </div>
                {number.displayName ? (
                  <span className='text-sm text-muted-foreground'>
                    {number.displayName}
                  </span>
                ) : null}
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  disabled={checking === number.id}
                  onClick={() => check(number)}
                >
                  {checking === number.id ? (
                    <Spinner data-icon='inline-start' />
                  ) : null}
                  {text('whatsappSettings.check')}
                </Button>
                <Button
                  variant='outline'
                  nativeButton={false}
                  render={
                    <Link to={`numbers/${encodeURIComponent(number.id)}`} />
                  }
                >
                  {text('edit')}
                </Button>
                <Button variant='outline' onClick={() => setRemoving(number)}>
                  {text('remove')}
                </Button>
              </div>
            </div>
            <dl className='flex flex-col gap-2'>
              <Row label={toText(text('whatsappSettings.quality'))}>
                {known(number.qualityRating, QUALITIES, 'qualities')}
              </Row>
              <Row label={toText(text('whatsappSettings.limit'))}>
                {known(number.messagingLimit, LIMITS, 'limits')}
              </Row>
              <Row label={toText(text('whatsappSettings.lastDelivery'))}>
                {time(number.lastWebhookAt)}
              </Row>
              <Row label={toText(text('whatsappSettings.conversations'))}>
                {number.conversations.toLocaleString(language)}
              </Row>
            </dl>
          </li>
        ))}
        {/* The demo dataset's: what they hold, nothing to change. They
            behave as coexistence numbers do (the team's replies from the
            phone among their messages, a reply alone ending the wait), so
            they show as such. */}
        {(connection.demoNumbers ?? []).map((number) => (
          <li
            key={number.id}
            className='flex flex-col gap-2 rounded-lg border border-dashed border-border p-4'
          >
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-medium'>{label(number)}</span>
              <Badge variant='muted'>
                {text('whatsappSettings.modes.coexistence')}
              </Badge>
              <Badge variant='info'>{text('whatsappSettings.demo')}</Badge>
            </div>
            <span className='text-sm text-muted-foreground'>
              {[
                number.displayName,
                toText(
                  text('whatsappSettings.conversationCount', {
                    count: number.conversations,
                    value: number.conversations.toLocaleString(language),
                  }),
                ),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <p className='text-sm text-muted-foreground'>
              {text('whatsappSettings.demoHint')}
            </p>
          </li>
        ))}
      </ul>
      {removing ? (
        <ConfirmDialog
          title={toText(
            text('whatsappSettings.removeTitle', { number: label(removing) }),
          )}
          description={toText(
            text(
              removing.conversations
                ? 'whatsappSettings.removeInUse'
                : 'whatsappSettings.removeBody',
            ),
          )}
          busy={busy}
          confirmDisabled={removing.conversations > 0}
          confirmLabel={toText(text('remove'))}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => remove(removing)}
        />
      ) : null}
    </CardContent>
  );
}

function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}): ReactElement {
  const { text } = useCrmText();
  const toaster = useToaster();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            aria-label={label}
            onClick={() =>
              void (
                navigator.clipboard?.writeText(value) ??
                Promise.reject(new Error('no clipboard'))
              )
                .then(() =>
                  toaster.show({
                    type: 'success',
                    title: toText(text('copiedValue')),
                  }),
                )
                .catch(() =>
                  toaster.show({
                    type: 'error',
                    title: toText(text('whatsappSettings.copyFailed')),
                  }),
                )
            }
          />
        }
      >
        <CopyIcon />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Row({
  label,
  center = false,
  children,
}: {
  label: string;
  // The label level with a value that carries buttons.
  center?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      className={`grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4 ${center ? 'sm:items-center' : ''}`}
    >
      <dt className='text-sm text-muted-foreground'>{label}</dt>
      <dd className='min-w-0 text-sm'>{children}</dd>
    </div>
  );
}

function Webhook({ connection }: { connection: Connection }): ReactElement {
  const { text } = useCrmText();
  const [shown, setShown] = useState(false);
  const url = `${window.location.origin}${connection.webhookPath}`;
  const token = connection.verifyToken;
  return (
    <CardContent>
      <dl className='flex flex-col gap-2'>
        <Row label={toText(text('whatsappSettings.callbackUrl'))} center>
          <span className='flex items-center gap-2'>
            <code className='min-w-0 font-mono text-xs break-all'>{url}</code>
            <CopyButton
              value={url}
              label={toText(text('whatsappSettings.copyUrl'))}
            />
          </span>
        </Row>
        <Row label={toText(text('whatsappSettings.verifyToken'))} center>
          {token ? (
            <span className='flex flex-wrap items-center gap-2'>
              <code className='min-w-0 font-mono text-xs break-all'>
                {shown ? token : '••••••••••••'}
              </code>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShown(!shown)}
              >
                {text(
                  shown ? 'whatsappSettings.hide' : 'whatsappSettings.show',
                )}
              </Button>
              <CopyButton
                value={token}
                label={toText(text('whatsappSettings.copyToken'))}
              />
            </span>
          ) : (
            <span className='text-muted-foreground'>
              {text('whatsappSettings.tokenLater')}
            </span>
          )}
        </Row>
      </dl>
    </CardContent>
  );
}

const FAILURES = ['unknownNumber', 'invalidJson', 'processingFailed'];

// How Meta's deliveries and their files are processed; failed ones can be
// tried again.
// Only what needs doing: all well, with the last delivery, or the
// deliveries waiting or failed and the files not yet or never fetched.
function Status({
  health,
  lastDelivery,
  refresh,
}: {
  health: Health;
  // The latest of the numbers' last deliveries.
  lastDelivery: string | null;
  refresh: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const zone = useBusinessZone();
  const api = useCrmApi();
  const toaster = useToaster();
  const [busy, setBusy] = useState(false);
  const number = (value: number) => value.toLocaleString(language);
  const retry = () => {
    setBusy(true);
    api('whatsapp/health/retry', 'POST')
      .then(() => {
        toaster.show({
          type: 'success',
          title: toText(
            text('whatsappSettings.retrying', { count: health.failed }),
          ),
        });
        refresh();
      })
      .catch(() =>
        toaster.show({
          type: 'error',
          title: toText(text('errors.serverError')),
        }),
      )
      .finally(() => setBusy(false));
  };
  const time = (at: string) =>
    new Intl.DateTimeFormat(language, {
      timeZone: zone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(at));
  const well =
    !health.pending &&
    !health.failed &&
    !health.mediaPending &&
    !health.mediaUnavailable;
  if (well)
    return (
      <CardContent>
        <p className='text-sm text-muted-foreground'>
          {lastDelivery
            ? text('whatsappSettings.allWell', { time: time(lastDelivery) })
            : text('whatsappSettings.noDeliveries')}
        </p>
      </CardContent>
    );
  return (
    <CardContent>
      <dl className='flex flex-col gap-3'>
        {health.pending ? (
          <Row label={toText(text('whatsappSettings.waiting'))}>
            {number(health.pending)}
          </Row>
        ) : null}
        {health.failed ? (
          <Row label={toText(text('whatsappSettings.failed'))}>
            <ul className='flex flex-col gap-1'>
              {health.failures.map((failure) => (
                <li key={failure.error}>
                  {toText(
                    text(
                      `whatsappSettings.failureReasons.${
                        FAILURES.includes(failure.error)
                          ? failure.error
                          : 'other'
                      }`,
                    ),
                  )}{' '}
                  ×{number(failure.count)}
                </li>
              ))}
            </ul>
          </Row>
        ) : null}
        {health.mediaPending ? (
          <Row label={toText(text('whatsappSettings.filesWaiting'))}>
            {number(health.mediaPending)}
          </Row>
        ) : null}
        {health.mediaUnavailable ? (
          <Row label={toText(text('whatsappSettings.filesUnavailable'))}>
            {number(health.mediaUnavailable)}
          </Row>
        ) : null}
      </dl>
      {health.failed > 0 ? (
        <div className='mt-4 flex justify-end'>
          <Button variant='outline' disabled={busy} onClick={retry}>
            {busy ? <Spinner data-icon='inline-start' /> : null}
            {text('whatsappSettings.retry')}
          </Button>
        </div>
      ) : null}
    </CardContent>
  );
}
