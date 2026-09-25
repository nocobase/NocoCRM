import { PageContainer } from '../components/page-container.js';
import { PageHeader } from '../components/page-header.js';
import { toText } from '../components/crm/api.js';
import { useState, type ReactElement } from 'react';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Loading, ErrorNotice } from '../components/crm/common.js';
import { Choice } from '../components/crm/form.js';
import { ConfirmDialog } from './crm-detail.js';
import {
  localDate,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  type CrmSettings,
} from '../components/crm/api.js';
interface DemoStatus {
  present: boolean;
  createdAt: string | null;
  records: number;
  accounts: { username: string; name: string; role: string }[];
}
interface SettingsResponse {
  settings: CrmSettings;
  demo: DemoStatus;
}
export default function SettingsPage(): ReactElement {
  const query = useCrmQuery<SettingsResponse>('settings');
  const { text } = useCrmText();
  if (query.isLoading) return <Loading />;
  if (!query.data)
    return (
      <PageContainer>
        <PageHeader title={text('settings')} />
        <ErrorNotice error={query.error} />
      </PageContainer>
    );
  return <SettingsForm initial={query.data} />;
}
function SettingsForm({
  initial,
}: {
  initial: SettingsResponse;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [settings, setSettings] = useState(initial.settings);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState('business');
  // The demo dataset: imported and removed from here, never saved with the
  // settings form, so it keeps its own state and confirmation.
  const [demo, setDemo] = useState(initial.demo);
  const [demoAction, setDemoAction] = useState<'populate' | 'reset'>();
  const [demoNotice, setDemoNotice] = useState<string>();
  const runDemo = async (action: 'populate' | 'reset'): Promise<void> => {
    setBusy(true);
    setError(undefined);
    setDemoNotice(undefined);
    try {
      setDemo(
        (await api<{ data: DemoStatus }>(`demo/${action}`, 'POST', {})).data,
      );
      await refresh();
      setDemoNotice(
        text(action === 'populate' ? 'demoImported' : 'demoRemoved'),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setDemoAction(undefined);
    }
  };
  const set = (key: keyof CrmSettings, value: unknown): void => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };
  const fields = (keys: (keyof CrmSettings)[]): ReactElement => (
    <div className='grid gap-4 sm:grid-cols-2'>
      {keys.map((key) => (
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
      ))}
    </div>
  );
  return (
    <PageContainer>
      <PageHeader
        title={text('settings')}
        description={text('settingsDescription')}
        actions={
          <>
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
          </>
        }
      />
      <ErrorNotice error={error} />
      {saved && (
        <p role='status' className='rounded-lg bg-primary/10 p-3 text-sm'>
          {text('settingsSaved')}
        </p>
      )}
      <div className='flex gap-1 overflow-x-auto border-b'>
        {['business', 'reminders', 'demoData'].map((key) => (
          <Button
            key={key}
            variant='ghost'
            className={`h-auto rounded-none border-0 border-b-2 px-3 py-2 transition-colors hover:bg-transparent dark:hover:bg-transparent ${
              section === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
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
          {section === 'demoData' ? (
            <>
              <p className='text-sm text-muted-foreground'>
                {text('demoDescription')}
              </p>
              <ul className='grid gap-1 text-sm sm:grid-cols-2'>
                {demo.accounts.map((account) => (
                  <li key={account.username} className='flex gap-2'>
                    <code className='rounded bg-muted px-1.5 py-0.5 text-xs'>
                      {account.username}
                    </code>
                    <span>{account.name}</span>
                    <span className='text-muted-foreground'>
                      {text(`options.${account.role}`)}
                    </span>
                  </li>
                ))}
              </ul>
              {demoNotice && (
                <p
                  role='status'
                  className='rounded-lg bg-primary/10 p-3 text-sm'
                >
                  {demoNotice}
                </p>
              )}
              <p className='text-sm'>
                {demo.present
                  ? text('demoPresent', {
                      date: localDate(
                        demo.createdAt,
                        language,
                        settings.timeZone,
                      ),
                      count: demo.records,
                    })
                  : text('demoAbsent')}
              </p>
              <div className='flex flex-wrap gap-2'>
                <Button
                  disabled={busy || demo.present}
                  onClick={() => setDemoAction('populate')}
                >
                  {text('demoImport')}
                </Button>
                <Button
                  variant='outline'
                  disabled={busy || !demo.present}
                  onClick={() => setDemoAction('reset')}
                >
                  {text('demoReset')}
                </Button>
              </div>
              {demoAction && (
                <ConfirmDialog
                  title={text(
                    demoAction === 'populate'
                      ? 'demoImportTitle'
                      : 'demoResetTitle',
                  )}
                  description={text(
                    demoAction === 'populate'
                      ? 'demoImportHint'
                      : 'demoResetHint',
                  )}
                  busy={busy}
                  onCancel={() => setDemoAction(undefined)}
                  onConfirm={() => void runDemo(demoAction)}
                />
              )}
            </>
          ) : section === 'business' ? (
            fields(['currency', 'timeZone'])
          ) : section === 'reminders' ? (
            fields([
              'activityReminderMinutes',
              'closeReminderDays',
              'leadStaleDays',
              'staleDays',
            ])
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
