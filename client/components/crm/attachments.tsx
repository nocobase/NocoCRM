import { useQuery } from '@tanstack/react-query';
import { Download, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import {
  PAGE_SIZE,
  arrayValues,
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  type Data,
  type Entity,
} from './api.js';
import { Markdown } from './markdown.js';

// Attachments, wherever they appear: the list of files on a record's tab
// and in a dialog's form, the preview dialog a file opens in, and the drop
// zone that adds files. One look everywhere.

export interface CrmFile {
  id: string;
  filename: string;
  createdAt: string;
  // The stored type when the browser can show it inline, otherwise null.
  mimeType: string | null;
  size: number | null;
  url: string;
}

// "1.2 MB" style sizes for the preview's subtitle.
function fileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit ? value.toFixed(1) : String(value)} ${units[unit]}`;
}

// A Markdown attachment, fetched as text and rendered on the client. HTML
// inside it is escaped rather than rendered, so an upload cannot run
// anything in the page.
function MarkdownPreview({ url }: { url: string }): ReactElement {
  const { text } = useCrmText();
  const { data, error, isLoading } = useQuery({
    queryKey: ['crm', 'file-text', url],
    queryFn: async () => {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    },
    staleTime: 60000,
  });
  if (isLoading)
    return <p className='text-sm text-muted-foreground'>{text('loading')}</p>;
  if (error || data === undefined)
    return (
      <p className='rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
        {text('noPreview')}
      </p>
    );
  return (
    <Markdown className='min-h-0 flex-1 overflow-auto rounded-md border px-5 py-4 text-sm leading-relaxed'>
      {data}
    </Markdown>
  );
}

// Opening an attachment shows it in a dialog rather than saving it: images
// and PDFs render inline, Markdown is rendered from its text, anything else
// is named and offered for download. The download stays a click away in the
// footer either way.
function FilePreview({
  file,
  onClose,
  timeZone,
}: {
  file: CrmFile | null;
  onClose: () => void;
  timeZone: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const type = file?.mimeType ?? '';
  const inlineUrl = file ? `${file.url}?inline=1` : '';
  const kind = type.startsWith('image/')
    ? 'image'
    : type === 'application/pdf' || type === 'text/plain'
      ? 'frame'
      : type === 'text/markdown' || type === 'text/x-markdown'
        ? 'markdown'
        : 'none';
  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          kind === 'none'
            ? 'sm:max-w-md'
            : 'flex max-h-[90vh] flex-col sm:max-w-4xl'
        }
      >
        <DialogHeader>
          <DialogTitle className='break-all'>{file?.filename}</DialogTitle>
          <DialogDescription>
            {file
              ? [
                  file.size === null ? null : fileSize(file.size),
                  localDate(file.createdAt, language, timeZone),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null}
          </DialogDescription>
        </DialogHeader>
        {kind === 'image' ? (
          <div className='flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-muted/40 p-2'>
            <img
              src={inlineUrl}
              alt={file?.filename ?? ''}
              className='max-h-[70vh] max-w-full object-contain'
            />
          </div>
        ) : kind === 'frame' ? (
          <iframe
            src={inlineUrl}
            title={file?.filename ?? ''}
            className='h-[70vh] w-full rounded-md border bg-background'
          />
        ) : kind === 'markdown' ? (
          <MarkdownPreview url={inlineUrl} />
        ) : (
          <p className='rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
            {text('noPreview')}
          </p>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            {text('close')}
          </Button>
          {file ? (
            <Button
              nativeButton={false}
              render={<a href={file.url} download={file.filename} />}
            >
              <Download />
              {text('download')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FileLinks({
  files,
  onRemove,
  sourceLabel,
}: {
  files: unknown[];
  onRemove?: (id: string) => void;
  // Names the record a file came from, used where one list mixes several.
  sourceLabel?: (id: string) => ReactNode;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const attachmentStep = PAGE_SIZE;
  const [shown, setShown] = useState(attachmentStep);
  const [previewing, setPreviewing] = useState<CrmFile | null>(null);
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const ids = files.map(toText).filter(Boolean);
  const { data } = useCrmQuery<CrmFile[]>(
    `files?ids=${encodeURIComponent(ids.join(','))}`,
    ids.length > 0,
  );
  // Newest upload first, so a truncated list shows the most recent files rather
  // than whichever happened to be appended first.
  const ordered = data
    ? [...ids].sort(
        (left, right) =>
          new Date(
            data.find((file) => file.id === right)?.createdAt ?? 0,
          ).getTime() -
          new Date(
            data.find((file) => file.id === left)?.createdAt ?? 0,
          ).getTime(),
      )
    : ids;
  const visible = ordered.slice(0, shown);
  if (!ids.length)
    return (
      <p className='text-sm text-muted-foreground'>{text('noAttachments')}</p>
    );
  return (
    <ul className='space-y-1'>
      <FilePreview
        file={previewing}
        onClose={() => setPreviewing(null)}
        timeZone={timeZone}
      />
      {visible.map((id) => {
        const file = data?.find((f) => f.id === id);
        return (
          <li key={id} className='flex items-start gap-1'>
            {file ? (
              // The name opens the preview dialog; the download and remove
              // icons sit together at the end of the row (the endpoint sends
              // Content-Disposition: attachment, so the link saves the file).
              // One flex row so the name, its time and its source sit on a
              // single centre line despite the differing text sizes.
              <span className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5'>
                <button
                  type='button'
                  className='inline-flex min-w-0 items-center gap-2 text-left text-sm text-primary hover:underline'
                  aria-label={`${toText(text('preview'))} ${file.filename}`}
                  onClick={() => setPreviewing(file)}
                >
                  <Paperclip className='size-3.5 shrink-0 text-muted-foreground' />
                  <span className='break-all'>{file.filename}</span>
                </button>
                <span className='text-xs text-muted-foreground'>
                  {localDate(file.createdAt, language, timeZone)}
                </span>
                {sourceLabel ? (
                  <span className='text-xs'>{sourceLabel(id)}</span>
                ) : null}
              </span>
            ) : (
              <span className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                <Paperclip className='size-3.5 shrink-0' />…
              </span>
            )}
            <span className='ml-auto flex shrink-0 items-center'>
              {file && (
                <a
                  className='inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
                  href={file.url}
                  download={file.filename}
                  aria-label={`${toText(text('download'))} ${file.filename}`}
                >
                  <Download className='size-3.5' />
                </a>
              )}
              {onRemove && (
                <Button
                  className='size-6 text-muted-foreground hover:text-destructive'
                  variant='ghost'
                  size='icon-sm'
                  // Two uploads may share a filename, so the label carries the
                  // upload time to stay distinguishable to screen readers.
                  aria-label={`${toText(text('remove'))} ${toText(
                    file?.filename ?? id,
                  )}${
                    file
                      ? ` · ${toText(localDate(file.createdAt, language, timeZone))}`
                      : ''
                  }`}
                  onClick={() => onRemove(id)}
                >
                  <Trash2 />
                </Button>
              )}
            </span>
          </li>
        );
      })}
      {ids.length > shown && (
        <li>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShown((n) => n + attachmentStep)}
          >
            {text('loadMore')} · {ids.length - shown}
          </Button>
        </li>
      )}
    </ul>
  );
}

// The drop zone every attachment list shares: drag files onto it or click
// it to pick them. It uploads them and hands the new file ids to its owner,
// which decides where they go (a record's attachments, a form's value).
export function FileDropZone({
  entity,
  busy,
  setBusy,
  onUploaded,
  onError,
}: {
  entity: Entity;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onUploaded: (ids: string[]) => Promise<void> | void;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const { text } = useCrmText();
  const fileRef = useRef<HTMLInputElement>(null);
  // Counts enters and leaves, because dragging over a child fires a leave
  // for the parent before the child's enter.
  const [dragDepth, setDragDepth] = useState(0);
  const over = dragDepth > 0;
  const upload = (picked: File[]): void => {
    if (!picked.length || busy) return;
    void (async () => {
      setBusy(true);
      const body = new FormData();
      picked.forEach((file) => body.append('file', file));
      try {
        const result = await api<{ data: { id: string }[] }>(
          `files?entity=${toText(entity)}`,
          'POST',
          body,
        );
        await onUploaded(result.data.map((uploaded) => toText(uploaded.id)));
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  return (
    <div
      role='button'
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      aria-label={text('uploadFile')}
      className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-md border border-dashed px-3 py-3 text-sm transition-colors ${
        over
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-muted/40'
      } ${busy ? 'cursor-progress opacity-60' : 'cursor-pointer'}`}
      onClick={() => !busy && fileRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!busy) fileRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragDepth((n) => n + 1);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
      }}
      onDragLeave={() => setDragDepth((n) => Math.max(0, n - 1))}
      onDrop={(event) => {
        event.preventDefault();
        setDragDepth(0);
        upload(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <Upload className='size-4 shrink-0' />
      <span>{busy ? text('uploading') : text('dropFilesHere')}</span>
      {!busy && (
        <span className='font-medium text-primary underline-offset-4 hover:underline'>
          {text('chooseFiles')}
        </span>
      )}
      <input
        ref={fileRef}
        type='file'
        multiple
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          upload(Array.from(event.target.files ?? []));
          // Without this, picking the same file twice fires no change event.
          event.target.value = '';
        }}
      />
    </div>
  );
}

// The drop zone under a record's own attachment group: what lands on it is
// appended to the record's attachments and the page refreshed.
export function UploadZone({
  entity,
  record,
  busy,
  setBusy,
  onError,
}: {
  entity: Entity;
  record: Data;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  return (
    <FileDropZone
      entity={entity}
      busy={busy}
      setBusy={setBusy}
      onError={onError}
      onUploaded={async (ids) => {
        await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
          attachments: [...arrayValues(record.attachments).map(toText), ...ids],
        });
        await refresh();
      }}
    />
  );
}
