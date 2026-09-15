import { useState, type ReactElement, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js';
import { toText, useCrmText, type Data } from './api.js';

// Won and lost per month as two lines: one axis, two series in fixed
// colours (won in the primary ink, lost in the destructive one — the same
// pairing the status badges use), a legend so identity is never colour
// alone, a tooltip on every bar, and the numbers themselves in a table below.
export function TrendChart({
  title,
  rows,
  language,
  table,
}: {
  title: string;
  rows: Data[];
  language: string;
  table: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  // The month under the pointer: a crosshair and the values beside its points.
  const [hover, setHover] = useState<number>();
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [Number(r.won ?? 0), Number(r.lost ?? 0)]),
  );
  const monthLabel = (month: unknown): string => {
    const [y, m] = toText(month).split('-').map(Number);
    return new Intl.DateTimeFormat(language, { month: 'short' }).format(
      new Date(Date.UTC(y, (m || 1) - 1, 15)),
    );
  };
  const series = [
    {
      key: 'won',
      label: text('options.won'),
      swatch: 'bg-primary',
      stroke: 'stroke-primary',
      fill: 'fill-primary',
    },
    {
      key: 'lost',
      label: text('options.lost'),
      swatch: 'bg-destructive',
      stroke: 'stroke-destructive',
      fill: 'fill-destructive',
    },
  ] as const;
  // Geometry in viewBox units; the x positions line up with the month
  // labels' grid columns below.
  const width = 600;
  const height = 140;
  const pad = 12;
  const x = (i: number): number =>
    rows.length > 1
      ? pad + (i * (width - 2 * pad)) / (rows.length - 1)
      : width / 2;
  const y = (v: number): number =>
    height - pad - (v / max) * (height - 2 * pad);
  return (
    <Card className='shadow-none'>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>{title}</CardTitle>
        <ul className='flex gap-3 text-xs text-muted-foreground'>
          {series.map((s) => (
            <li key={s.key} className='flex items-center gap-1.5'>
              <span
                aria-hidden
                className={`inline-block size-2.5 rounded-sm ${s.swatch}`}
              />
              {s.label}
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent>
        {/* Two lines on one axis; the y range is the larger count, with a
            little headroom. Points are >= 8px with a surface ring so the two
            series stay apart where they cross; every point carries a tooltip. */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className='h-36 w-full'
          role='img'
          aria-label={title}
        >
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={pad}
              x2={width - pad}
              y1={y(max * t)}
              y2={y(max * t)}
              className='stroke-border'
              strokeWidth={1}
            />
          ))}
          {series.map((s) => (
            <polyline
              key={s.key}
              fill='none'
              strokeWidth={2}
              strokeLinejoin='round'
              strokeLinecap='round'
              className={s.stroke}
              points={rows
                .map((row, i) => `${x(i)},${y(Number(row[s.key] ?? 0))}`)
                .join(' ')}
            />
          ))}
          {hover !== undefined && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad}
              y2={height - pad}
              className='stroke-muted-foreground/40'
              strokeWidth={1}
              strokeDasharray='3 3'
            />
          )}
          {series.map((s) =>
            rows.map((row, i) => {
              const value = Number(row[s.key] ?? 0);
              return (
                <circle
                  key={`${s.key}-${toText(row.month)}`}
                  cx={x(i)}
                  cy={y(value)}
                  r={4}
                  className={`${s.fill} stroke-card`}
                  strokeWidth={2}
                >
                  <title>{`${monthLabel(row.month)} · ${s.label} ${value}`}</title>
                </circle>
              );
            }),
          )}
          {hover !== undefined &&
            series.map((s, si) => {
              const value = Number(rows[hover]?.[s.key] ?? 0);
              // Labels sit to the right of the point, or to the left at the
              // last month so they stay inside the plot; the two series'
              // labels are pushed apart when their points coincide.
              const other = Number(rows[hover]?.[series[1 - si].key] ?? 0);
              const dy = value === other ? (si === 0 ? -8 : 8) : 0;
              const right = hover < rows.length - 1;
              return (
                <text
                  key={s.key}
                  x={x(hover) + (right ? 8 : -8)}
                  y={y(value) + dy + 4}
                  textAnchor={right ? 'start' : 'end'}
                  className={`${s.fill} text-sm font-semibold`}
                >
                  {value}
                </text>
              );
            })}
          {/* Hit areas: one column per month, wider than the marks. */}
          {rows.map((row, i) => (
            <rect
              key={`hit-${toText(row.month)}`}
              x={x(i) - (width - 2 * pad) / (2 * Math.max(1, rows.length - 1))}
              y={0}
              width={(width - 2 * pad) / Math.max(1, rows.length - 1)}
              height={height}
              fill='transparent'
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(undefined)}
            />
          ))}
        </svg>
        <div
          className='grid text-center text-xs text-muted-foreground'
          style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}
        >
          {rows.map((row) => (
            <span key={toText(row.month)}>{monthLabel(row.month)}</span>
          ))}
        </div>
        {/* The numbers under the picture, always: the table is what a
            reader copies or checks against. */}
        <div className='mt-4'>{table}</div>
      </CardContent>
    </Card>
  );
}
