import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  accountsList,
  billsList,
  customersList,
  invoicesList,
  notificationsList,
  notificationsRead,
  vendorsList,
} from '../../services/api';
import { Bell, ChevronRight, LogOut, Search, User as UserIcon } from 'lucide-react';

type SearchResult = { type: string; label: string; meta?: string; to: string };

const CRUMB_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  bills: 'Bills and expenses',
  invoices: 'Sales and invoices',
  ledger: 'Ledger and accounts',
  banking: 'Banking',
  tax: 'Tax and compliance',
  reports: 'Financial reports',
  audit: 'Audit workspace',
  evidence: 'Evidence and papers',
  'working-papers': 'Working papers',
  ai: 'FINZI AI',
  automations: 'Automations',
  reminders: 'Reminders',
  settings: 'Settings',
  team: 'Team',
  roles: 'Roles and permissions',
  activity: 'Activity log',
  companies: 'Companies',
  clients: 'Clients',
  create: 'New entry',
  support: 'Help and support',
};

export const TopNav: React.FC = () => {
  const { state, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: CRUMB_LABELS[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    path: '/' + segments.slice(0, i + 1).join('/'),
  }));

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const [bills, invoices, customers, vendors, accounts] = await Promise.all([
          billsList({ search: term, limit: 5 }),
          invoicesList({ search: term, limit: 5 }),
          customersList(),
          vendorsList(),
          accountsList(),
        ]);
        const lowered = term.toLowerCase();
        const found: SearchResult[] = [];
        (bills.data?.bills || []).forEach((b: any) =>
          found.push({ type: 'Bill', label: b.bill_number, meta: b.vendor_name, to: `/bills/${b.id}` }));
        (invoices.data?.invoices || []).forEach((i: any) =>
          found.push({ type: 'Invoice', label: i.invoice_number, meta: i.customer_name, to: `/invoices/${i.id}` }));
        (customers.data?.customers || [])
          .filter((c: any) => String(c.name || '').toLowerCase().includes(lowered))
          .slice(0, 4)
          .forEach((c: any) => found.push({ type: 'Customer', label: c.name, meta: c.gstin, to: '/bills/create' }));
        (vendors.data?.vendors || [])
          .filter((v: any) => String(v.name || '').toLowerCase().includes(lowered))
          .slice(0, 4)
          .forEach((v: any) => found.push({ type: 'Vendor', label: v.name, meta: v.gstin, to: '/bills/create' }));
        (accounts.data?.accounts || [])
          .filter((a: any) =>
            [a.name, a.code].some((value: string) => String(value || '').toLowerCase().includes(lowered)))
          .slice(0, 4)
          .forEach((a: any) => found.push({ type: 'Account', label: `${a.code} ${a.name}`, to: '/ledger' }));
        setResults(found.slice(0, 10));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!showNotifications) return;
    notificationsList()
      .then((res) => setNotifications(res.data?.notifications || []))
      .catch(() => setNotifications([]));
  }, [showNotifications]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    try {
      await notificationsRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch {
      // keep the panel as it is; the next refresh will show the server state
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-outline bg-surface-container-lowest flex items-center justify-between px-6 gap-4 z-40">
      <nav className="hidden md:flex items-center gap-1 text-xs text-on-surface-variant min-w-0">
        <Link to="/dashboard" className="hover:text-on-surface transition-colors">Home</Link>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.path} className="flex items-center gap-1 min-w-0">
            <ChevronRight size={12} className="text-outline shrink-0" />
            <Link to={crumb.path} className="hover:text-on-surface transition-colors truncate">
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3 ml-auto">
        <div ref={searchRef} className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search invoices, bills, vendors"
            className="w-64 pl-9 pr-10 py-2 text-sm bg-surface-container-low border border-outline rounded-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 font-code-mono text-code-mono text-outline border border-outline rounded px-1">
            /
          </kbd>
          {showResults && query.trim().length >= 2 && (
            <div className="absolute right-0 mt-1 w-80 bg-surface-container-lowest border border-outline rounded-md shadow-lg overflow-hidden z-50">
              {searching && <p className="px-3 py-2 text-xs text-on-surface-variant">Searching...</p>}
              {!searching && results.length === 0 && (
                <p className="px-3 py-2 text-xs text-on-surface-variant">No match for “{query.trim()}”.</p>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.label}-${i}`}
                  onClick={() => {
                    setShowResults(false);
                    setQuery('');
                    navigate(r.to);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-container-low transition-colors flex items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-on-surface truncate">{r.label}</span>
                    {r.meta && <span className="block text-xs text-on-surface-variant truncate">{r.meta}</span>}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-outline shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="hidden lg:inline-flex items-center px-2.5 py-1.5 rounded bg-surface-container-low border border-outline font-code-mono text-code-mono text-on-surface-variant">
          {state.company?.gstin || 'GSTIN pending'}
        </span>

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications((v) => !v);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-1 w-80 bg-surface-container-lowest border border-outline rounded-md shadow-lg z-50 overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant border-b border-outline">
                Notifications
              </p>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-on-surface-variant text-center">No notifications.</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="border-b border-outline last:border-0">
                      <button
                        onClick={() => markRead(n.id)}
                        className={`w-full text-left px-3 py-2 hover:bg-surface-container-low transition-colors ${
                          n.is_read ? '' : 'bg-surface-container-low/60'
                        }`}
                      >
                        <span className="block text-sm text-on-surface">{n.title}</span>
                        <span className="block text-xs text-on-surface-variant">{n.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu((v) => !v);
              setShowNotifications(false);
            }}
            className="w-8 h-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center text-xs font-bold"
            title={state.user?.email || 'Account'}
            aria-label="Account menu"
          >
            {(state.user?.full_name || state.user?.email || 'U').charAt(0).toUpperCase()}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-60 bg-surface-container-lowest border border-outline rounded-md shadow-lg z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-outline">
                <p className="text-sm font-semibold text-on-surface truncate">{state.user?.full_name || 'User'}</p>
                <p className="text-xs text-on-surface-variant truncate">{state.user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <UserIcon size={15} /> Profile and settings
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-container/30 transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
