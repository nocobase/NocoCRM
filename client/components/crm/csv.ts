import { toText, type Data } from './api.js';
export function csvCell(value: unknown): string {
  const text =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : toText(value);
  return `"${toText((/^[=+@\-\t\r]/.test(text) ? `'${toText(text)}` : text).replaceAll('"', '""'))}"`;
}
export function downloadCsv(
  filename: string,
  columns: string[],
  records: Data[],
): void {
  const blob = new Blob(
    [
      '\uFEFF',
      [
        columns.map(csvCell).join(','),
        ...records.map((r) => columns.map((key) => csvCell(r[key])).join(',')),
      ].join('\r\n'),
    ],
    { type: 'text/csv;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
export function parseCsv(source: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const input = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(value);
      if (row.some((v) => v.trim())) result.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (quoted) throw new Error('invalidCsv');
  row.push(value);
  if (row.some((v) => v.trim())) result.push(row);
  return result;
}
