import { toText } from './api.js';
import { reasonFor } from './reason-rules.js';
import { useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Textarea } from '../ui/textarea.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.js';
import { Choice } from './form.js';
import { Status } from './common.js';
import {
  useCrmText,
  useMetadata,
  errorCode,
  type CrmRecord,
  type Data,
  type Entity,
} from './api.js';

// Collects the reason fields for one status change, then hands back the
// patch: {status/stage, ...reasons}. The caller decides what to do with it.
export function ReasonDialog({
  entity,
  stage,
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  entity: Entity;
  stage: string;
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reasons: Data) => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const [reason, setReason] = useState<Data>({});
  const fields = reasonFor(entity, stage) ?? [];
  const incomplete = fields.some(
    (f) => f.required && !toText(reason[f.key] ?? '').trim(),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>
            {text('moveTo', { stage: text(`options.${stage}`) })}
          </DialogTitle>
          <DialogDescription>
            {text('moveToDetail', { name: title })}
          </DialogDescription>
        </DialogHeader>
        {/* No defaultOpen on the select: a popup opened while the dialog is
            still animating in anchors to where the trigger was mid-transition. */}
        {fields.map((field) =>
          field.type === 'select' ? (
            <div key={field.key} className='grid gap-1.5 text-sm'>
              {text(`fields.${field.key}`)}
              <Choice
                label={text(`fields.${field.key}`)}
                value={toText(reason[field.key] ?? '')}
                onChange={(v) => setReason((r) => ({ ...r, [field.key]: v }))}
                choices={(meta?.settings.options[field.key] ?? []).map(
                  (value) => ({
                    value,
                    label: text(`options.${value}`, { defaultValue: value }),
                  }),
                )}
              />
            </div>
          ) : (
            <label key={field.key} className='grid gap-1.5 text-sm'>
              {text(`fields.${field.key}`)}
              {field.type === 'date' ? (
                <Input
                  type='date'
                  value={toText(reason[field.key] ?? '')}
                  onChange={(e) =>
                    setReason((r) => ({ ...r, [field.key]: e.target.value }))
                  }
                />
              ) : (
                <Textarea
                  rows={3}
                  value={toText(reason[field.key] ?? '')}
                  onChange={(e) =>
                    setReason((r) => ({ ...r, [field.key]: e.target.value }))
                  }
                />
              )}
            </label>
          ),
        )}
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onCancel}>
            {text('cancel')}
          </Button>
          <Button
            disabled={busy || incomplete}
            onClick={() => onConfirm(reason)}
          >
            {busy ? text('saving') : text('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// An inline status / stage picker for a detail page's summary row: a menu of
// the allowed values, where choosing one that needs a reason opens the reason
// dialog first so the status and its reason arrive in one write.
export function StageField({
  entity,
  record,
  field,
  editable,
  title,
  onSave,
}: {
  entity: Entity;
  record: CrmRecord;
  field: string;
  editable: boolean;
  title: string;
  onSave: (values: Data) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const [asking, setAsking] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options =
    meta?.definitions[entity]?.fields.find((f) => f.key === field)?.options ??
    [];
  const current = toText(record[field]);
  const reasonShown =
    entity === 'leads' && current === 'invalid'
      ? text(`options.${toText(record.invalidReason)}`, {
          defaultValue: toText(record.invalidReason),
        })
      : current === 'churned'
        ? text(`options.${toText(record.churnReason)}`, {
            defaultValue: toText(record.churnReason),
          })
        : current === 'lost'
          ? text(`options.${toText(record.lostReason)}`, {
              defaultValue: toText(record.lostReason),
            })
          : current === 'paused'
            ? text(`options.${toText(record.pauseReason)}`, {
                defaultValue: toText(record.pauseReason),
              })
            : '';
  // Moving to a status without a reason clears the reasons this object has,
  // so a stale "price" does not linger on a customer that came back.
  const clearedReasons: Data =
    entity === 'leads'
      ? { invalidReason: null }
      : entity === 'accounts'
        ? { churnReason: null }
        : entity === 'opportunities'
          ? { lostReason: null, pauseReason: null, resumeAt: null }
          : {};
  const commit = async (values: Data): Promise<void> => {
    setBusy(true);
    try {
      await onSave(values);
      setError('');
      setAsking(undefined);
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
    } finally {
      setBusy(false);
    }
  };
  const trigger = (
    <span className='flex min-w-0 items-center gap-2'>
      <Status value={current} />
      {reasonShown ? (
        <span className='truncate text-sm text-muted-foreground'>
          {reasonShown}
        </span>
      ) : null}
      {error ? <span className='text-xs text-destructive'>{error}</span> : null}
    </span>
  );
  if (!editable) return <div className='px-2 py-1.5'>{trigger}</div>;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={text(`fields.${field}`)}
          className='flex w-full items-center rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted'
        >
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          {options
            // "converted" is reached only through conversion.
            .filter((value) => value !== 'converted')
            .map((value) => {
              const needed = reasonFor(entity, value);
              const single = needed?.length === 1 ? needed[0] : undefined;
              // A status whose only reason is a choice gets a submenu, the
              // way the lead page does invalid: the statuses stay on screen
              // and the reason cannot be skipped, because only its items
              // commit. Free-text reasons still go through the dialog.
              if (single?.type === 'select')
                return (
                  <DropdownMenuSub key={value}>
                    <DropdownMenuSubTrigger disabled={value === current}>
                      {text(`options.${value}`)}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {(meta?.settings.options[single.key] ?? []).map((reason) => (
                        <DropdownMenuItem
                          key={reason}
                          onClick={() =>
                            void commit({ [field]: value, [single.key]: reason })
                          }
                        >
                          {text(`options.${reason}`, { defaultValue: reason })}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              return (
                <DropdownMenuItem
                  key={value}
                  disabled={value === current}
                  onClick={() => {
                    if (needed) setAsking(value);
                    else void commit({ [field]: value, ...clearedReasons });
                  }}
                >
                  {text(`options.${value}`)}
                </DropdownMenuItem>
              );
            })}
        </DropdownMenuContent>
      </DropdownMenu>
      {asking && (
        <ReasonDialog
          entity={entity}
          stage={asking}
          title={title}
          busy={busy}
          onCancel={() => setAsking(undefined)}
          onConfirm={(reasons) => void commit({ [field]: asking, ...reasons })}
        />
      )}
    </>
  );
}
