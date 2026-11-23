import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Banknote,
  BookOpen,
  Bot,
  Building2,
  CheckSquare,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  Workflow,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { remindersList } from '../../services/api';
import { cn } from '../../utils/cn';
import { Dropdown, type MenuItem } from '../ui/Dropdown';
import { SectionLabel } from '../ui/Chip';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** Optional count badge. Only used for counts that come from stored records. */
  badge?: 'reminders';
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Companies', icon: Building2, path: '/companies' },
      { label: 'Clients', icon: Users, path: '/clients' },
    ],
  },
  {
    group: 'Accounting',
    items: [
      { label: 'Bills and expenses', icon: FileText, path: '/bills' },
      { label: 'Sales and invoices', icon: CreditCard, path: '/invoices' },
      { label: 'Ledger and accounts', icon: BookOpen, path: '/ledger' },
      { label: 'Banking', icon: Banknote, path: '/banking' },
      { label: 'Tax and compliance', icon: Receipt, path: '/tax' },
      { label: 'Financial reports', icon: ScrollText, path: '/reports' },
    ],
  },
  {
    group: 'Audit',
    items: [
      { label: 'Audit workspace', icon: ShieldCheck, path: '/audit' },
      { label: 'Evidence and papers', icon: ListChecks, path: '/audit/evidence' },
      { label: 'Working papers', icon: CheckSquare, path: '/audit/working-papers' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { label: 'FINZI AI', icon: Bot, path: '/ai' },
      { label: 'Automations', icon: Workflow, path: '/automations' },
      { label: 'Reminders', icon: ListChecks, path: '/reminders', badge: 'reminders' },
    ],
  },
];

const WIDTH = 248;
const COLLAPSED = 68;

export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ collapsed, onToggle }) => {
  const { state, switchCompany, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reminderCount, setReminderCount] = useState<number | null>(null);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'));

  // The one badge in the rail, and it counts real open reminders.
  useEffect(() => {
    let alive = true;
    remindersList({ status: 'pending', limit: 99 })
      .then((res) => {
        if (!alive) return;
        const rows = res.data?.reminders || [];
        setReminderCount(rows.length || null);
      })
      .catch(() => {
        if (alive) setReminderCount(null);
      });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const companies = state.companies;
  const current = companies.find((c) => c.id === state.company?.id);
  const userName = state.user?.full_name || state.user?.email || 'User';
  const roleName = current?.role_name || 'Member';

  const companyMenu: MenuItem[] = companies.map((company) => ({
    label: company.legal_name,
    icon: company.id === state.company?.id ? Building2 : undefined,
    onSelect: () => switchCompany(company.id),
  }));

  const accountMenu: MenuItem[] = [
    { label: 'Profile and settings', icon: SettingsIcon, onSelect: () => navigate('/settings') },
    { label: 'Switch account', icon: LogOut, onSelect: () => switchCompany(current?.id || '') },
    { label: 'Security', icon: ShieldCheck, onSelect: () => navigate('/settings/security') },
    { label: 'Help and support', icon: LifeBuoy, onSelect: () => navigate('/support') },
    {
      label: 'Sign out',
      icon: LogOut,
      destructive: true,
      onSelect: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  const badgeFor = (item: NavItem) =>
    item.badge === 'reminders' && reminderCount ? reminderCount : null;

  return (
    <aside
      data-shell="light"
      style={{ width: collapsed ? COLLAPSED : WIDTH }}
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-surface border-r border-line',
        'transition-[width] duration-panel ease-swift'
      )}
    >
      {/* Brand row: the mark, then the single rail control. */}
      <div className={cn(
        'flex h-14 shrink-0 items-center justify-between border-b border-line px-4',
        collapsed ? 'gap-1 px-2' : 'gap-2 px-4'
      )}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn(
            'grid shrink-0 place-items-center rounded-lg bg-brand text-[13px] font-bold leading-none text-on-secondary',
            collapsed ? 'size-6 text-[11px]' : 'size-7 text-[13px]'
          )}>
            F
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold leading-4 text-primary-text">FINZI AI</span>
              <span className="block text-[9.5px] uppercase leading-3 tracking-[0.062em] text-ink-4">
                Practice workspace
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className={cn(
            'grid shrink-0 place-items-center rounded-lg text-ink-3 transition-colors duration-micro hover:bg-sub hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30',
            collapsed ? 'size-6 p-0 text-[11px]' : 'size-7 p-0'
          )}>
          {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-4" /> : <PanelLeftClose aria-hidden="true" className="size-4" />}
        </button>
      </div>

      {/* Company switcher: a real menu, not a native select. */}
      {!collapsed && companies.length > 1 && (
        <div className="shrink-0 border-b border-line px-3 py-3">
          <SectionLabel className="mb-1.5 px-1">Company</SectionLabel>
          <Dropdown
            align="start"
            width="w-full"
            panelTitle="Switch company"
            items={companyMenu}
            trigger={({ open, toggle, ref }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left transition-colors duration-micro hover:border-line-strong hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sub text-[10px] font-bold text-ink-2">
                  {(current?.legal_name || 'C').charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium leading-4 text-primary-text">
                    {current?.legal_name || 'Select company'}
                  </span>
                </span>
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0 text-ink-4">
                  <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          />
        </div>
      )}

      {/* Navigation: icon plus label, one row per destination, one wash for the active row. */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="mb-4 last:mb-0">
            {!collapsed && <SectionLabel className="mb-1.5 px-2">{group.group}</SectionLabel>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                const count = badgeFor(item);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left',
                      'transition-colors duration-micro ease-swift',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30',
                      active
                        ? 'bg-sub font-semibold text-primary-text'
                        : 'font-medium text-ink-2 hover:bg-sub/60 hover:text-primary-text'
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2')}
                    />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-[12px] leading-4">{item.label}</span>
                        {count !== null && (
                          <span className="shrink-0 rounded-md bg-sub px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ink-2 tnum">
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: the signed-in member, with sign-out behind a menu. */}
      <div className="shrink-0 border-t border-line p-3">
        {collapsed ? (
          <Dropdown
            align="start"
            items={accountMenu}
            trigger={({ open, toggle, ref }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
                title={`${userName} — ${roleName}`}
                className="grid size-8 w-full place-items-center rounded-lg bg-sub text-[12px] font-bold text-ink-2 transition-colors hover:bg-sub-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                {userName.charAt(0).toUpperCase()}
              </button>
            )}
          />
        ) : (
          <Dropdown
            align="start"
            items={accountMenu}
            trigger={({ open, toggle, ref }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sub text-[11px] font-bold text-ink-2">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold leading-4 text-primary-text">{userName}</span>
                  <span className="block truncate text-[10px] leading-3 text-ink-3">{roleName}</span>
                </span>
              </button>
            )}
          />
        )}
      </div>
    </aside>
  );
};