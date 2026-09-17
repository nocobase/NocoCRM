import { PAGE_SIZE, toText } from '../components/crm/api.js';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { Button } from '../components/ui/button.js';
import { CrmFrame, ErrorNotice, Loading } from '../components/crm/common.js';
import { ActionCard } from '../components/crm/assistant.js';
import {
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  type Data,
} from '../components/crm/api.js';

// Every status a settled action can end in. "executing" is a transient claim
// inside the execute transaction and never survives long enough to list.
const settledStatuses = ['executed', 'dismissed', 'superseded'] as const;
type Settled = (typeof settledStatuses)[number];

interface ActionPage {
  data: Data[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
  titles: Record<string, string>;
}

// One status filter's actions, a page at a time from the server.
function useActions(status: string) {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const query = useInfiniteQuery({
    queryKey: [...scopeKey, 'ai/actions', status],
    queryFn: ({ pageParam }) =>
      api<ActionPage>(
        `ai/actions?status=${status}&page=${toText(pageParam)}&pageSize=${toText(PAGE_SIZE)}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
  const pages = query.data?.pages ?? [];
  return {
    query,
    actions: pages.flatMap((p) => p.data),
    total: pages[0]?.total ?? 0,
    counts: pages[0]?.counts ?? {},
    titles: pages.reduce<Record<string, string>>(
      (all, p) => ({ ...all, ...p.titles }),
      {},
    ),
  };
}

function Cards({
  list,
  empty,
}: {
  list: ReturnType<typeof useActions>;
  empty: string;
}): ReactElement {
  const { text } = useCrmText();
  const { actions, total, titles, query } = list;
  if (query.isLoading) return <Loading />;
  return actions.length ? (
    <div className='space-y-4'>
      <div className='grid items-start gap-4 lg:grid-cols-2'>
        {actions.map((a) => (
          <ActionCard
            key={`${toText(a.id)}-${toText(JSON.stringify(a.input))}`}
            action={a}
            titles={titles}
          />
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant='outline'
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {text('loadMore')}
          <span className='ml-1 tabular-nums text-muted-foreground'>
            {total - actions.length}
          </span>
        </Button>
      )}
    </div>
  ) : (
    <p className='rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground'>
      {empty}
    </p>
  );
}

export default function ActionsPage(): ReactElement {
  const { text } = useCrmText();
  const [filter, setFilter] = useState<Settled | 'all'>('executed');
  // Pending cards are the ones asking for a decision, so they lead; everything
  // already decided sits below as the record of what happened. Each is its
  // own paged list, and the status counts come with the first page.
  const pending = useActions('pending');
  const settled = useActions(filter === 'all' ? 'settled' : filter);
  const counts = { ...settled.counts, ...pending.counts };
  const count = (status: Settled | 'all'): number =>
    status === 'all'
      ? settledStatuses.reduce((n, s) => n + (counts[s] ?? 0), 0)
      : (counts[status] ?? 0);
  return (
    <CrmFrame
      title={text('actions')}
      description={text('actionsDescription')}
      assistant={false}
    >
      <ErrorNotice error={pending.query.error ?? settled.query.error} />
      <div className='space-y-8'>
        <section className='space-y-3'>
          <h2 className='text-sm font-medium text-muted-foreground'>
            {text('actionPending')}
            <span className='ml-2 tabular-nums'>{pending.total}</span>
          </h2>
          <Cards list={pending} empty={text('noPendingActions')} />
        </section>
        <section className='space-y-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='mr-2 text-sm font-medium text-muted-foreground'>
              {text('actionHistory')}
            </h2>
            {([...settledStatuses, 'all'] as const).map((status) => (
              <Button
                key={status}
                size='sm'
                variant={filter === status ? 'secondary' : 'ghost'}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? text('all') : text(`options.${status}`)}
                <span className='ml-1 tabular-nums text-muted-foreground'>
                  {count(status)}
                </span>
              </Button>
            ))}
          </div>
          <Cards list={settled} empty={text('noActionHistory')} />
        </section>
      </div>
    </CrmFrame>
  );
}
