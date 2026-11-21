import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building,
  Users,
  FileText,
  CreditCard,
  BookOpen,
  Banknote,
  Shield,
  Bot,
  Settings,
  LifeBuoy,
  ChevronLeft,
  LogOut,
  FileCheck,
  AlertTriangle,
  Workflow,
  ClipboardList,
  ScrollText,
} from 'lucide-react';

const navItems = [
  {
    group: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Companies', icon: Building, path: '/companies' },
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
      { label: 'Tax and compliance', icon: FileCheck, path: '/tax' },
      { label: 'Financial reports', icon: ScrollText, path: '/reports' },
    ],
  },
  {
    group: 'Audit',
    items: [
      { label: 'Audit workspace', icon: Shield, path: '/audit' },
      { label: 'Evidence and papers', icon: ClipboardList, path: '/audit/evidence' },
      { label: 'Working papers', icon: ScrollText, path: '/audit/working-papers' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { label: 'FINZI AI', icon: Bot, path: '/ai' },
      { label: 'Automations', icon: Workflow, path: '/automations' },
      { label: 'Reminders', icon: AlertTriangle, path: '/reminders' },
    ],
  },
];

export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ collapsed, onToggle }) => {
  const { state, switchCompany, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'));

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const userName = state.user?.full_name || state.user?.email || 'User';
  const roleName = state.companies.find((c) => c.id === state.company?.id)?.role_name || 'Member';

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-primary-container text-inverse-on-surface z-50 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center shrink-0">
            <span className="text-on-secondary font-bold text-base">F</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-white leading-tight">FINZI AI</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-on-primary-container leading-tight">
                Enterprise terminal
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded text-on-primary-container hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={16} className={collapsed ? '' : 'rotate-180'} />
        </button>
      </div>

      {!collapsed && state.companies.length > 0 && (
        <div className="px-3 pt-3 shrink-0">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-on-primary-container font-semibold mb-1.5">
            Company
          </label>
          <select
            value={state.company?.id || ''}
            onChange={(e) => switchCompany(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            {state.companies.map((c) => (
              <option key={c.id} value={c.id} className="text-on-surface">
                {c.legal_name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 font-code-mono text-code-mono text-on-primary-container truncate">
            {state.company?.gstin || 'GSTIN pending'}
          </p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navItems.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-on-primary-container font-semibold mb-1.5 px-3">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-secondary text-on-secondary font-semibold'
                        : 'text-[#c7d2e6] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 shrink-0">
        <button
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#c7d2e6] hover:bg-white/5 hover:text-white transition-colors ${
            isActive('/settings') ? 'bg-secondary text-on-secondary font-semibold' : ''
          }`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={() => navigate('/support')}
          className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#c7d2e6] hover:bg-white/5 hover:text-white transition-colors ${
            isActive('/support') ? 'bg-secondary text-on-secondary font-semibold' : ''
          }`}
          title={collapsed ? 'Help and support' : undefined}
        >
          <LifeBuoy size={16} className="shrink-0" />
          {!collapsed && <span>Help and support</span>}
        </button>

        {!collapsed && (
          <div className="mt-3 px-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userName}</p>
                <p className="text-[11px] text-on-primary-container truncate">{roleName}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded text-on-primary-container hover:text-white hover:bg-white/10 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
