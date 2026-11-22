import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * PageHeader — the first block of every screen: a title, one line of context,
 * and the page's actions on the right.
 *
 * The title carries its own weight; there is no eyebrow above it and no icon
 * tile beside it. More space sits above this heading than below it, so the
 * block reads as a heading rather than a banner.
 */
export const PageHeader: React.FC<{
  title: string;
  description?: string;
  /** The page's real actions: an export, a create, a date range. */
  actions?: React.ReactNode;
  /** A small factual readout beside the title, e.g. the current financial year. */
  badge?: React.ReactNode;
  /** A segmented switch that belongs to this page only. */
  tabs?: React.ReactNode;
  breadcrumb?: { label: string; to: string }[];
  className?: string;
}> = ({ title, description, actions, badge, tabs, breadcrumb, className }) => (
  <div className={cn('space-y-3', className)}>
    {breadcrumb && breadcrumb.length > 0 && (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[10.5px] leading-4 text-ink-4">
        {breadcrumb.map((crumb) => (
          <span key={crumb.to} className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3" />
            <Link to={crumb.to} className="hover:text-primary-text">
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>
    )}

    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-semibold leading-6 tracking-[-0.02em] text-primary-text">
          {title}
          {badge}
        </h1>
        {description && <p className="max-w-[68ch] text-[11.5px] leading-4 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>

    {tabs}
  </div>
);