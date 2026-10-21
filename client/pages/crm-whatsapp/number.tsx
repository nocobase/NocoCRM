import { useToaster } from '@nocobase/app-client';
import { useState, type ReactElement } from 'react';
import { useOutletContext, useParams } from 'react-router';
import { Badge } from '#components/ui/badge';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '#components/ui/field';
import { RadioGroup, RadioGroupItem } from '#components/ui/radio-group';
import {
  errorCode,
  toText,
  useCrmApi,
  useCrmText,
} from '../../components/crm/api.js';
import { FormDialog, TextField } from '../settings/common/shared.js';
import type { Connection, ConnectionContext } from './connection.js';

// Add a WhatsApp number (/whatsapp/connection/numbers/new) or change one
// (…/numbers/:numberId), over the connection page: Meta's ids for it, how it
// is connected (coexistence, the number staying in the WhatsApp Business
// app, or the Cloud API alone) and its access token, sealed on the server
// and left empty to keep it. No one is assigned to its customers: replies
// are made on WhatsApp.

const FORM_ID = 'crm-whatsapp-number';
const MODES = ['coexistence', 'api'] as const;

interface Values {
  phoneNumberId: string;
  wabaId: string;
  mode: (typeof MODES)[number];
  accessToken: string;
}
type Errors = Partial<Record<'phoneNumberId' | 'accessToken', string>>;

export default function WhatsAppNumberDialog(): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const { numberId } = useParams();
  const { connection, saved } = useOutletContext<ConnectionContext>();
  const number = numberId
    ? connection.numbers.find((n) => n.id === numberId)
    : undefined;
  const [values, setValues] = useState<Values>(() => ({
    phoneNumberId: number?.phoneNumberId ?? '',
    wabaId: number?.wabaId ?? '',
    mode: number?.mode === 'api' ? 'api' : 'coexistence',
    accessToken: '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [rootError, setRootError] = useState<string>();
  const validate = (next: Values): Errors => {
    const found: Errors = {};
    if (!/^\d{5,32}$/.test(next.phoneNumberId.trim()))
      found.phoneNumberId = toText(text('whatsappSettings.phoneInvalid'));
    if (!number?.hasAccessToken && !next.accessToken.trim())
      found.accessToken = toText(text('whatsappSettings.enterToken'));
    return found;
  };
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // After a failed save a field is checked again as it changes (T3.3).
    if (submitted) setErrors(validate(next));
  };
  const focus = (field: keyof Errors) =>
    document.getElementById(`${FORM_ID}-${field}`)?.focus();
  const submit = async (): Promise<boolean> => {
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    const first = (['phoneNumberId', 'accessToken'] as const).find(
      (key) => found[key],
    );
    if (first) {
      focus(first);
      return false;
    }
    setRootError(undefined);
    const body = {
      phoneNumberId: values.phoneNumberId.trim(),
      wabaId: values.wabaId.trim() || null,
      mode: values.mode,
      ...(values.accessToken.trim()
        ? { accessToken: values.accessToken.trim() }
        : {}),
    };
    try {
      const { data } = await api<{ data: Connection }>(
        number
          ? `whatsapp/numbers/${encodeURIComponent(number.id)}`
          : 'whatsapp/numbers',
        number ? 'PUT' : 'POST',
        body,
      );
      saved(data);
      toaster.show({
        type: 'success',
        title: toText(
          text(
            number
              ? 'whatsappSettings.numberSaved'
              : 'whatsappSettings.numberAdded',
          ),
        ),
      });
      return true;
    } catch (error) {
      const { code, field } = errorCode(error);
      if (field === 'phoneNumberId') {
        setErrors({
          phoneNumberId: toText(
            text(
              code === 'numberExists'
                ? 'errors.numberExists'
                : 'whatsappSettings.phoneInvalid',
            ),
          ),
        });
        focus('phoneNumberId');
      } else
        setRootError(
          toText(
            text(`errors.${code}`, {
              defaultValue: text('errors.serverError'),
            }),
          ),
        );
      return false;
    }
  };
  return (
    <FormDialog
      title={text(
        number ? 'whatsappSettings.editNumber' : 'whatsappSettings.addNumber',
      )}
      className='sm:max-w-lg'
      formId={FORM_ID}
      submitLabel={text('whatsappSettings.save')}
      submit={submit}
      rootError={rootError}
      blocked={
        numberId && !number ? (
          <p className='text-sm text-muted-foreground'>
            {text('errors.notFound')}
          </p>
        ) : undefined
      }
    >
      <TextField
        formId={FORM_ID}
        name='phoneNumberId'
        label={toText(text('whatsappSettings.phoneNumberId'))}
        required
        maxLength={32}
        value={values.phoneNumberId}
        onChange={(value) => set('phoneNumberId', value)}
        error={errors.phoneNumberId}
      />
      <TextField
        formId={FORM_ID}
        name='wabaId'
        label={toText(text('whatsappSettings.wabaId'))}
        maxLength={32}
        value={values.wabaId}
        onChange={(value) => set('wabaId', value)}
      />
      <Field>
        <FieldLabel>{text('whatsappSettings.mode')}</FieldLabel>
        <RadioGroup
          value={values.mode}
          onValueChange={(value) => set('mode', value as Values['mode'])}
        >
          {MODES.map((mode) => (
            <FieldLabel key={mode} htmlFor={`${FORM_ID}-mode-${mode}`}>
              <Field orientation='horizontal'>
                <RadioGroupItem value={mode} id={`${FORM_ID}-mode-${mode}`} />
                <FieldContent>
                  <FieldTitle>
                    {text(`whatsappSettings.modes.${mode}`)}
                    {mode === 'coexistence' ? (
                      <Badge variant='ai'>
                        {text('whatsappSettings.recommended')}
                      </Badge>
                    ) : null}
                  </FieldTitle>
                  {/* Filling the line: the primitive balances a horizontal
                      field's description, which wraps it early here. */}
                  <FieldDescription className='group-has-data-horizontal/field:text-pretty'>
                    {text(`whatsappSettings.modeHints.${mode}`)}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </Field>
      <TextField
        formId={FORM_ID}
        name='accessToken'
        type='password'
        autoComplete='new-password'
        label={toText(text('whatsappSettings.accessToken'))}
        required={!number?.hasAccessToken}
        hint={
          number?.hasAccessToken
            ? toText(text('whatsappSettings.secretSet'))
            : undefined
        }
        maxLength={1024}
        value={values.accessToken}
        onChange={(value) => set('accessToken', value)}
        error={errors.accessToken}
      />
    </FormDialog>
  );
}
