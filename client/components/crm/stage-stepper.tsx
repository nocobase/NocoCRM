import { useState, type ReactElement } from 'react';
import { Check, CircleDot, Pause, Trophy, XCircle } from 'lucide-react';
import { Button } from '../ui/button.js';
import { ReasonDialog } from './reasons.js';
import { reasonFor } from './reason-rules.js';
import {
  localDate,
  toText,
  useCrmText,
  useMetadata,
  errorCode,
  type CrmRecord,
  type Data,
} from './api.js';

// The six working stages read left to right as the road to a signed deal;
// the three outcomes sit at the end of it.
const openStages = [
  'contact',
  'qualification',
  'validation',
  'proposal',
  'negotiation',
  'contract',
];
const outcomes = ['won', 'lost', 'paused'] as const;

// An opportunity's stage as a stepper: where the deal stands, what has been
// passed, what is next. Clicking a step moves the deal there; an outcome that
// needs a reason asks for it first, so the move and its reason arrive in one
// write. Moving off "paused" or "lost" clears the stale reason.
export function StageStepper({
  record,
  editable,
  title,
  onSave,
}: {
  record: CrmRecord;
  editable: boolean;
  title: string;
  onSave: (values: Data) => Promise<void>;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const [asking, setAsking] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = toText(record.stage);
  const currentIndex = openStages.indexOf(current);
  const probability = (stage: string): string =>
    `${Math.round((meta?.probabilities[stage] ?? 0) * 100)}%`;
  const commit = async (values: Data): Promise<void> => {
    setBusy(true);
    try {
      await onSave({
        lostReason: null,
        pauseReason: null,
        resumeAt: null,
        ...values,
      });
      setError('');
      setAsking(undefined);
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
    } finally {
      setBusy(false);
    }
  };
  const move = (stage: string): void => {
    if (stage === current) return;
    if (reasonFor('opportunities', stage)) setAsking(stage);
    else void commit({ stage });
  };
  const reasonKey =
    current === 'lost'
      ? toText(record.lostReason)
      : current === 'paused'
        ? toText(record.pauseReason)
        : '';
  const reasonShown = [
    reasonKey ? text(`options.${reasonKey}`, { defaultValue: reasonKey }) : '',
    // A paused deal says when it is expected back.
    current === 'paused' && record.resumeAt
      ? `${toText(text('fields.resumeAt'))} ${localDate(
          record.resumeAt,
          language,
          meta?.settings.timeZone ?? 'Asia/Shanghai',
          false,
        )}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className='space-y-3 rounded-xl border bg-card p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
          <CircleDot className='size-3.5 shrink-0' />
          {text('fields.stage')}
        </p>
        {/* The outcomes sit at the top right, apart from the path. */}
        <div className='flex flex-wrap items-center gap-2'>
          {outcomes.map((outcome) => {
            const active = current === outcome;
            const Icon =
              outcome === 'won' ? Trophy : outcome === 'lost' ? XCircle : Pause;
            return (
              <Button
                key={outcome}
                size='sm'
                variant={
                  active
                    ? outcome === 'lost'
                      ? 'destructive'
                      : 'default'
                    : 'outline'
                }
                disabled={!editable || busy}
                aria-pressed={active}
                onClick={() => move(outcome)}
              >
                <Icon />
                {text(`options.${outcome}`)}
              </Button>
            );
          })}
          {reasonShown ? (
            <span className='text-sm text-muted-foreground'>{reasonShown}</span>
          ) : null}
          {error ? (
            <span className='text-xs text-destructive'>{error}</span>
          ) : null}
        </div>
      </div>
      {/* Chevrons rather than boxes: each step points at the next, so the
          row reads as a path. clip-path leaves no room for a border, so the
          three states are told apart by fill alone. */}
      <ol className='flex'>
        {openStages.map((stage, index) => {
          // Passed stages are ticked; on a won deal every stage is passed.
          const passed = current === 'won' || index < currentIndex;
          const active = stage === current;
          const first = index === 0;
          return (
            <li
              key={stage}
              className={`min-w-0 flex-1 ${toText(first ? '' : '-ml-2')}`}
            >
              <button
                type='button'
                disabled={!editable || busy}
                aria-current={active ? 'step' : undefined}
                title={`${toText(text(`options.${stage}`))} · ${probability(stage)}`}
                onClick={() => move(stage)}
                style={{
                  clipPath: first
                    ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                    : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)',
                }}
                className={`flex h-10 w-full items-center gap-1.5 pr-5 text-left transition-colors ${toText(
                  first ? 'pl-3' : 'pl-6',
                )} ${toText(
                  active
                    ? 'bg-primary text-primary-foreground'
                    : passed
                      ? 'bg-primary/15 text-foreground'
                      : 'bg-muted text-muted-foreground',
                )} ${toText(editable ? 'enabled:hover:bg-primary/25' : '')}`}
              >
                {/* Only the current stage carries a mark; the colours
                    already tell passed stages from the ones ahead. */}
                {active && (
                  <Check className='size-3.5 shrink-0 text-primary-foreground' />
                )}
                <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                  {text(`options.${stage}`)}
                </span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${toText(
                    active
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground',
                  )}`}
                >
                  {probability(stage)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {asking && (
        <ReasonDialog
          entity='opportunities'
          stage={asking}
          title={title}
          busy={busy}
          onCancel={() => setAsking(undefined)}
          onConfirm={(reasons) => void commit({ stage: asking, ...reasons })}
        />
      )}
    </div>
  );
}
