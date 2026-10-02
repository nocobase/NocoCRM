import { useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { CrmFrame, ErrorNotice, Loading } from '../components/crm/common.js';
import {
  VerdictBadge,
  VerdictPanel,
  type EvaluationEntry,
} from '../components/crm/lead-evaluation.js';
import { recordTitle } from '../components/crm/lookups.js';
import { revealScrollbar } from '../components/crm/scrollbar.js';
import {
  localDate,
  sentence,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
} from '../components/crm/api.js';

// Handled: accepted or dismissed (a card being redone still waits).
const isDecided = (entry: EvaluationEntry): boolean =>
  entry.status === 'accepted' || entry.status === 'dismissed';

// A lead's or a deal's follow-up waiting on its decision, with the record
// it concerns.
interface EvaluationItem extends EvaluationEntry {
  entity: 'leads' | 'opportunities';
  lead?: {
    id: string;
    name: string;
    company: string | null;
    ownerId: string | null;
    status: string;
  };
  opportunity?: {
    id: string;
    name: string;
    account: string | null;
    ownerId: string | null;
    stage: string;
  };
}

// The record an item concerns, whichever it is.
const recordOf = (
  entry: EvaluationItem,
): { id: string; name: string; ownerId: string | null } =>
  (entry.lead ?? entry.opportunity)!;

// What waits on the reader (server/providers/crm/lead-evaluation.ts,
// pendingDecisions): the AI's follow-ups of leads and deals. The reader's
// own, or, for someone who may edit every lead, the team's. A list on the left,
// the chosen one on the right, decided there as on the lead's page. The
// assistant's cards in a conversation are decided there, not here: a card
// left undecided lapses once the conversation moves on.
export default function DecisionsPage(): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const [chosen, setChosen] = useState<string>();
  // Those waiting and, after them, those already decided.
  const path = `decisions?scope=${scope}&state=all&pageSize=100`;
  const query = useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () =>
      api<{ data: EvaluationItem[]; total: number; pending: number }>(path),
    // An evaluation finishing adds one; read again as the menu's count is,
    // and every few seconds while a card is being redone.
    refetchInterval: (query) =>
      query.state.data?.data.some((entry) => entry.status === 'running')
        ? 4000
        : 30000,
  });
  // Deciding for leads one does not own is for whoever may edit them all.
  const team = meta?.permissions.leads.update
    ? meta.permissions.leads.update.all === true
    : false;
  const items = query.data?.data ?? [];
  const pending = query.data?.pending ?? 0;
  // The chosen entry, or the first once it has been decided and left the
  // list.
  const current = items.find((entry) => entry.id === chosen) ?? items[0];
  const nameOf = (entry: EvaluationItem): string =>
    entry.lead
      ? recordTitle('leads', entry.lead as unknown as CrmRecord)
      : toText(entry.opportunity?.name);
  const kindOf = (entry: EvaluationItem): string =>
    sentence(text(`entity.${entry.entity}`));
  const ownerOf = (entry: EvaluationItem): string =>
    toText(meta?.users.find((u) => u.id === recordOf(entry).ownerId)?.name);
  const when = (at: string): string =>
    localDate(at, language, meta?.settings.timeZone ?? 'Asia/Shanghai');
  return (
    <CrmFrame
      fill
      title={
        <>
          {text('decisions.title')}
          {query.data && (
            <span className='ml-2 text-base font-normal text-muted-foreground'>
              {query.data.pending}
            </span>
          )}
        </>
      }
      description={text('decisions.description')}
      titleAside={
        team ? (
          <div className='flex rounded-lg border p-0.5'>
            {(['mine', 'team'] as const).map((value) => (
              <Button
                key={value}
                size='sm'
                variant={scope === value ? 'secondary' : 'ghost'}
                onClick={() => setScope(value)}
              >
                {text(value === 'mine' ? 'scopeMine' : 'scopeTeam')}
              </Button>
            ))}
          </div>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <Loading />
      ) : !query.data ? (
        <ErrorNotice error={query.error} />
      ) : !items.length || !current ? (
        <p className='rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground'>
          {text('decisions.empty')}
        </p>
      ) : (
        // Container query: the AI panel narrows this area, not the viewport.
        <div className='@container min-h-0 flex-1 pb-6'>
          <div className='grid h-full overflow-y-auto rounded-xl border bg-card scroll-quiet @3xl:grid-cols-[22rem_minmax(0,1fr)] @3xl:grid-rows-[minmax(0,1fr)] @3xl:overflow-hidden'>
            <ul
              className='border-b scroll-quiet @3xl:overflow-y-auto @3xl:border-r @3xl:border-b-0'
              onScroll={revealScrollbar}
            >
              {/* Nothing waiting, but decided ones below: say so first. */}
              {pending === 0 ? (
                <li className='border-b'>
                  <p className='border-b bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground'>
                    {text('decisions.waiting')} 0
                  </p>
                  <p className='px-4 py-3 text-sm text-muted-foreground'>
                    {text('decisions.empty')}
                  </p>
                </li>
              ) : null}
              {items.map((entry, index) => {
                const selected = entry.id === current.id;
                const decided = isDecided(entry);
                // A heading before those waiting and before the decided.
                const heading =
                  index === 0 || decided !== isDecided(items[index - 1])
                    ? decided
                      ? text('decisions.handled')
                      : `${toText(text('decisions.waiting'))} ${toText(pending)}`
                    : null;
                return (
                  <li key={entry.id} className='border-b last:border-b-0'>
                    {heading ? (
                      <p className='border-b bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground'>
                        {heading}
                      </p>
                    ) : null}
                    <button
                      type='button'
                      aria-current={selected}
                      onClick={() => setChosen(entry.id)}
                      className={`grid w-full gap-1 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                        selected
                          ? 'bg-muted shadow-[inset_2px_0_0_var(--ai)]'
                          : ''
                      }`}
                    >
                      <span className='flex items-center justify-between gap-2'>
                        {/* The record's type first, in plain muted text as
                            on the right, so the verdict is the one tag. */}
                        <span className='flex min-w-0 items-center gap-2'>
                          <span className='shrink-0 text-xs text-muted-foreground'>
                            {kindOf(entry)}
                          </span>
                          <span className='truncate font-medium'>
                            {nameOf(entry)}
                          </span>
                        </span>
                        <span className='shrink-0 text-xs text-muted-foreground tabular-nums'>
                          {/* The team's view names whose lead it is. */}
                          {scope === 'team' && ownerOf(entry)
                            ? `${ownerOf(entry)} · `
                            : ''}
                          {when(entry.createdAt)}
                        </span>
                      </span>
                      {/* The verdict, its reason straight after it; a
                          decided one says what became of it first. */}
                      {entry.status === 'running' && (
                        <span className='text-xs text-muted-foreground'>
                          {text(
                            entry.ai.instruction
                              ? 'evaluation.revising'
                              : 'evaluation.running',
                          )}
                        </span>
                      )}
                      {entry.ai.result && (
                        <span className='line-clamp-2 text-xs text-muted-foreground'>
                          {decided ? (
                            <>
                              <Badge
                                variant={
                                  entry.status === 'accepted'
                                    ? 'success'
                                    : 'muted'
                                }
                              >
                                {text(`evaluation.statuses.${entry.status}`)}
                              </Badge>{' '}
                            </>
                          ) : null}
                          <VerdictBadge
                            verdict={entry.ai.result}
                            pending={!decided}
                          />{' '}
                          {entry.ai.result.summary}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <section
              className='min-w-0 p-6 scroll-quiet @3xl:overflow-y-auto'
              onScroll={revealScrollbar}
            >
              <EvaluationDetail
                entry={current}
                onRevised={(next) => setChosen(next.id)}
                name={nameOf(current)}
                kind={kindOf(current)}
                owner={ownerOf(current)}
                when={when}
              />
            </section>
          </div>
        </div>
      )}
    </CrmFrame>
  );
}

// The heading of the right side: the name, then a line of labelled facts
// led by the record's type, set apart from what follows by a rule.
function DetailHeading({
  name,
  kind,
  facts,
  action,
}: {
  name: string;
  kind: string;
  facts: [label: string, value: string][];
  action: ReactElement;
}): ReactElement {
  const { text, language } = useCrmText();
  const colon = language.startsWith('zh') ? '：' : ':';
  return (
    <div className='mb-5 flex items-start justify-between gap-4 border-b pb-4'>
      <div className='grid min-w-0 gap-1'>
        <h2 className='truncate font-heading text-xl leading-tight font-semibold'>
          {name}
        </h2>
        {/* Labelled as the evaluation card's rows are. */}
        <dl className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
          {/* The record's type leads the line, unlabelled. */}
          {kind ? <dd className='text-muted-foreground'>{kind}</dd> : null}
          {facts
            .filter(([, value]) => value)
            .map(([label, value], index) => (
              <div key={label} className='flex min-w-0 items-center gap-3'>
                {kind || index > 0 ? (
                  <span aria-hidden className='h-3 w-px bg-border' />
                ) : null}
                <div className='flex min-w-0 gap-1'>
                  <dt className='shrink-0 text-muted-foreground'>
                    {text(label)}
                    {colon}
                  </dt>
                  <dd className='max-w-72 min-w-0 truncate tabular-nums'>
                    {value}
                  </dd>
                </div>
              </div>
            ))}
        </dl>
      </div>
      {action}
    </div>
  );
}

// A lead's or a deal's follow-up, decided here as on its page, or opened in
// its timeline, where it is brought into view and marked.
function EvaluationDetail({
  entry,
  name,
  kind,
  owner,
  when,
  onRevised,
}: {
  entry: EvaluationItem;
  onRevised: (entry: EvaluationEntry) => void;
  name: string;
  kind: string;
  owner: string;
  when: (at: string) => string;
}): ReactElement {
  const { text } = useCrmText();
  const refresh = useRefresh();
  return (
    <>
      <DetailHeading
        name={name}
        kind={kind}
        facts={[
          ...(entry.opportunity
            ? ([
                ['fields.accountId', toText(entry.opportunity.account)],
                [
                  'fields.stage',
                  toText(text(`options.${entry.opportunity.stage}`)),
                ],
              ] as [string, string][])
            : []),
          ['fields.ownerId', owner],
          ['decisions.evaluatedAt', when(entry.createdAt)],
        ]}
        action={
          <Button
            size='sm'
            variant='outline'
            nativeButton={false}
            render={
              <Link
                to={`/crm/${entry.entity}/${recordOf(entry).id}/history?focus=${entry.id}`}
              />
            }
          >
            <ArrowUpRight />
            {text('decisions.openRecord')}
          </Button>
        }
      />
      <VerdictPanel
        key={entry.id}
        entity={entry.entity}
        entry={entry}
        recordId={recordOf(entry).id}
        recordName={name}
        editable
        // Whole, waiting or decided, as the record's timeline shows it.
        full
        onRevised={onRevised}
        onChanged={async () => {
          await refresh();
        }}
      />
    </>
  );
}
