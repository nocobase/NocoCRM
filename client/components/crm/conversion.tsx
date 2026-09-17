import { recordTitle } from './lookups.js';
import { RecordPicker } from './record-picker.js';
import { toText } from './api.js';
import { useState, type ReactElement, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Checkbox } from '../ui/checkbox.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import { inherited, proposalFor } from './conversion-fields.js';
import { ErrorNotice, Value } from './common.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  useCrmScopeKey,
  useRecord,
  arrayValues,
  type CrmRecord,
  type Data,
  type Entity,
} from './api.js';

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className='space-y-3 rounded-xl border p-4'>
      <h3 className='text-sm font-medium'>{title}</h3>
      {children}
    </section>
  );
}

// A compact "label value" list of the fields that will be written.
export function FieldPreview({
  entity,
  record,
  keys,
  names,
}: {
  entity: Entity;
  record: Data;
  keys: readonly string[];
  names: Record<string, string>;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const field = (key: string) =>
    meta?.definitions[entity].fields.find((f) => f.key === key) ?? { key };
  const present = keys.filter(
    (key) => record[key] != null && record[key] !== '',
  );
  return (
    <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm'>
      {present.map((key) => (
        <div key={key} className='contents'>
          <dt className='text-muted-foreground'>{text(`fields.${key}`)}</dt>
          <dd className='min-w-0 truncate'>
            <Value
              record={record as CrmRecord}
              field={field(key)}
              lookup={names}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ConvertDialog({
  lead,
  onClose,
}: {
  lead: CrmRecord;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const scopeKey = useCrmScopeKey();
  const preview = useCrmQuery<{
    accounts: CrmRecord[];
    contacts: CrmRecord[];
    titles: Record<string, string>;
  }>(`leads/${toText(lead.id)}/conversion`);
  // The list endpoint puts total beside data, not inside it, so this reads
  // the raw response rather than going through useCrmQuery's unwrapping.
  const activities = useQuery({
    queryKey: [...scopeKey, `activities?leadId=${toText(lead.id)}&count`],
    queryFn: () =>
      api<{ total: number }>(`activities?leadId=${toText(lead.id)}&pageSize=1`),
  });
  const [input, setInput] = useState<Data>(() => ({
    accountName: lead.company ?? '',
    createOpportunity: false,
    // "Company + opportunity", per the specification's default.
    opportunityName: `${toText(lead.company ?? lead.name)}${text('opportunitySuffix')}`,
    amount: 0,
  }));
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: unknown): void =>
    setInput((v) => ({
      ...v,
      [key]: value,
      // A different account invalidates the contact choice and any overwrite
      // decisions made against the previous records.
      // Back to "untouched" for the contact, so the new account's own single
      // match can become the default again.
      ...(key === 'accountId'
        ? {
            contactId: undefined,
            overwriteAccountFields: [],
            overwriteContactFields: [],
          }
        : {}),
    }));

  const suggestedAccounts = preview.data?.accounts ?? [];
  // Until the user chooses, exactly one match is taken as the choice: a
  // single strong hit is more likely the same company than a new one, and a
  // wrong guess is one click away from "create new". Zero or several matches
  // leave "create new". `undefined` is untouched; `null` is an explicit new.
  const accountId =
    input.accountId === undefined
      ? suggestedAccounts.length === 1
        ? suggestedAccounts[0].id
        : null
      : input.accountId;
  // The chosen records: a suggestion the preview brought, or one picked by
  // search and read on its own.
  const pickedAccount = useRecord(
    accountId && !suggestedAccounts.some((r) => r.id === accountId)
      ? 'accounts'
      : undefined,
    accountId,
  );
  const account =
    suggestedAccounts.find((r) => r.id === accountId) ??
    (pickedAccount.data?.record?.id === accountId
      ? pickedAccount.data.record
      : undefined);
  const suggestedContacts = (preview.data?.contacts ?? []).filter(
    (c) => !account || c.accountId === account.id,
  );
  const contactId =
    input.contactId === undefined
      ? account && suggestedContacts.length === 1
        ? suggestedContacts[0].id
        : null
      : input.contactId;
  const pickedContact = useRecord(
    contactId && !suggestedContacts.some((r) => r.id === contactId)
      ? 'contacts'
      : undefined,
    contactId,
  );
  const contact =
    suggestedContacts.find((r) => r.id === contactId) ??
    (pickedContact.data?.record?.id === contactId
      ? pickedContact.data.record
      : undefined);
  // Names for the lead, the suggestions and whatever was picked by search.
  const names: Record<string, string> = {
    ...(preview.data?.titles ?? {}),
    ...(pickedAccount.data?.titles ?? {}),
    ...(pickedContact.data?.titles ?? {}),
  };
  // What is actually submitted: the derived choices, not the raw state.
  const resolved: Data = { ...input, accountId, contactId };
  const linkedActivities = activities.data?.total ?? 0;

  // Conflicts: fields where the lead and the chosen record both have a value
  // and disagree; the user opts into each overwrite.
  const conflicts = (
    entity: 'accounts' | 'contacts',
    current: CrmRecord | undefined,
  ): string[] => {
    if (!current) return [];
    const proposed = proposalFor(lead, entity);
    return inherited[entity].filter(
      (key) => current[key] && proposed[key] && current[key] !== proposed[key],
    );
  };

  const modeToggle = (
    entity: 'accounts' | 'contacts',
    canLink: boolean,
  ): ReactElement => {
    const key = entity === 'accounts' ? 'accountId' : 'contactId';
    // Linking without a pick yet is the empty string: the picker is open,
    // nothing chosen. Null is an explicit "create new".
    const linking = resolved[key] !== null && resolved[key] !== undefined;
    return (
      <div className='flex gap-1 rounded-lg border p-0.5'>
        <Button
          type='button'
          size='sm'
          variant={linking ? 'ghost' : 'secondary'}
          onClick={() => set(key, null)}
        >
          {text('newRecord', { entity: text(`entity.${entity}`) })}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={linking ? 'secondary' : 'ghost'}
          disabled={!canLink}
          onClick={() => {
            const first =
              entity === 'accounts'
                ? suggestedAccounts[0]
                : suggestedContacts[0];
            set(key, first ? first.id : '');
          }}
        >
          {text('linkExisting')}
        </Button>
      </div>
    );
  };

  const overwriteList = (
    entity: 'accounts' | 'contacts',
    current: CrmRecord | undefined,
  ): ReactElement | null => {
    const fields = conflicts(entity, current);
    if (!current || !fields.length) return null;
    const key =
      entity === 'accounts'
        ? 'overwriteAccountFields'
        : 'overwriteContactFields';
    const proposed = proposalFor(lead, entity);
    const chosen = arrayValues(input[key]);
    const def = (k: string) =>
      meta?.definitions[entity].fields.find((f) => f.key === k) ?? { key: k };
    return (
      <div className='space-y-2'>
        <p className='text-xs text-muted-foreground'>
          {text('overwriteFields')}
        </p>
        {fields.map((field) => (
          <label key={field} className='flex items-start gap-2 text-sm'>
            <Checkbox
              className='mt-0.5'
              checked={chosen.includes(field)}
              onCheckedChange={(v) =>
                set(
                  key,
                  v ? [...chosen, field] : chosen.filter((x) => x !== field),
                )
              }
            />
            <span className='min-w-0'>
              <span className='text-muted-foreground'>
                {text(`fields.${field}`)}：
              </span>
              <Value record={current} field={def(field)} lookup={names} />
              <span className='mx-1 text-muted-foreground'>→</span>
              <Value
                record={proposed as CrmRecord}
                field={def(field)}
                lookup={names}
              />
            </span>
          </label>
        ))}
      </div>
    );
  };

  const chips = (
    records: CrmRecord[],
    entity: 'accounts' | 'contacts',
  ): ReactElement | null =>
    records.length ? (
      <div className='flex flex-wrap items-center gap-1.5'>
        <span className='text-xs text-muted-foreground'>
          {text('possibleDuplicates')}
        </span>
        {records.map((r) => {
          const key = entity === 'accounts' ? 'accountId' : 'contactId';
          const active = resolved[key] === r.id;
          return (
            <Button
              key={r.id}
              type='button'
              size='sm'
              variant={active ? 'secondary' : 'outline'}
              className='h-7'
              onClick={() => set(key, active ? null : r.id)}
            >
              {recordTitle(entity, r)}
            </Button>
          );
        })}
      </div>
    ) : null;

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className='max-h-[90svh] overflow-y-auto sm:max-w-2xl'
      >
        <DialogHeader>
          <DialogTitle>
            {text('convert')}：{recordTitle('leads', lead)}
          </DialogTitle>
          <DialogDescription>{text('conversionHint')}</DialogDescription>
        </DialogHeader>
        <ErrorNotice error={error ?? preview.error} />
        <form
          className='space-y-4'
          onSubmit={(e) => {
            void (async () => {
              e.preventDefault();
              setBusy(true);
              setError(undefined);
              try {
                await api(`leads/${toText(lead.id)}/convert`, 'POST', resolved);
                await refresh();
                onClose();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <Section title={text('entities.accounts')}>
            <div className='flex flex-wrap items-center gap-3'>
              {modeToggle('accounts', true)}
              {accountId !== null && accountId !== undefined && (
                <div className='min-w-48 flex-1'>
                  <RecordPicker
                    entity='accounts'
                    label={text('entities.accounts')}
                    value={toText(accountId)}
                    titles={names}
                    onChange={(v) => set('accountId', v || null)}
                  />
                </div>
              )}
            </div>
            {chips(suggestedAccounts, 'accounts')}
            {accountId ? (
              overwriteList('accounts', account)
            ) : (
              <>
                <label className='grid gap-1.5 text-sm'>
                  {text('newAccountName')}
                  <Input
                    required
                    value={toText(input.accountName)}
                    onChange={(e) => set('accountName', e.target.value)}
                  />
                </label>
                <FieldPreview
                  entity='accounts'
                  record={{
                    ...proposalFor(lead, 'accounts'),
                    name: undefined,
                  }}
                  keys={inherited.accounts}
                  names={names}
                />
              </>
            )}
          </Section>

          <Section title={text('entities.contacts')}>
            <div className='flex flex-wrap items-center gap-3'>
              {modeToggle('contacts', Boolean(account))}
              {contactId !== null && contactId !== undefined && (
                <div className='min-w-48 flex-1'>
                  <RecordPicker
                    entity='contacts'
                    bare
                    label={text('entities.contacts')}
                    value={toText(contactId)}
                    titles={names}
                    filter={
                      account ? { accountId: toText(account.id) } : undefined
                    }
                    onChange={(v) => set('contactId', v || null)}
                  />
                </div>
              )}
            </div>
            {chips(suggestedContacts, 'contacts')}
            {contactId ? (
              overwriteList('contacts', contact)
            ) : (
              <FieldPreview
                entity='contacts'
                record={proposalFor(lead, 'contacts')}
                keys={inherited.contacts}
                names={names}
              />
            )}
          </Section>

          <Section title={text('entities.opportunities')}>
            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={Boolean(input.createOpportunity)}
                onCheckedChange={(v) => set('createOpportunity', v === true)}
              />
              {text('createOpportunity')}
            </label>
            {input.createOpportunity === true && (
              <div className='grid gap-3 sm:grid-cols-[1fr_auto]'>
                <label className='grid gap-1.5 text-sm'>
                  {text('fields.name')}
                  <Input
                    required
                    value={toText(input.opportunityName ?? '')}
                    onChange={(e) => set('opportunityName', e.target.value)}
                  />
                </label>
                <label className='grid gap-1.5 text-sm'>
                  {text('fields.amount')}（{meta?.settings.currency}）
                  <Input
                    type='number'
                    min='0'
                    step='0.01'
                    className='w-36'
                    value={Number(input.amount)}
                    onChange={(e) => set('amount', Number(e.target.value))}
                  />
                </label>
              </div>
            )}
          </Section>

          <p className='text-xs text-muted-foreground'>
            {text('conversionImpact', { activities: linkedActivities })}
          </p>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={busy}
              onClick={onClose}
            >
              {text('cancel')}
            </Button>
            <Button
              type='submit'
              // Linking was chosen but nothing picked yet: nothing to submit.
              disabled={busy || accountId === '' || contactId === ''}
            >
              {busy ? text('saving') : text('convert')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
