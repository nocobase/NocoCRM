import { useToaster } from '@nocobase/app-client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MessageCircle, PanelRight } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs';
import { LoadFailure } from '../../../pages/settings/common/shared.js';
import { Button } from '#components/ui/button';
import { WhatsAppConversationDrawer } from './conversation-drawer.js';
import { toText, useCrmApi, useCrmScopeKey, useCrmText } from '../api.js';
import {
  TAB_POLL_MS,
  useWhatsAppPage,
  type RecordMessages,
  type WhatsAppMessage,
} from './api.js';
import { MessagesSkeleton, WhatsAppMessages } from './messages.js';

// A record's WhatsApp tab: the messages its people exchanged with the
// company's number — a lead's or a contact's own, a company's contacts', a
// deal's contacts' — read by whoever reads the record, asked again every
// half minute while it shows (R4). One person's conversation at a time,
// the latest to write first, the others a tab away: the team's replies to
// two people interleaved would not say whom they answer. Read only in this
// phase.

export type WhatsAppEntity =
  'leads' | 'contacts' | 'companies' | 'opportunities';

export function RecordWhatsAppPanel({
  entity,
  id,
}: {
  entity: WhatsAppEntity;
  id: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const scopeKey = useCrmScopeKey();
  const mayOpen = useWhatsAppPage();
  // The conversation open in the drawer.
  const [opened, setOpened] = useState<string | null>(null);
  // The person picked; the server's choice, the latest to write, until then.
  const [picked, setPicked] = useState<string>();
  const base = `${entity}/${encodeURIComponent(id)}/whatsappMessages`;
  const path = picked ? `${base}?person=${encodeURIComponent(picked)}` : base;
  const query = useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () => api<{ data: RecordMessages }>(path).then((r) => r.data),
    refetchInterval: TAB_POLL_MS,
    // The person's tabs stay while another's conversation loads.
    placeholderData: keepPreviousData,
  });
  // Earlier pages, of the person they were loaded for.
  const [loaded, setLoaded] = useState<{
    person: string | null;
    messages: WhatsAppMessage[];
    more: boolean;
  }>({ person: null, messages: [], more: true });
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  if (query.error && !query.data)
    return (
      <div className='p-4'>
        <LoadFailure
          error={query.error}
          what={toText(text('whatsapp.whatMessages'))}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  if (!query.data) return <MessagesSkeleton />;
  const { people, person } = query.data;
  const earlier =
    loaded.person === person ? loaded : { messages: [], more: true };
  if (!query.data.messages.length)
    return (
      <div className='p-4'>
        <Empty className='min-h-48 border border-dashed'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MessageCircle />
            </EmptyMedia>
            <EmptyTitle>{text('whatsapp.tabEmptyTitle')}</EmptyTitle>
            <EmptyDescription>{text('whatsapp.tabEmptyBody')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  const latestIds = new Set(query.data.messages.map((m) => m.id));
  const messages = [
    ...earlier.messages.filter((m) => !latestIds.has(m.id)),
    ...query.data.messages,
  ];
  const more = earlier.messages.length ? earlier.more : query.data.more;
  const names = new Map(people.map((one) => [one.id, one.name]));
  // The people with messages, each a tab when there are two or more.
  const talking = people.filter((one) => one.messageCount > 0);
  // The conversation the newest message shown is in (a person on two
  // numbers has two; the WhatsApp page shows each).
  const conversationId = query.data.messages.at(-1)?.conversationId ?? null;
  const loadEarlier = () => {
    const before = messages[0]?.occurredAt;
    if (!before) return;
    setLoadingEarlier(true);
    api<{ data: RecordMessages }>(
      `${base}?person=${encodeURIComponent(person ?? '')}&before=${encodeURIComponent(before)}`,
    )
      .then(({ data }) =>
        setLoaded({
          person,
          messages: [...data.messages, ...earlier.messages],
          more: data.more,
        }),
      )
      .catch(() =>
        toaster.show({
          type: 'error',
          title: toText(text('whatsapp.loadEarlierFailed')),
        }),
      )
      .finally(() => setLoadingEarlier(false));
  };
  return (
    // On the card's white, as the Mail tab's list is: its head and its
    // body each drawing their part of the card's border, so the head keeps
    // its top edge and corners while it stays at the top of the column.
    <div data-slot='record-whatsapp' className='flex flex-col'>
      {/* Whose conversation: line tabs over a rule, as the record's own
          tabs are, each person with their count; one person, their name.
          It stays at the top of the column while the body scrolls under
          it. */}
      <div className='sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 rounded-t-xl border border-border bg-card px-4'>
        {talking.length > 1 ? (
          <Tabs
            value={person ?? ''}
            onValueChange={(next) => setPicked(String(next))}
          >
            <TabsList
              variant='line'
              className='h-14 gap-4 p-0'
              aria-label={toText(text('whatsapp.tabPeopleLabel'))}
            >
              {talking.map((one) => (
                <TabsTrigger
                  key={one.id}
                  value={one.id}
                  // The active line on the head's rule, not under it.
                  className='px-0 group-data-horizontal/tabs:after:bottom-[-2px]'
                >
                  {one.name}
                  <span className='font-normal text-muted-foreground'>
                    {one.messageCount.toLocaleString(language)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <p className='text-sm text-muted-foreground'>
            {text('whatsapp.tabPeople', {
              names: names.get(person ?? '') ?? '',
            })}
          </p>
        )}
        {/* The person's conversation, in a drawer over the page, for
            whoever has the WhatsApp page its route asks for. */}
        {conversationId && mayOpen ? (
          <Button
            variant='ghost'
            size='sm'
            className='shrink-0'
            onClick={() => setOpened(conversationId)}
          >
            <PanelRight data-icon='inline-start' />
            {text('whatsapp.openConversation')}
          </Button>
        ) : null}
      </div>
      <div className='flex flex-col overflow-hidden rounded-b-xl border-x border-b border-border bg-card shadow-xs'>
        <WhatsAppMessages
          key={person ?? ''}
          className='max-h-[70dvh]'
          messages={messages}
          more={more}
          loadingEarlier={loadingEarlier}
          onLoadEarlier={loadEarlier}
          senderOf={() => names.get(person ?? '') ?? ''}
        />
        {/* Under a rule, as the WhatsApp page's conversation ends, so the
          messages scrolling above do not run into it. */}
        <p className='border-t border-border px-4 py-3 text-xs text-muted-foreground'>
          {text('whatsapp.replyInConversation')}
        </p>
      </div>
      <WhatsAppConversationDrawer
        conversationId={opened}
        onClose={() => setOpened(null)}
      />
    </div>
  );
}
