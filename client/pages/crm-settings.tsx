import { toText } from '../components/crm/api.js';
import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { Checkbox } from '../components/ui/checkbox.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { CrmFrame, Loading, ErrorNotice } from '../components/crm/common.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
import { Choice } from '../components/crm/form.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  rows,
  localDate,
  useMetadata,
  type CrmSettings,
  type User,
  type Data,
} from '../components/crm/api.js';
interface SettingsResponse {
  settings: CrmSettings;
  users: User[];
  // Per user id: what they carry — open leads, accounts, open deals and
  // their amounts, last activity.
  workload: Record<string, Data>;
  models: Data[];
}
export default function SettingsPage(): ReactElement {
  const query = useCrmQuery<SettingsResponse>('settings');
  const { text } = useCrmText();
  if (query.isLoading) return <Loading />;
  if (!query.data)
    return (
      <CrmFrame title={text('settings')}>
        <ErrorNotice error={query.error} />
      </CrmFrame>
    );
  return <SettingsForm initial={query.data} />;
}
function SettingsForm({
  initial,
}: {
  initial: SettingsResponse;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [settings, setSettings] = useState(initial.settings);
  const [users, setUsers] = useState(initial.users);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState('business');
  const set = (key: keyof CrmSettings, value: unknown): void => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };
  const fields = (keys: (keyof CrmSettings)[]): ReactElement => (
    <div className='grid gap-4 sm:grid-cols-2'>
      {keys.map((key) =>
        typeof settings[key] === 'boolean' ? (
          // A switch reads as "[x] label", the way the forms do it.
          <label
            key={key}
            className='flex items-center gap-2 text-sm sm:col-span-2'
          >
            <Checkbox
              checked={Boolean(settings[key])}
              onCheckedChange={(v) => set(key, v)}
            />
            {text(`fields.${toText(key)}`)}
          </label>
        ) : (
          <label key={key} className='grid gap-2 text-sm'>
            {text(`fields.${toText(key)}`)}
            {key === 'timeZone' ? (
              // IANA zones the browser knows, with the saved one kept even when
              // it is not among them; a typed zone name is easy to get wrong
              // and everything date-related hangs on it.
              <Choice
                label={text('fields.timeZone')}
                value={toText(settings.timeZone)}
                choices={[
                  ...new Set([
                    toText(settings.timeZone),
                    ...Intl.supportedValuesOf('timeZone'),
                  ]),
                ]
                  .filter(Boolean)
                  .map((v) => ({ value: v, label: v }))}
                onChange={(v) => set(key, v)}
              />
            ) : key === 'currency' ? (
              // The default for new opportunities, from the currency list
              // defined in code (server/providers/crm/schema.ts).
              <Choice
                label={text('fields.currency')}
                value={toText(settings.currency)}
                choices={(settings.options.currency ?? []).map((v) => ({
                  value: v,
                  label: v,
                }))}
                onChange={(v) => set(key, v)}
              />
            ) : (
              <Input
                value={toText(settings[key])}
                type={typeof settings[key] === 'number' ? 'number' : 'text'}
                min={0}
                onChange={(e) =>
                  set(
                    key,
                    typeof settings[key] === 'number'
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            )}
          </label>
        ),
      )}
    </div>
  );
  return (
    <CrmFrame
      title={text('settings')}
      description={text('settingsDescription')}
      actions={
        section !== 'users' && (
          <Button
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError(undefined);
                try {
                  await api('settings', 'PUT', settings);
                  await refresh();
                  setSaved(true);
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {busy ? text('saving') : text('save')}
          </Button>
        )
      }
    >
      <ErrorNotice error={error} />
      {saved && (
        <p role='status' className='rounded-lg bg-primary/10 p-3 text-sm'>
          {text('settingsSaved')}
        </p>
      )}
      <div className='flex flex-wrap gap-2 border-b pb-3'>
        {['business', 'reminders', 'aiSettings', 'users'].map((key) => (
          <Button
            key={key}
            variant={section === key ? 'secondary' : 'ghost'}
            onClick={() => setSection(key)}
          >
            {text(key)}
          </Button>
        ))}
      </div>
      <Card className='max-w-4xl shadow-none'>
        <CardHeader>
          <CardTitle>{text(section)}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {section === 'business' ? (
            fields(['currency', 'timeZone'])
          ) : section === 'reminders' ? (
            fields([
              'activityReminderMinutes',
              'closeReminderDays',
              'leadStaleDays',
              'staleDays',
            ])
          ) : section === 'aiSettings' ? (
            <>
              {fields(['aiEnabled'])}
              <p className='text-sm text-muted-foreground'>
                {text('modelHint')}
              </p>
              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='grid gap-2 text-sm'>
                  {text('fields.aiService')}
                  <Choice
                    label={text('fields.aiService')}
                    value={settings.aiService}
                    onChange={(v) => {
                      set('aiService', v);
                      set('aiModel', '');
                    }}
                    choices={initial.models.map((m) => ({
                      value: toText(m.name),
                      label: toText(m.title ?? m.name),
                    }))}
                  />
                </label>
                <label className='grid gap-2 text-sm'>
                  {text('fields.aiModel')}
                  <Choice
                    label={text('fields.aiModel')}
                    value={settings.aiModel}
                    onChange={(v) => set('aiModel', v)}
                    choices={rows(
                      initial.models.find((m) => m.name === settings.aiService)
                        ?.models,
                    ).map((m) => ({
                      value: toText(m.value),
                      label: toText(m.label),
                    }))}
                  />
                </label>
              </div>
              <label className='grid gap-2 text-sm'>
                {text('fields.aiInstructions')}
                <Textarea
                  rows={8}
                  value={settings.aiInstructions}
                  onChange={(e) => set('aiInstructions', e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <p className='text-sm text-muted-foreground'>
                {text('userHint')}
              </p>
              <Link
                className='text-sm text-primary hover:underline'
                to='/settings/authorization/permission-sets'
              >
                {text('permissionSettings')} ↗
              </Link>
              <div className='overflow-x-auto rounded-xl border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{text('userColumn')}</TableHead>
                      <TableHead>{text('role')}</TableHead>
                      <TableHead>{text('enabled')}</TableHead>
                      <TableHead>{text('lastActivity')}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => {
                      const load = initial.workload[toText(user.id)] ?? {};
                      const changed =
                        JSON.stringify([user.roles[0] ?? '', user.disabled]) !==
                        JSON.stringify([
                          initial.users[index]?.roles[0] ?? '',
                          initial.users[index]?.disabled,
                        ]);
                      return (
                        <TableRow
                          key={user.id}
                          className={user.disabled ? 'opacity-60' : ''}
                        >
                          <TableCell>
                            <p className='font-medium'>
                              {user.name}
                              {user.id === meta?.userId && (
                                <span className='ml-1.5 text-xs text-muted-foreground'>
                                  {text('you')}
                                </span>
                              )}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {[user.username, user.email]
                                .filter(Boolean)
                                .map(toText)
                                .join(' · ')}
                            </p>
                          </TableCell>
                          <TableCell className='w-44'>
                            <Choice
                              label={text('role')}
                              emptyLabel={text('noRole')}
                              value={user.roles[0] ?? ''}
                              onChange={(v) =>
                                setUsers((all) =>
                                  all.map((u, i) =>
                                    i === index ? { ...u, roles: [v] } : u,
                                  ),
                                )
                              }
                              choices={[
                                'sales-representative',
                                'sales-manager',
                                'system-administrator',
                              ].map((r) => ({
                                value: r,
                                label: text(`options.${toText(r)}`),
                              }))}
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              aria-label={text('enabled')}
                              checked={!user.disabled}
                              disabled={user.id === meta?.userId}
                              onCheckedChange={(v) =>
                                setUsers((all) =>
                                  all.map((u, i) =>
                                    i === index ? { ...u, disabled: !v } : u,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className='text-muted-foreground tabular-nums'>
                            {load.lastActivityAt
                              ? localDate(
                                  load.lastActivityAt,
                                  language,
                                  meta?.settings.timeZone ?? 'Asia/Shanghai',
                                )
                              : '—'}
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              size='sm'
                              variant={changed ? 'default' : 'outline'}
                              disabled={busy || !user.roles.length || !changed}
                              onClick={() => {
                                void (async () => {
                                  setBusy(true);
                                  setError(undefined);
                                  try {
                                    await api(
                                      `users/${toText(user.id)}`,
                                      'PUT',
                                      {
                                        role: user.roles[0],
                                        disabled: user.disabled,
                                      },
                                    );
                                    await refresh();
                                  } catch (e) {
                                    setError(e);
                                  } finally {
                                    setBusy(false);
                                  }
                                })();
                              }}
                            >
                              {text('save')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </CrmFrame>
  );
}
