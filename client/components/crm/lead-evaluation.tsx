import { copyText } from '@nocobase/app-client';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AiFailure } from './ai-failure.js';
import {
  CalendarPlus,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  PencilLine,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox.js';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible.js';
import { Markdown } from './markdown.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import { Textarea } from '../ui/textarea.js';
import { Spinner } from '../ui/spinner.js';
import { ErrorNotice, LongText, RecordLink, Value } from './common.js';
import { KindTag } from './kind-tag.js';
import { markdownLine } from './line-breaks.js';
import { ConvertDialog } from './conversion.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { OutcomeBox } from './outcome.js';
import { useMailSetup } from './mail.js';
import { EmailStep } from './email-step.js';
import { AiStatusWord } from './ai-status-word.js';
import { aiStateWords } from './ai-state-words.js';
import type { FollowUpRequest } from './follow-up-request.js';
import { Choice } from './form.js';
import { Input } from '../ui/input.js';
import { DateTimeInput } from './datetime-input.js';
import {
  contactTime,
  DEFAULT_TIME_ZONE,
} from '../../../server/providers/crm/zone-time.js';
import {
  mergePlanDescription,
  planDescription,
  planPartChanges,
  type PlanPart,
} from '../../../server/providers/crm/plan.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import {
  fieldLabelKey,
  localDate,
  money,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRecord,
  useRefresh,
  type CrmRecord,
} from './api.js';
import { useAgentWords } from './work-agent-name.js';
import { AgentWords } from './work-agent.js';
import { cardPin, recordPin } from './agent-chat/ask.js';
import { DiscussButton } from './agent-chat/discuss-button.js';
import { ReviseButton, RerunButton, RunButton } from './ai-buttons.js';

// The AI's follow-up recommendation for a lead, as the server keeps it in the lead's
// activity feed (server/providers/crm/ai-entries.ts).
export interface Verdict {
  recommendation: 'follow' | 'nurture' | 'convert' | 'invalid';
  grade: 'A' | 'B' | 'C' | null;
  summary: string;
  // What it found, as a short paragraph (absent from cards before it).
  brief?: string | null;
  reasons: string[];
  edition: string | null;
  invalidReason: string | null;
  // `taskId`: a task already planned that the step carries on;
  // `ownerId`: whom the AI gave it to, when it named someone.
  nextStep: {
    type: string;
    subject: string;
    inDays: number;
    taskId?: string | null;
    ownerId?: string | null;
  } | null;
  questions: string[];
  // Following up: what to prepare. Converting: the opportunity to open.
  // Nurturing: when to look again. Against the previous recommendation:
  // what changed. Absent from recommendations made before the follow-up
  // skill replaced the evaluation.
  prep?: string[];
  opportunity?: {
    name: string;
    amount: number | null;
    // Its currency, when the AI named one; else the CRM's default.
    currency?: string | null;
  } | null;
  reviewInDays?: number | null;
  changes?: string[];
  // Following up by email: the draft, which the CRM never sends.
  email?: { subject: string; body: string } | null;
  enrich?: {
    field: string;
    value: string;
    // The page it was found on, for the web.
    source: string | null;
    // The CRM's own material it came from, when not the web.
    basis?: string;
    current: string | null;
  }[];
}
// The AI's follow-up recommendation for a deal (opportunity-evaluation.ts):
// move it to the stage the evidence supports, keep at it, pause or lose it.
export interface DealVerdict {
  recommendation: 'advance' | 'continue' | 'pause' | 'lose';
  confidence: 'high' | 'medium' | 'low' | null;
  stage: string | null;
  summary: string;
  // What it found, as a short paragraph (absent from cards before it).
  brief?: string | null;
  reasons: string[];
  risks: string[];
  nextStep: Verdict['nextStep'];
  prep: string[];
  questions: string[];
  email: { subject: string; body: string } | null;
  updates: {
    field:
      | 'amount'
      | 'currency'
      | 'expectedCloseAt'
      | 'businessType'
      | 'source'
      | 'description';
    value: string;
    reason: string;
    current: string | null;
  }[];
  pauseReason: string | null;
  resumeInDays: number | null;
  lostReason: string | null;
  revisitInDays: number | null;
  changes: string[];
  // What the web says about the deal's company, for its fields.
  enrich?: Verdict['enrich'];
  // Approvals to request before promising the customer what needs them.
  approvals?: { topic: string; name: string; description: string }[];
  // Every commercial term in the material, checked by the server against
  // the deal's approvals: within the standards, approved, awaiting one, or
  // needing one.
  // The customer's people with a part in the deal: a role to set or change,
  // a contact to add, or a person to create, each written with the accept.
  contacts?: {
    name: string;
    role: string;
    contactId: string | null;
    contactName?: string;
    currentRole: string | null;
    jobTitle: string | null;
    phone: string | null;
    email: string | null;
    reason: string;
  }[];
  terms?: {
    topic: string;
    term: string;
    status: 'standard' | 'approved' | 'pending' | 'rejected' | 'needed';
    approval?: string;
  }[];
}
export type AnyVerdict = Verdict | DealVerdict;
const isDeal = (verdict: AnyVerdict): verdict is DealVerdict =>
  ['advance', 'continue', 'pause', 'lose'].includes(verdict.recommendation);
// The records the AI follows up.
export type FollowedEntity = 'leads' | 'opportunities';

export interface EvaluationEntry {
  id: string;
  status:
    'running' | 'pending' | 'accepted' | 'dismissed' | 'failed' | 'superseded';
  createdAt: string;
  ai: {
    result?: AnyVerdict;
    error?: string;
    researchedAt?: string;
    decidedById?: string;
    decidedAt?: string;
    enrichedFields?: string[];
    submittedApprovals?: { index: number; id: string }[];
    keptContacts?: { index: number; contactId: string }[];
    enrichedById?: string;
    enrichedAt?: string;
    // A card redone as a person asked: the card it replaced, what they
    // asked and who.
    revises?: string;
    instruction?: string;
    instructedById?: string;
    // A deal's fields the person kept with an accept.
    updatedFields?: string[];
    // What started a follow-up the system ran on its own.
    trigger?: string;
    // A lead's web look-up of its company (lead-research.ts): what it found,
    // its points citing the pages as [ref_n]; or why one due was not made.
    research?: {
      at: string;
      text: string;
      pages: { index: number; title: string; url: string; site: string }[];
    };
    researchMiss?: 'unavailable' | 'failed';
    // When a running follow-up began; absent while it waits its turn.
    startedAt?: string;
    // A deal's follow-up started by its approvals' decisions: those
    // submitted together, each with what became of it.
    decidedApprovals?: { id: string; name: string; status: string }[];
  };
}

// "Follow up · Grade A", "Advance to Validation · Likely": the verdict in a
// few words, for the card and the activity feed.
function useVerdictLabel(): (verdict: AnyVerdict) => string {
  const { text } = useCrmText();
  return (verdict) =>
    (isDeal(verdict)
      ? [
          verdict.recommendation === 'advance' && verdict.stage
            ? text('evaluation.deal.advanceTo', {
                stage: text(`options.${verdict.stage}`),
              })
            : text(`evaluation.deal.${verdict.recommendation}`),
          verdict.confidence
            ? text(`evaluation.deal.confidence.${verdict.confidence}`)
            : '',
        ]
      : [
          text(`evaluation.${verdict.recommendation}`),
          verdict.grade
            ? text('evaluation.grade', { grade: verdict.grade })
            : '',
        ]
    )
      .filter(Boolean)
      .join(' · ');
}

// A verdict as a tag ("Follow up · Grade A"), purple while it waits.
export function VerdictBadge({
  verdict,
  pending = true,
}: {
  verdict: AnyVerdict;
  pending?: boolean;
}): ReactElement {
  const label = useVerdictLabel();
  return <Badge variant={pending ? 'ai' : 'muted'}>{label(verdict)}</Badge>;
}

