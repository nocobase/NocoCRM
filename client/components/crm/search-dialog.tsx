import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Command as CommandPrimitive } from 'cmdk';
import { RotateCw, Search, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.js';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../ui/command.js';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog.js';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar.js';
import { Spinner } from '../ui/spinner.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import {
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Entity,
} from './api.js';
import { useAgentReadiness, useSearchAnswer } from './agent-chat/ask.js';
import { SearchAnswer } from './agent-chat/search-answer.js';
import {
  SEARCH_SHORTCUT,
  searchWords,
  useGlobalSearch,
  type GlobalSearch,
} from './global-search-state.js';
import { ENTITY_ICONS } from './entity-icons.js';
import { useDebounced } from './record-search.js';
import { SearchRow } from './search-results.js';

// The global search's dialog and its menu entry (global-search.tsx holds
// the state): a command palette over the page, finding records by keyword,
// or asking the assistant, which opens its panel on the question.

interface SearchGroup {
  entity: Entity;
  total: number;
  rows: CrmRecord[];
  titles: Record<string, string>;
}

export function GlobalSearchDialog(): ReactElement | null {
  const search = useGlobalSearch();
  const { text } = useCrmText();
  if (!search) return null;
  return (
    <>
      {/* Where the dialog is: ⌘K acts only here (global-search.tsx). */}
      <span data-crm-search-host hidden />
      <Dialog open={search.open} onOpenChange={search.setOpen}>
        <DialogContent
          // Told apart from other dialogs by ⌘K (global-search.tsx).
          data-crm-search
          showCloseButton={false}
          // A palette sits high and narrow, its results growing downward.
          className='top-[8svh] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12svh] sm:max-w-2xl'
        >
          <DialogTitle className='sr-only'>
            {text('globalSearch.dialogTitle')}
          </DialogTitle>
          {search.open && <SearchPanel search={search} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchPanel({ search }: { search: GlobalSearch }): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAgentReadiness();
  const answers = useSearchAnswer();
  // A question asked here, answered in the dialog: kept as a conversation
  // only when the person goes on asking, discarded when they leave it (back
  // to the results, or the dialog closed).
  const [answer, setAnswer] = useState<{
    question: string;
    id: string | null;
    error?: unknown;
  } | null>(null);
  const pendingRef = useRef<string | null>(null);
  // The latest hook value, read when the dialog closes; only an unmount
  // discards, never a change of the hook's identity.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(
    () => () => {
      // The dialog closed on an answer not kept.
      if (pendingRef.current)
        answersRef.current.discard(pendingRef.current, true);
    },
    [],
  );
  const navigate = useNavigate();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const assistantOn = Boolean(meta?.assistant);
  const aiReady = assistantOn && readiness.state === 'ready';
  const aiReason =
    readiness.state === 'unavailable'
      ? readiness.reason
      : toText(text('assistantLoading'));
  const typed = search.value.trim();
  const q = useDebounced(typed, 200);
  const results = useQuery({
    queryKey: [...scopeKey, 'global-search', q],
    queryFn: () =>
      api<{ data: SearchGroup[] }>(`search?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30000,
    // A refusal (an over-long text) answers the same however often asked.
    retry: false,
  });
  const groups = q && typed ? (results.data?.data ?? []) : [];
  const words = searchWords(q);
  const go = (path: string): void => {
    search.setOpen(false);
    void navigate(path);
  };
  // Asking the assistant: answered here, in a conversation of its own that
  // stays only if the person goes on asking.
  const ask = (): void => {
    if (!aiReady || !readiness.agent || !typed) return;
    const question = typed;
    setAnswer({ question, id: null });
    answers
      .start(question)
      .then((id) => {
        pendingRef.current = id;
        setAnswer((current) =>
          current?.question === question ? { ...current, id } : current,
        );
      })
      .catch((error: unknown) =>
        setAnswer((current) =>
          current?.question === question ? { ...current, error } : current,
        ),
      );
  };
  // The selection starts on the first result (or on Ask AI when there is
  // none) and keeps a choice made with the arrows or the mouse only until
  // the results change.
  const firstKey = groups[0]?.rows[0]
    ? `${groups[0].entity}:${toText(groups[0].rows[0].id)}`
    : 'ask';
  const signature = `${q}|${groups.map((g) => `${g.entity}${String(g.total)}`).join()}`;
  const [selected, setSelected] = useState<string>();
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setSelected(undefined);
  }

  if (answer)
    return (
      <SearchAnswer
        conversationId={answer.id}
        question={answer.question}
        error={answer.error}
        onBack={(running) => {
          if (answer.id) answers.discard(answer.id, running);
          pendingRef.current = null;
          setAnswer(null);
        }}
        onContinue={() => {
          if (!answer.id) return;
          const id = answer.id;
          pendingRef.current = null;
          search.setOpen(false);
          search.setValue('');
          void answers.keep(id).catch(() => undefined);
        }}
      />
    );

  const placeholder = toText(text('globalSearch.placeholder'));

  return (
    <Command
      // cmdk names its input by this label.
      label={placeholder}
      shouldFilter={false}
      loop
      value={selected ?? firstKey}
      onValueChange={setSelected}
      className='rounded-none! bg-popover p-0'
    >
      <div className='flex items-center gap-2 border-b border-border px-3'>
        {results.isFetching ? (
          <Spinner className='size-4 shrink-0 text-muted-foreground' />
        ) : (
          <Search className='size-4 shrink-0 text-muted-foreground' />
        )}
        <CommandPrimitive.Input
          value={search.value}
          onValueChange={search.setValue}
          placeholder={placeholder}
          aria-label={placeholder}
          // The server takes up to 100 characters.
          maxLength={100}
          className='h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm'
        />
      </div>
      <CommandList
        className={`max-h-[min(60svh,34rem)] p-1 ${
          results.isPlaceholderData ? 'opacity-60' : ''
        }`}
      >
        {!typed ? (
          <div className='flex flex-col gap-1 px-3 py-6 text-center text-sm text-muted-foreground'>
            <p>{text('globalSearch.hint')}</p>
            {aiReady && <p>{text('globalSearch.hintAsk')}</p>}
          </div>
        ) : results.isError ? (
          <div
            role='alert'
            className='flex flex-col items-center gap-2 px-3 py-6 text-sm text-muted-foreground'
          >
            {text('globalSearch.failed')}
            <Button
              variant='outline'
              size='sm'
              onClick={() => void results.refetch()}
            >
              <RotateCw />
              {text('globalSearch.retry')}
            </Button>
          </div>
        ) : !results.data || q !== typed ? (
          !groups.length && (
            <p
              role='status'
              className='flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground'
            >
              <Spinner className='size-3.5' />
              {text('globalSearch.searching')}
            </p>
          )
        ) : (
          !groups.length && (
            <p className='px-3 py-6 text-center text-sm text-muted-foreground'>
              {text('globalSearch.noResults')}
            </p>
          )
        )}
        {groups.map((group) => {
          // Each kind's menu icon, beside its group of results.
          const Icon = ENTITY_ICONS[group.entity];
          const list = toText(text(`entities.${group.entity}`));
          return (
            <CommandGroup
              key={group.entity}
              heading={
                <span className='inline-flex items-center gap-1.5'>
                  <Icon className='size-3.5' />
                  {`${list} · ${String(group.total)}`}
                </span>
              }
            >
              {group.rows.map((row) => (
                <CommandItem
                  key={toText(row.id)}
                  value={`${group.entity}:${toText(row.id)}`}
                  onSelect={() => go(`/${group.entity}/${toText(row.id)}`)}
                >
                  <SearchRow
                    entity={group.entity}
                    record={row}
                    titles={group.titles}
                    words={words}
                  />
                </CommandItem>
              ))}
              {group.total > group.rows.length && (
                <CommandItem
                  value={`${group.entity}:all`}
                  onSelect={() =>
                    go(
                      `/${group.entity}?${new URLSearchParams({ search: q }).toString()}`,
                    )
                  }
                  className='text-muted-foreground'
                >
                  <span className='pl-6'>
                    {text('globalSearch.showAllIn', {
                      list,
                      count: group.total,
                    })}
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          );
        })}
        {/* Asking the AI stays in view at the list's foot however many
            results scroll above it. */}
        {assistantOn && typed && (
          <CommandGroup className='sticky -bottom-1 -mx-1 -mb-1 border-t border-border bg-popover p-1'>
            <CommandItem value='ask' disabled={!aiReady} onSelect={ask}>
              <Sparkles className='text-primary' />
              <span className='truncate'>
                {text('globalSearch.askAbout', { text: typed })}
              </span>
            </CommandItem>
            {/* Why it cannot be asked, in the open: a disabled row takes no
                  pointer, so a tooltip would never show (I7). */}
            {!aiReady && (
              <p className='px-2 pb-1.5 pl-8 text-xs text-muted-foreground'>
                {aiReason}
              </p>
            )}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

// The search's button at the right of the sidebar's brand (AppSidebar's
// `action`), with its shortcut on hover; in the phone's sheet it closes the
// sheet first.
export function SearchHeaderButton(): ReactElement | null {
  const search = useGlobalSearch();
  const { text } = useCrmText();
  const { isMobile, setOpenMobile } = useSidebar();
  if (!search) return null;
  const label = toText(text('globalSearch.label'));
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            // The menu's own actions' colour (SidebarGroupAction), the icon
            // where theirs sits: a larger box for the hover's ground, pulled
            // back by its margin so the icon keeps its place.
            className='-m-1 size-7 rounded-md p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            onClick={() => {
              if (isMobile) setOpenMobile(false);
              search.setOpen(true);
            }}
            size='icon-sm'
            variant='ghost'
          />
        }
      >
        <Search />
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        {isMobile ? label : `${label} · ${SEARCH_SHORTCUT}`}
      </TooltipContent>
    </Tooltip>
  );
}

// The collapsed sidebar has no room beside its mark, so there the search is
// the menu's item under the overview (NavigationMenu's `after`).
export function SearchNavButton(): ReactElement | null {
  const search = useGlobalSearch();
  const { text } = useCrmText();
  const { isMobile, state } = useSidebar();
  if (!search || isMobile || state !== 'collapsed') return null;
  const label = toText(text('globalSearch.label'));
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => search.setOpen(true)}
        tooltip={{
          children: `${label} · ${SEARCH_SHORTCUT}`,
          role: 'tooltip',
          sideOffset: 8,
        }}
      >
        <Search />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
