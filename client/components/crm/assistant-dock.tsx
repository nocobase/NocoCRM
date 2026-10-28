import { useDemoMode } from '@nocobase/app-plugin-demo-mode/client';
import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useLocation } from 'react-router';
import { useIsMobile } from '#hooks/use-mobile';
import { Button } from '../ui/button.js';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.js';
import { toText, useCrmText, useMetadata, type Entity } from './api.js';
import { usePanelOpen, useAskDraft, useFocusReturn } from './assistant-ask.js';
import { recordPin, useAgentReadiness, useDiscuss } from './agent-chat/ask.js';
import { AskComposer } from './assistant-ask-composer.js';
import { useCurrentRecord, type CurrentRecord } from './current-record.js';

// The assistant's one general entry: a box floating at the bottom of the main
// column (the application layout's <main>), in the manner of Clarify's "Ask
// anything". A question typed there, or one of the page's suggested
// questions, opens the assistant panel on a new conversation and sends it; on
// a record's page the conversation starts from that record (announced by the
// page, current-record.ts). It replaced every record page's "Ask AI"; the
// header's ✨ button (assistant-header-button.tsx) opens the panel from every
// page as well; the AI cards keep their own "Ask AI", which asks
// about the card. Pages keep 6rem empty at the bottom of what scrolls under
// it (CrmFrame's pb-24, the record page's columns, the board's columns), so
// their last row can be scrolled above it. One line until it is clicked, it
// then opens into the ask boxes' composer (assistant-ask-composer.tsx) with
// its files and its model, and closes to one line again once focus leaves an
// empty box. On a phone it is a round button in the corner that opens the
// panel. It hides while the panel is open, and
// on pages filled by panes of their own that cannot leave room for it.

// Pages the dock is not shown on: the overview, which opens on an ask box of
// its own (assistant-ask-box.tsx); the Mail plugin's workspace, the inbox and
// the WhatsApp page (its connection page with it), which fill the window
// with fixed panes whose bottom (pagination, keyboard hints, the open
// conversation's last messages) it would cover; the agents' conversations, which have a composer
// of their own; and the Settings pages (users, permission sets, API keys,
// scheduled tasks), whose tables and sticky save bar it would cover, and
// App foundation (the Foundation plugin's page), a Settings page of its
// own, which keeps no room at its bottom for it.
function hiddenOn(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/mail' ||
    pathname === '/inbox' ||
    pathname.startsWith('/inbox/') ||
    pathname === '/whatsapp' ||
    pathname.startsWith('/whatsapp/') ||
    // The agents' conversations have a composer of their own.
    pathname === '/agent-chat' ||
    pathname.startsWith('/agent-chat/') ||
    pathname.startsWith('/settings/') ||
    pathname === '/foundation'
  );
}

// The questions a page suggests, by the kind of record it shows or else by
// its path; keys under `dock.q` in the crm locale.
const RECORD_QUESTIONS: Record<string, readonly string[]> = {
  leads: ['lead.next', 'lead.summary', 'lead.email'],
  opportunities: [
    'opportunity.missing',
    'opportunity.risk',
    'opportunity.progress',
  ],
  companies: ['company.latest', 'company.contacts', 'company.deals'],
  contacts: ['contact.exchanges', 'contact.deals', 'contact.email'],
  tasks: ['task.prepare'],
  approvals: ['approval.decide'],
};
const PAGE_QUESTIONS: Record<string, readonly string[]> = {
  '/leads': ['leads.first', 'leads.quiet'],
  '/opportunities': ['opportunities.closing', 'opportunities.risk'],
  '/companies': ['companies.quiet'],
  '/contacts': ['contacts.quiet'],
  '/tasks': ['tasks.overdue', 'tasks.week'],
  '/approvals': ['approvals.waiting'],
};

function questionsFor(
  pathname: string,
  record: CurrentRecord | undefined,
): readonly string[] {
  if (record) return RECORD_QUESTIONS[record.entity] ?? [];
  return PAGE_QUESTIONS[pathname] ?? [];
}

