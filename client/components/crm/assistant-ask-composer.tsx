import { ArrowUp, Paperclip, Sparkles } from 'lucide-react';
import {
  Fragment,
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import type { ModelChoice } from './agent-chat/ask.js';
import { modelKey } from './agent-chat/ask.js';
import { FileChip } from './agent-chat/composer.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '../ui/input-group.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../ui/select.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import { toText, useCrmText } from './api.js';
import type { AskDraft } from './assistant-ask.js';

// The ask boxes' composer, shared by the overview's box and the dock: the
// question grows past one line (Enter sends, Shift+Enter breaks the line),
// files are attached with the paperclip, dropped or pasted and uploaded at
// once, and the model the conversation runs on is picked beside them.
// Collapsed (the dock until it is clicked), it is one line: the AI mark,
// the question and the send button, without the files and the model. The
// question's textarea keeps its place in the tree between the two, so the
// focus that expands the box stays in it. Inside a TooltipProvider.
export function AskComposer({
  draft,
  placeholder,
  disabled,
  expanded,
  inputRef,
  className,
  inputClassName,
  onKeyDown,
  onModelMenu,
}: {
  draft: AskDraft;
  placeholder: string;
  // Not ready to send (the chat still loading, or unable to start): the box
  // is drawn faded and takes no input.
  disabled: boolean;
  expanded: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  // The box's shape and size, by where it sits.
  className: string;
  // The question's padding and type size in the expanded box.
  inputClassName: string;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  // The model menu opening or closing: it lies outside the box, so the dock
  // keeps itself expanded while it is open.
  onModelMenu?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const fileRef = useRef<HTMLInputElement>(null);
  const { files, model } = draft;
  // The models by service, as the select groups them.
  const groups = [...draft.models].reduce<
    { key: string; label: string; models: ModelChoice[] }[]
  >((list, item) => {
    const group = list.find((entry) => entry.key === item.modelService);
    if (group) group.models.push(item);
    else
      list.push({
        key: item.modelService,
        label: item.serviceTitle,
        models: [item],
      });
    return list;
  }, []);
  const attachLabel = toText(text('dock.attach'));
  const sendLabel = toText(text('send'));

  const sendButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <InputGroupButton
            size='icon-sm'
            aria-label={sendLabel}
            disabled={!draft.canSend}
            className='rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground disabled:bg-muted disabled:text-muted-foreground'
            onClick={() => draft.send()}
          />
        }
      >
        <ArrowUp />
      </TooltipTrigger>
      <TooltipContent>{sendLabel}</TooltipContent>
    </Tooltip>
  );

  return (
    <>
      <InputGroup
        // In the ask boxes' AI border (client/styles.css). The primitive
        // fades the whole group while any control in it is disabled, and
        // the send button is whenever the box is empty: only a box that
        // cannot send yet fades here.
        className={`crm-ai-border has-disabled:bg-card dark:bg-card dark:has-disabled:bg-card ${
          disabled ? 'opacity-60' : 'has-disabled:opacity-100'
        } ${className}`}
        onDragOver={(event) => {
          if (!disabled && event.dataTransfer.types.includes('Files'))
            event.preventDefault();
        }}
        onDrop={(event) => {
          if (disabled || !event.dataTransfer.files.length) return;
          event.preventDefault();
          files.upload(Array.from(event.dataTransfer.files));
        }}
      >
        {expanded && files.files.length > 0 ? (
          <InputGroupAddon align='block-start' className='px-4 pt-3'>
            <ul className='flex flex-wrap gap-1.5'>
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
        {expanded ? null : (
          <InputGroupAddon className='pl-4'>
            <Sparkles className='text-primary' />
          </InputGroupAddon>
        )}
        <InputGroupTextarea
          ref={inputRef}
          value={draft.value}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          // Expanded, one line high until more is written, then growing with
          // the text up to a third of the window, past which it scrolls;
          // collapsed, the one line of the dock.
          className={
            expanded
              ? `max-h-[33vh] min-h-0 ${inputClassName}`
              : 'h-11 min-h-0 overflow-hidden py-3 text-sm leading-5'
          }
          onChange={(event) => draft.setValue(event.target.value)}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented) return;
            // Enter while an input method is composing only confirms the
            // composition; Shift+Enter breaks the line.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              draft.send();
            }
          }}
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.items)
              .filter((item) => item.kind === 'file')
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null);
            if (!pasted.length || disabled) return;
            event.preventDefault();
            files.upload(pasted);
          }}
        />
        {expanded ? null : (
          // Clear of the round end, rather than following its curve (the
          // primitive pulls a button outward, `has-[>button]:mr-*`).
          <InputGroupAddon
            align='inline-end'
            className='pr-2.5 has-[>button]:mr-0'
          >
            {sendButton}
          </InputGroupAddon>
        )}
        {expanded ? (
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
                      aria-label={attachLabel}
                      disabled={disabled}
                      className='rounded-full'
                      onClick={() => fileRef.current?.click()}
                    />
                  }
                >
                  <Paperclip />
                </TooltipTrigger>
                <TooltipContent>{attachLabel}</TooltipContent>
              </Tooltip>
              {model && draft.models.length > 1 && (
                <Select
                  value={modelKey(model)}
                  disabled={disabled}
                  onOpenChange={(open) => onModelMenu?.(open)}
                  onValueChange={(next) => {
                    if (typeof next === 'string') draft.selectModel(next);
                  }}
                >
                  <SelectTrigger
                    size='sm'
                    aria-label={toText(text('dock.model'))}
                    title={model.modelLabel}
                    className='max-w-48 min-w-0 rounded-full border-0 bg-muted/60 shadow-none'
                  >
                    <SelectValue>
                      <span className='truncate'>{model.modelLabel}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className='max-h-96 min-w-56'>
                    {groups.map((group, index) => (
                      <Fragment key={group.key}>
                        {index > 0 && <SelectSeparator />}
                        <SelectGroup>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.models.map((item) => (
                            <SelectItem
                              key={modelKey(item)}
                              value={modelKey(item)}
                            >
                              <span className='block max-w-64 truncate'>
                                {item.modelLabel}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </Fragment>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {sendButton}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      <input
        ref={fileRef}
        type='file'
        multiple
        hidden
        tabIndex={-1}
        aria-hidden='true'
        data-testid='ask-files'
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          if (picked.length) files.upload(picked);
          event.target.value = '';
        }}
      />
    </>
  );
}
