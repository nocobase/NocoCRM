import { downloadCsv, parseCsv } from './csv.js';
import { toText } from './api.js';
import { useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table.js';
import {
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type Data,
  type Entity,
} from './api.js';
import { ErrorNotice } from './common.js';

export function ImportDialog({
  entity,
  onClose,
}: {
  entity: Entity;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [records, setRecords] = useState<Data[]>([]);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const fields = meta?.definitions[entity].fields ?? [];
  const columns = fields.map((f) => f.key);
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {text('import')} · {text(`entities.${toText(entity)}`)}
          </DialogTitle>
          <DialogDescription>{text('importHint')}</DialogDescription>
        </DialogHeader>
        <ErrorNotice error={error} />
        <Button
          variant='outline'
          onClick={() =>
            downloadCsv(`${toText(entity)}-template.csv`, columns, [])
          }
        >
          {text('template')}
        </Button>
        <Input
          type='file'
          accept='.csv,text/csv'
          aria-label={text('import')}
          onChange={(e) => {
            void (async () => {
              setError(undefined);
              setRecords([]);
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) throw new Error();
                const [header = [], ...data] = parseCsv(await file.text());
                if (
                  header.some((h) => !columns.includes(h)) ||
                  new Set(header).size !== header.length ||
                  data.length > 500 ||
                  !data.length ||
                  data.some((r) => r.length !== header.length)
                )
                  throw new Error();
                setRecords(
                  data.map((values) =>
                    Object.fromEntries(
                      header
                        .map((key, i): [string, unknown] => {
                          const field = fields.find((f) => f.key === key)!;
                          const value = values[i];
                          return [
                            key,
                            !value
                              ? undefined
                              : field.type === 'number'
                                ? Number(value)
                                : field.type === 'boolean'
                                  ? ['true', '1', 'yes'].includes(
                                      value.toLowerCase(),
                                    )
                                  : ['contacts', 'multi', 'files'].includes(
                                        field.type,
                                      )
                                    ? (JSON.parse(value) as unknown)
                                    : value,
                          ];
                        })
                        .filter(([, value]) => value !== undefined),
                    ),
                  ),
                );
              } catch (e) {
                setError(e);
              }
            })();
          }}
        />
        {records.length > 0 && (
          <>
            <p className='text-sm'>
              {text('importPreview', { count: records.length })}
            </p>
            <div className='max-h-64 overflow-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(records[0]).map((key) => (
                      <TableHead key={key}>
                        {text(`fields.${toText(key)}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 10).map((record) => (
                    <TableRow key={JSON.stringify(record)}>
                      {Object.entries(record).map(([key, v]) => (
                        <TableCell key={key}>
                          {typeof v === 'object'
                            ? JSON.stringify(v)
                            : toText(v ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onClose}>
            {text('cancel')}
          </Button>
          <Button
            disabled={busy || !records.length}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await api<{ data: CrmRecord[] }>(
                    `${toText(entity)}/import`,
                    'POST',
                    {
                      rows: records,
                    },
                  );
                  await refresh();
                  onClose();
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {busy ? text('saving') : text('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
