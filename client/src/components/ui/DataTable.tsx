import React from 'react';
import { cn } from '../../utils/cn';

export interface DataColumn<Row> {
  key: string;
  /** Uppercase header text; leave empty for the leading-glyph column. */
  label?: string;
  align?: 'left' | 'right';
  render: (row: Row, index: number) => React.ReactNode;
}

export interface DataRowGlyph {
  /** Short monogram or a drawn mark, e.g. "IN" or a status dot. */
  label: string;
  tone?: 'accent' | 'positive' | 'negative' | 'neutral' | 'warning';
  /** An image source (a favicon, a logo) drawn in a rounded box instead of a monogram. */
  src?: string;
}

/**
 * DataTable — the reading surface for a list of records.
 *
 * Header row is 9.5px uppercase with wide tracking; values are right-aligned in
 * tabular figures so a column of rupees can be scanned vertically without the
 * eye hunting for the decimal. Rows are separated by hairlines, not zebra fill.
 */
export function DataTable<Row>({
  columns,
  rows,
  glyph,
  emptyMessage = 'Nothing recorded in this period yet.',
  footer,
  className,
}: {
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  glyph?: (row: Row, index: number) => DataRowGlyph | undefined;
  emptyMessage?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className={cn('px-1 py-6 text-center text-[11.5px] leading-4 text-ink-3', className)}>{emptyMessage}</p>
    );
  }

  return (
    <table className={cn('w-full border-collapse', className)}>
      <thead>
        <tr className="border-b border-line">
          {glyph && <th scope="col" className="w-8 pb-2" aria-hidden="true" />}
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                'pb-2 text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4',
                column.align === 'right' ? 'pl-3 text-right' : 'text-left'
              )}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const mark = glyph?.(row, index);
          return (
            <tr key={index} className="border-b border-line last:border-0">
              {mark && (
                <td className="w-8 py-2.5 pr-2.5 align-middle">
                  {mark.src ? (
                    <img
                      src={mark.src}
                      alt=""
                      width={16}
                      height={16}
                      loading="lazy"
                      className="size-4 rounded-[4px] object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        'dot mt-1.5',
                        mark.tone === 'positive' && 'bg-brand',
                        mark.tone === 'negative' && 'bg-error',
                        mark.tone === 'warning' && 'bg-warning',
                        (mark.tone === 'accent' || !mark.tone) && 'bg-brand',
                        mark.tone === 'neutral' && 'bg-ink-4'
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only">{mark.label}</span>
                </td>
              )}
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'py-2.5 align-middle',
                    column.align === 'right' ? 'pl-3 text-right' : 'text-left'
                  )}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
      {footer && <tfoot className="border-t border-line-strong">{footer}</tfoot>}
    </table>
  );
}

/** The left-hand cell of a row: a name with a grey second line beneath it. */
export const RowLabel: React.FC<{ title: React.ReactNode; meta?: React.ReactNode }> = ({ title, meta }) => (
  <span className="block min-w-0">
    <span className="block truncate text-[11.5px] font-medium leading-4 text-primary-text">{title}</span>
    {meta && <span className="mt-0.5 block truncate text-[10px] leading-3 text-ink-3">{meta}</span>}
  </span>
);

/** The right-hand cell of a row: a tabular figure with an optional sub-line. */
export const RowValue = ({
  value,
  meta,
  tone = 'neutral',
}: {
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
}) => (
  <span className="block">
    <span
      className={cn(
        'block text-[13px] font-semibold leading-4 tnum',
        tone === 'positive' && 'text-brand',
        tone === 'negative' && 'text-error',
        tone === 'neutral' && 'text-primary-text'
      )}
    >
      {value}
    </span>
    {meta && <span className="mt-0.5 block text-[10px] leading-3 text-ink-3 tnum">{meta}</span>}
  </span>
);