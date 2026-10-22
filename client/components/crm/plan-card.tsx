import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import { Checkbox } from '#components/ui/checkbox';
import { Spinner } from '#components/ui/spinner';
import { ArrowRight, Check, ClipboardList, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  fieldLabelKey,
  relativeTime,
  toText,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Entity,
  type Field,
} from './api.js';
import { ErrorNotice, RecordLink, Value } from './common.js';
import { InlineField } from './inline.js';
import { Markdown } from './markdown.js';
import { usePlanDecision, type PlanView } from './plans.js';

// A plan an agent proposed, as its decision card: what it changes, step by step, and the one choice it asks
// for — carry it out, leaving steps out if need be, or void it. Shown in
// the agent's conversation alone: a record's page no longer lists the plans
// waiting on it, which crowded its particulars.

type Step = PlanView['steps'][number];

const TONES: Record<
  PlanView['status'],
  'ai' | 'success' | 'destructive' | 'muted' | 'info'
> = {
  pending: 'ai',
  executing: 'info',
  executed: 'success',
  failed: 'destructive',
  stale: 'destructive',
  voided: 'muted',
  expired: 'muted',
  superseded: 'muted',
};

export function PlanCard({ plan }: { plan: PlanView }): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const { decide, revise, busy, error, gone } = usePlanDecision(plan);
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  // Once decided here, focus goes to what came of it, the buttons being gone.
  const outcomeRef = useRef<HTMLParagraphElement>(null);
  const [decidedHere, setDecidedHere] = useState(false);
  useEffect(() => {
    if (decidedHere && (plan.status !== 'pending' || gone))
      outcomeRef.current?.focus();
  }, [decidedHere, plan.status, gone]);
  const run = (decision: 'execute' | 'void'): void => {
    setDecidedHere(true);
    void decide(decision, decision === 'execute' ? [...skipped] : []);
  };
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const waiting = plan.status === 'pending' && !gone;
  const kept = plan.steps.length - skipped.size;
  const nameOf = (id: string | null): string =>
    toText(meta?.users.find((user) => user.id === id)?.name ?? '');
  // The field a refused step names, by its label on that step's record.
  const failedField = (field: string): string => {
    const failed = plan.steps.find(
      (step) => step.position === Number(plan.failure?.position),
    );
    const name = field.replace(/^values\./u, '');
    return failed?.check
      ? text(fieldLabelKey(failed.check.entity, name), { defaultValue: name })
      : name;
  };
  const hoursLeft = Math.max(
    1,
    Math.ceil((Date.parse(plan.expiresAt) - now) / 3_600_000),
  );
  return (
    // On the card's own white, waiting or decided, as the AI's cards in a
    // timeline are; each step a card of its own with its fields in a label
    // column, and the decision under them, the AI's colour on the button
    // that carries it out.
    <section
      aria-label={plan.title}
      className='rounded-lg border border-border bg-card p-4 shadow-xs'
    >
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
        <ClipboardList className='size-3.5' aria-hidden />
        <span>
          {text('plans.meta', {
            agent: plan.agentName ?? text('plans.agent'),
            time: relativeTime(plan.createdAt, language, now, text('justNow')),
          })}
        </span>
        <Badge variant={TONES[plan.status]} className='ml-auto'>
          {text(`plans.status.${plan.status}`)}
        </Badge>
      </div>
      <h3 className='mt-2 text-sm font-medium break-words'>{plan.title}</h3>
      {plan.summary ? (
        <Markdown compact className='mt-1 text-sm text-muted-foreground'>
          {plan.summary}
        </Markdown>
      ) : null}
      <ol className='mt-3 flex flex-col gap-2'>
        {plan.steps.map((step) => (
          <PlanStep
            key={step.id}
            step={step}
            titles={plan.titles}
            // A waiting plan's values are the person's to change before
            // deciding, as the confirmation cards' were.
            onRevise={
              waiting && !busy
                ? async (values) => {
                    await revise(step.position, values);
                  }
                : undefined
            }
            selectable={waiting && plan.steps.length > 1}
            kept={!skipped.has(step.position)}
            onKept={(on) =>
              setSkipped((current) => {
                const next = new Set(current);
                if (on) next.delete(step.position);
                else next.add(step.position);
                return next;
              })
            }
          />
        ))}
      </ol>
      {error ? (
        <div className='mt-3'>
          <ErrorNotice error={error} />
        </div>
      ) : null}
      {waiting ? (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
          <span className='text-xs text-muted-foreground'>
            {text('plans.expiresIn', { count: hoursLeft })}
          </span>
          <div className='flex shrink-0 gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={Boolean(busy)}
              onClick={() => run('void')}
            >
              {busy === 'void' ? <Spinner /> : <X />}
              {text('plans.void')}
            </Button>
            <Button
              size='sm'
              className='bg-primary text-primary-foreground hover:bg-primary/90'
              disabled={Boolean(busy) || kept === 0}
              onClick={() => run('execute')}
            >
              {busy === 'execute' ? <Spinner /> : <Check />}
              {text('plans.execute', { count: kept })}
            </Button>
          </div>
        </div>
      ) : plan.status === 'executing' && !gone ? (
        <p className='mt-3 flex items-center gap-2 text-sm text-muted-foreground'>
          <Spinner />
          {text('plans.carryingOut')}
        </p>
      ) : (
        <p
          ref={outcomeRef}
          tabIndex={-1}
          className='mt-3 text-sm text-muted-foreground outline-none'
        >
          {gone
            ? text('plans.gone')
            : outcomeText(plan, text, nameOf, language, now, failedField)}
        </p>
      )}
    </section>
  );
}

