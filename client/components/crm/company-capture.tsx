import { useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router';
import { Globe, Sparkles } from 'lucide-react';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { ErrorNotice } from './common.js';
import { RecordForm } from './form.js';
import { CaptureTabs } from './lead-capture.js';
import {
  fieldLabelKey,
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type Data,
} from './api.js';
import { captureLabels } from './capture-labels.js';
import { WorkAgentLabel } from './work-agent.js';

// The fields the web look-up fills (PROFILE_FIELDS in
// server/providers/crm/company-profile.ts), whose labels it is sent.
const PROFILE_FIELDS = [
  'name',
  'website',
  'linkedin',
  'industry',
  'employees',
  'annualRevenue',
  'currency',
  'country',
  'state',
  'city',
  'address',
  'description',
];

// "New company" with the AI (server/providers/crm/company-profile.ts): the
// person names the company, adds what they know if they like, and the
// Company signals agent looks it up on the web, filling the company form
// with what it finds: its website, industry, size, revenue, headquarters
// and an introduction, beside the pages it read and the companies already
// in the CRM by that name. Nothing is saved until the person creates it.

interface Profile {
  input: Data;
  uncertain: string[];
  sources: { title: string; url: string; site: string }[];
  duplicates: { id: string; name: string }[];
}
const SELLER_ROLES = ['sales-representative', 'sales-manager'];
// What the form keeps of the company.
const FIELDS = [
  'name',
  'ownerId',
  'source',
  'status',
  'type',
  'industry',
  'employees',
  'annualRevenue',
  'currency',
  'country',
  'state',
  'city',
  'address',
  'website',
  'linkedin',
  'description',
];

export function CompanyCaptureDialog({
  draft,
  onDraft,
  onClose,
  onForm,
}: {
  // The company named and what was added, kept by the page while the user
  // switches to the form and back.
  draft: { name: string; note: string };
  onDraft: (draft: { name: string; note: string }) => void;
  onClose: () => void;
  onForm: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const { data: meta } = useMetadata();
  const [busy, setBusy] = useState<'search' | 'create'>();
  const [error, setError] = useState<unknown>();
  const [profile, setProfile] = useState<Profile>();
  const [input, setInput] = useState<Data>({});
  const [revision, setRevision] = useState(0);
  const required = (meta?.definitions.companies.fields ?? [])
    .filter((f) => f.required && FIELDS.includes(f.key))
    .map((f) => f.key);
  const missing = required.filter(
    (key) =>
      input[key] === undefined || input[key] === null || input[key] === '',
  );
  // A new company's owner is the reader when they sell, as in the form.
  const defaults: Data = {
    status: 'prospect',
    ...(meta?.users.some(
      (u) =>
        u.id === meta.userId && u.roles.some((r) => SELLER_ROLES.includes(r)),
    )
      ? { ownerId: meta.userId }
      : {}),
  };

  const search = async (): Promise<void> => {
    if (!draft.name.trim() || busy) return;
    setBusy('search');
    setError(undefined);
    try {
      const { data } = await api<{ data: Profile }>(
        'companies/capture',
        'POST',
        {
          name: draft.name.trim(),
          ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
          labels: captureLabels(
            'companies',
            PROFILE_FIELDS,
            meta?.definitions.companies.fields ?? [],
            meta?.settings.options ?? {},
            text,
          ),
        },
      );
      setProfile(data);
      setInput({
        ...defaults,
        name: draft.name.trim(),
        ...data.input,
      });
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(undefined);
    }
  };

  const create = async (): Promise<void> => {
    if (!profile || missing.length || busy) return;
    setBusy('create');
    setError(undefined);
    try {
      const payload = Object.fromEntries(
        FIELDS.filter(
          (key) =>
            input[key] !== undefined &&
            input[key] !== null &&
            input[key] !== '',
        ).map((key) => [key, input[key]]),
      );
      const { data } = await api<{ data: CrmRecord }>(
        'companies',
        'POST',
        payload,
      );
      await refresh();
      onClose();
      void navigate(`/companies/${toText(data.id)}`);
    } catch (e) {
      setError(e);
      setBusy(undefined);
    }
  };

  const join = (items: string[]): string =>
    items.join(language.startsWith('zh') ? '、' : ', ');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`max-h-[90svh] overflow-y-auto ${
          // Before the search, wide enough for the title, the tabs and the
          // agent's name on one line.
          profile ? 'sm:max-w-6xl' : 'sm:max-w-[44rem]'
        }`}
      >
        <DialogHeader>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <DialogTitle>
              {text('newRecord', { entity: text('entity.companies') })}
            </DialogTitle>
            <CaptureTabs
              current='ai'
              disabled={Boolean(busy)}
              onSwitch={onForm}
            />
            <WorkAgentLabel work='signals' className='ml-auto' />
          </div>
        </DialogHeader>
        {!profile ? (
          <div className='grid gap-4'>
            <ErrorNotice error={error} />
            <div className='grid gap-2'>
              <Label htmlFor='company-capture-name'>
                {text('companyCapture.name')}
              </Label>
              <Input
                id='company-capture-name'
                autoFocus
                value={draft.name}
                maxLength={255}
                disabled={Boolean(busy)}
                placeholder={toText(text('companyCapture.namePlaceholder'))}
                onChange={(e) => onDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void search();
                  }
                }}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='company-capture-note'>
                {text('companyCapture.note')}
              </Label>
              <Textarea
                id='company-capture-note'
                value={draft.note}
                maxLength={1000}
                className='min-h-20'
                disabled={Boolean(busy)}
                placeholder={toText(text('companyCapture.notePlaceholder'))}
                onChange={(e) => onDraft({ ...draft, note: e.target.value })}
              />
            </div>
            <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Globe className='size-3.5 shrink-0' />
              {text(
                busy === 'search'
                  ? 'companyCapture.searching'
                  : 'companyCapture.searchHint',
              )}
            </p>
            <DialogFooter>
              <Button
                variant='outline'
                disabled={Boolean(busy)}
                onClick={onClose}
              >
                {text('cancel')}
              </Button>
              <Button
                className='bg-primary text-primary-foreground hover:bg-primary/90'
                disabled={Boolean(busy) || !draft.name.trim()}
                onClick={() => void search()}
              >
                {busy ? <Spinner /> : <Sparkles />}
                {text(busy ? 'leadCapture.organising' : 'leadCapture.organise')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className='grid gap-4'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start'>
              <div className='grid min-w-0 gap-3'>
                <RecordForm
                  key={revision}
                  entity='companies'
                  initial={input}
                  review={profile.uncertain}
                  notice={(unfilled) => (
                    <div className='grid gap-1 rounded-lg bg-primary/10 p-3 text-sm'>
                      <p className='flex gap-2'>
                        <Sparkles className='mt-0.5 size-4 shrink-0 text-primary' />
                        <span>
                          {text('companyCapture.filledNotice')}
                          {unfilled.length > 0 && (
                            <>
                              {language.startsWith('zh') ? '' : ' '}
                              <span className='font-medium text-warning'>
                                {text('leadCapture.fillRequired', {
                                  fields: join(
                                    unfilled.map((key) =>
                                      text(fieldLabelKey('companies', key)),
                                    ),
                                  ),
                                })}
                              </span>
                            </>
                          )}
                        </span>
                      </p>
                      {profile.duplicates.length > 0 && (
                        <p className='text-warning'>
                          {text('companyCapture.duplicates')}{' '}
                          {profile.duplicates.map((d, index) => (
                            <span key={d.id}>
                              {index > 0 &&
                                (language.startsWith('zh') ? '、' : ', ')}
                              <Link
                                to={`/companies/${d.id}`}
                                target='_blank'
                                className='underline underline-offset-2'
                              >
                                {d.name}
                              </Link>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  )}
                  embedded={{ onChange: setInput }}
                  onClose={() => undefined}
                />
              </div>
              {/* Where it came from: the pages the search read, each opening
                  in a new tab, and the name searched for, to search again. */}
              <aside className='grid content-start gap-3 rounded-lg border bg-muted/30 p-3 md:sticky md:top-0'>
                <div className='grid gap-1.5'>
                  <h3 className='flex items-center gap-1.5 text-sm font-medium'>
                    <Globe className='size-4 text-muted-foreground' />
                    {text('companyCapture.sources')}
                  </h3>
                  {profile.sources.length ? (
                    <ul className='grid gap-1.5'>
                      {profile.sources.map((source) => (
                        <li key={source.url} className='min-w-0 text-sm'>
                          <a
                            href={source.url}
                            target='_blank'
                            rel='noreferrer noopener'
                            className='line-clamp-2 underline-offset-2 hover:underline'
                            title={source.url}
                          >
                            {source.title}
                          </a>
                          <span className='text-xs text-muted-foreground'>
                            {source.site}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      {text('companyCapture.noSources')}
                    </p>
                  )}
                </div>
                <div className='grid gap-2 pt-3'>
                  <Label htmlFor='company-capture-again'>
                    {text('companyCapture.name')}
                  </Label>
                  <Input
                    id='company-capture-again'
                    value={draft.name}
                    maxLength={255}
                    disabled={Boolean(busy)}
                    className='bg-background'
                    onChange={(e) =>
                      onDraft({ ...draft, name: e.target.value })
                    }
                  />
                  <Button
                    size='sm'
                    variant='outline'
                    className='justify-self-end text-primary hover:text-primary'
                    disabled={Boolean(busy) || !draft.name.trim()}
                    onClick={() => void search()}
                  >
                    {busy === 'search' ? <Spinner /> : <Sparkles />}
                    {text('companyCapture.searchAgain')}
                  </Button>
                </div>
              </aside>
            </div>
            <ErrorNotice error={error} />
            <DialogFooter>
              <Button
                variant='outline'
                disabled={Boolean(busy)}
                onClick={onClose}
              >
                {text('cancel')}
              </Button>
              <Button
                disabled={Boolean(busy) || missing.length > 0}
                onClick={() => void create()}
              >
                {busy === 'create' && <Spinner />}
                {text('companyCapture.create')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
