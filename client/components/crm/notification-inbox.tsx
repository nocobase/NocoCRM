import { useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowUpRight, Bell } from 'lucide-react';
import { apiClientToken, useService } from '@nocobase/app-client';
import {
  fetchInbox,
  markInboxRead,
  mutateInboxItem,
  useNotificationInAppRuntime,
  type InboxItem,
  type InboxListResponse,
} from '@nocobase/app-plugin-notification-in-app/client';
import { Button } from '../ui/button.js';
import { Spinner } from '../ui/spinner.js';
import {
  localDate,
  PAGE_SIZE,
  toText,
  useCrmText,
  useMetadata,
} from './api.js';
import { ErrorNotice } from './common.js';
import { ConfirmDialog } from '../../pages/crm-detail.js';

// The notification centre's list, on the in-app plugin's public API rather
// than its ready-made inbox: that component brings its own page header
// (eyebrow, title, description) on top of the CRM frame's, and formats times
// with the browser's default clock. Here the page has one header, each item
// is its title plus the time and the record as a link, times read in the
// business timezone like everywhere else, and paging follows the CRM's rule.
export function NotificationInbox(): ReactElement {
  const client = useService(apiClientToken);
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const runtime = useNotificationInAppRuntime();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  // The first page follows the runtime's revision (a delivery, a read made
  // elsewhere); pages loaded on demand stay until the filter changes.
  const first = useQuery({
    queryKey: ['crm', 'inbox', unreadOnly, runtime.revision],
    queryFn: () => fetchInbox(client, { unreadOnly, limit: PAGE_SIZE }),
  });
  const [extra, setExtra] = useState<{
    unreadOnly: boolean;
    pages: InboxListResponse[];
  }>({ unreadOnly, pages: [] });
  // What this page changed itself, applied over what was fetched, so a
  // read or delete shows at once without dropping the pages already open.
  const [changed, setChanged] = useState<Record<string, InboxItem | null>>({});
  const [error, setError] = useState<unknown>();
  // The notification a delete has been asked for, awaiting confirmation.
  const [deleting, setDeleting] = useState<InboxItem>();
  const pages = [
    ...(first.data ? [first.data] : []),
    ...(extra.unreadOnly === unreadOnly ? extra.pages : []),
  ];
  const items = pages
    .flatMap((page) => page.data)
    .map((item) => (item.id in changed ? changed[item.id] : item))
    .filter((item): item is InboxItem => item !== null);
  const cursor = pages.at(-1)?.nextCursor;
  const loadMore = async (): Promise<void> => {
    try {
      const page = await fetchInbox(client, {
        unreadOnly,
        limit: PAGE_SIZE,
        cursor,
      });
      setExtra((current) => ({
        unreadOnly,
        pages: [
          ...(current.unreadOnly === unreadOnly ? current.pages : []),
          page,
        ],
      }));
    } catch (e) {
      setError(e);
    }
  };
  const mutate = async (
    item: InboxItem,
    action: 'read' | 'unread' | 'delete',
  ): Promise<void> => {
    try {
      const next = await mutateInboxItem(client, item.id, action);
      setChanged((all) => ({
        ...all,
        [item.id]: action === 'delete' ? null : next,
      }));
      runtime.refresh();
    } catch (e) {
      setError(e);
    }
  };
  // The record the message is about. New rows carry only its name as the
  // body; rows from before carried "title: name", so the title is stripped.
  const recordName = (item: InboxItem): string =>
    item.body.startsWith(item.title)
      ? item.body.slice(item.title.length).replace(/^[:：]\s*/, '')
      : item.body;
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex rounded-lg border p-0.5'>
          {([false, true] as const).map((value) => (
            <Button
              key={String(value)}
              size='sm'
              variant={unreadOnly === value ? 'secondary' : 'ghost'}
              onClick={() => setUnreadOnly(value)}
            >
              {value ? text('unreadOnly') : text('all')}
              {value && runtime.unreadCount > 0 && (
                <span className='ml-1 tabular-nums text-muted-foreground'>
                  {runtime.unreadCount}
                </span>
              )}
            </Button>
          ))}
        </div>
        {runtime.unreadCount > 0 && (
          <Button
            size='sm'
            variant='outline'
            onClick={() =>
              void markInboxRead(client)
                .then(() => {
                  setChanged({});
                  runtime.refresh();
                })
                .catch(setError)
            }
          >
            {text('markAllRead')}
          </Button>
        )}
      </div>
      <ErrorNotice error={error ?? first.error} />
      {first.isLoading ? (
        <div className='flex items-center gap-2 py-8 text-sm text-muted-foreground'>
          <Spinner className='size-4' />
          {text('loading')}
        </div>
      ) : !items.length ? (
        <p className='rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground'>
          {text('noNotifications')}
        </p>
      ) : (
        <ul className='divide-y rounded-xl border bg-card'>
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex gap-3 p-4 ${toText(item.readAt ? '' : 'bg-primary/[0.035]')}`}
            >
              <span className='mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground'>
                <Bell className='size-4' />
              </span>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <p className='truncate font-medium'>{item.title}</p>
                  {!item.readAt && (
                    <span
                      aria-label={text('unreadOnly')}
                      className='size-2 shrink-0 rounded-full bg-primary'
                    />
                  )}
                </div>
                <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
                  <time
                    dateTime={item.createdAt}
                    className='tabular-nums text-muted-foreground'
                  >
                    {localDate(item.createdAt, language, timeZone)}
                  </time>
                  {item.actionUrl ? (
                    <Link
                      className='inline-flex items-center gap-1 font-medium hover:text-primary hover:underline'
                      // The plugin stores the app-prefixed path; the router
                      // adds the base path itself.
                      to={item.actionUrl.replace(/^\/[^/]+(?=\/crm\/)/, '')}
                      onClick={() => {
                        if (!item.readAt) void mutate(item, 'read');
                      }}
                    >
                      {recordName(item)}
                      <ArrowUpRight className='size-3 text-muted-foreground' />
                    </Link>
                  ) : (
                    <span>{recordName(item)}</span>
                  )}
                  <span className='ml-auto flex gap-1'>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 px-2 text-xs'
                      onClick={() =>
                        void mutate(item, item.readAt ? 'unread' : 'read')
                      }
                    >
                      {text(item.readAt ? 'markUnread' : 'markRead')}
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 px-2 text-xs'
                      onClick={() => setDeleting(item)}
                    >
                      {text('delete')}
                    </Button>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <Button variant='outline' onClick={() => void loadMore()}>
          {text('loadMore')}
        </Button>
      )}
      {deleting && (
        <ConfirmDialog
          title={text('deleteNotificationTitle', { title: deleting.title })}
          description={text('deleteNotificationHint')}
          busy={false}
          onCancel={() => setDeleting(undefined)}
          onConfirm={() => {
            void mutate(deleting, 'delete');
            setDeleting(undefined);
          }}
        />
      )}
    </div>
  );
}
