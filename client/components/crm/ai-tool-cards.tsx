import { useState, type ReactElement, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CircleAlert, LoaderCircle, Sparkles } from 'lucide-react';
import type { AIToolRendererProps } from '@/extensions/nocobase-ai';
import { useAITranslate } from '@/extensions/nocobase-ai/locales/use-ai-translate.js';
import { Button } from '../ui/button.js';
import { ErrorNotice } from './common.js';
import { InlineField } from './inline.js';
import {
  fieldLabelKey,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Data,
  type Entity,
  type Field,
  type ListData,
} from './api.js';

// The cards the CRM's write tools show in the conversation. The plugin
// holds each call until the user allows it; these render the proposal the
// way a form would — every value labelled, codes as their option labels,
// ids as record names — because the card is what the user confirms, and a
// value they cannot read is one they cannot have agreed to. They handle
// the approval themselves (standalone, handlesApproval) so the values and
// the buttons sit together instead of behind the generic card's fold.

type WriteTool =
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'convert_lead'
  | 'approval_action';

const object = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : {};

// The conversion request's own keys, which are not lead fields.
const convertFields: Record<string, Field> = {
  accountId: { key: 'accountId', type: 'relation', relation: 'accounts' },
  accountName: { key: 'accountName', type: 'text' },
  contactId: { key: 'contactId', type: 'relation', relation: 'contacts' },
  createOpportunity: { key: 'createOpportunity', type: 'boolean' },
  opportunityName: { key: 'opportunityName', type: 'text' },
  amount: { key: 'amount', type: 'number' },
};

// The error text of a refused call is the CRM's error body (server/ai/tools);
// anything else is shown as a plain failure with the text as its detail.
function parseFailure(errorText: unknown): {
  code: string;
  field?: string;
  detail?: string;
} {
  const raw = toText(errorText ?? '');
  try {
    const parsed = object(JSON.parse(raw));
    if (parsed.error)
      return {
        code: toText(parsed.error),
        field: parsed.field ? toText(parsed.field) : undefined,
        detail: parsed.detail ? toText(parsed.detail) : undefined,
      };
  } catch {
    // Not the CRM's body; fall through.
  }
  return { code: 'serverError', detail: raw || undefined };
}

function toolName(part: AIToolRendererProps['part']): string {
  return part.type === 'dynamic-tool' ? part.toolName : part.type.slice(5);
}

function metadataOf(part: AIToolRendererProps['part']): Data {
  return 'callProviderMetadata' in part
    ? object(part.callProviderMetadata?.nocobase)
    : {};
}

// The names of the records a proposal points at (an account, a contact, a
// lead), read in one request per object so the rows show names rather than
// ids; users come from the metadata the pages already hold.
function useNames(
  values: Data,
  fieldOf: (key: string) => Field,
): Record<string, string> {
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const wanted: Partial<Record<Entity, string[]>> = {};
  for (const [key, value] of Object.entries(values)) {
    const relation = fieldOf(key).relation;
    if (!relation || relation === 'users') continue;
    for (const id of Array.isArray(value) ? value : [value])
      if (toText(id)) (wanted[relation] ??= []).push(toText(id));
  }
  const query = Object.entries(wanted)
    .map(
      ([entity, ids]) =>
        `${entity}?ids=${encodeURIComponent(ids.join(','))}&pageSize=${ids.length}`,
    )
    .sort();
  const names = useQuery({
    queryKey: [...scopeKey, 'names', ...query],
    queryFn: async () =>
      Object.assign(
        {},
        ...(await Promise.all(
          query.map((path) => api<ListData>(path).then((r) => r.names)),
        )),
      ) as Record<string, string>,
    enabled: query.length > 0,
    staleTime: 20000,
  });
  return {
    ...Object.fromEntries((meta?.users ?? []).map((u) => [u.id, u.name])),
    ...(names.data ?? {}),
  };
}

