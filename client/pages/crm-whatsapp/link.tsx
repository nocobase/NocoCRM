import { ApiClientError, useToaster } from '@nocobase/app-client';
import { useRef, useState, type ReactElement } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#components/ui/field';
import { RadioGroup, RadioGroupItem } from '#components/ui/radio-group';
import {
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
} from '../../components/crm/api.js';
import { RecordPicker } from '../../components/crm/record-picker.js';
import type { Conversation } from '../../components/crm/whatsapp/api.js';
import { FormDialog } from '../settings/common/shared.js';
import type { ConversationContext } from './conversation.js';

// Link a WhatsApp customer to a lead or a contact (…/:conversationId/link),
// or change the link: opened from the conversation's header, prefilled with
// the current link when changing it. The list offers the records the reader
// may read; one they may not edit is refused by the server, and the dialog
// says so (the list API has no edit filter).

const FORM_ID = 'crm-whatsapp-link';

export default function LinkConversationDialog(): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { conversation, settle, focusName } =
    useOutletContext<ConversationContext>();
  const { contact, record } = conversation;
  const changing = contact.state === 'linked';
  // A customer from an unknown number is most often a new enquiry: a lead
  // first, unless they are linked to a contact already.
  const [entity, setEntity] = useState<'leads' | 'contacts'>(
    record?.entity ?? 'leads',
  );
  const [picked, setPicked] = useState<{ id: string; name: string }>(
    record ? { id: record.id, name: record.name } : { id: '', name: '' },
  );
  const [missing, setMissing] = useState(false);
  const [rootError, setRootError] = useState<string>();
  const pickerRef = useRef<HTMLDivElement>(null);
  const label = toText(
    text(entity === 'leads' ? 'whatsapp.lead' : 'whatsapp.contact'),
  );

  async function submit(): Promise<boolean> {
    if (!picked.id) {
      setMissing(true);
      // The picker's trigger, named by its label.
      pickerRef.current?.querySelector<HTMLElement>('[aria-label]')?.focus();
      return false;
    }
    setRootError(undefined);
    try {
      const { data } = await api<{ data: Conversation }>(
        `whatsapp/conversations/${encodeURIComponent(conversation.id)}/link`,
        'POST',
        entity === 'leads' ? { leadId: picked.id } : { contactId: picked.id },
      );
      settle(data);
      toaster.show({
        type: 'success',
        title: toText(
          text('whatsapp.linked', { name: data.record?.name ?? picked.name }),
        ),
      });
      focusName();
      return true;
    } catch (error) {
      const status = error instanceof ApiClientError ? error.status : 0;
      // A 404 is the record picked or the conversation itself: asked once
      // more, a conversation that is gone closes the dialog and the list
      // shows without it (R3).
      if (
        status === 404 &&
        (await api(
          `whatsapp/conversations/${encodeURIComponent(conversation.id)}?pageSize=1`,
        ).then(
          () => false,
          (again: unknown) =>
            again instanceof ApiClientError && again.status === 404,
        ))
      ) {
        toaster.show({ type: 'error', title: toText(text('whatsapp.gone')) });
        settle();
        void navigate({
          pathname: '/whatsapp',
          search: params.toString() ? `?${params.toString()}` : '',
        });
        return false;
      }
      setRootError(
        toText(
          text(
            status === 403 || status === 404
              ? 'whatsapp.linkFailed'
              : 'errors.serverError',
          ),
        ),
      );
      return false;
    }
  }

  return (
    <FormDialog
      title={toText(text(changing ? 'whatsapp.changeLink' : 'whatsapp.link'))}
      formId={FORM_ID}
      submitLabel={toText(text('whatsapp.linkSubmit'))}
      submit={submit}
      rootError={rootError}
    >
      <Field>
        <FieldLabel id={`${FORM_ID}-to`}>{text('whatsapp.linkTo')}</FieldLabel>
        <RadioGroup
          aria-labelledby={`${FORM_ID}-to`}
          value={entity}
          onValueChange={(value) => {
            const next = value === 'leads' ? 'leads' : 'contacts';
            setEntity(next);
            // Back on the current link's kind, its record again.
            setPicked(
              record?.entity === next
                ? { id: record.id, name: record.name }
                : { id: '', name: '' },
            );
            setMissing(false);
          }}
          className='flex gap-6'
        >
          {(['leads', 'contacts'] as const).map((value) => (
            <label key={value} className='flex items-center gap-2 text-sm'>
              <RadioGroupItem value={value} />
              {text(value === 'leads' ? 'whatsapp.lead' : 'whatsapp.contact')}
            </label>
          ))}
        </RadioGroup>
      </Field>
      <Field data-invalid={missing || undefined}>
        <FieldLabel>
          {label}
          <span aria-hidden className='text-destructive'>
            *
          </span>
        </FieldLabel>
        <div ref={pickerRef}>
          <RecordPicker
            key={entity}
            entity={entity}
            excludeStatus={entity === 'leads' ? 'converted,invalid' : undefined}
            value={picked.id}
            titles={picked.id ? { [picked.id]: picked.name } : {}}
            label={label}
            onChange={(id, chosen) => {
              setPicked({ id, name: toText(chosen?.name ?? '') });
              setMissing(false);
            }}
          />
        </div>
        {missing ? (
          <FieldError>
            {text(
              entity === 'leads'
                ? 'whatsapp.chooseLead'
                : 'whatsapp.chooseContact',
            )}
          </FieldError>
        ) : null}
        {entity === 'contacts' && picked.id ? (
          <ContactReach id={picked.id} />
        ) : null}
      </Field>
    </FormDialog>
  );
}

// Where a contact's messages go besides the contact: its company's timeline
// and those of the deals naming it (the service's targetsOf), said before
// linking so the choice is an informed one.
function ContactReach({ id }: { id: string }): ReactElement | null {
  const { text } = useCrmText();
  const { data } = useCrmQuery<{
    record: { companyId?: string | null };
    names?: Record<string, string>;
    related?: { opportunities?: unknown[] };
    relatedTotals?: { opportunities?: number };
  }>(`contacts/${encodeURIComponent(id)}`);
  if (!data) return null;
  const companyId = data.record.companyId;
  const company = companyId ? data.names?.[companyId] : undefined;
  const deals =
    data.relatedTotals?.opportunities ??
    data.related?.opportunities?.length ??
    0;
  if (!company && !deals) return null;
  return (
    <FieldDescription>
      {text(
        company && deals
          ? 'whatsapp.reach.companyAndDeals'
          : company
            ? 'whatsapp.reach.company'
            : 'whatsapp.reach.deals',
        { company, count: deals },
      )}
    </FieldDescription>
  );
}
