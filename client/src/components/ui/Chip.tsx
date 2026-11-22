import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type Tone = 'accent' | 'positive' | 'negative' | 'neutral' | 'warning';

const DOT: Record<Tone, string> = {
  accent: 'bg-brand',
  positive: 'bg-brand',
  negative: 'bg-error',
  neutral: 'bg-ink-4',
  warning: 'bg-warning',
};

/**
 * Chip — the small dot-and-figure readout that sits at the top right of a card.
 * It states a count or a unit, never a status; status belongs in a badge.
 */
export const Chip: React.FC<
  React.HTMLAttributes<HTMLSpanElement> & {
    tone?: Tone;
    /** Shows the dot. Off when the chip states a plain count. */
    dot?: boolean;
  }
> = ({ tone = 'accent', dot = true, className, children, ...props }) => (
  <span
    className={cn('inline-flex items-center gap-1.5 text-[10.5px] font-medium leading-4 text-ink-3 tnum', className)}
    {...props}
  >
    {dot && <span className={cn('dot', DOT[tone])} aria-hidden="true" />}
    {children}
  </span>
);

/**
 * InfoHint — the glyph that opens a one-line explanation of a metric. The note
 * is rendered as the native tooltip so keyboard and screen-reader users get the
 * same text pointer users do.
 */
export const InfoHint: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
  <span className={cn('inline-flex text-ink-4', className)} title={label} aria-label={label} role="img">
    <Info aria-hidden="true" className="size-3" />
  </span>
);

/**
 * SectionLabel — the tiny uppercase label above a group of nav items or a
 * table column. Lowercase weight, wide tracking, faint grey.
 */
export const SectionLabel: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ children, className, ...props }) => (
  <span
    className={cn('block text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4', className)}
    {...props}
  >
    {children}
  </span>
);