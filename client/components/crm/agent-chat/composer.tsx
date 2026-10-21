import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '#components/ui/input-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import {
  contextChips,
  useChatPanel,
  type ChatContextItem,
} from '@nocobase/app-plugin-agents/client/chat';
import type {
  MessageAttachment,
  PageContext,
} from '@nocobase/app-plugin-agents/shared/conversations';
import { ArrowUp, Bot, Paperclip, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { useIsMobile } from '../../../hooks/use-mobile.js';
import { toText, useCrmText } from '../api.js';
import { useCurrentRecord } from '../current-record.js';
import {
  contextOf,
  modelKey,
  useAskFiles,
  type AskFile,
  type ModelChoice,
} from './ask.js';

// The draft last put in a composer, so a composer mounted later (another
// conversation) does not take it again.
let takenDraft: number | null = null;

export interface ComposerSend {
  content: string;
  context: PageContext | undefined;
  attachments: readonly MessageAttachment[];
}

// A conversation's message box: Enter sends, Shift+Enter breaks the line,
// and an Enter that ends an input method's composition does neither. Above
// it, what the message will carry: the records and AI cards a Discuss or a
// phone's dock pinned (removable), and the files picked with the paperclip,
// dropped or pasted (the agent sees images, and only the names of other
// files). For a new conversation, the model it answers with. The panel's
// drafts (a message that could not be sent) land in it, and the panel
// focuses it through the plugin's composer registration.
export function Composer({
  disabled,
  reason,
  models = [],
  model,
  onModel,
  onSend,
}: {
  disabled: boolean;
  reason: string | null;
  // The model it answers with: a new conversation's choice, or the one a
  // conversation under way switches to from its next reply.
  models?: readonly ModelChoice[];
  model?: ModelChoice;
  onModel?: (key: string) => void;
  onSend: (message: ComposerSend) => void;
}): ReactElement {
  const { text } = useCrmText();
  // Worded as the dock's box (assistant-dock.tsx): about the record whose
  // page is open, when there is one.
  const record = useCurrentRecord();
  const placeholder = toText(
    record
      ? text(`dock.placeholderFor.${record.entity}`)
      : text('dock.placeholder'),
  );
  const panel = useChatPanel();
  // A phone's keyboard would cover the conversation as soon as it opened.
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const files = useAskFiles();
  const [value, setValue] = useState(() =>
    panel.draft && panel.draft.nonce !== takenDraft ? panel.draft.text : '',
  );
  // A draft the panel was given (a question that did not go) replaces the
  // box's text once: when it arrives, or when the box mounts after it (the
  // conversation opened on it), never again on a later mount.
  const draft = panel.draft;
  const [draftNonce, setDraftNonce] = useState(draft?.nonce ?? null);
  if (draft && draft.nonce !== draftNonce) {
    setDraftNonce(draft.nonce);
    setValue(draft.text);
  }
  useEffect(() => {
    if (draft) takenDraft = draft.nonce;
  }, [draft]);
  // The chips the person removed, for the pins as they stand: a new pin
  // (another Discuss) shows again even if its like was removed before.
  const [removed, setRemoved] = useState<{
    pins: unknown;
    keys: ReadonlySet<string>;
  }>(() => ({ pins: panel.pinned, keys: new Set() }));
  if (removed.pins !== panel.pinned)
    setRemoved({ pins: panel.pinned, keys: new Set() });
  const register = panel.registerComposer;
  useEffect(() => register(() => inputRef.current?.focus()), [register]);
  // The pinned items only: no page sources, no selected text.
  const chips = contextChips({
    route: window.location.pathname,
    pinned: panel.pinned,
    sources: [],
    filter: null,
    selection: null,
    removed: removed.keys,
  });
  const pinned: { key: string; item: ChatContextItem }[] = chips.flatMap(
    (chip) =>
      chip.kind === 'item' ? [{ key: chip.key, item: chip.item }] : [],
  );
  const blocked = disabled || Boolean(reason);
  const canSend =
    !blocked && !files.uploading && Boolean(value.trim() || files.ready.length);
  const submit = (): void => {
    if (!canSend) return;
    onSend({
      content: value.trim(),
      // The page it was written on, as the address bar shows it (as the
      // dock's questions name it).
      context: contextOf(
        window.location.pathname,
        pinned.map(({ item }) => item),
      ),
      attachments: files.ready,
    });
    setValue('');
    files.clear();
    // What a pin brought goes with this message only.
    panel.clearPinned();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  };
  const attachLabel = toText(text('dock.attach'));
  return (
    <div
      className='flex flex-col gap-1.5 pt-3 pb-4'
      onDragOver={(event) => {
        if (!blocked && event.dataTransfer.types.includes('Files'))
          event.preventDefault();
      }}
      onDrop={(event) => {
        if (blocked || !event.dataTransfer.files.length) return;
        event.preventDefault();
        files.upload(Array.from(event.dataTransfer.files));
      }}
    >
      {reason ? (
        <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <Bot className='size-3.5' aria-hidden />
          {reason}
        </p>
      ) : null}
      {/* Built as the overview's ask box (assistant-ask-composer.tsx), in
          a plain border rather than its AI colours, the send button alone in
          the AI's colour as there: what is attached, the question, then
          along its foot the paperclip, the model and the send button. */}
      <InputGroup className='rounded-xl bg-card shadow-[0_6px_22px_-12px_rgb(0_0_0/0.18)] has-disabled:bg-card has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:border-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 dark:bg-card dark:has-disabled:bg-card'>
        {pinned.length || files.files.length ? (
          <InputGroupAddon align='block-start' className='px-4 pt-3'>
            <ul className='flex flex-wrap gap-1.5'>
              {pinned.map(({ key, item }) => (
                <li
                  key={key}
                  className='inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs'
                >
                  <span className='truncate' title={item.label}>
                    {item.label}
                  </span>
                  <button
                    type='button'
                    className='rounded-sm text-muted-foreground hover:text-foreground'
                    aria-label={toText(
                      text('agentPanel.removePin', { label: item.label }),
                    )}
                    onClick={() =>
                      setRemoved((current) => ({
                        ...current,
                        keys: new Set([...current.keys, key]),
                      }))
                    }
                  >
                    <X className='size-3' />
                  </button>
                </li>
              ))}
              {files.files.map((file) => (
                <FileChip
                  key={file.uid}
                  file={file}
                  onRemove={() => files.remove(file.uid)}
                />
              ))}
            </ul>
          </InputGroupAddon>
        ) : null}
        <InputGroupTextarea
          ref={inputRef}
          autoFocus={!isMobile}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.items)
              .filter((item) => item.kind === 'file')
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null);
            if (!pasted.length || blocked) return;
            event.preventDefault();
            files.upload(pasted);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          // One line high until more is written, then growing with the
          // text, as the overview's box does.
          className='max-h-48 min-h-0 px-4 pt-3 pb-1 text-sm'
        />
        <InputGroupAddon
          align='block-end'
          className='justify-between gap-2 px-3 pb-2.5'
        >
          <div className='flex min-w-0 items-center gap-1.5'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    size='icon-sm'
                    className='rounded-full'
                    aria-label={attachLabel}
                    disabled={blocked}
                    onClick={() => fileRef.current?.click()}
                  />
                }
              >
                <Paperclip />
              </TooltipTrigger>
              <TooltipContent>{text('agentPanel.attachHint')}</TooltipContent>
            </Tooltip>
            {model && models.length > 1 && onModel ? (
              <Select
                value={modelKey(model)}
                disabled={blocked}
                onValueChange={(next) => {
                  if (typeof next === 'string') onModel(next);
                }}
              >
                <SelectTrigger
                  size='sm'
                  aria-label={toText(text('agentPanel.model'))}
                  title={model.modelLabel}
                  className='max-w-48 min-w-0 rounded-full border-0 bg-muted/60 shadow-none'
                >
                  <SelectValue>
                    <span className='truncate'>{model.modelLabel}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className='w-auto max-w-[min(var(--container-sm),var(--available-width))] min-w-(--anchor-width) [&_[data-slot=select-item]>:first-child]:whitespace-normal'>
                  {models.map((item) => (
                    <SelectItem key={modelKey(item)} value={modelKey(item)}>
                      {item.modelLabel}
                      <span className='text-muted-foreground'>
                        {' '}
                        · {item.serviceTitle}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <InputGroupButton
            size='icon-sm'
            aria-label={text('agentChat.send')}
            disabled={!canSend}
            className='rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground disabled:bg-muted disabled:text-muted-foreground'
            onClick={submit}
          >
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <input
        ref={fileRef}
        type='file'
        multiple
        hidden
        tabIndex={-1}
        aria-hidden='true'
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          if (picked.length) files.upload(picked);
          event.target.value = '';
        }}
      />
    </div>
  );
}

// A file the message carries: its name, uploading or refused, removable.
export function FileChip({
  file,
  onRemove,
}: {
  file: AskFile;
  onRemove: () => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <li
      className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
        file.status === 'error'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted'
      } ${file.status === 'uploading' ? 'opacity-60' : ''}`}
    >
      <Paperclip className='size-3 shrink-0' aria-hidden />
      <span className='truncate' title={file.filename}>
        {file.filename}
      </span>
      <button
        type='button'
        className='rounded-sm text-muted-foreground hover:text-foreground'
        aria-label={toText(
          text('agentPanel.removePin', { label: file.filename }),
        )}
        onClick={onRemove}
      >
        <X className='size-3' />
      </button>
    </li>
  );
}
