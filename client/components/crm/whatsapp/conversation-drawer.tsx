import { useToaster } from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WhatsAppComposer } from './composer.js';
import { Maximize2, X } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { Button } from '#components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '#components/ui/sheet';
import { LoadFailure } from '../../../pages/settings/common/shared.js';
import { toText, useCrmApi, useCrmText } from '../api.js';
import {
  CONVERSATION_POLL_MS,
  numberLabel,
  useConversationKey,
  type Conversation,
  type WhatsAppMessage,
} from './api.js';
import { MessagesSkeleton, WhatsAppMessages } from './messages.js';

// One WhatsApp conversation in a drawer over a record's page, from its
// WhatsApp tab: the customer, the number it is on, and the messages, read
// only, asked again every few seconds as the WhatsApp page asks; its toolbar
// offers the conversation on the WhatsApp page, where it is linked and set
// aside.

export function WhatsAppConversationDrawer({
  conversationId,
  onClose,
}: {
  // The conversation shown; none closes the drawer.
  conversationId: string | null;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Sheet
      open={Boolean(conversationId)}
      onOpenChange={(next) => !next && onClose()}
    >
      <SheetContent
        side='right'
        showCloseButton={false}
        className='gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl'
      >
        <div className='flex items-center gap-2 border-b px-4 py-2'>
          <SheetTitle className='flex-1 text-sm text-muted-foreground'>
            {text('whatsapp.title')}
          </SheetTitle>
          {conversationId ? (
            <Button
              variant='ghost'
              size='sm'
              nativeButton={false}
              render={
                <Link
                  to={`/whatsapp/${encodeURIComponent(conversationId)}?view=all`}
                />
              }
            >
              <Maximize2 />
              {text('openFullPage')}
            </Button>
          ) : null}
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={text('close')}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        {conversationId ? (
          <ConversationBody key={conversationId} id={conversationId} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ConversationBody({ id }: { id: string }): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const key = useConversationKey(id);
  const queryClient = useQueryClient();
  const path = `whatsapp/conversations/${encodeURIComponent(id)}`;
  const query = useQuery({
    queryKey: key,
    queryFn: () => api<{ data: Conversation }>(path).then((r) => r.data),
    refetchInterval: CONVERSATION_POLL_MS,
  });
  const [earlier, setEarlier] = useState<{
    messages: WhatsAppMessage[];
    more: boolean;
  }>({ messages: [], more: true });
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  if (query.error && !query.data)
    return (
      <div className='p-4'>
        <LoadFailure
          error={query.error}
          what={toText(text('whatsapp.whatOne'))}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  if (!query.data) return <MessagesSkeleton />;
  const conversation = query.data;
  const latestIds = new Set(conversation.messages.map((m) => m.id));
  const messages = [
    ...earlier.messages.filter((m) => !latestIds.has(m.id)),
    ...conversation.messages,
  ];
  const more = earlier.messages.length ? earlier.more : conversation.more;
  const loadEarlier = () => {
    const before = messages[0]?.occurredAt;
    if (!before) return;
    setLoadingEarlier(true);
    api<{ data: Conversation }>(`${path}?before=${encodeURIComponent(before)}`)
      .then(({ data }) =>
        setEarlier({
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
  const { contact } = conversation;
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='flex flex-col gap-1 border-b px-4 py-3'>
        <h2 className='truncate text-base font-medium' title={contact.name}>
          {contact.name}
        </h2>
        <p className='flex flex-wrap gap-x-3 text-sm text-muted-foreground'>
          {contact.phone ? <span>{contact.phone}</span> : null}
          {conversation.number ? (
            <span>
              {text('whatsapp.onNumber', {
                number: numberLabel(conversation.number),
              })}
            </span>
          ) : null}
        </p>
      </div>
      <WhatsAppMessages
        className='min-h-0 flex-1'
        messages={messages}
        more={more}
        loadingEarlier={loadingEarlier}
        onLoadEarlier={loadEarlier}
        senderOf={() => contact.name}
      />
      <WhatsAppComposer
        conversation={conversation}
        onSent={(next) => queryClient.setQueryData(key, next)}
      />
    </div>
  );
}
