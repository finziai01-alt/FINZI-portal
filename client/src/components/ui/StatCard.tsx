import React from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';
import { Chip, InfoHint } from './Chip';

export interface StatMetric {
  /** Small grey label on the left of the row. */
  label: string;
  /** The figure, already formatted. Right-aligned, tabular. */
  value: string;
  /** Signed delta, e.g. "+20.6%" or "No prior month to compare". */
  delta?: string;
  /** Direction of the delta: what it means, not which way the number moved. */
  deltaTone?: 'positive' | 'negative' | 'neutral';
  /** One grey line under the figure. */
  caption?: string;
}

/**
 * StatCard — the uixpress KPI panel.
 *
 * A title and an optional info note on the left, a count readout on the right,
 * then up to three metric rows. Each row is label-left, figure-right, so a
 * column of figures reads vertically. Rows are hairline-separated; the card
 * uses no fill, no icon, and no shadow.
 */
export const StatCard: React.FC<{
  title: string;
  /** The one-line explanation of what the figures mean. */
  note?: string;
  /** Right-hand readout: a count with its unit, e.g. "12 invoices". */
  readout?: { value: string; unit?: string; tone?: 'accent' | 'positive' | 'negative' };
  metrics: readonly StatMetric[];
  footer?: React.ReactNode;
  className?: string;
}> = ({ title, note, readout, metrics, footer, className }) => (
  <Card className={cn('flex flex-col', className)} flush>
    <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
      <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
        {title}
        {note && <InfoHint label={note} />}
      </h3>
      {readout && (
        <Chip tone={readout.tone || 'accent'}>
          {readout.value}
          {readout.unit ? ` ${readout.unit}` : ''}
        </Chip>
      )}
    </div>

    <div className="flex-1 px-4 pb-2 pt-2.5">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={cn(
            'flex items-start justify-between gap-4 py-2.5',
            index > 0 && 'border-t border-line'
          )}
        >
          <p className="pt-1 text-[11px] leading-4 text-ink-2">{metric.label}</p>
          <div className="text-right">
            <p className="text-[17px] font-semibold leading-6 text-primary-text tnum">{metric.value}</p>
            {metric.delta && (
              <p
                className={cn(
                  'mt-0.5 text-[10.5px] font-medium leading-3 tnum',
                  metric.deltaTone === 'positive' && 'text-brand',
                  metric.deltaTone === 'negative' && 'text-error',
                  (metric.deltaTone === 'neutral' || !metric.deltaTone) && 'text-ink-3'
                )}
              >
                {metric.delta}
              </p>
            )}
            {metric.caption && <p className="mt-1 text-[10px] leading-3 text-ink-4">{metric.caption}</p>}
          </div>
        </div>
      ))}
    </div>

    {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
  </Card>
);