import { useRef, useState, type ReactElement } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError, useToaster } from '@nocobase/app-client';
import { inboxKeys } from '@nocobase/app-plugin-notification-in-app/client/inbox';
import { PageContainer } from '../../components/page-container.js';
import { PageHeader } from '../../components/page-header.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent } from '../../components/ui/card.js';
import { ErrorNotice, Loading } from '../../components/crm/common.js';
import { Choice } from '../../components/crm/form.js';
import { ConfirmDialog } from '../crm-detail.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmScopeKey,
  useCrmText,
  useRefresh,
  type Data,
  type Metadata,
} from '../../components/crm/api.js';
import type { DemoStatus } from '../../components/crm/demo-status.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// Settings → Demo data, a tab of its own (it was the General tab's last
// card): the demo dataset's accounts, whether it is there, and importing it
// in either language or removing it, never saved with the settings.
export default function DemoDataPage(): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  // The workspace's settings, as useMetadata reads them, for the date the
  // dataset was imported.
  const timeZone =
    useCrmQuery<Metadata>('workspace').data?.settings?.timeZone ??
    DEFAULT_TIME_ZONE;
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // Read from its query rather than kept here: importing or
  // removing it changes the reader's roles, and the route guards hide and
  // show the page again while the new permissions load, so this page mounts
  // anew; its own state would start from what the cache held before. The
  // answer is written into the cache, and the outcome told in a toast, which
  // outlives that remount.
  const demoQuery = useCrmQuery<DemoStatus>('demoData');
  const queryClient = useQueryClient();
  const scopeKey = useCrmScopeKey();
  const toaster = useToaster();
  const [demoAction, setDemoAction] = useState<'populate' | 'reset'>();
  // The dataset comes in Chinese and in English (the same story, translated);
  // the reader's interface language is the first choice.
  const [demoLanguage, setDemoLanguage] = useState(
    language.startsWith('zh') ? 'zh-CN' : 'en-US',
  );
  // A second click on the confirmation, before it closes, starts nothing:
  // an import takes a while, and a second one beside it would be refused.
  const demoRunningRef = useRef(false);
  // How the dataset stands, asked every few seconds until it is as wanted.
  const waitForDemo = async (
    present: boolean,
  ): Promise<DemoStatus | undefined> => {
    for (let tries = 0; tries < 60; tries += 1) {
      await new Promise((done) => setTimeout(done, 3000));
      const status = await api<{ data: DemoStatus }>('demoData')
        .then((answer) => answer.data)
        .catch(() => undefined);
      if (status?.present === present) return status;
    }
    return undefined;
  };
  const runDemo = async (action: 'populate' | 'reset'): Promise<void> => {
    if (demoRunningRef.current) return;
    demoRunningRef.current = true;
    setBusy(true);
    setError(undefined);
    const wanted = action === 'populate';
    // The outcome, written into what every page reads at once: the card's
    // query and the workspace's `demoPresent`, which the banner reads, so
    // neither waits for the refresh after it.
    const settle = async (answer: DemoStatus): Promise<void> => {
      queryClient.setQueryData([...scopeKey, 'demoData'], answer);
      queryClient.setQueryData<Data>([...scopeKey, 'workspace'], (current) =>
        current ? { ...current, demoPresent: answer.present } : current,
      );
      toaster.show({
        type: 'success',
        title: text(wanted ? 'demoImported' : 'demoRemoved'),
      });
      // The inbox's notifications too: the removal deletes those about the
      // demo's records, which the menu's count would otherwise keep until
      // the in-app plugin's realtime event arrives, if it does.
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: inboxKeys.all }),
      ]);
    };
    // Under way at once in what the banner reads, which then follows the
    // import's progress (demo-banner.tsx).
    if (wanted)
      queryClient.setQueryData<DemoStatus>(
        [...scopeKey, 'demoData'],
        (current) =>
          current ? { ...current, importing: { percent: 0 } } : current,
      );
    try {
      await settle(
        (
          await api<{ data: DemoStatus }>(
            wanted ? 'demoData/import' : 'demoData/remove',
            'POST',
            wanted ? { language: demoLanguage } : {},
          )
        ).data,
      );
    } catch (e) {
      // An import takes long enough for a gateway in front of the server
      // (a hosted deployment's) to give up on the request while the server
      // carries on: a timeout or a lost connection is not its failure. The
      // page then asks how the dataset stands until it is there, for up to
      // three minutes.
      const cutOff =
        !(e instanceof ApiClientError) || [502, 503, 504].includes(e.status);
      const answer = cutOff ? await waitForDemo(wanted) : undefined;
      if (answer) await settle(answer);
      else setError(e);
    } finally {
      demoRunningRef.current = false;
      setBusy(false);
      setDemoAction(undefined);
    }
  };
  const demo = demoQuery.data;
  if (demoQuery.isLoading) return <Loading />;
  if (!demo)
    return (
      <PageContainer>
        <PageHeader title={text('demoData')} />
        <ErrorNotice error={demoQuery.error} />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title={text('demoData')}
        description={text('demoDescription')}
      />
      <ErrorNotice error={error} />
      <Card className='max-w-4xl border border-border shadow-xs ring-0'>
        <CardContent className='space-y-6'>
          <>
            <ul className='grid gap-1 text-sm sm:grid-cols-2'>
              {/* The accounts the import will create in the language
                  picked, or those of the import present. */}
              {(
                (!demo.present && demo.accountsByLanguage?.[demoLanguage]) ||
                demo.accounts
              ).map((account) => (
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
            <p className='text-sm'>
              {demo.present
                ? text('demoPresent', {
                    date: localDate(demo.createdAt, language, timeZone),
                    count: demo.records,
                  })
                : text('demoAbsent')}
            </p>
            {/* The business settings the import set, those still at their
                default (server/providers/crm/demo.ts `demoSettings`). */}
            {demo.present && demo.settings?.length ? (
              <p className='text-sm text-muted-foreground'>
                {text('demoSettingsSet', {
                  names: new Intl.ListFormat(language, {
                    type: 'conjunction',
                  }).format(
                    demo.settings.map((key) => toText(text(`fields.${key}`))),
                  ),
                })}
              </p>
            ) : null}
            {!demo.present && (
              <label className='flex items-center gap-3 text-sm'>
                <span className='shrink-0'>{text('demoLanguage')}</span>
                <span className='w-40'>
                  <Choice
                    label={text('demoLanguage')}
                    value={demoLanguage}
                    choices={['zh-CN', 'en-US'].map((v) => ({
                      value: v,
                      label: text(`aiLanguages.${v}`),
                    }))}
                    onChange={(v) => v && setDemoLanguage(v)}
                  />
                </span>
              </label>
            )}
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
        </CardContent>
      </Card>
    </PageContainer>
  );
}
