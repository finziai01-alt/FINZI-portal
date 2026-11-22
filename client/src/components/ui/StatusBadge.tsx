import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';

const TONE: Record<Tone, string> = {
  positive: 'bg-brand-soft text-brand-ink',
  negative: 'bg-danger-soft text-danger-ink',
  warning: 'bg-warning-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-sub text-ink-2',
};

/**
 * Every status the workspace can hold, mapped to one tone. A status is described
 * by its word, so the colour is a second channel, never the only one.
 */
const STATUS_TONE: Record<string, Tone> = {
  // settled, good
  paid: 'positive',
  paid_in_full: 'positive',
  matched: 'positive',
  reconciled: 'positive',
  approved: 'positive',
  approved_conclusion: 'positive',
  auditor_verified: 'positive',
  filed: 'positive',
  configured: 'positive',
  active: 'positive',
  signed_off: 'positive',
  complete: 'positive',
  completed: 'positive',
  sent: 'info',
  // in flight
  processing: 'info',
  in_review: 'info',
  under_review: 'info',
  prepared: 'info',
  ai_suggestion: 'info',
  partially_paid: 'warning',
  pending: 'warning',
  pending_integration: 'warning',
  open: 'warning',
  auditor_finding: 'warning',
  // needs work
  unpaid: 'negative',
  overdue: 'negative',
  unmatched: 'negative',
  rejected: 'negative',
  failed: 'negative',
  error: 'negative',
  void: 'negative',
  // untouched
  draft: 'neutral',
  cancelled: 'neutral',
  archived: 'neutral',
  paused: 'neutral',
  reviewer_comment: 'neutral',
  inactive: 'neutral',
};

const resolveTone = (status: string): Tone => {
  const key = status.toLowerCase().replace(/[\s-]+/g, '_');
  if (STATUS_TONE[key]) return STATUS_TONE[key];
  if (/(paid|matched|reconcil|approv|verif|filed|signoff|signed|complete|active|final)/.test(key)) return 'positive';
  if (/(overdue|unpaid|unmatch|reject|fail|error|void|bounce|missing)/.test(key)) return 'negative';
  if (/(pending|process|review|partial|open|draft|wait|hold|finding|suggest)/.test(key)) return 'warning';
  return 'neutral';
};

/**
 * StatusBadge — a tinted pill with the status in words. Compact, right-aligned
 * in the last column of a table, and never colour alone.
 */
export const StatusBadge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { status: string }> = ({
  status,
  className,
  ...props
}) => {
  const tone = resolveTone(status);
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-4',
        'truncate whitespace-nowrap',
        TONE[tone],
        className
      )}
      title={status.replace(/_/g, ' ')}
      {...props}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};