export function AssistantDock(): ReactElement | null {
  const { text } = useCrmText();
  const readiness = useAgentReadiness();
  const panelOpen = usePanelOpen();
  const discuss = useDiscuss();
  const record = useCurrentRecord();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  // Switched off for the company in Settings → General (assistantDock).
  const { data: meta } = useMetadata();
  // A demo site takes no question, but the dock stays open to one: sending
  // opens the panel on it (useAskDraft), which says why it goes no further.
  const demo = useDemoMode();
  const unavailable =
    readiness.state === 'unavailable' && !demo ? readiness.reason : undefined;
  const draft = useAskDraft(record, readiness.state !== 'ready' && !demo);
  // Focus is in the dock, or its model menu (which lies outside it) is open.
  const [focused, setFocused] = useState(false);
  const [modelMenu, setModelMenu] = useState(false);
  // The suggestions show while the box is focused and empty, until Esc.
  const [listOpen, setListOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const phoneRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  // Focus given back when the panel closes leaves the dock one line: it
  // opens once the reader presses it or types, not by itself.
  const quietRef = useRef(false);
  useFocusReturn(
    () => {
      quietRef.current = !isMobile;
      return isMobile ? phoneRef.current : inputRef.current;
    },
    () => (isMobile ? phoneRef.current : dockRef.current),
  );
  // A press outside closes it too, focus or not: a page that drags on a
  // press (the board) keeps focus where it was, so no blur would come. Its
  // model menu, outside it while open, keeps it open.
  useEffect(() => {
    if (!focused || modelMenu) return;
    const outside = (event: PointerEvent): void => {
      const target = event.target as Element | null;
      if (target && dockRef.current?.contains(target)) return;
      // The veil closes it on its click (below).
      if (target?.closest?.('[data-dock-veil]')) return;
      if (dockRef.current?.contains(document.activeElement))
        (document.activeElement as HTMLElement | null)?.blur();
      setFocused(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [focused, modelMenu]);

  if (
    readiness.state === 'loading' ||
    hiddenOn(pathname) ||
    meta?.settings.assistantDock === false
  )
    return null;
  const questions = questionsFor(pathname, record);
  const placeholder =
    unavailable ??
    toText(
      record
        ? text(`dock.placeholderFor.${record.entity}`)
        : text('dock.placeholder'),
    );
  // Open while it is being used or holds something; one line otherwise.
  const expanded =
    !unavailable &&
    (focused ||
      modelMenu ||
      Boolean(draft.value) ||
      draft.files.files.length > 0);
  // Sent, by Enter, the send button or a suggestion: the box closes, so its
  // suggestions do not come back over the emptied box.
  const sending: typeof draft = {
    ...draft,
    send: (prompt) => {
      const sent = draft.send(prompt);
      if (sent) {
        setListOpen(false);
        setFocused(false);
      }
      return sent;
    },
  };
  const send = (prompt: string): void => {
    sending.send(prompt);
  };

  const box = (
    <AskComposer
      draft={sending}
      placeholder={placeholder}
      disabled={Boolean(unavailable)}
      expanded={expanded}
      inputRef={inputRef}
      // Lifted off the page as well as framed.
      className={`[--crm-ai-lift:var(--shadow-lg)] ${
        expanded ? 'rounded-3xl' : 'h-11 rounded-full'
      }`}
      inputClassName='px-4 pt-3 pb-1 text-sm'
      onModelMenu={setModelMenu}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setListOpen(false);
      }}
    />
  );

  return (
    <TooltipProvider>
      {/* While the box is in use, a veil over the page under it, drawn as
          a dialog's backdrop: a press beside the box lands on the veil and
          only closes the box, rather than on the list or the board behind
          it. */}
      {focused && !isMobile && !panelOpen ? (
        <div
          aria-hidden
          data-dock-veil=''
          // Drawn as a dialog's backdrop (ui/dialog.tsx).
          className='fixed inset-0 z-40 bg-black/10 duration-100 animate-in fade-in-0 supports-backdrop-filter:backdrop-blur-xs'
          // Closed on its own click, so the press's click lands here and
          // never reaches the row it covers.
          onClick={() => {
            if (dockRef.current?.contains(document.activeElement))
              (document.activeElement as HTMLElement | null)?.blur();
            setFocused(false);
          }}
        />
      ) : null}
      <div
        // Over the bottom of the main column, below the header and every
        // overlay, above a stacked record page's sticky tab bar (z-10);
        // while in use, over its veil, which covers the header (z-40) as a
        // dialog's backdrop does, every overlay (z-50) still above.
        className={`pointer-events-none absolute inset-x-0 bottom-4 flex justify-end px-4 md:justify-center ${
          focused && !isMobile ? 'z-40' : 'z-20'
        }`}
        hidden={panelOpen}
      >
        {isMobile ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  ref={phoneRef}
                  size='icon-lg'
                  aria-label={unavailable ?? toText(text('dock.open'))}
                  disabled={Boolean(unavailable)}
                  className='pointer-events-auto rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90'
                  // A new conversation with the record pinned, nothing
                  // sent: the person writes in the panel.
                  onClick={() =>
                    discuss(
                      record
                        ? [
                            recordPin(
                              record.entity as Entity,
                              record.recordId,
                              record.name ?? '',
                            ),
                          ]
                        : [],
                    )
                  }
                />
              }
            >
              <Sparkles />
            </TooltipTrigger>
            <TooltipContent>
              {unavailable ?? toText(text('dock.open'))}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div
            ref={dockRef}
            // Shorter than the md and xl widths it had: the line it closes
            // to and the composer it opens into.
            className={`pointer-events-auto relative w-full ${
              expanded ? 'max-w-[32rem]' : 'max-w-[22rem]'
            }`}
            onFocus={() => {
              if (quietRef.current) {
                quietRef.current = false;
                return;
              }
              if (!focused) setListOpen(true);
              setFocused(true);
            }}
            // Pressed while it already holds focus (given back quietly):
            // it opens as a focus would open it.
            onPointerDown={() => {
              if (focused) return;
              setListOpen(true);
              setFocused(true);
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (next) {
                if (!dockRef.current?.contains(next)) setFocused(false);
                return;
              }
              // Focus went to no element: a click on the page, or another
              // window (the file picker), which keeps the dock's element
              // active and so does not close it.
              window.setTimeout(() => {
                if (
                  document.hasFocus() &&
                  !dockRef.current?.contains(document.activeElement)
                )
                  setFocused(false);
              });
            }}
          >
            {unavailable ? (
              // Disabled controls take no pointer events, so the reason's
              // tooltip hangs on a wrapper around the box.
              <Tooltip>
                <TooltipTrigger render={<div className='w-full' />}>
                  {box}
                </TooltipTrigger>
                <TooltipContent>{unavailable}</TooltipContent>
              </Tooltip>
            ) : (
              box
            )}
            {/* After the box in the document, so Tab moves from the box to
                the suggestions; drawn above it. They send with the files
                attached, on the model picked. */}
            {focused &&
              listOpen &&
              !draft.value &&
              !draft.files.files.length &&
              questions.length > 0 &&
              !unavailable && (
                <ul
                  aria-label={toText(text('dock.suggestions'))}
                  className='absolute bottom-full mb-2 flex w-full flex-col gap-0.5 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg'
                >
                  {questions.map((key) => {
                    const question = toText(text(`dock.q.${key}`));
                    return (
                      <li key={key}>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='w-full justify-start font-normal'
                          // A click lands before the box's blur hides the list.
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => send(question)}
                        >
                          <Sparkles className='text-primary' />
                          <span className='truncate'>{question}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