function outcomeText(
  plan: PlanView,
  text: (key: string, options?: Record<string, unknown>) => string,
  nameOf: (id: string | null) => string,
  language: string,
  now: number,
  fieldLabel: (field: string) => string,
): string {
  const failure = plan.failure ?? {};
  const time = plan.decidedAt
    ? relativeTime(plan.decidedAt, language, now, text('justNow'))
    : '';
  switch (plan.status) {
    case 'executed':
      return text('plans.outcome.executed', {
        name: nameOf(plan.deciderUserId),
        time,
      });
    case 'voided':
      return text('plans.outcome.voided', {
        name: nameOf(plan.deciderUserId),
        time,
      });
    case 'stale':
      return text('plans.outcome.stale', { position: failure.position });
    case 'failed':
      return text('plans.outcome.failed', {
        position: failure.position,
        reason: `${text(`errors.${toText(failure.code)}`, {
          defaultValue: text('errors.serverError'),
        })}${failure.field ? ` (${fieldLabel(toText(failure.field))})` : ''}`,
      });
    case 'expired':
      return text('plans.outcome.expired');
    case 'superseded':
      return text('plans.outcome.superseded');
    default:
      return text('plans.status.executing');
  }
}

function PlanStep({
  step,
  titles,
  selectable,
  kept,
  onKept,
  onRevise,
}: {
  step: Step;
  // The records its values name, by id, so each links by its name.
  titles: Record<string, string>;
  selectable: boolean;
  kept: boolean;
  onKept: (kept: boolean) => void;
  // Changes the values the step writes; absent once the plan is decided.
  onRevise?: (values: Record<string, unknown>) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const check = step.check;
  const entity = check?.entity ?? 'leads';
  const fields = meta?.definitions[entity]?.fields ?? [];
  // The record it changes, or the one it created once carried out.
  const recordId =
    check?.id ?? (step.result ? toText(step.result.id ?? '') || null : null);
  // Deciding an approval or a suggestion reads as the decision itself.
  const what = text(
    step.op === 'approval.decide' || step.op === 'suggestion.decide'
      ? `plans.op.${step.op.split('.')[0]}.${toText(step.params.decision)}`
      : `plans.op.${step.op}`,
    { entity: text(`entity.${entity}`) },
  );
  const removed = step.status === 'removed' || (selectable && !kept);
  // The values a step that creates or updates a record writes may be changed.
  const editable =
    !removed && (step.op === 'record.create' || step.op === 'record.update');
  return (
    <li
      className={`flex gap-2.5 rounded-md border border-border bg-card p-3 ${removed ? 'opacity-55' : ''}`}
    >
      {/* A box to leave the step out where there is a choice; nothing,
          not even its number, where there is none. */}
      {selectable ? (
        <Checkbox
          className='mt-0.5'
          checked={kept}
          onCheckedChange={(on) => onKept(on === true)}
          aria-label={text('plans.keepStep', { step: step.position })}
        />
      ) : null}
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-x-1.5 text-sm'>
          <span
            className={`text-muted-foreground ${removed ? 'line-through' : ''}`}
          >
            {what}
          </span>
          {check?.name ? (
            recordId ? (
              <RecordLink
                entity={entity}
                record={{ id: recordId, name: check.name }}
              />
            ) : (
              <span className='font-medium break-words'>{check.name}</span>
            )
          ) : null}
        </div>
        {check?.mail ? (
          <StepMail mail={check.mail} step={step} removed={removed} />
        ) : null}
        {check?.changes.length ? (
          <dl className='mt-2 flex flex-col gap-1 text-sm'>
            {check.changes.map((change) => (
              <div
                key={change.field}
                className='flex items-baseline gap-3 break-words'
              >
                <dt className='w-24 shrink-0 text-muted-foreground'>
                  {['comment', 'suggestion', 'nextTask'].includes(change.field)
                    ? text(`plans.${change.field}`)
                    : text(fieldLabelKey(entity, change.field), {
                        defaultValue: change.field,
                      })}
                </dt>
                <dd className='min-w-0 flex-1'>
                  <StepValue
                    entity={entity}
                    field={fields.find((f) => f.key === change.field)}
                    name={change.field}
                    from={change.from}
                    to={change.to}
                    titles={titles}
                    onRevise={editable ? onRevise : undefined}
                  />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </li>
  );
}

// An email a step sends, whole, as it goes out: the person reads every
// word before confirming. Once carried out, whether it went.
function StepMail({
  mail,
  step,
  removed,
}: {
  mail: NonNullable<NonNullable<Step['check']>['mail']>;
  step: Step;
  removed: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const rows: [string, string][] = [
    ['from', mail.from],
    ['to', mail.to.join(', ')],
    ...(mail.cc.length ? [['cc', mail.cc.join(', ')] as [string, string]] : []),
    ['subject', mail.subject],
  ];
  return (
    <div className='mt-2 flex flex-col gap-2 text-sm'>
      <dl className='flex flex-col gap-1'>
        {rows.map(([key, value]) => (
          <div key={key} className='flex items-baseline gap-3 break-words'>
            <dt className='w-24 shrink-0 text-muted-foreground'>
              {text(`plans.mail.${key}`)}
            </dt>
            <dd className='min-w-0 flex-1'>{value}</dd>
          </div>
        ))}
      </dl>
      <p className='rounded-md border border-border bg-muted/40 px-3 py-2 break-words whitespace-pre-wrap'>
        {mail.text}
      </p>
      <p className='text-xs text-muted-foreground'>
        {step.status === 'failed'
          ? text('plans.mail.notSent', {
              reason: text(`errors.${toText(step.result?.code ?? '')}`, {
                defaultValue: text('errors.mailFailed'),
              }),
            })
          : step.status === 'done'
            ? text('plans.mail.sent')
            : removed
              ? null
              : text('plans.mail.later')}
      </p>
    </div>
  );
}

// A value a step writes: while the plan waits, the new value is the field
// the record pages edit it with (a click, then saved as they save), after
// the old one when there was one; a value naming a record an earlier step
// creates ($1) or a field the record has not, as it reads.
function StepValue({
  entity,
  field,
  name,
  from,
  to,
  titles,
  onRevise,
}: {
  entity: Entity;
  field: Field | undefined;
  name: string;
  from: unknown;
  to: unknown;
  titles: Record<string, string>;
  onRevise?: (values: Record<string, unknown>) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const reference = typeof to === 'string' && to.startsWith('$');
  if (!onRevise || !field || reference)
    return (
      <ChangeValue
        field={field ?? { key: name, type: 'text' }}
        from={from}
        to={to}
        titles={titles}
      />
    );
  const long = isLong(field, from, to);
  return (
    <Change
      long={long}
      old={
        filled(from) ? (
          <OldValue field={field} value={from} long={long} titles={titles} />
        ) : null
      }
      next={
        <span
          className={long ? '-mx-2 -my-1 block' : '-mx-2 -my-1 min-w-36 flex-1'}
        >
          <InlineField
            entity={entity}
            record={{ id: '', [name]: to } as unknown as CrmRecord}
            field={field}
            lookup={titles}
            label={toText(
              text(fieldLabelKey(entity, name), { defaultValue: name }),
            )}
            editable
            plain
            onSave={async (value) => onRevise({ [name]: value })}
          />
        </span>
      }
    />
  );
}

// A changed value as the record pages show it: → new, after the old one
// when there was one.
function ChangeValue({
  field,
  from,
  to,
  titles,
}: {
  field: Field | { key: string; type: string };
  from: unknown;
  to: unknown;
  titles: Record<string, string>;
}): ReactElement {
  const long = isLong(field, from, to);
  return (
    <Change
      long={long}
      old={
        filled(from) ? (
          <OldValue field={field} value={from} long={long} titles={titles} />
        ) : null
      }
      next={
        filled(to) ? (
          <span className='min-w-0 break-words'>
            <Value
              field={field}
              record={{ id: '', [field.key]: to } as unknown as CrmRecord}
              lookup={titles}
              plain
            />
          </span>
        ) : (
          <span className='text-muted-foreground'>—</span>
        )
      }
    />
  );
}

const filled = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== '';

// A value that reads as a paragraph (a long text, or a value too long for a
// line): its old value goes above the new one rather than beside it.
function isLong(
  field: Field | { key: string; type: string },
  from: unknown,
  to: unknown,
): boolean {
  return (
    field.type === 'textarea' ||
    [from, to].some(
      (value) =>
        typeof value === 'string' &&
        (value.length > 40 || value.includes('\n')),
    )
  );
}

// The old value beside or above the new: struck through, wrapping where
// the card ends; a paragraph as plain text (its Markdown marks left out),
// two lines of it at most.
function OldValue({
  field,
  value,
  long,
  titles,
}: {
  field: Field | { key: string; type: string };
  value: unknown;
  long: boolean;
  titles: Record<string, string>;
}): ReactElement {
  if (long)
    return (
      <div className='line-clamp-2 break-words whitespace-pre-wrap text-muted-foreground line-through'>
        {toText(value)
          .replace(/\*\*|__|`/gu, '')
          .replace(/^#{1,6}\s+/gmu, '')}
      </div>
    );
  return (
    <span className='max-w-full shrink-0 break-words text-muted-foreground line-through'>
      <Value
        field={field}
        record={{ id: '', [field.key]: value } as unknown as CrmRecord}
        lookup={titles}
        plain
      />
    </span>
  );
}

// Old → new on a line, wrapping as a whole where the card ends; a
// paragraph's old value above the new one.
function Change({
  long,
  old,
  next,
}: {
  long: boolean;
  old: ReactNode;
  next: ReactNode;
}): ReactElement {
  if (long)
    return (
      <div className='flex min-w-0 flex-col gap-1'>
        {old}
        {next}
      </div>
    );
  return (
    <span className='flex min-w-0 flex-wrap items-baseline gap-x-1'>
      {old ? (
        <>
          {old}
          <ArrowRight
            className='size-3 shrink-0 self-center text-muted-foreground'
            aria-hidden
          />
        </>
      ) : null}
      {next}
    </span>
  );
}
