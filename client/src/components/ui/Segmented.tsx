import { cn } from '../../utils/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional count shown after the label, e.g. "Analytics 12". */
  count?: number;
}

/**
 * Segmented — the pill switch under a page title. Active pill is a raised white
 * surface on the canvas track; the rest is quiet text. One authored moment, no
 * sliding indicator: the pill swaps and the content cross-fades.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-sub p-0.5', className)}
      onKeyDown={(event) => {
        const index = options.findIndex((option) => option.value === value);
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const step = event.key === 'ArrowRight' ? 1 : -1;
          const next = options[(index + step + options.length) % options.length];
          onChange(next.value);
        }
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[11.5px] font-medium leading-4',
              'transition-[background-color,color,box-shadow] duration-micro ease-swift',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30',
              active
                ? 'bg-surface text-primary-text shadow-xs'
                : 'text-ink-3 hover:text-primary-text'
            )}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <span className="text-[10px] text-ink-4 tnum">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}