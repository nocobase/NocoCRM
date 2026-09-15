import { PAGE_SIZE, toText } from '../components/crm/api.js';
import { useState, type ReactElement } from 'react';
import { Button } from '../components/ui/button.js';
import { CrmFrame, ErrorNotice, Loading } from '../components/crm/common.js';
import { ActionCard } from '../components/crm/assistant.js';
import { useCrmQuery, useCrmText, type Data } from '../components/crm/api.js';

// Every status a settled action can end in. "executing" is a transient claim
// inside the execute transaction and never survives long enough to list.
const settledStatuses = ['executed', 'dismissed', 'superseded'] as const;
type Settled = (typeof settledStatuses)[number];

// The list is already in hand (history caps at 200), so paging is a display
// concern: show a page, reveal the next on demand.
function Cards({ actions, empty }: { actions: Data[]; empty: string }) {
  const { text } = useCrmText();
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = actions.slice(0, shown);
  return actions.length ? (
    <div className='space-y-4'>
      <div className='grid items-start gap-4 lg:grid-cols-2'>
        {visible.map((a) => (
          <ActionCard
            key={`${toText(a.id)}-${toText(JSON.stringify(a.input))}`}
            action={a}
          />
        ))}
      </div>
      {shown < actions.length && (
        <Button
          variant='outline'
          onClick={() => setShown((n) => n + PAGE_SIZE)}
        >
          {text('loadMore')}
          <span className='ml-1 tabular-nums text-muted-foreground'>
            {actions.length - shown}
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
  const { data, error, isLoading } = useCrmQuery<{ actions: Data[] }>(
    'ai/history',
  );
  const [filter, setFilter] = useState<Settled | 'all'>('executed');
  // Pending cards are the ones asking for a decision, so they lead; everything
  // already decided sits below as the record of what happened.
  const actions = data?.actions ?? [];
  const pending = actions.filter((a) => a.status === 'pending');
  const settled = actions.filter((a) => a.status !== 'pending');
  const shown =
    filter === 'all' ? settled : settled.filter((a) => a.status === filter);
  const count = (status: Settled | 'all'): number =>
    status === 'all'
      ? settled.length
      : settled.filter((a) => a.status === status).length;
  return (
    <CrmFrame
      title={text('actions')}
      description={text('actionsDescription')}
      assistant={false}
    >
      <ErrorNotice error={error} />
      {isLoading ? (
        <Loading />
      ) : (
        <div className='space-y-8'>
          <section className='space-y-3'>
            <h2 className='text-sm font-medium text-muted-foreground'>
              {text('actionPending')}
              <span className='ml-2 tabular-nums'>{pending.length}</span>
            </h2>
            <Cards actions={pending} empty={text('noPendingActions')} />
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
            <Cards
              key={filter}
              actions={shown}
              empty={text('noActionHistory')}
            />
          </section>
        </div>
      )}
    </CrmFrame>
  );
}