// The proposal's values, one labelled row each, rendered and edited by the
// same InlineField the detail pages use: a code reads as its option label,
// a country as its name, an id as the record's name, and a wrong guess is
// corrected in place before confirming.
function Rows({
  entity,
  values,
  fields,
  editable,
  onChange,
}: {
  entity: Entity;
  values: Data;
  fields?: Record<string, Field>;
  editable: boolean;
  onChange: (key: string, value: unknown) => void;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  // A key the model proposed may not be in the schema at all; fall back to
  // plain text so it still renders instead of throwing.
  const fieldOf = (key: string): Field =>
    fields?.[key] ??
    meta?.definitions[entity]?.fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  const names = useNames(values, fieldOf);
  const entries = Object.entries(values);
  if (!entries.length) return null;
  return (
    <dl className='space-y-0'>
      {entries.map(([key]) => {
        const label = toText(
          text(fieldLabelKey(entity, key), { defaultValue: key }),
        );
        return (
          <div key={key} className='flex items-start gap-3 text-sm'>
            <dt className='w-24 shrink-0 pt-1.5 text-muted-foreground'>
              {label}
            </dt>
            <dd className='-mx-2 min-w-0 flex-1'>
              <InlineField
                entity={entity}
                record={values as CrmRecord}
                field={fieldOf(key)}
                label={label}
                lookup={names}
                editable={editable}
                plain
                onSave={async (value) => onChange(key, value)}
              />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// What the proposal would write, per tool.
function Proposal({
  tool,
  input,
  editable,
  onChange,
}: {
  tool: WriteTool;
  input: Data;
  editable: boolean;
  // Writes one value into the draft: a field of the record for a create or
  // update, a key of the conversion request or of its account / contact
  // overrides for a conversion.
  onChange: (path: string[], value: unknown) => void;
}): ReactElement | null {
  const { text } = useCrmText();
  const entity = toText(input.entity) as Entity;
  if (tool === 'create_record' || tool === 'update_record')
    return (
      <Rows
        entity={entity}
        values={object(input.input)}
        editable={editable}
        onChange={(key, value) => onChange(['input', key], value)}
      />
    );
  if (tool === 'delete_record')
    return (
      <p className='text-sm text-muted-foreground'>{text('toolCard.delete')}</p>
    );
  if (tool === 'convert_lead') {
    const {
      id: _id,
      title: _t,
      assumptions: _a,
      account,
      contact,
      ...rest
    } = input;
    return (
      <div className='space-y-2'>
        <Rows
          entity='leads'
          values={rest}
          fields={convertFields}
          editable={editable}
          onChange={(key, value) => onChange([key], value)}
        />
        {Object.keys(object(account)).length ? (
          <div>
            <p className='mb-1 text-xs font-medium text-muted-foreground'>
              {text('entities.accounts')}
            </p>
            <Rows
              entity='accounts'
              values={object(account)}
              editable={editable}
              onChange={(key, value) => onChange(['account', key], value)}
            />
          </div>
        ) : null}
        {Object.keys(object(contact)).length ? (
          <div>
            <p className='mb-1 text-xs font-medium text-muted-foreground'>
              {text('entities.contacts')}
            </p>
            <Rows
              entity='contacts'
              values={object(contact)}
              editable={editable}
              onChange={(key, value) => onChange(['contact', key], value)}
            />
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <dl className='space-y-1 text-sm'>
      <div className='flex items-start gap-3'>
        <dt className='w-24 shrink-0 text-muted-foreground'>
          {text('fields.decision')}
        </dt>
        <dd>
          {text(toText(input.action), { defaultValue: toText(input.action) })}
        </dd>
      </div>
      {input.comment ? (
        <div className='flex items-start gap-3'>
          <dt className='w-24 shrink-0 text-muted-foreground'>
            {text('fields.comment')}
          </dt>
          <dd className='min-w-0 break-words'>{toText(input.comment)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function operationLabel(tool: WriteTool, input: Data): string {
  switch (tool) {
    case 'create_record':
      return 'create';
    case 'update_record':
      return 'update';
    case 'delete_record':
      return 'delete';
    case 'convert_lead':
      return 'convert';
    default:
      return toText(input.action) || 'approve';
  }
}

function entityOf(tool: WriteTool, input: Data): Entity {
  if (tool === 'convert_lead') return 'leads';
  if (tool === 'approval_action') return 'approvals';
  return toText(input.entity) as Entity;
}

export function CrmWriteCard({
  part,
  disabled,
  onApprove,
  onEdit,
  onReject,
}: AIToolRendererProps): ReactElement {
  const { text } = useCrmText();
  const t = useAITranslate();
  const tool = toolName(part) as WriteTool;
  const proposed = object(part.input);
  const metadata = metadataOf(part);
  const [action, setAction] = useState<'approve' | 'reject'>();
  const [decided, setDecided] = useState(false);
  // The user's corrections to the proposal, kept here until they confirm;
  // confirming an edited proposal hands the plugin the edited values. The
  // draft remembers which proposal it corrects, so a new input drops it.
  const [edited, setEdited] = useState<{ of: string; value: Data }>();
  const draft =
    edited && edited.of === part.toolCallId ? edited.value : undefined;
  // Once run, the tool reports the values as written (the user may have
  // corrected the proposal), and that is what a settled card shows.
  const written =
    part.state === 'output-available'
      ? object(object(part.output).values)
      : undefined;
  const input =
    written && Object.keys(written).length
      ? tool === 'create_record' || tool === 'update_record'
        ? { ...proposed, input: written }
        : { ...proposed, ...written }
      : (draft ?? proposed);
  const edit = (path: string[], value: unknown): void => {
    const next: Data = { ...input };
    let cursor = next;
    for (const key of path.slice(0, -1)) {
      const child = { ...object(cursor[key]) };
      cursor[key] = child;
      cursor = child;
    }
    const last = path.at(-1) ?? '';
    if (value === null || value === undefined) delete cursor[last];
    else cursor[last] = value;
    setEdited({ of: part.toolCallId, value: next });
  };
  const entity = entityOf(tool, input);
  // The plugin holds the call while the user decides; once allowed it runs
  // and the part carries the tool's own result.
  const awaiting =
    metadata.requiresApproval === true &&
    part.state === 'input-available' &&
    (metadata.invokeStatus === undefined ||
      metadata.invokeStatus === 'interrupted') &&
    !decided;
  // Allowed and run: the part carries what the tool returned (the record
  // written) or, for a refusal, the CRM's error body as the error text.
  // A confirmed call whose result the plugin did not relay shows as
  // confirmed rather than done.
  const result =
    part.state === 'output-available' ? object(part.output) : undefined;
  const succeeded = result !== undefined && Object.keys(result).length > 0;
  const confirmed =
    part.state === 'output-available' &&
    !succeeded &&
    metadata.invokeStatus === 'confirmed';
  const failure =
    part.state === 'output-error' ? parseFailure(part.errorText) : undefined;
  const assumptions = Array.isArray(input.assumptions)
    ? input.assumptions.map(toText).filter(Boolean)
    : [];
  const decide = async (
    next: 'approve' | 'reject',
    run: () => void | Promise<void>,
  ): Promise<void> => {
    setAction(next);
    try {
      await run();
      setDecided(true);
    } finally {
      setAction(undefined);
    }
  };
  let status: ReactNode;
  if (part.state === 'input-streaming')
    status = (
      <>
        <LoaderCircle className='size-3.5 animate-spin' />
        {t('tool.status.preparing', 'Preparing')}
      </>
    );
  else if (awaiting)
    status = (
      <>
        <Sparkles className='size-3.5 text-ai' />
        {text('toolCard.awaiting')}
      </>
    );
  else if (succeeded)
    status = (
      <>
        <Check className='size-3.5 text-primary' />
        {text('toolCard.done')}
      </>
    );
  else if (confirmed)
    status = (
      <>
        <Check className='size-3.5 text-primary' />
        {text('toolCard.confirmed')}
      </>
    );
  else if (failure)
    status = (
      <>
        <CircleAlert className='size-3.5 text-destructive' />
        {text('toolCard.failed')}
      </>
    );
  else if (decided && action === undefined)
    status = (
      <>
        <LoaderCircle className='size-3.5 animate-spin' />
        {t('tool.status.running', 'Running')}
      </>
    );
  else
    status = (
      <>
        <CircleAlert className='size-3.5' />
        {t('tool.status.denied', 'Denied')}
      </>
    );
  return (
    // The pending card asks for a decision and carries the AI tint; a
    // settled one drops back to the neutral surface.
    <div
      className={`rounded-lg border p-3 ${awaiting ? 'border-ai/30 bg-ai/5' : 'bg-background'}`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-sm font-medium'>
            {toText(input.title) || t('tool.input', 'Input')}
          </p>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            {text(`entities.${entity}`, { defaultValue: entity })} ·{' '}
            {text(operationLabel(tool, input), {
              defaultValue: operationLabel(tool, input),
            })}
          </p>
        </div>
        <span className='flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground'>
          {status}
        </span>
      </div>
      {assumptions.length ? (
        <div className='mt-3 rounded-md bg-background/70 p-2.5 text-xs'>
          <p className='mb-1 font-medium'>{text('assumptions')}</p>
          <ul className='list-inside list-disc space-y-0.5'>
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className='mt-3'>
        <Proposal
          tool={tool}
          input={input}
          editable={awaiting && !disabled && action === undefined}
          onChange={edit}
        />
      </div>
      {failure ? (
        <div className='mt-3'>
          <ErrorNotice error={failure} />
        </div>
      ) : null}
      {succeeded && result?.name ? (
        <p className='mt-3 text-xs text-muted-foreground'>
          {text(`entities.${toText(result.entity)}`, {
            defaultValue: toText(result.entity),
          })}
          {' · '}
          {toText(result.name)}
        </p>
      ) : null}
      {awaiting ? (
        <div className='mt-3 flex items-center justify-between gap-3 border-t pt-3'>
          <p className='text-xs text-muted-foreground'>
            {text('toolCard.confirmHint')}
          </p>
          <div className='flex shrink-0 gap-2'>
            <Button
              variant='ghost'
              size='sm'
              disabled={disabled || action !== undefined}
              onClick={() =>
                void decide('reject', () =>
                  onReject(
                    'The user denied this change. Do not call this tool again with the same values; ask what to change instead.',
                  ),
                )
              }
            >
              {action === 'reject' ? '…' : t('actions.deny', 'Deny')}
            </Button>
            <Button
              size='sm'
              className='bg-ai text-ai-foreground hover:bg-ai/90'
              disabled={disabled || action !== undefined}
              onClick={() =>
                void decide('approve', () =>
                  draft ? onEdit(draft) : onApprove(),
                )
              }
            >
              {action === 'approve' ? '…' : text('confirm')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
