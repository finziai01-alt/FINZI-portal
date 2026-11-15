import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Building, Users, FileText, CreditCard, Banknote,
  Shield, Search, Mail, BarChart3, Activity, Bot, Settings,
  HelpCircle, User, ChevronLeft, LogOut, BookOpen, FileCheck,
  AlertTriangle, TrendingUp, PieChart
} from 'lucide-react';

const navItems = [
  { group: 'WORKSPACE', items: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { key: 'companies', label: 'Companies', icon: Building, path: '/companies' },
    { key: 'clients', label: 'Clients', icon: Users, path: '/clients' },
  ]},
  { group: 'ACCOUNTING', items: [
    { key: 'bills', label: 'Bills & Expenses', icon: FileText, path: '/bills' },
    { key: 'invoices', label: 'Sales & Invoices', icon: CreditCard, path: '/invoices' },
    { key: 'ledger', label: 'Ledger & Accounts', icon: BookOpen, path: '/ledger' },
    { key: 'banking', label: 'Banking', icon: Banknote, path: '/banking' },
    { key: 'tax', label: 'Tax & Compliance', icon: FileCheck, path: '/tax' },
    { key: 'reports', label: 'Financial Reports', icon: BarChart3, path: '/reports' },
  ]},
  { group: 'AUDIT', items: [
    { key: 'audit', label: 'Audit Workspace', icon: Shield, path: '/audit' },
    { key: 'evidence', label: 'Evidence & Papers', icon: FileCheck, path: '/audit/evidence' },
    { key: 'audit-reports', label: 'Audit Reports', icon: Activity, path: '/audit/reports' },
  ]},
  { group: 'INTELLIGENCE', items: [
    { key: 'finzi-ai', label: 'FINZI AI', icon: Bot, path: '/ai' },
    { key: 'automations', label: 'Automations', icon: TrendingUp, path: '/automations' },
    { key: 'reminders', label: 'Reminders', icon: AlertTriangle, path: '/reminders' },
  ]},
  { group: 'ADMINISTRATION', items: [
    { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    { key: 'team', label: 'Team Management', icon: Users, path: '/settings/team' },
    { key: 'roles', label: 'Roles & Permissions', icon: Shield, path: '/settings/roles' },
    { key: 'activity', label: 'Activity Logs', icon: Activity, path: '/settings/activity' },
  ]},
];

export const Sidebar: React.FC = () => {
  const { state, switchCompany } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className={`fixed left-0 top-0 h-screen border-r border-border bg-navy text-white z-50 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex items-center justify-between h-16 px-4 bg-navy/90 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">FINZI AI</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-secondary-text hover:text-white"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronLeft size={18} /> : <ChevronLeft size={18} rotate={180} />}
        </button>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-160px)] p-3">
        {navItems.map((group) => (
          <div key={group.group} className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">{group.group}</h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-green-100 text-green-600 border-r-2 border-green-600'
                        : 'text-gray-400 hover:bg-gray-50/50 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 w-full p-3 border-t border-border bg-navy/90">
        {state.companies.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company</label>
            <select
              value={state.company?.id || ''}
              onChange={(e) => switchCompany(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="px-2 py-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
              {state.user?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{state.user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{state.user?.email}</p>
            </div>
            <button onClick={() => navigate('/login')} className="text-gray-400 hover:text-white text-xs">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