// Atop the lead's timeline, where the AI stands on the lead: evaluating it, a
// verdict waiting, or the latest verdict and what became of it. It opens the
// evaluation in the activity feed (`onOpen`, given the entry), where the
// verdict lives whole (HistoryFeed) and is handled.
export function EvaluationStatus({
  entity = 'leads',
  recordId,
  onOpen,
  request,
  wide = false,
}: {
  entity?: FollowedEntity;
  recordId: string;
  onOpen: (entryId: string) => void;
  // Asking the AI to follow the record up again, at the chip's end.
  request?: FollowUpRequest;
  // Across its row, as atop a record's particulars.
  wide?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const words = useAgentWords();
  const refresh = useRefresh();
  const label = useVerdictLabel();
  const { data: entry } = useCrmQuery<EvaluationEntry | null>(
    `${entity}/${recordId}/evaluations/latest`,
    true,
    // While the AI works, look again every few seconds.
    { refetchInterval: (data) => (data?.status === 'running' ? 4000 : false) },
  );
  // When a running evaluation finishes, the page (the lead's feed) catches
  // up with it.
  const lastStatusRef = useRef(entry?.status);
  useEffect(() => {
    if (lastStatusRef.current === 'running' && entry?.status !== 'running')
      void refresh();
    lastStatusRef.current = entry?.status;
  }, [entry?.status, refresh]);
  // Before the first evaluation it shows nothing (EvaluateButton asks
  // for one); after, it reports the latest and asks for another.
  // What the AI concluded shows with or without a model to ask now;
  // asking again is the request's (useFollowUpRequest), which needs one.
  if (!meta || !entry) return null;
  const verdict = entry.ai.result;
  // On the AI's tint whatever it stands at, its dot saying where; at work,
  // the AI's state tag's words, as on a list's row (ai-state-tag.tsx).
  const live = entry?.status === 'running';
  const decided = entry.status === 'accepted' || entry.status === 'dismissed';
  // One chip, not a row of its own: what the AI concluded and where that
  // stands. It opens the evaluation in the timeline, where it is handled;
  // the details say more on hover.
  // Without a model it stays, greyed (ai-buttons.tsx).
  const again =
    request && (request.available || request.needsModel)
      ? entry.status !== 'running'
      : false;
  // Where it stands, in words: who decided it and when, once decided.
  const statusLine = toText(
    decided
      ? text('evaluation.decidedBy', {
          status: text(`evaluation.statuses.${entry.status}`),
          name:
            meta.users.find((u) => u.id === entry.ai.decidedById)?.name ?? '',
          time: localDate(entry.ai.decidedAt, language, meta.settings.timeZone),
        })
      : entry.status === 'failed'
        ? text('evaluation.failed')
        : text(`evaluation.statuses.${entry.status}`),
  );
  // As tall as the small buttons beside it (h-7), the main action's, and
  // in their type size.
  return (
    <div
      className={`${wide ? 'flex w-full' : 'inline-flex max-w-full'} h-7 items-center rounded-lg border font-sans text-sm font-normal tracking-normal border-transparent bg-primary/10 dark:bg-primary/20 ${live ? 'text-primary' : ''}`}
    >
      {/* The chip says only whose it is and where it stands; its hover
          says what it concluded, why, and where it stands in words. */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              onClick={() => onOpen(entry.id)}
              aria-label={[
                words(entity, 'name', 'evaluation.start'),
                verdict ? label(verdict) : '',
                statusLine,
              ]
                .filter(Boolean)
                .join(' · ')}
              // Small, as the filter beside it.
              className={`flex h-full min-w-0 items-center gap-1.5 rounded-l-lg px-2 transition-colors ${
                again ? '' : 'rounded-r-lg'
              } hover:bg-primary/15 ${wide ? 'flex-1' : ''}`}
            />
          }
        >
          {entry.status === 'running' ? (
            <Spinner className='size-3.5 text-primary' />
          ) : (
            <Sparkles className='size-3.5 text-primary' />
          )}
          <span className='min-w-0 truncate font-medium text-primary'>
            {live ? (
              text(aiStateWords.followUp.running)
            ) : (
              <AgentWords
                inButton
                work={entity}
                wordKey='name'
                fallback='evaluation.start'
              />
            )}
          </span>
          {live ? null : <AiStatusWord status={entry.status} />}
        </TooltipTrigger>
        <TooltipContent
          side='bottom'
          align='start'
          className='max-w-80 flex-col items-start gap-1'
        >
          {verdict ? <p className='font-medium'>{label(verdict)}</p> : null}
          {verdict?.summary ? (
            <p className='line-clamp-3 opacity-90'>{verdict.summary}</p>
          ) : null}
          {/* Where it stands, and what a click does, on one line. */}
          <p className='opacity-80'>
            {statusLine}
            {language.startsWith('zh') ? '，' : ' · '}
            {text('evaluation.chipHint')}
          </p>
        </TooltipContent>
      </Tooltip>
      {/* Following it up again, after where it stands. */}
      {again && request ? (
        <RerunButton
          asks={request.available}
          busy={request.busy}
          onAsk={request.ask}
          label={words(entity, 'rerun', 'evaluation.askAgain')}
          hint={
            <AgentWords
              inButton
              work={entity}
              wordKey='rerun'
              fallback='evaluation.askAgain'
            />
          }
        />
      ) : null}
    </div>
  );
}

// Asks the AI to follow the record up before it ever has: a button beside
// the record's heading. After, the latest suggestion's chip stands there
// and asks again at its end (EvaluationStatus); evaluating again while a
// verdict waits sets that verdict aside. No card offers it.
export function EvaluateButton({
  request,
}: {
  request: FollowUpRequest;
}): ReactElement | null {
  if (!(request.available || request.needsModel) || request.asked) return null;
  // Shaped as the suggestion's chip it gives way to (EvaluationStatus).
  return (
    <RunButton asks={request.available} busy={request.busy} onAsk={request.ask}>
      <AgentWords
        inButton
        work={request.entity}
        wordKey='run'
        fallback='evaluation.start'
      />
    </RunButton>
  );
}

// One verdict with what can be done about it: the card in a lead's or a
// deal's timeline, and a row of the "Waiting on me" page, which names the
// record in `heading`. Following up again is not offered here but atop the
// record's timeline.
export function VerdictPanel({
  entity = 'leads',
  entry,
  recordId,
  recordName,
  editable,
  onChanged,
  heading,
  full,
  onRevised,
  inFeed = false,
}: {
  entity?: FollowedEntity;
  entry: EvaluationEntry;
  recordId: string;
  recordName?: string;
  editable: boolean;
  onChanged: () => Promise<unknown>;
  // The card that replaces this one when the person has it redone.
  onRevised?: (entry: EvaluationEntry) => void;
  heading?: ReactNode;
  // Everything the verdict says, not only its reason: while it waits, and
  // when a decided one is opened in the timeline.
  full?: boolean;
  // Opened from its line in a record's timeline, which already names it and
  // its verdict: the card leads with what started it instead.
  inFeed?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const words = useAgentWords();
  const api = useCrmApi();
  const label = useVerdictLabel();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<unknown>();
  // Converting is the person's own, in the conversion dialog with the
  // proposed opportunity; accepting is recorded once it is done.
  const [converting, setConverting] = useState(false);
  // Accepting a deal's card that submits approvals asks first.
  const [confirmingApprovals, setConfirmingApprovals] = useState(false);
  // What the person wants changed on the card, for the AI to redo it.
  const [instruction, setInstruction] = useState('');
  // The web findings ticked, all to start with: written on their own with
  // "Write picked", or with the accept (a lead's into the lead, a deal's
  // into its company). A deal's proposed updates likewise, written with the
  // accept.
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        [
          ...(entry.ai.result && isDeal(entry.ai.result)
            ? entry.ai.result.updates
            : []),
          ...(entry.ai.result?.enrich ?? []),
        ].map((f) => f.field),
      ),
  );
  // What the accept still writes: the findings unless already written on
  // their own, and a deal's updates in any case.
  const found = new Set((entry.ai.result?.enrich ?? []).map((f) => f.field));
  const unwritten = [...picked].filter(
    (field) => !(entry.ai.enrichedAt && found.has(field)),
  );
  const base = `${entity}/${recordId}`;
  // An email as the next step is changed and sent on the card (EmailStep),
  // which accepts it once sent; without a mailbox to send from, the draft is
  // copied instead and the card accepted as any other.
  const canMail = useMailSetup().senders.length > 0;
  // The email draft's send, which the card's "accept all" calls.
  const emailSendRef = useRef<((all: boolean) => Promise<void>) | null>(null);
  // The proposed approvals kept, all to start with, each with its approver
  // (a sales manager by default), submitted with the accept.
  const [approvalPicks, setApprovalPicks] = useState<
    Record<number, { on: boolean; approverId: string }>
  >({});
  // The proposed contacts left out (all kept to start with).
  const [contactsOff, setContactsOff] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  // The task accepting creates, as the person changes it here: only
  // what they changed, over what the verdict proposes.
  const [plan, setPlan] = useState<Partial<Plan>>({});
  // When the card was drawn, to tell a task overdue.
  const [now] = useState(() => Date.now());
  // The deal itself, for the currency its amounts are in.
  const { data: followedRecord } = useRecord(
    entity === 'opportunities' ? 'opportunities' : undefined,
    recordId,
  );
  // The planned task the step carries on, if any, as it is now.
  const { data: carriedOn } = useRecord(
    'tasks',
    entry.ai.result?.nextStep?.taskId || undefined,
  );
  if (!meta) return null;
  const act = async (
    name: string,
    call: () => Promise<unknown>,
  ): Promise<void> => {
    setBusy(name);
    setError(undefined);
    try {
      await call();
      await onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(undefined);
    }
  };
  // Accepting writes the findings still ticked with it.
  const decide = (decision: 'accept' | 'dismiss'): Promise<void> =>
    act(decision, () =>
      api(`${base}/evaluations/${entry.id}/decide`, 'POST', {
        decision,
        ...(decision === 'accept'
          ? {
              fields: unwritten,
              task: existing
                ? { mode: overdue ? 'report' : 'reschedule', ...plan }
                : plan,
              // Only a deal's card proposes contacts and approvals.
              ...(verdict && isDeal(verdict) && verdict.contacts?.length
                ? {
                    contacts: verdict.contacts
                      .map((_, index) => index)
                      .filter((index) => !contactsOff.has(index)),
                  }
                : {}),
              ...(verdict && isDeal(verdict) && verdict.approvals?.length
                ? {
                    approvals: verdict.approvals.flatMap((_, index) => {
                      const pick = approvalPicks[index];
                      if (pick && !pick.on) return [];
                      return [
                        {
                          index,
                          ...(pick?.approverId
                            ? { approverId: pick.approverId }
                            : {}),
                        },
                      ];
                    }),
                  }
                : {}),
            }
          : {}),
      }),
    );
  // An email card writes them before its message goes, so a send the
  // provider refuses keeps them; the accept that follows the send leaves
  // them be. The card then shows them written.
  const writeTicked = async (): Promise<void> => {
    if (!unwritten.length) return;
    await api(`${base}/evaluations/${entry.id}/enrich`, 'POST', {
      fields: unwritten,
    });
    await onChanged();
  };
  // A conversion writes them first: the lead is read-only once converted,
  // and the company it becomes takes the corrected particulars.
  const convert = (): Promise<void> =>
    act('accept', async () => {
      if (unwritten.length)
        await api(`${base}/evaluations/${entry.id}/enrich`, 'POST', {
          fields: unwritten,
        });
      setConverting(true);
    });
  // Redoes the card as asked: the AI writes a new one, which replaces this.
  const revise = (): Promise<void> =>
    act('revise', async () => {
      const result = await api<{ data: EvaluationEntry }>(
        `${base}/evaluate`,
        'POST',
        {
          revise: entry.id,
          instruction: instruction.trim(),
        },
      );
      setInstruction('');
      onRevised?.(result.data);
    });
  const verdict = entry.ai.result;
  // A waiting card the reader decides, whose accept plans a task.
  const planning =
    entry.status === 'pending' &&
    editable &&
    Boolean(verdict && plansTask(verdict));
  const existing = verdict?.nextStep?.taskId ? carriedOn?.record : undefined;
  const overdue = existing
    ? new Date(toText(existing.dueAt)).getTime() < now
    : false;
  // Done but its outcome not written yet: nothing to accept.
  // Telling what came of the task: by default when it is overdue, and
  // whenever the person says it was done.
  const reporting = Boolean(
    existing && (plan.mode ?? (overdue ? 'report' : 'reschedule')) === 'report',
  );
  // Carrying on a task that is ready as it is: accepting changes
  // nothing on it.
  const unchanged =
    existing && verdict && !reporting
      ? carriedChanges(existing, verdict, plan, overdue).none
      : false;
  // The approvals the accept would submit, as ticked, each with its
  // approver (a sales manager other than the reader by default).
  const approvers = meta.users.filter(
    (u) => !u.disabled && u.canApprove && u.id !== meta.userId,
  );
  const submitting = (
    verdict && isDeal(verdict) ? (verdict.approvals ?? []) : []
  ).flatMap((approval, index) => {
    const pick = approvalPicks[index];
    if (pick && !pick.on) return [];
    const approverId = pick?.approverId || approvers[0]?.id || '';
    return [
      {
        ...approval,
        approver: meta.users.find((u) => u.id === approverId)?.name ?? '—',
      },
    ];
  });
  const decider = meta.users.find((u) => u.id === entry.ai.decidedById)?.name;
  // What accepting all of it does, step by step, for its hover.
  const taskName =
    toText(plan.name ?? '').trim() ||
    toText(existing?.name ?? '') ||
    toText(verdict?.nextStep?.subject ?? '');
  const keptContacts =
    verdict && isDeal(verdict)
      ? (verdict.contacts?.length ?? 0) - contactsOff.size
      : 0;
  const willDo: string[] = verdict
    ? [
        unwritten.length > 0 &&
          text(
            entity === 'leads'
              ? 'evaluation.will.write'
              : 'evaluation.will.writeCompany',
            { count: unwritten.length },
          ),
        emailsNext(verdict) &&
          (canMail
            ? text('evaluation.will.send', {
                subject: verdict.email?.subject ?? '',
              })
            : text('evaluation.will.sendYourself')),
        planning &&
          (existing
            ? reporting
              ? text('evaluation.will.report', { name: taskName })
              : overdue
                ? text('evaluation.will.reschedule', { name: taskName })
                : unchanged
                  ? null
                  : text('evaluation.will.update', { name: taskName })
            : text('evaluation.will.plan', { name: taskName })),
        verdict.recommendation === 'nurture' && text('evaluation.will.nurture'),
        verdict.recommendation === 'invalid' && text('evaluation.will.invalid'),
        verdict.recommendation === 'convert' && text('evaluation.will.convert'),
        isDeal(verdict) &&
          verdict.recommendation === 'advance' &&
          verdict.stage &&
          text('evaluation.will.stage', {
            stage: text(`options.${verdict.stage}`),
          }),
        verdict.recommendation === 'pause' && text('evaluation.will.pause'),
        verdict.recommendation === 'lose' && text('evaluation.will.lose'),
        keptContacts > 0 &&
          text('evaluation.will.contacts', { count: keptContacts }),
        submitting.length > 0 &&
          text('evaluation.will.approvals', { count: submitting.length }),
        text('evaluation.will.mark'),
      ].filter((step): step is string => Boolean(step))
    : [];
  // What started a follow-up the system began, said on the card.
  const startedBy = entry.ai.trigger
    ? entry.ai.decidedApprovals?.length
      ? text('evaluation.trigger.approvalsDecided', {
          approvals: entry.ai.decidedApprovals
            .map(
              (approval) =>
                `${approval.name} ${text(`options.${approval.status}`)}`,
            )
            .join(' · '),
        })
      : text(`evaluation.trigger.${entry.ai.trigger}`, { defaultValue: '' })
    : '';
  const instructor = meta.users.find(
    (u) => u.id === entry.ai.instructedById,
  )?.name;
  return (
    <section
      // On the card's own white, waiting or decided. Its fields show focus
      // as lightly as the inline editor does.
      className={`@container grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border p-4 text-sm shadow-xs [&_:is(input,textarea,[role=combobox]):focus-visible]:border-ring/50! [&_:is(input,textarea,[role=combobox]):focus-visible]:ring-2! [&_:is(input,textarea,[role=combobox]):focus-visible]:ring-ring/20! bg-card`}
    >
      {/* The heading, with asking and deciding at its top right; on a card
          too narrow for both (a phone), they take a row of their own under
          it, from the left, rather than hang at the right of a second row. */}
      {/* Empty in the timeline when nothing started it and nothing has
          been decided: the card then opens on its conclusion. */}
      <div className='flex flex-wrap items-center gap-2 empty:hidden'>
        {inFeed ? (
          startedBy ? (
            // Led by a spark: something set it going.
            <span className='flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground'>
              <Zap aria-hidden className='size-3 shrink-0' />
              {startedBy}
            </span>
          ) : null
        ) : (
          <>
            <Sparkles className='size-4 shrink-0 text-primary' />
            {heading ?? (
              <span className='shrink-0 font-medium'>
                <AgentWords
                  work={entity}
                  wordKey='suggestion'
                  fallback='evaluation.title'
                />
              </span>
            )}
            {verdict && (
              <Badge variant={entry.status === 'pending' ? 'ai' : 'muted'}>
                {label(verdict)}
              </Badge>
            )}
          </>
        )}
        {(entry.status === 'accepted' || entry.status === 'dismissed') && (
          <span className='text-xs text-muted-foreground'>
            {text('evaluation.decidedBy', {
              status: text(`evaluation.statuses.${entry.status}`),
              name: decider ?? '',
              time: localDate(
                entry.ai.decidedAt,
                language,
                meta.settings.timeZone,
              ),
            })}
          </span>
        )}
      </div>
      {/* A follow-up the system started says what started it. */}
      {!inFeed && startedBy ? (
        <p className='flex items-center gap-1.5 text-muted-foreground'>
          <Zap aria-hidden className='size-3.5 shrink-0' />
          {startedBy}
        </p>
      ) : null}
      {/* A card redone on someone's word says whose and what. */}
      {entry.ai.instruction && (
        <p className='text-muted-foreground'>
          {text('evaluation.instructionBy', {
            name: instructor ?? '',
            text: entry.ai.instruction,
          })}
        </p>
      )}
      {entry.status === 'running' && (
        <p className='flex items-center gap-2 text-muted-foreground'>
          <Spinner />
          {/* Not begun yet: waiting its turn behind other follow-ups. */}
          {!entry.ai.startedAt ? (
            text('evaluation.queued')
          ) : entry.ai.instruction ? (
            text('evaluation.revising')
          ) : (
            <AgentWords
              work={entity}
              wordKey='running.followUp'
              fallback='evaluation.running'
            />
          )}
        </p>
      )}
      {entry.status === 'failed' && (
        <AiFailure
          message={toText(text('evaluation.failed'))}
          error={entry.ai.error}
        />
      )}
      {/* The reason always; the rest while the verdict waits. */}
      {verdict && (
        <VerdictList
          verdict={verdict}
          full={full ?? entry.status === 'pending'}
          planned={planning}
          emailStep={
            verdict.email && emailsNext(verdict) ? (
              <EmailStep
                entity={entity}
                recordId={recordId}
                draft={verdict.email}
                editable={entry.status === 'pending' && editable}
                beforeSend={writeTicked}
                onSent={(all) =>
                  all
                    ? decide('accept')
                    : // The email alone: accepted as sent, nothing else
                      // written.
                      act('accept', () =>
                        api(`${base}/evaluations/${entry.id}/decide`, 'POST', {
                          decision: 'accept',
                        }),
                      )
                }
                sendRef={emailSendRef}
                heading={
                  <EmailHeading
                    // When the AI suggests sending it: today, or in so many
                    // days.
                    when={
                      verdict.nextStep
                        ? toText(
                            verdict.nextStep.inDays > 0
                              ? text('evaluation.inDays', {
                                  count: verdict.nextStep.inDays,
                                })
                              : text('evaluation.today'),
                          )
                        : undefined
                    }
                  />
                }
              />
            ) : undefined
          }
          conversion={
            entry.status === 'pending' &&
            verdict.recommendation === 'convert' ? (
              <ConversionPlan leadId={recordId} verdict={verdict} />
            ) : undefined
          }
        />
      )}
      {/* A deal's amount or close date to change, ticked to be written
          with the accept. */}
      {verdict && isDeal(verdict) && verdict.updates.length > 0 && (
        <DealUpdates
          entry={entry}
          updates={verdict.updates}
          currency={toText(followedRecord?.record.currency) || undefined}
          editable={editable && entry.status === 'pending'}
          picked={picked}
          onPick={setPicked}
        />
      )}
      {/* The terms on the table and where each stands, so what is still to
          be approved shows at a glance. */}
      {verdict && isDeal(verdict) && (verdict.terms?.length ?? 0) > 0 && (
        <DealTerms terms={verdict.terms ?? []} />
      )}
      {/* The customer's people and their parts, set with the accept. */}
      {verdict && isDeal(verdict) && (verdict.contacts?.length ?? 0) > 0 && (
        <DealContacts
          entry={entry}
          contacts={verdict.contacts ?? []}
          editable={editable && entry.status === 'pending'}
          off={contactsOff}
          onToggle={setContactsOff}
        />
      )}
      {/* Approvals to request first, submitted with the accept. */}
      {verdict && isDeal(verdict) && (verdict.approvals?.length ?? 0) > 0 && (
        <ProposedApprovals
          entry={entry}
          approvals={verdict.approvals ?? []}
          editable={editable && entry.status === 'pending'}
          picks={approvalPicks}
          onPick={setApprovalPicks}
        />
      )}
      {/* What accepting will create, laid out and changeable. */}
      {planning && verdict && (
        <PlannedTask
          verdict={verdict}
          entity={entity}
          recordId={recordId}
          plan={plan}
          onPlan={setPlan}
          disabled={Boolean(busy)}
          existing={existing}
          overdue={overdue}
        />
      )}
      {/* What the web says about the company, to fill the lead (or the
          deal's company) with. */}
      {verdict && (verdict.enrich?.length ?? 0) > 0 && (
        <Findings
          entry={entry}
          entity={entity}
          recordId={recordId}
          // Still writable once the email alone was sent, accepting the
          // card without them.
          editable={
            editable &&
            (entry.status === 'pending' || entry.status === 'accepted')
          }
          onChanged={onChanged}
          picked={picked}
          onPick={setPicked}
        />
      )}
      {/* The web look-up behind it, folded: what it found and the pages. */}
      <WebResearch entry={entry} />
      <ErrorNotice error={error} />
      {/* Everything to do with it, at the card's foot where reading it
          ends: talking it over at the left; at the right dismissing it and
          accepting all of it, whose hover lists what that does. Its parts
          have their own actions where they are drawn: the email its send,
          the fields their writing. */}
      {entry.status === 'pending' && verdict && (
        <div className='grid gap-3 border-t border-border pt-3'>
          {/* First, redoing it in a sentence: the row stays without a model,
              its button greyed. */}
          {editable && (
            <div className='flex'>
              {/* Redo the card in a sentence: another channel, another time,
              something the AI did not know. Questions that change nothing
              go to the chat ("Ask AI") instead. */}
              {editable && (
                // The words, one line to start and growing, with the review
                // dialog's adjust button at their right.
                <form
                  className='flex min-w-0 flex-1 items-end gap-2'
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (meta?.assistant && instruction.trim()) void revise();
                  }}
                >
                  {/* Grows with what is typed; Enter sends, Shift+Enter starts
                  a new line. */}
                  <Textarea
                    value={instruction}
                    maxLength={1000}
                    rows={1}
                    placeholder={toText(text('evaluation.revisePlaceholder'))}
                    aria-label={toText(text('evaluation.revise'))}
                    disabled={Boolean(busy)}
                    onChange={(event) => setInstruction(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        if (meta?.assistant && instruction.trim())
                          void revise();
                      }
                    }}
                    // One line as tall as a small button (h-7), whatever the
                    // theme's scale: its padding is what the line and border
                    // leave of that height. More lines grow it.
                    className='max-h-40 min-h-7 resize-none bg-background py-[calc((var(--spacing)*7-1lh-2px)/2)]'
                  />
                  <ReviseButton
                    asks={Boolean(meta?.assistant)}
                    busy={Boolean(busy)}
                    revising={busy === 'revise'}
                    empty={!instruction.trim()}
                  />
                </form>
              )}
            </div>
          )}
          <div className='flex flex-wrap items-center justify-end gap-2'>
            {/* At its left: talking it over with the AI, a conversation of
              its own that changes nothing. */}
            <span className='mr-auto flex items-center gap-1'>
              <DiscussButton
                pins={[
                  recordPin(entity, recordId, recordName ?? ''),
                  cardPin(
                    entry.id,
                    `${words(entity, 'suggestion', 'evaluation.title')} · ${label(verdict)}`,
                  ),
                ]}
              />
            </span>
            {editable && (
              <>
                <Button
                  size='sm'
                  variant='ghost'
                  disabled={Boolean(busy)}
                  onClick={() => void decide('dismiss')}
                >
                  {busy === 'dismiss' ? <Spinner /> : <X />}
                  {text('evaluation.dismiss')}
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size='sm'
                        className='bg-primary text-primary-foreground hover:bg-primary/90'
                        disabled={
                          Boolean(busy) ||
                          (reporting && !toText(plan.outcome).trim())
                        }
                        onClick={() =>
                          // An email to send goes from its draft, as it
                          // stands, the ticked fields written first.
                          emailsNext(verdict) && canMail
                            ? void emailSendRef.current?.(true)
                            : verdict.recommendation === 'convert'
                              ? void convert()
                              : submitting.length
                                ? setConfirmingApprovals(true)
                                : void decide('accept')
                        }
                      />
                    }
                  >
                    {busy === 'accept' ? <Spinner /> : <Check />}
                    {text('evaluation.acceptAll')}
                  </TooltipTrigger>
                  <TooltipContent className='max-w-80 flex-col items-start gap-1'>
                    <p className='font-medium'>
                      {text('evaluation.will.title')}
                    </p>
                    <ul className='list-disc space-y-0.5 pl-4'>
                      {willDo.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      )}
      {converting && verdict && !isDeal(verdict) && (
        <ConvertFromVerdict
          leadId={recordId}
          opportunity={verdict.opportunity ?? null}
          onClose={() => setConverting(false)}
          onConverted={() =>
            api(`${base}/evaluations/${entry.id}/decide`, 'POST', {
              decision: 'accept',
            }).then(onChanged)
          }
        />
      )}
      {/* Submitting approvals notifies their approvers: said and confirmed
          before the accept goes. */}
      <Dialog
        open={confirmingApprovals}
        onOpenChange={(open) => {
          if (!open && busy !== 'accept') setConfirmingApprovals(false);
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {text('evaluation.deal.confirmTitle', {
                count: submitting.length,
              })}
            </DialogTitle>
            <DialogDescription>
              {text('evaluation.deal.confirmHint')}
            </DialogDescription>
          </DialogHeader>
          <ul className='grid gap-2 text-sm'>
            {submitting.map((approval) => (
              <li
                key={`${approval.topic}-${approval.name}`}
                className='flex items-center gap-2'
              >
                <Badge variant='warning'>
                  {text(`options.${approval.topic}`, {
                    defaultValue: approval.topic,
                  })}
                </Badge>
                <span className='min-w-0 flex-1 truncate'>{approval.name}</span>
                <span className='shrink-0 text-muted-foreground'>
                  {text('fields.approverId')}
                  {language.startsWith('zh') ? '：' : ': '}
                  {approval.approver}
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              variant='outline'
              disabled={busy === 'accept'}
              onClick={() => setConfirmingApprovals(false)}
            >
              {text('cancel')}
            </Button>
            <Button
              className='bg-primary text-primary-foreground hover:bg-primary/90'
              disabled={busy === 'accept'}
              onClick={() =>
                void decide('accept').then(() => setConfirmingApprovals(false))
              }
            >
              {busy === 'accept' && <Spinner />}
              {text('evaluation.deal.confirmSubmit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// Whether the next step is an email to write now (from the card), which
// plans no task.
function emailsNext(verdict: AnyVerdict): boolean {
  return Boolean(
    stepsNext(verdict) &&
    verdict.nextStep?.type === 'email' &&
    !verdict.nextStep.taskId,
  );
}

// Whether accepting a verdict plans a task: a lead's next contact or
// nurture review, a deal's next step (advancing or keeping at it), its
// resumption when paused, or a visit after it is lost. An email is no task.
function plansTask(verdict: AnyVerdict): boolean {
  if (emailsNext(verdict)) return false;
  if (isDeal(verdict))
    return Boolean(
      ((verdict.recommendation === 'advance' ||
        verdict.recommendation === 'continue') &&
        verdict.nextStep) ||
      (verdict.recommendation === 'pause' && verdict.resumeInDays) ||
      (verdict.recommendation === 'lose' && verdict.revisitInDays),
    );
  return Boolean(
    (verdict.recommendation === 'follow' && verdict.nextStep) ||
    (verdict.recommendation === 'nurture' && verdict.reviewInDays),
  );
}

// Whether the verdict's next step is the contact to make (a lead followed
// up, a deal advanced or kept at), rather than a task to come back later.
function stepsNext(verdict: AnyVerdict): boolean {
  return Boolean(
    verdict.nextStep &&
    (verdict.recommendation === 'follow' ||
      verdict.recommendation === 'advance' ||
      verdict.recommendation === 'continue'),
  );
}

// The task a waiting card's accept creates: what the verdict proposes,
// or what the person set here.
interface Plan {
  name: string;
  // An instant (ISO).
  dueAt: string;
  ownerId: string;
  // Markdown, as the task will hold it.
  description: string;
  // An overdue task the step carries on: done, with what came of it,
  // or not yet, and moved.
  mode?: 'report' | 'reschedule';
  outcome?: string;
  // Its outcome recorded, whether the AI follows the lead up anew.
  followUp?: boolean;
}

// What accepting does to the planned task a step carries on: each part
// of its description added, changed or kept, and which of its fields the
// card changes; nothing at all when the task is ready as it is.
function carriedChanges(
  existing: CrmRecord,
  verdict: AnyVerdict,
  plan: Partial<Plan>,
  overdue: boolean,
): {
  parts: Partial<Record<PlanPart, 'added' | 'changed' | 'kept'>>;
  edited: boolean;
  fields: (keyof Plan)[];
  none: boolean;
} {
  const description = toText(existing.description);
  // The person's own words over the parts: what they wrote is the change.
  const edited =
    typeof plan.description === 'string' &&
    plan.description.trim() !== description.trim();
  const parts = edited ? {} : planPartChanges(description, verdict);
  // The owner as the person set it, else as the AI gave it.
  const wanted = (key: 'name' | 'ownerId'): string | undefined =>
    key === 'ownerId'
      ? (plan.ownerId ?? verdict.nextStep?.ownerId ?? undefined)
      : plan[key];
  const fields = (['name', 'ownerId', 'dueAt'] as const).filter((key) =>
    key === 'dueAt'
      ? overdue ||
        (plan.dueAt !== undefined &&
          new Date(plan.dueAt).getTime() !==
            new Date(toText(existing.dueAt)).getTime())
      : wanted(key) !== undefined && wanted(key) !== toText(existing[key]),
  );
  return {
    parts,
    edited,
    fields,
    none:
      !edited &&
      !fields.length &&
      Object.values(parts).every((change) => change === 'kept'),
  };
}

// The task accepting creates, laid out as the task it will be:
// its title, when and whose, each changeable before accepting; the
// preparation, questions and email draft go into its description. A lead
// to follow up gets the next step, one to nurture its review task; a deal
// its next step, or the task to resume it (paused) or look in again (lost).
function PlannedTask({
  verdict,
  entity,
  recordId,
  plan,
  onPlan,
  disabled,
  existing,
  overdue = false,
}: {
  verdict: AnyVerdict;
  entity: FollowedEntity;
  recordId: string;
  plan: Partial<Plan>;
  onPlan: (plan: Partial<Plan>) => void;
  disabled: boolean;
  // The planned task the step carries on, and whether its time has gone.
  existing?: CrmRecord;
  overdue?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const { data: followed } = useRecord(entity, recordId);
  // The field open for editing, and the plan as it was when it opened, for
  // Escape to go back to.
  const [editing, setEditing] = useState<keyof Plan | null>(null);
  // The start's date and time popup holds focus while open, so leaving the
  // text for it is not leaving the field; closing it is.
  const timePopupRef = useRef(false);
  const [before, setBefore] = useState<Partial<Plan>>({});
  if (!meta) return null;
  const follow = stepsNext(verdict);
  const record = followed?.record;
  // A task to come back to the record: when, and what it is called (the
  // server names it so when the name is left as it is).
  const later = isDeal(verdict)
    ? verdict.recommendation === 'pause'
      ? { inDays: verdict.resumeInDays, name: 'evaluation.deal.resumeName' }
      : { inDays: verdict.revisitInDays, name: 'evaluation.deal.revisitName' }
    : { inDays: verdict.reviewInDays, name: 'evaluation.reviewName' };
  // What the server plans when nothing here is changed.
  // Carrying on a task: its own values, its time moved only when it is
  // overdue, what to prepare added to what it says.
  const added = follow
    ? planDescription(verdict, language.startsWith('zh'))
    : '';
  const proposed: Plan = existing
    ? {
        name: toText(existing.name),
        dueAt: overdue
          ? contactTime(
              verdict.nextStep?.inDays ?? 0,
              meta.settings.timeZone,
            ).toISOString()
          : toText(existing.dueAt),
        ownerId: toText(verdict.nextStep?.ownerId || existing.ownerId),
        // This follow-up's parts in place of an earlier one's.
        description: mergePlanDescription(
          toText(existing.description),
          verdict,
          language.startsWith('zh'),
        ),
      }
    : {
        name: follow
          ? (verdict.nextStep?.subject ?? '')
          : `${toText(
              entity === 'leads'
                ? record?.company || record?.name
                : record?.name,
            )} ${toText(text(later.name))}`,
        dueAt: contactTime(
          (follow ? verdict.nextStep?.inDays : later.inDays) ?? 0,
          meta.settings.timeZone,
        ).toISOString(),
        // Whom the AI gave it to, else the record's owner.
        ownerId: toText(
          (follow && verdict.nextStep?.ownerId) ||
            record?.ownerId ||
            meta.userId,
        ),
        // A review task starts with none; a follow-up with what to prepare,
        // ask and send.
        description: added,
      };
  const value = { ...proposed, ...plan };
  // Done or not yet: done by default once its time has gone.
  const mode = plan.mode ?? (overdue ? 'report' : 'reschedule');
  // Telling what came of the task: it is shown as it was.
  const reporting = Boolean(existing) && mode === 'report';
  const set = (key: keyof Plan, next: string): void =>
    onPlan({ ...plan, [key]: next });
  // Sellers own tasks, as the task form offers them.
  const owners = meta.users
    .filter(
      (u) =>
        !u.disabled &&
        u.roles.some((r) =>
          ['sales-representative', 'sales-manager'].includes(r),
        ),
    )
    .map((u) => ({ value: u.id, label: u.name }));
  const open = (key: keyof Plan): void => {
    setBefore(plan);
    setEditing(key);
  };
  const close = (): void => setEditing(null);
  // A text input's keys: Enter (outside a long text) keeps the value,
  // Escape takes it back.
  const keys = (event: KeyboardEvent<HTMLElement>, multiline = false) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onPlan(before);
      close();
    } else if (
      event.key === 'Enter' &&
      !multiline &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      close();
    }
  };
  // One row: its value as it reads, opened for editing by a double-click,
  // or Enter or F2 with focus, as every field of a record is.
  const row = (
    key: keyof Plan,
    label: string,
    shown: ReactNode,
    editor: ReactNode,
    editableField = true,
  ): ReactNode => {
    const canEdit = editableField && !reporting;
    return (
      <Fragment key={key}>
        <dt
          className={`text-muted-foreground ${key === 'description' ? 'self-start pt-1' : ''}`}
        >
          {label}
        </dt>
        <dd className='min-w-0'>
          {editing === key ? (
            editor
          ) : (
            <div
              role={canEdit && !disabled ? 'button' : undefined}
              tabIndex={canEdit && !disabled ? 0 : undefined}
              aria-label={canEdit && !disabled ? label : undefined}
              className={`-mx-2 min-h-7 rounded-md px-2 py-1 ${
                canEdit && !disabled
                  ? 'cursor-text transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  : ''
              }`}
              onDoubleClick={canEdit && !disabled ? () => open(key) : undefined}
              onKeyDown={(event) => {
                if (
                  canEdit &&
                  !disabled &&
                  (event.key === 'Enter' || event.key === 'F2')
                ) {
                  event.preventDefault();
                  open(key);
                }
              }}
            >
              {shown}
            </div>
          )}
        </dd>
      </Fragment>
    );
  };
  return (
    <div className='grid gap-2 rounded-lg border border-border bg-background/60 p-3'>
      <p className='flex items-center gap-1.5 font-medium'>
        <CalendarPlus className='size-4 text-muted-foreground' />
        {text(
          !existing
            ? 'evaluation.plannedTask'
            : overdue
              ? 'evaluation.overdueTask'
              : 'evaluation.existingTask',
        )}
      </p>
      {/* What accepting changes on the task, or that it changes
          nothing. */}
      {existing && !reporting
        ? (() => {
            const changes = carriedChanges(existing, verdict, plan, overdue);
            if (changes.none)
              return (
                <p className='text-muted-foreground'>
                  {text('evaluation.noChange')}
                </p>
              );
            const colon = language.startsWith('zh') ? '：' : ': ';
            const items = [
              ...changes.fields.map(
                (key) =>
                  `${toText(text(key === 'ownerId' ? 'fields.ownerId' : `fields.${key}`))} ${toText(text('evaluation.change.changed'))}`,
              ),
              ...(changes.edited
                ? [
                    `${toText(text('fields.description'))} ${toText(text('evaluation.change.changed'))}`,
                  ]
                : (
                    Object.entries(changes.parts) as [
                      PlanPart,
                      'added' | 'changed' | 'kept',
                    ][]
                  ).map(
                    ([part, change]) =>
                      `${toText(text(`evaluation.${part}`))} ${toText(text(`evaluation.change.${change}`))}`,
                  )),
            ];
            return (
              <p className='text-muted-foreground'>
                {text('evaluation.afterAccept')}
                {colon}
                {items.join(' · ')}
              </p>
            );
          })()
        : null}
      {/* A task already planned: done (and what came of it), or not
          yet (prepared for, or, overdue, moved). */}
      {existing ? (
        // A segmented choice, as the timeline's filter: the one chosen
        // raised on white and bold, the other muted.
        <div
          role='radiogroup'
          aria-label={toText(text('evaluation.doneOrNot'))}
          className='flex w-fit gap-1 rounded-lg bg-muted p-0.5'
        >
          {(['report', 'reschedule'] as const).map((choice) => (
            <Button
              key={choice}
              type='button'
              size='sm'
              variant='ghost'
              role='radio'
              aria-checked={mode === choice}
              disabled={disabled}
              className={`h-7 px-3 ${
                mode === choice
                  ? 'bg-background font-medium text-foreground shadow-sm hover:bg-background'
                  : 'text-muted-foreground'
              }`}
              onClick={() => onPlan({ ...plan, mode: choice })}
            >
              {text(
                `evaluation.${
                  choice === 'report'
                    ? 'done'
                    : overdue
                      ? 'notDone'
                      : 'notDoneYet'
                }`,
              )}
            </Button>
          ))}
        </div>
      ) : null}
      {/* The task as it stands, always: changeable when it is to be
          planned or moved, only read when its outcome is being told. */}
      <dl className='grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5'>
        {row(
          'name',
          toText(text('fields.name')),
          value.name,
          <Input
            autoFocus
            value={value.name}
            maxLength={255}
            aria-label={toText(text('fields.name'))}
            onChange={(event) => set('name', event.target.value)}
            onBlur={close}
            onKeyDown={(event) => keys(event)}
          />,
        )}
        {row(
          'dueAt',
          toText(text('fields.dueAt')),
          localDate(
            reporting && existing ? toText(existing.dueAt) : value.dueAt,
            language,
            meta.settings.timeZone,
          ),
          <div
            onBlur={(event) => {
              if (
                !timePopupRef.current &&
                !event.currentTarget.contains(event.relatedTarget)
              )
                close();
            }}
          >
            <DateTimeInput
              autoFocus
              label={toText(text('fields.dueAt'))}
              value={value.dueAt}
              onChange={(at) => {
                if (at) set('dueAt', at);
              }}
              onOpenChange={(isOpen) => {
                timePopupRef.current = isOpen;
                if (!isOpen) close();
              }}
              onKeyDown={(event) => keys(event)}
            />
          </div>,
        )}
        {/* Another owner only for whoever may assign records. */}
        {row(
          'ownerId',
          toText(text('fields.ownerId')),
          owners.find((o) => o.value === value.ownerId)?.label ??
            meta.users.find((u) => u.id === value.ownerId)?.name ??
            '',
          <Choice
            label={toText(text('fields.ownerId'))}
            value={value.ownerId}
            choices={owners}
            defaultOpen
            onOpenChange={(isOpen) => !isOpen && close()}
            onChange={(v) => {
              if (v) set('ownerId', v);
              close();
            }}
          />,
          meta.assign,
        )}
        {/* What the task will hold, Markdown, as it will be saved. */}
        {row(
          'description',
          toText(text('fields.description')),
          value.description ? (
            <LongText value={value.description} />
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
          <Textarea
            autoFocus
            value={value.description}
            maxLength={LONG_TEXT_LIMIT}
            aria-label={toText(text('fields.description'))}
            onChange={(event) => set('description', event.target.value)}
            onBlur={close}
            onKeyDown={(event) => keys(event, true)}
            className='max-h-72 min-h-16 bg-background'
          />,
        )}
      </dl>
      {reporting && existing ? (
        <OutcomeBox
          taskId={toText(existing.id)}
          value={toText(plan.outcome)}
          onChange={(outcome) => onPlan({ ...plan, outcome })}
          disabled={disabled}
          followUp={plan.followUp ?? true}
          onFollowUp={(followUp) => onPlan({ ...plan, followUp })}
          followUpBy={entity}
        />
      ) : null}
    </div>
  );
}

// The conversion dialog for an accepted conversion proposal, once the lead
// is read, with the proposed opportunity filled in.
function ConvertFromVerdict({
  leadId,
  opportunity,
  onClose,
  onConverted,
}: {
  leadId: string;
  opportunity: Verdict['opportunity'];
  onClose: () => void;
  onConverted: () => Promise<unknown>;
}): ReactElement | null {
  const { data } = useRecord('leads', leadId);
  if (!data?.record) return null;
  return (
    <ConvertDialog
      lead={data.record}
      initial={
        opportunity
          ? {
              opportunityName: opportunity.name,
              amount: opportunity.amount,
              currency: opportunity.currency ?? null,
            }
          : undefined
      }
      onClose={onClose}
      onConverted={onConverted}
    />
  );
}

// An AI entry's summary on its line in the activity feed: what the AI
// concluded and what became of it. Opened, the entry shows the evaluation's
// own card (VerdictPanel), read-only.
export function EvaluationFeedEntry({
  entry,
}: {
  entry: { aiStatus?: unknown; ai?: unknown };
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const label = useVerdictLabel();
  const ai = (entry.ai ?? {}) as EvaluationEntry['ai'];
  const status = toText(entry.aiStatus);
  const name = (id: string | undefined): string =>
    meta?.users.find((u) => u.id === id)?.name ?? '';
  const when = (at: string | undefined): string =>
    localDate(at, language, meta?.settings.timeZone ?? DEFAULT_TIME_ZONE);
  // One line on the timeline: the verdict, cut if it must be, and its
  // status; who decided and when on hover, as the line has no room.
  return (
    <>
      {ai.result && (
        <span className='min-w-0 truncate'>{label(ai.result)}</span>
      )}
      <Badge
        variant={
          status === 'pending'
            ? 'ai'
            : status === 'accepted'
              ? 'success'
              : 'muted'
        }
        title={
          (status === 'accepted' || status === 'dismissed') && ai.decidedAt
            ? `${name(ai.decidedById)} · ${when(ai.decidedAt)}`
            : undefined
        }
      >
        {text(`evaluation.statuses.${status}`)}
      </Badge>
    </>
  );
}

// A lead card's web look-up of the company (lead-research.ts): a line
// saying when it was made and how many pages it read, opening on what it
// found, its [ref_n] marks linking those pages; or a line saying why a
// look-up due this time was not made. Nothing on a card that needed none.
function WebResearch({
  entry,
}: {
  entry: EvaluationEntry;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const { research, researchMiss } = entry.ai;
  if (!meta) return null;
  if (!research)
    return researchMiss ? (
      <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
        <Globe aria-hidden className='size-3.5 shrink-0' />
        {text(`evaluation.research.${researchMiss}`)}
      </p>
    ) : null;
  const pages = new Map(research.pages.map((page) => [page.index, page]));
  // Each mark a link to its page, numbered as the list below.
  const cited = research.text.replace(/\[ref_(\d+)\]/gu, (_mark, n: string) => {
    const page = pages.get(Number(n));
    return page ? `[[${n}]](${page.url})` : '';
  });
  return (
    <Collapsible className='grid gap-2'>
      <CollapsibleTrigger className='group flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
        <Globe aria-hidden className='size-3.5 shrink-0' />
        {text('evaluation.research.done', {
          time: localDate(research.at, language, meta.settings.timeZone),
          count: research.pages.length,
        })}
        <ChevronRight
          aria-hidden
          className='size-3.5 transition-transform group-data-[panel-open]:rotate-90'
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='grid gap-2 rounded-lg border border-border bg-background/60 p-3'>
        <Markdown compact newTab className='break-words'>
          {cited}
        </Markdown>
        {research.pages.length > 0 && (
          <ol className='grid gap-0.5 border-t border-border pt-2 text-xs'>
            {research.pages.map((page) => (
              <li key={page.index} className='flex min-w-0 gap-1.5'>
                <span className='text-muted-foreground'>{page.index}.</span>
                <a
                  href={page.url}
                  target='_blank'
                  rel='noreferrer'
                  className='min-w-0 truncate text-primary hover:underline'
                  title={page.url}
                >
                  {page.title}
                </a>
                {page.site && (
                  <span className='shrink-0 text-muted-foreground'>
                    {page.site}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// The web findings on an evaluation: each field's value now and the one
// found, with its source, to be written into the lead as picked. A field the
// lead leaves empty is picked by default; one where the lead already holds a
// different value is the person's to choose (the AI never overwrites what
// a person entered). Written once, then shown as done.
function Findings({
  entry,
  entity,
  recordId,
  editable,
  onChanged,
  picked,
  onPick,
}: {
  entry: EvaluationEntry;
  // A lead's findings fill the lead; a deal's fill its company.
  entity: FollowedEntity;
  recordId: string;
  editable: boolean;
  onChanged: () => Promise<unknown>;
  // Kept by the card, whose "accept all" writes them too.
  picked: ReadonlySet<string>;
  onPick: (next: ReadonlySet<string>) => void;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const result = entry.ai.result;
  const findings = result?.enrich ?? [];
  // The object the findings are written into.
  const target = entity === 'leads' ? 'leads' : 'companies';
  // The ticked findings (a deal's card ticks its updates in the same set).
  const chosen = findings
    .filter((f) => picked.has(f.field))
    .map((f) => f.field);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  if (!meta) return null;
  const fields = meta.definitions[target].fields;
  const country = findings.find((f) => f.field === 'country')?.value;
  const done = entry.ai.enrichedAt;
  // A long text as running text, not its folding block, so a finding
  // reads as one passage: old → new, then the source.
  const shown = (field: string, value: string | null) => {
    if (value === null) return <span className='text-muted-foreground'>—</span>;
    const definition = fields.find((f) => f.key === field) ?? { key: field };
    return (
      <Value
        record={{ id: recordId, country, [field]: value } as never}
        field={
          'type' in definition && definition.type === 'textarea'
            ? { ...definition, type: 'text' }
            : definition
        }
      />
    );
  };
  return (
    <div className='grid gap-1.5 rounded-lg border border-border bg-background/60 p-3'>
      <div className='flex items-center gap-1.5 font-medium'>
        {/* Found on the web, or read from the CRM's own material too: a
            lead's suggestions may be both. */}
        {findings.every((finding) => finding.source) ? (
          <Globe className='size-4 text-muted-foreground' />
        ) : (
          <PencilLine className='size-4 text-muted-foreground' />
        )}
        {text(
          entity !== 'leads'
            ? 'evaluation.findingsCompany'
            : findings.every((finding) => finding.source)
              ? 'evaluation.findings'
              : 'evaluation.fieldSuggestions',
        )}
        {done && (
          <span className='text-xs font-normal text-muted-foreground'>
            {text('evaluation.findingsDone', {
              name:
                meta.users.find((u) => u.id === entry.ai.enrichedById)?.name ??
                '',
              time: localDate(done, language, meta.settings.timeZone),
            })}
          </span>
        )}
        {/* Writing the ticked ones on their own, at the heading's end; the
            card's "accept all" writes them too. */}
        {editable && !done && (
          <Button
            size='xs'
            variant='outline'
            // Plainly a button on the card's tint: the AI's colour on its
            // border and text, on the card's white.
            className='-my-1 ml-auto border-primary/40 bg-card font-medium text-primary hover:bg-primary/10 hover:text-primary'
            disabled={busy || chosen.length === 0}
            onClick={() => {
              setBusy(true);
              setError(undefined);
              api(
                `${entity}/${recordId}/evaluations/${entry.id}/enrich`,
                'POST',
                {
                  fields: chosen,
                },
              )
                .then(() => onChanged())
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            {busy ? <Spinner /> : <PencilLine />}
            {text(
              entity === 'leads'
                ? 'evaluation.writePicked'
                : 'evaluation.writePickedCompany',
              { count: chosen.length },
            )}
          </Button>
        )}
      </div>
      <ul className='grid gap-1'>
        {findings.map((finding) => (
          <li
            key={finding.field}
            className='grid grid-cols-[1.25rem_7rem_minmax(0,1fr)] items-start gap-2'
          >
            <Checkbox
              className='mt-0.5'
              aria-label={text(fieldLabelKey(target, finding.field))}
              // Written: what was written. Still to decide: what is ticked.
              // Decided without writing: nothing.
              checked={
                done
                  ? Boolean(entry.ai.enrichedFields?.includes(finding.field))
                  : editable && picked.has(finding.field)
              }
              disabled={Boolean(done) || !editable || busy}
              onCheckedChange={(on) => {
                const next = new Set(picked);
                if (on) next.add(finding.field);
                else next.delete(finding.field);
                onPick(next);
              }}
            />
            <span className='text-muted-foreground'>
              {text(fieldLabelKey(target, finding.field))}
            </span>
            {/* Inline, not a row of boxes: a long value wraps as text, the
                arrow and the source staying beside the words they follow. */}
            <span className='min-w-0 break-words'>
              {finding.current !== null && (
                <>
                  {/* What it replaces, cut to a line's worth: only that it
                      differs needs reading here (the whole on hover). */}
                  <span
                    className='text-muted-foreground line-through'
                    title={finding.current}
                  >
                    {shown(finding.field, clip(finding.current, 20))}
                  </span>
                  <span className='mx-1.5 text-muted-foreground'>→</span>
                </>
              )}
              {shown(finding.field, finding.value)}
              {finding.source && (
                <a
                  href={finding.source}
                  target='_blank'
                  rel='noreferrer'
                  // Plain inline text, so it sits on the line's baseline (a
                  // centred flex box did not); the icon nudged to match.
                  className='ml-2 text-xs whitespace-nowrap text-primary hover:underline'
                >
                  <ExternalLink className='mr-0.5 inline size-3 align-[-1px]' />
                  {text('evaluation.source')}
                </a>
              )}
              {!finding.source && finding.basis && (
                <span className='ml-2 text-xs text-muted-foreground'>
                  {text('evaluation.basis', { basis: finding.basis })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <ErrorNotice error={error} />
    </div>
  );
}

// The email the next step proposes, to copy into the mail client: the CRM
// never sends it.
function EmailDraft({
  draft,
  heading,
}: {
  draft: { subject: string; body: string };
  heading?: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const [copied, setCopied] = useState(false);
  return (
    <div className='grid gap-1.5 rounded-lg border border-border bg-background/60 p-3'>
      <div className='flex items-start justify-between gap-2'>
        {heading ?? <span />}
        <Button
          size='xs'
          variant='ghost'
          className='-my-1 shrink-0'
          onClick={() => {
            void copyText(`${draft.subject}\n\n${draft.body}`).then(
              (copied) => {
                if (copied) setCopied(true);
              },
            );
          }}
        >
          <Copy />
          {text(copied ? 'evaluation.copied' : 'evaluation.copy')}
        </Button>
      </div>
      <p className='font-medium'>{draft.subject}</p>
      <p className='break-words whitespace-pre-wrap'>{draft.body}</p>
    </div>
  );
}

// An email box's heading, as the field updates' box is headed: the email
// to send, and when.
export function EmailHeading({ when }: { when?: string }): ReactElement {
  const { text } = useCrmText();
  return (
    <div className='flex items-center gap-1.5 font-medium'>
      <Mail className='size-4 text-muted-foreground' />
      {text('evaluation.emailToSend')}
      {when ? (
        <span className='font-normal text-muted-foreground'>· {when}</span>
      ) : null}
    </div>
  );
}

// What accepting a conversion would create, as the conversion dialog will
// start: the one matching company linked, else a new one from the lead's
// company, and likewise the contact at it; the proposed opportunity; and
// what the duplicate check found, so an empty check reads as done. The
// dialog confirms it all before anything is saved.
function ConversionPlan({
  leadId,
  verdict,
}: {
  leadId: string;
  verdict: Verdict;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const lead = useRecord('leads', leadId).data?.record;
  const preview = useCrmQuery<{
    companies: CrmRecord[];
    contacts: CrmRecord[];
    opportunities: CrmRecord[];
    titles: Record<string, string>;
  }>(`leads/${leadId}/previewConversion`);
  const zh = language.startsWith('zh');
  const quoted = (value: unknown): string =>
    zh ? `「${toText(value)}」` : `“${toText(value)}”`;
  const titles = preview.data?.titles ?? {};
  const companies = preview.data?.companies ?? [];
  const company = companies.length === 1 ? companies[0] : undefined;
  const contacts = (preview.data?.contacts ?? []).filter(
    (c) => !company || c.companyId === company.id,
  );
  const contact = company && contacts.length === 1 ? contacts[0] : undefined;
  const deals = preview.data?.opportunities ?? [];
  const links = (
    entity: 'companies' | 'contacts' | 'opportunities',
    records: CrmRecord[],
  ): ReactNode =>
    records.map((record, index) => (
      <Fragment key={toText(record.id)}>
        {index > 0 && (zh ? '、' : ', ')}
        <RecordLink
          entity={entity}
          record={{
            id: toText(record.id),
            name: titles[toText(record.id)] ?? toText(record.name),
          }}
        />
      </Fragment>
    ));
  const possible = (
    entity: 'companies' | 'contacts',
    records: CrmRecord[],
  ): ReactNode =>
    records.length > 0 && (
      <span className='block text-xs text-warning'>
        {text('evaluation.conversion.possible')} {links(entity, records)}
      </span>
    );
  const create = (value: unknown): ReactNode => (
    <>
      {text('evaluation.conversion.create')}
      {zh ? '' : ' '}
      {quoted(value)}
    </>
  );
  const link = (
    entity: 'companies' | 'contacts',
    record: CrmRecord,
  ): ReactNode => (
    <span className='inline-flex max-w-full min-w-0 items-center gap-1'>
      {text('evaluation.conversion.link')} {links(entity, [record])}
    </span>
  );
  return (
    <>
      <Row label={text('evaluation.conversion.company')}>
        {company ? link('companies', company) : create(lead?.company)}
        {!company && possible('companies', companies)}
      </Row>
      <Row label={text('evaluation.conversion.contact')}>
        {contact ? link('contacts', contact) : create(lead?.name)}
        {!contact && possible('contacts', contacts)}
      </Row>
      {verdict.opportunity && (
        <Row label={text('evaluation.opportunity')}>
          {verdict.opportunity.name}
          {/* In the currency the conversion starts the deal in. */}
          {verdict.opportunity.amount !== null
            ? ` · ${money(
                verdict.opportunity.amount,
                verdict.opportunity.currency ?? meta?.settings.currency,
                language,
              )}`
            : ''}
          {deals.length > 0 && (
            <span className='flex items-start gap-1 text-xs text-warning'>
              <TriangleAlert className='mt-0.5 size-3 shrink-0' />
              <span>
                {text('evaluation.conversion.openDeals')}{' '}
                {links('opportunities', deals)}
              </span>
            </span>
          )}
        </Row>
      )}
      {preview.data &&
        !companies.length &&
        !preview.data.contacts.length &&
        !deals.length && (
          <Row label={text('evaluation.conversion.duplicates')}>
            <span className='inline-flex items-center gap-1'>
              <Check className='size-3.5 text-success' />
              {text('evaluation.conversion.noDuplicates')}
            </span>
          </Row>
        )}
      <dd className='col-span-2 text-xs text-muted-foreground'>
        {text('evaluation.conversion.confirm')}
      </dd>
    </>
  );
}

// A model's way of saying nothing changed since the last follow-up.
const NO_CHANGE =
  /^(?:没有变化|无变化|暂无变化|无|没有|no changes?|nothing (?:has )?changed|none)[。.!！]?$/i;

// A long value cut to `length` characters, its end an ellipsis.
function clip(value: string, length: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length).trimEnd()}…` : flat;
}

// A labelled row of the verdict's list: the label, in the reader's
// punctuation, and its value.
// A card's row, label and value (also the approval review's,
// approval-review.tsx, so every AI card reads alike).
export function Row({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  // A value with a layout of its own (an email draft) under its label,
  // across the whole list rather than in the values' column.
  wide?: boolean;
}): ReactElement {
  const { language } = useCrmText();
  return (
    <>
      <dt className={`text-muted-foreground ${wide ? 'col-span-2' : ''}`}>
        {label}
        {language.startsWith('zh') ? '：' : ':'}
      </dt>
      <dd className={`min-w-0 ${wide ? 'col-span-2' : ''}`}>{children}</dd>
    </>
  );
}

// The verdict as a list, label and value per row, the labels in a column of
// their own: the reason, and with `full` what accepting does, the risks, the
// reasons, the edition and the questions. The card shows it while the
// verdict waits; the activity feed keeps it whole, for later reference.
function VerdictList({
  verdict,
  full,
  planned = false,
  conversion,
  emailStep,
}: {
  verdict: AnyVerdict;
  full: boolean;
  // An email to send as the next step, laid out to be changed and sent.
  emailStep?: ReactNode;
  // The next step or the review is laid out apart, to be changed there.
  planned?: boolean;
  // A waiting conversion: what it would create, in place of the opportunity.
  conversion?: ReactNode;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const list = (items: readonly string[]): ReactNode => (
    <ul className='list-disc space-y-0.5 pl-5'>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
  const deal = isDeal(verdict) ? verdict : undefined;
  const lead = isDeal(verdict) ? undefined : verdict;
  // What changed since last time, leaving out a model's "no change", which
  // says nothing.
  const changes = (verdict.changes ?? []).filter(
    (change) => !NO_CHANGE.test(change.trim()),
  );
  const inDays = (days: number): string =>
    toText(
      days > 0
        ? text('evaluation.inDays', { count: days })
        : text('evaluation.today'),
    );
  // The email box's heading: what it is, and when it goes.
  const emailHeading = (
    <EmailHeading
      when={verdict.nextStep ? inDays(verdict.nextStep.inDays) : undefined}
    />
  );

  return (
    <div className='grid gap-3'>
      {/* The reason, the card's conclusion, leads it as a sentence; the
          rest is the list under it. */}
      <div className='grid gap-2'>
        <p className='leading-relaxed font-medium text-foreground'>
          {verdict.summary}
        </p>
        {/* What it found, in a few sentences of its own, always shown;
            a card from before the AI wrote them shows the same as the list
            it had: what changed, its reasons, the edition, what to prepare
            and ask (those two shown in a planned task's description
            instead). */}
        {full && verdict.brief ? (
          <p className='leading-relaxed text-muted-foreground'>
            {verdict.brief}
          </p>
        ) : full ? (
          <dl className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2 empty:hidden'>
            {changes.length > 0 && (
              <Row label={text('evaluation.changes')}>
                {/* A model may write an empty side as null. */}
                {list(
                  changes.map((change) =>
                    change.replace(
                      /\b(?:null|undefined)\b/gi,
                      toText(text('evaluation.none')),
                    ),
                  ),
                )}
              </Row>
            )}
            {verdict.reasons.length > 0 && (
              <Row label={text('evaluation.reasons')}>
                {list(verdict.reasons)}
              </Row>
            )}
            {lead?.edition && (
              <Row label={text('evaluation.edition')}>{lead.edition}</Row>
            )}
            {!planned && verdict.prep && verdict.prep.length > 0 && (
              <Row label={text('evaluation.prep')}>{list(verdict.prep)}</Row>
            )}
            {!planned && verdict.questions.length > 0 && (
              <Row label={text('evaluation.questions')}>
                {list(verdict.questions)}
              </Row>
            )}
          </dl>
        ) : null}
      </div>
      {full && (
        <dl className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2'>
          {/* What accepting does: the contact it plans, the stage it moves
              to or the status it sets. */}
          {deal?.recommendation === 'advance' && deal.stage && (
            <Row label={text('fields.stage')}>
              {text('evaluation.deal.toStage', {
                stage: text(`options.${deal.stage}`),
              })}
            </Row>
          )}
          {planned ||
          // An email is its own box below, headed with when it goes.
          (verdict.nextStep?.type === 'email' &&
            verdict.email) ? null : stepsNext(verdict) && verdict.nextStep ? (
            <Row label={text('evaluation.nextStep')}>
              {text(
                verdict.nextStep.type === 'email'
                  ? 'evaluation.stepEmail'
                  : 'evaluation.stepTask',
              )}{' '}
              · {verdict.nextStep.subject} · {inDays(verdict.nextStep.inDays)}
            </Row>
          ) : lead?.recommendation === 'invalid' && lead.invalidReason ? (
            <Row label={text('fields.invalidReason')}>
              {text(`options.${lead.invalidReason}`)}
            </Row>
          ) : lead?.recommendation === 'convert' && conversion ? (
            conversion
          ) : lead?.recommendation === 'convert' && lead.opportunity ? (
            <Row label={text('evaluation.opportunity')}>
              {lead.opportunity.name}
              {lead.opportunity.amount !== null
                ? ` · ${money(
                    lead.opportunity.amount,
                    lead.opportunity.currency ?? meta?.settings.currency,
                    language,
                  )}`
                : ''}
            </Row>
          ) : lead?.recommendation === 'nurture' && lead.reviewInDays ? (
            <Row label={text('evaluation.review')}>
              {inDays(lead.reviewInDays)}
            </Row>
          ) : deal?.recommendation === 'pause' && deal.resumeInDays ? (
            <Row label={text('evaluation.deal.resume')}>
              {inDays(deal.resumeInDays)}
            </Row>
          ) : deal?.recommendation === 'lose' && deal.revisitInDays ? (
            <Row label={text('evaluation.deal.revisit')}>
              {inDays(deal.revisitInDays)}
            </Row>
          ) : null}
          {deal?.recommendation === 'pause' && deal.pauseReason && (
            <Row label={text('fields.pauseReason')}>
              {text(`options.${deal.pauseReason}`)}
            </Row>
          )}
          {deal?.recommendation === 'lose' && deal.lostReason && (
            <Row label={text('fields.lostReason')}>
              {text(`options.${deal.lostReason}`)}
            </Row>
          )}
          {deal && deal.risks.length > 0 && (
            <Row label={text('evaluation.deal.risks')}>{list(deal.risks)}</Row>
          )}
        </dl>
      )}
      {/* The email to send, a box of its own headed as the field updates'
          is: what accepting sends, and when. */}
      {full && !planned && verdict.email
        ? (emailStep ?? (
            <EmailDraft draft={verdict.email} heading={emailHeading} />
          ))
        : null}
    </div>
  );
}

// The approvals the AI would request before the customer is promised what
// needs them: each kept to start with and sent to a sales manager, both
// changeable; submitted with the accept, then marked.
// The customer's people the follow-up gives a part in the deal: each a role
// to set or change, a contact to add to the deal, or a person to create as
// the company's contact, with what shows it; ticked ones are written with
// the accept.
function DealContacts({
  entry,
  contacts,
  editable,
  off,
  onToggle,
}: {
  entry: EvaluationEntry;
  contacts: NonNullable<DealVerdict['contacts']>;
  editable: boolean;
  off: ReadonlySet<number>;
  onToggle: (off: ReadonlySet<number>) => void;
}): ReactElement {
  const { text } = useCrmText();
  const kept = new Set((entry.ai.keptContacts ?? []).map((k) => k.index));
  const role = (value: string): string =>
    text(`options.${value}`, { defaultValue: value });
  return (
    <div className='grid gap-1.5 rounded-lg border border-border bg-background/60 p-3'>
      <p className='font-medium'>{text('evaluation.deal.contacts')}</p>
      {contacts.map((person, index) => (
        <label
          key={`${person.contactId ?? person.name}-${String(index)}`}
          className='flex items-start gap-2'
        >
          {editable ? (
            <Checkbox
              className='mt-0.5'
              aria-label={person.contactName ?? person.name}
              checked={!off.has(index)}
              onCheckedChange={(on) => {
                const next = new Set(off);
                if (on) next.delete(index);
                else next.add(index);
                onToggle(next);
              }}
            />
          ) : kept.has(index) ? (
            <Check className='mt-0.5 size-4 shrink-0 text-success' />
          ) : (
            <span className='size-4 shrink-0' />
          )}
          <span className='min-w-0'>
            <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <span className='font-medium'>
                {person.contactName ?? person.name}
              </span>
              {!person.contactId ? (
                <Badge variant='ai'>{text('evaluation.deal.newContact')}</Badge>
              ) : person.currentRole === null ? (
                <Badge variant='muted'>
                  {text('evaluation.deal.addContact')}
                </Badge>
              ) : null}
              <span>
                {person.currentRole !== null && (
                  <>
                    <span className='text-muted-foreground line-through'>
                      {role(person.currentRole)}
                    </span>
                    <span className='mx-1 text-muted-foreground'>→</span>
                  </>
                )}
                <span className='font-medium'>{role(person.role)}</span>
              </span>
            </span>
            {/* What the follow-up knows of a person to create, and why. */}
            <span className='block text-xs text-muted-foreground'>
              {[
                !person.contactId ? person.jobTitle : null,
                !person.contactId ? person.phone : null,
                !person.contactId ? person.email : null,
                person.reason,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

// The deal's commercial terms, each with where it stands against the
// approvals: within the standards, approved (by which), awaiting approval,
// or needing it.
function DealTerms({
  terms,
}: {
  terms: NonNullable<DealVerdict['terms']>;
}): ReactElement {
  const { text } = useCrmText();
  const tone = {
    standard: 'muted',
    approved: 'success',
    pending: 'info',
    rejected: 'warning',
    needed: 'warning',
  } as const;
  return (
    <div className='grid gap-1.5 rounded-lg border border-border bg-background/60 p-3'>
      <p className='font-medium'>{text('evaluation.deal.terms')}</p>
      {terms.map((term) => (
        <div
          key={`${term.topic}-${term.term}`}
          className='flex flex-wrap items-center gap-2'
        >
          <KindTag value={term.topic} />
          <span className='min-w-0'>{term.term}</span>
          <Badge variant={tone[term.status]}>
            {text(`evaluation.deal.termStatus.${term.status}`)}
          </Badge>
          {term.approval && (
            <span className='text-xs text-muted-foreground'>
              {term.approval}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ProposedApprovals({
  entry,
  approvals,
  editable,
  picks,
  onPick,
}: {
  entry: EvaluationEntry;
  approvals: NonNullable<DealVerdict['approvals']>;
  editable: boolean;
  picks: Record<number, { on: boolean; approverId: string }>;
  onPick: (picks: Record<number, { on: boolean; approverId: string }>) => void;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text } = useCrmText();
  if (!meta) return null;
  const approvers = meta.users.filter(
    (u) => !u.disabled && u.canApprove && u.id !== meta.userId,
  );
  const submitted = new Map(
    (entry.ai.submittedApprovals ?? []).map((s) => [s.index, s.id]),
  );
  const pick = (index: number) => ({
    on: picks[index]?.on ?? true,
    approverId: picks[index]?.approverId || (approvers[0]?.id ?? ''),
  });
  return (
    <div className='grid gap-2 rounded-lg border border-border bg-background/60 p-3'>
      <p className='font-medium'>
        {text('evaluation.deal.approvals')}
        {editable && (
          <span className='ml-2 text-xs font-normal text-muted-foreground'>
            {text('evaluation.deal.approvalsHint')}
          </span>
        )}
      </p>
      {approvals.map((approval, index) => {
        const current = pick(index);
        const id = submitted.get(index);
        return (
          <div
            key={`${approval.topic}-${approval.name}`}
            className='flex items-start gap-2'
          >
            {editable ? (
              <Checkbox
                className='mt-0.5'
                aria-label={approval.name}
                checked={current.on}
                onCheckedChange={(value) =>
                  onPick({
                    ...picks,
                    [index]: { ...current, on: value === true },
                  })
                }
              />
            ) : id ? (
              <Check className='mt-0.5 size-4 shrink-0 text-success' />
            ) : (
              <span className='size-4 shrink-0' />
            )}
            <div className='grid min-w-0 flex-1 gap-1'>
              <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                <Badge variant='warning'>
                  {text(`options.${approval.topic}`, {
                    defaultValue: approval.topic,
                  })}
                </Badge>
                {id ? (
                  <RecordLink
                    entity='approvals'
                    record={{ id, name: approval.name }}
                  />
                ) : (
                  <span className='font-medium'>{approval.name}</span>
                )}
                {editable && current.on && (
                  <span className='ml-auto flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground'>
                    {text('fields.approverId')}
                    <Choice
                      value={current.approverId}
                      onChange={(value) =>
                        onPick({
                          ...picks,
                          [index]: { ...current, approverId: value },
                        })
                      }
                      choices={approvers.map((u) => ({
                        value: u.id,
                        label: u.name,
                      }))}
                      label={text('fields.approverId')}
                      variant='inline'
                      compact
                    />
                  </span>
                )}
              </div>
              <p className='text-xs whitespace-pre-wrap text-muted-foreground'>
                {approval.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// A deal's amount or expected close date the AI would change, each with
// why and what it holds now: ticked to start with, written with the accept;
// once decided, those written are marked.
function DealUpdates({
  entry,
  updates,
  currency,
  editable,
  picked,
  onPick,
}: {
  entry: EvaluationEntry;
  updates: DealVerdict['updates'];
  // The deal's currency, which an amount is in.
  currency?: string;
  editable: boolean;
  picked: ReadonlySet<string>;
  onPick: (picked: ReadonlySet<string>) => void;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  if (!meta) return null;
  // The new currency when the card changes it too, for the amount.
  const newCurrency = updates.find((u) => u.field === 'currency')?.value;
  const shown = (
    field: string,
    value: string | null,
    side: 'current' | 'value' = 'value',
  ): string =>
    value === null
      ? '—'
      : field === 'amount'
        ? money(
            value,
            (side === 'value' ? newCurrency : undefined) ??
              currency ??
              meta.settings.currency,
            language,
          )
        : field === 'expectedCloseAt'
          ? localDate(value, language, meta.settings.timeZone, false)
          : field === 'businessType' || field === 'source'
            ? text(`options.${value}`, { defaultValue: value })
            : field === 'description'
              ? markdownLine(value)
              : value;
  const written = new Set(entry.ai.updatedFields ?? []);
  return (
    <div className='grid gap-1.5 rounded-lg border border-border bg-background/60 p-3'>
      <p className='font-medium'>{text('evaluation.deal.updates')}</p>
      {updates.map((update) => (
        <label key={update.field} className='flex items-start gap-2'>
          {editable ? (
            <Checkbox
              className='mt-0.5'
              checked={picked.has(update.field)}
              onCheckedChange={(value) => {
                const next = new Set(picked);
                if (value) next.add(update.field);
                else next.delete(update.field);
                onPick(next);
              }}
            />
          ) : written.has(update.field) ? (
            <Check className='mt-0.5 size-4 shrink-0 text-success' />
          ) : (
            <span className='size-4 shrink-0' />
          )}
          <span className='min-w-0'>
            <span className='text-muted-foreground'>
              {text(`fields.${update.field}`)}
              {language.startsWith('zh') ? '：' : ': '}
            </span>
            {shown(update.field, update.current, 'current')}
            <span className='mx-1 text-muted-foreground'>→</span>
            <span className='font-medium'>
              {shown(update.field, update.value)}
            </span>
            <span className='block text-xs text-muted-foreground'>
              {update.reason}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
