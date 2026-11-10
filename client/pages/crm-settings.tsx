import { PageContainer } from '../components/page-container.js';
import { PageHeader } from '../components/page-header.js';
import { toText } from '../components/crm/api.js';
import { useState, type ReactElement } from 'react';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Switch } from '../components/ui/switch.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Loading, ErrorNotice } from '../components/crm/common.js';
import { Choice } from '../components/crm/form.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  type CrmSettings,
} from '../components/crm/api.js';
interface SettingsResponse {
  settings: CrmSettings;
}
// What each card holds and saves.
const BUSINESS_FIELDS = ['currency', 'timeZone', 'aiLanguage'] as const;
const BUSINESS = [...BUSINESS_FIELDS, 'assistantDock'] as const;
const REMINDER_DAYS = [
  'taskReminderMinutes',
  'closeReminderDays',
  'uncontactedDays',
  'leadStaleDays',
  'staleDays',
  'nurtureReviewDays',
] as const;
const NOTIFICATIONS = [
  'notifyApprovals',
  'notifyRecordChanges',
  'notifyComments',
  'notifyTaskReminders',
] as const;
const REMINDERS = [...REMINDER_DAYS, ...NOTIFICATIONS] as const;

export default function SettingsPage(): ReactElement {
  const settings = useCrmQuery<CrmSettings>('systemSettings');
  const { text } = useCrmText();
  if (settings.isLoading) return <Loading />;
  if (!settings.data)
    return (
      <PageContainer>
        <PageHeader title={text('settings')} />
        <ErrorNotice error={settings.error} />
      </PageContainer>
    );
  return <SettingsForm initial={{ settings: settings.data }} />;
}
function SettingsForm({
  initial,
}: {
  initial: SettingsResponse;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [settings, setSettings] = useState(initial.settings);
  // What the server holds, which a card's Save is offered against.
  const [stored, setStored] = useState(initial.settings);
  const [error, setError] = useState<unknown>();
  // The card being saved, and the card saved last.
  const [saving, setSaving] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const set = (key: keyof CrmSettings, value: unknown): void => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(undefined);
  };
  // Each card saves its own settings alone, the route taking any part of
  // them, and only once one of them differs from what is stored.
  const saveCard = (card: string, keys: readonly (keyof CrmSettings)[]) => {
    const changed = keys.some((key) => settings[key] !== stored[key]);
    return (
      <div className='flex items-center justify-end gap-3'>
        {saved === card && (
          <span role='status' className='text-sm text-muted-foreground'>
            {text('settingsSaved')}
          </span>
        )}
        <Button
          disabled={!changed || saving !== undefined}
          onClick={() => {
            void (async () => {
              setSaving(card);
              setError(undefined);
              try {
                const changes = Object.fromEntries(
                  keys.map((key) => [key, settings[key]]),
                );
                await api('systemSettings', 'PUT', changes);
                setStored((current) => ({ ...current, ...changes }));
                await refresh();
                setSaved(card);
              } catch (e) {
                setError(e);
              } finally {
                setSaving(undefined);
              }
            })();
          }}
        >
          {saving === card ? text('saving') : text('save')}
        </Button>
      </div>
    );
  };
  const fields = (
    keys: readonly (keyof CrmSettings)[],
    extra?: ReactElement,
  ): ReactElement => (
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
          ) : key === 'aiLanguage' ? (
            // What the AI writes in when it works on its own, the same for
            // the whole team; the chat answers in the user's language.
            <Choice
              label={text('fields.aiLanguage')}
              value={toText(settings.aiLanguage)}
              choices={['zh-CN', 'en-US'].map((v) => ({
                value: v,
                label: text(`aiLanguages.${v}`),
              }))}
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
      {extra}
    </div>
  );
  return (
    <PageContainer>
      <PageHeader
        title={text('settings')}
        description={text('settingsDescription')}
      />
      <ErrorNotice error={error} />
      {/* One page, its parts one under another: the business defaults and
          the reminders each saved by their own card's Save. The demo
          dataset has a settings page of its own (settings/demo-data.tsx). */}
      <Card
        id='settings-business'
        className='max-w-4xl scroll-mt-16 border border-border shadow-xs ring-0'
      >
        <CardHeader>
          <CardTitle>{text('business')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {fields(
            BUSINESS_FIELDS,
            // The assistant's ask box at the bottom of the pages
            // (assistant-dock.tsx), for everyone; the header's ✨ button
            // stays either way. Beside the AI's language, in the grid.
            <div className='grid gap-2 text-sm'>
              <span>{text('fields.assistantDock')}</span>
              <div className='flex min-h-9 items-center gap-3'>
                <Switch
                  checked={settings.assistantDock !== false}
                  onCheckedChange={(on) => set('assistantDock', on)}
                  aria-label={toText(text('fields.assistantDock'))}
                />
                <span className='text-xs text-muted-foreground'>
                  {text('fields.assistantDockHint')}
                </span>
              </div>
            </div>,
          )}
          {saveCard('business', BUSINESS)}
        </CardContent>
      </Card>
      <Card
        id='settings-reminders'
        className='max-w-4xl scroll-mt-16 border border-border shadow-xs ring-0'
      >
        <CardHeader>
          <CardTitle>{text('reminders')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-6'>
            {fields(REMINDER_DAYS)}
            {/* Each kind of in-app message the CRM sends, on unless
                switched off (service.ts, queueMessage). */}
            <div className='space-y-2'>
              <p className='text-sm font-medium'>
                {text('notifications.heading')}
              </p>
              <ul className='divide-y divide-border rounded-lg border border-border px-3'>
                {NOTIFICATIONS.map((key) => (
                  <li
                    key={key}
                    className='flex items-start justify-between gap-4 py-2.5'
                  >
                    <div className='min-w-0 space-y-0.5'>
                      <p className='text-sm'>{text(`notifications.${key}`)}</p>
                      <p className='text-xs text-muted-foreground'>
                        {text(`notifications.${key}Hint`)}
                      </p>
                    </div>
                    <Switch
                      checked={settings[key] !== false}
                      onCheckedChange={(on) => set(key, on)}
                      aria-label={toText(text(`notifications.${key}`))}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {saveCard('reminders', REMINDERS)}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
