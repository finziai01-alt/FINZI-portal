import React from 'react';

const statusStyles: Record<string, string> = {
  draft: 'bg-surface-container-low text-secondary-text',
  processing: 'bg-info/10 text-info',
  unpaid: 'bg-warning/10 text-warning',
  partially_paid: 'bg-warning/10 text-warning',
  paid: 'bg-green/10 text-green',
  overdue: 'bg-danger/10 text-danger',
  rejected: 'bg-danger/10 text-danger',
  sent: 'bg-info/10 text-info',
  cancelled: 'bg-surface-container-low text-secondary-text',
  matched: 'bg-green/10 text-green',
  unmatched: 'bg-warning/10 text-warning',
  reconciled: 'bg-green/10 text-green',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-green/10 text-green',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const className = `inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium capitalize ${statusStyles[status] || statusStyles.draft}`;
  return <span className={className}>{status}</span>;
};


