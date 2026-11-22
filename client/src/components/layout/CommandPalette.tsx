import React, { useEffect, useMemo, useRef, useState } from 'react';
import { accountsList, billsList, customersList, invoicesList, vendorsList } from '../../services/api';

interface Result {
  type: string;
  label: string;
  meta?: string;
  to: string;
}

const TYPE_ORDER = ['Bill', 'Invoice', 'Customer', 'Vendor', 'Account'];

/**
 * CommandPalette — ⌘K over the whole workspace.
 *
 * The surface's one authored motion moment: the panel rises 4px and fades in
 * over 160ms, results are grouped under tiny uppercase headers, and the
 * keyboard drives the whole thing. Arrow keys move, Enter navigates, Escape
 * closes and returns focus to the trigger. Search runs against the same lists
 * the top bar used, so nothing here is slower or different from the global
 * search it replaced.
 */
export const CommandPalette: React.FC<{ onClose: () => void; onNavigate: (path: string) => void }> = ({
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setActive(0);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const [bills, invoices, customers, vendors, accounts] = await Promise.all([
          billsList({ search: term, limit: 5 }),
          invoicesList({ search: term, limit: 5 }),
          customersList(),
          vendorsList(),
          accountsList(),
        ]);
        if (!alive) return;
        const lowered = term.toLowerCase();
        const found: Result[] = [];
        (bills.data?.bills || []).forEach((b: any) =>
          found.push({ type: 'Bill', label: b.bill_number, meta: b.vendor_name, to: `/bills/${b.id}` })
        );
        (invoices.data?.invoices || []).forEach((i: any) =>
          found.push({ type: 'Invoice', label: i.invoice_number, meta: i.customer_name, to: `/invoices/${i.id}` })
        );
        (customers.data?.customers || [])
          .filter((c: any) => String(c.name || '').toLowerCase().includes(lowered))
          .slice(0, 4)
          .forEach((c: any) => found.push({ type: 'Customer', label: c.name, meta: c.gstin, to: '/bills/create' }));
        (vendors.data?.vendors || [])
          .filter((v: any) => String(v.name || '').toLowerCase().includes(lowered))
          .slice(0, 4)
          .forEach((v: any) => found.push({ type: 'Vendor', label: v.name, meta: v.gstin, to: '/bills/create' }));
        (accounts.data?.accounts || [])
          .filter((a: any) => [a.name, a.code].some((value: string) => String(value || '').toLowerCase().includes(lowered)))
          .slice(0, 4)
          .forEach((a: any) => found.push({ type: 'Account', label: `${a.code} ${a.name}`, to: '/ledger' }));
        setResults(found.slice(0, 14));
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
        }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    TYPE_ORDER.forEach((type) => {
      const rows = results.filter((r) => r.type === type);
      if (rows.length) map.set(type, rows);
    });
    return map;
  }, [results]);

  const flat = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);

  const go = (index: number) => {
    const target = flat[index];
    if (!target) return;
    onNavigate(target.to);
    setQuery('');
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        return (index + step + flat.length) % Math.max(flat.length, 1);
      });
    }
  };

  const jumpRoutes = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Bills and expenses', to: '/bills' },
    { label: 'Sales and invoices', to: '/invoices' },
    { label: 'Ledger and accounts', to: '/ledger' },
    { label: 'Banking', to: '/banking' },
    { label: 'Tax and compliance', to: '/tax' },
    { label: 'Financial reports', to: '/reports' },
    { label: 'Audit workspace', to: '/audit' },
    { label: 'FINZI AI', to: '/ai' },
    { label: 'Automations', to: '/automations' },
    { label: 'Reminders', to: '/reminders' },
    { label: 'Settings', to: '/settings' },
    { label: 'Help and support', to: '/support' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/20 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-pop relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-modal"
        onKeyDown={onListKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-ink-4">
            <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.2 10.2 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bills, invoices, customers, vendors, accounts"
            aria-label="Search bills, invoices, customers, vendors, accounts"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-5 text-primary-text placeholder:text-ink-3 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[9.5px] leading-none text-ink-4">
            esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <>
              <p className="px-2.5 py-1.5 text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4">
                Jump to
              </p>
              <div className="space-y-0.5">
                {jumpRoutes.map((route) => (
                  <button
                    key={route.to}
                    type="button"
                    onClick={() => {
                      onNavigate(route.to);
                      setQuery('');
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:bg-sub"
                  >
                    {route.label}
                    <span className="font-mono text-[10px] text-ink-4">↵</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {query.trim().length >= 2 && searching && flat.length === 0 && (
            <p className="px-3 py-6 text-center text-[11.5px] leading-4 text-ink-3">Searching…</p>
          )}

          {query.trim().length >= 2 && !searching && flat.length === 0 && (
            <p className="px-3 py-6 text-center text-[11.5px] leading-4 text-ink-3">
              No record matches “{query.trim()}”.
            </p>
          )}

          {Array.from(grouped.entries()).map(([type, rows]) => (
            <div key={type} className="mb-2 last:mb-0">
              <p className="px-2.5 py-1.5 text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4">
                {type}
              </p>
              <div className="space-y-0.5">
                {rows.map((row) => {
                  const index = flat.indexOf(row);
                  return (
                    <button
                      key={`${type}-${row.label}-${index}`}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(index)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-micro ${
                        index === active ? 'bg-sub' : 'hover:bg-sub/60'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium leading-4 text-primary-text tnum">
                          {row.label}
                        </span>
                        {row.meta && (
                          <span className="mt-0.5 block truncate text-[10px] leading-3 text-ink-3">{row.meta}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-4">↵</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};