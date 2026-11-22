import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

export interface MenuItem {
  label: string;
  icon?: React.ElementType;
  onSelect?: () => void;
  href?: string;
  description?: string;
  destructive?: boolean;
  /** Renders the row but blocks it, with the reason as its title. */
  disabled?: string;
}

/**
 * Dropdown — the menu behind a button.
 *
 * Closes on outside pointer-down, on Escape, and on row activation, and returns
 * focus to its trigger so the keyboard never loses its place. The panel enters
 * with a 160ms fade and a 4px rise: transform and opacity, nothing else, so it
 * stays cheap and is disabled wholesale under reduced motion.
 */
export function Dropdown({
  trigger,
  items,
  align = 'end',
  width = 'w-56',
  panelTitle,
  className,
}: {
  /** The trigger element. It receives the open state and a ref attachment. */
  trigger: (state: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => React.ReactNode;
  items: readonly MenuItem[];
  align?: 'start' | 'end';
  width?: string;
  panelTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const run = (item: MenuItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open && (
        <div
          id={panelId}
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'animate-pop absolute z-50 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
            width
          )}
        >
          {panelTitle && (
            <p className="border-b border-line px-3 py-2 text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4">
              {panelTitle}
            </p>
          )}
          <div className="p-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(item.disabled)}
                  title={item.disabled}
                  onClick={() => run(item)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left',
                    'transition-colors duration-micro ease-swift',
                    'focus-visible:outline-none focus-visible:bg-sub',
                    item.disabled && 'cursor-not-allowed opacity-40',
                    item.destructive ? 'text-error hover:bg-danger-soft' : 'text-primary-text hover:bg-sub'
                  )}
                >
                  {Icon && <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-3" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium leading-4">{item.label}</span>
                    {item.description && (
                      <span className="mt-0.5 block truncate text-[10px] leading-3 text-ink-3">{item.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}