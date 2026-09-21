import type { FileRecord } from '@nocobase/app-plugin-file/client';
import { Download, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { FilePreviewDialog } from '@/extensions/nocobase-file-component-ui';
import { Button } from '../ui/button.js';
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

// Attachments, wherever they appear: the list of files on a record's tab
// and in a dialog's form, the preview dialog a file opens in, and the drop
// zone that adds files. One look everywhere.

export interface CrmFile {
  id: string;
  filename: string;
  createdAt: string;
  // The stored type, or null when the upload recorded none.
  mimeType: string | null;
  size: number | null;
  url: string;
}

// The preview dialog is the file plugin's (client/extensions/
// nocobase-file-component-ui): images, PDF, text and Markdown, and Word,
// Excel and PowerPoint rendered in the browser. It takes the plugin's file
// record shape; the CRM serves the bytes from its own route, with
// "?inline=1" so the browser may show what it renders itself.
function fileRecord(file: CrmFile): FileRecord {
  const dot = file.filename.lastIndexOf('.');
  return {
    id: file.id,
    disk: '',
    key: '',
    filename: file.filename,
    ext: dot < 0 ? '' : file.filename.slice(dot + 1).toLowerCase(),
    mimeType: file.mimeType ?? 'application/octet-stream',
    size: file.size ?? 0,
    createdAt: file.createdAt,
    updatedAt: file.createdAt,
    contentUrl: `${file.url}?inline=1`,
  };
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
  const [previewing, setPreviewing] = useState<string | null>(null);
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
  // The dialog pages through the listed files in the order shown.
  const records = visible.flatMap((id) => {
    const file = data?.find((f) => f.id === id);
    return file ? [fileRecord(file)] : [];
  });
  const previewIndex = records.findIndex((r) => r.id === previewing);
  if (!ids.length)
    return (
      <p className='text-sm text-muted-foreground'>{text('noAttachments')}</p>
    );
  return (
    <ul className='space-y-1'>
      <FilePreviewDialog
        files={records}
        initialIndex={Math.max(previewIndex, 0)}
        open={previewIndex >= 0}
        onOpenChange={(open) => !open && setPreviewing(null)}
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
                  onClick={() => setPreviewing(file.id)}
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
