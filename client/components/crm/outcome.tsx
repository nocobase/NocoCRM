import { useId, useState, type ReactElement } from 'react';
import { CalendarCheck, Sparkles } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Checkbox } from '../ui/checkbox.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import { ErrorNotice } from './common.js';
import {
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
} from './api.js';

// What came of an activity, as the person tells it, with the AI writing up
// what they jotted down (headed points: what the other side said, the facts
// settled, what was agreed, the next step), which they read and change
// before recording it; and, where the activity belongs to a lead, whether
// the AI then follows the lead up anew (`onFollowUp`). The follow-up card's
// "done" and the activity's own "record outcome" both use it.
export function OutcomeBox({
  activityId,
  value,
  onChange,
  disabled,
  followUp,
  onFollowUp,
}: {
  activityId: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  followUp?: boolean;
  onFollowUp?: (followUp: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const id = useId();
  const [organising, setOrganising] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div className='grid gap-2'>
      <Textarea
        value={value}
        maxLength={LONG_TEXT_LIMIT}
        disabled={disabled || organising}
        placeholder={toText(text('evaluation.outcomePlaceholder'))}
        aria-label={toText(text('fields.feedback'))}
        onChange={(event) => onChange(event.target.value)}
        className='max-h-72 min-h-16 bg-background'
      />
      <ErrorNotice error={error} />
      <div className='flex flex-wrap items-center gap-2'>
        {/* The lead followed up anew once this is recorded: ticked by
            default, offered only while the AI is on. */}
        {onFollowUp && meta?.assistant ? (
          <label
            htmlFor={id}
            className='mr-auto flex items-center gap-2 text-sm text-muted-foreground'
          >
            <Checkbox
              id={id}
              checked={followUp ?? true}
              disabled={disabled}
              onCheckedChange={(checked) => onFollowUp(checked === true)}
            />
            {text('evaluation.followUpAfter')}
          </label>
        ) : null}
        {meta?.assistant ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='ml-auto text-ai hover:text-ai'
            disabled={disabled || organising || !value.trim()}
            onClick={() => {
              setOrganising(true);
              setError(undefined);
              api<{ data: { text: string } }>(
                `activities/${activityId}/feedback/organise`,
                'POST',
                { text: value },
              )
                .then((result) => onChange(result.data.text))
                .catch(setError)
                .finally(() => setOrganising(false));
            }}
          >
            {organising ? <Spinner /> : <Sparkles />}
            {text(
              organising
                ? 'evaluation.organising'
                : 'evaluation.organiseOutcome',
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// A planned activity's outcome, recorded from its own page: written (or
// written up by the AI), the activity completed with it, and its deal, or
// else its lead, followed up anew when that is ticked.
export function RecordOutcomeDialog({
  activity,
  onClose,
}: {
  activity: CrmRecord;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [outcome, setOutcome] = useState('');
  const [followUp, setFollowUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const followable = Boolean(activity.opportunityId || activity.leadId);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {text('evaluation.recordOutcomeOf', {
              name: toText(activity.name),
            })}
          </DialogTitle>
          <DialogDescription>
            {text('evaluation.recordOutcomeHint')}
          </DialogDescription>
        </DialogHeader>
        <ErrorNotice error={error} />
        <OutcomeBox
          activityId={toText(activity.id)}
          value={outcome}
          onChange={setOutcome}
          disabled={busy}
          // A follow-up is a deal's or a lead's: offered only for an
          // activity of one.
          {...(followable ? { followUp, onFollowUp: setFollowUp } : {})}
        />
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onClose}>
            {text('cancel')}
          </Button>
          <Button
            disabled={busy || !outcome.trim()}
            onClick={() => {
              setBusy(true);
              setError(undefined);
              api(`activities/${toText(activity.id)}/outcome`, 'POST', {
                outcome,
                followUp: followable && followUp,
              })
                .then(() => refresh())
                .then(onClose)
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            {busy ? <Spinner /> : <CalendarCheck />}
            {text('evaluation.acceptReport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
