import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Card — the flat hairline panel the workspace is built from.
 *
 * Depth comes from the canvas tint, the hairline, and the gutter between
 * panels, not from a heavy shadow. That is what keeps a screen of numbers
 * readable for hours. Cards are leaf containers: a card never holds a card.
 */
// Flat by design: a hairline and the gutter carry the depth, not a shadow.
// A heavy shadow on a screen of numbers makes every figure harder to read.
const CARD_BASE =
  'bg-surface border border-line rounded-xl overflow-hidden transition-[border-color] duration-panel ease-swift';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** A short plain-language note shown beside the title behind the info glyph. */
  description?: string;
  /** Right-hand slot in the header: a metric chip, a filter, or a single action. */
  action?: React.ReactNode;
  /** A card that lifts on hover, for rows and navigable panels only. */
  interactive?: boolean;
  /** Removes the body padding so a table or chart can run to the edges. */
  flush?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  description,
  action,
  interactive = false,
  flush = false,
  className,
  ...props
}) => {
  const hasHeader = header || description || action;

  return (
    <section
      className={cn(
        CARD_BASE,
        interactive && 'hover:border-line-strong hover:shadow-raise motion-safe:hover:-translate-y-px',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 px-4 pt-3.5 pb-2 border-b border-line">
          <div className="min-w-0 space-y-1">
            {header && (
              <h2 className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                {header}
              </h2>
            )}
            {description && (
              <p className="flex items-start gap-1.5 text-[10.5px] leading-4 text-ink-3">
                <Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-4')}>{children}</div>
      {footer && <footer className="border-t border-line px-4 py-3">{footer}</footer>}
    </section>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('flex items-start justify-between gap-4 px-4 pt-3.5 pb-2 border-b border-line', className)} {...props}>
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('p-4', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('border-t border-line px-4 py-3', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className, ...props }) => (
  <h2 className={cn('text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]', className)} {...props}>
    {children}
  </h2>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className, ...props }) => (
  <p className={cn('text-[10.5px] leading-4 text-ink-3', className)} {...props}>
    {children}
  </p>
);