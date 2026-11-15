import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, HelpCircle, Maximize, Menu } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { state, switchCompany } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbs: { label: string; path: string }[] = [];
  const segments = location.pathname.split('/').filter(Boolean);
  segments.forEach((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    breadcrumbs.push({ label: seg.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), path });
  });

  return (
    <nav className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-6 flex-1">
        <div className="hidden md:flex items-center gap-4 text-xs text-secondary-text">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1 cursor-pointer hover:text-primary-text transition-colors">
              {i > 0 && <span className="text-secondary-text">/</span>}
              <Link to={b.path} className="hover:text-primary-text">{b.label}</Link>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="relative">
            <div className="absolute left-3 top-3.5 text-secondary-text">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-9 pr-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md bg-surface-container-low border border-border text-xs">
              <span className="font-medium text-primary-text">{state.company?.legal_name || 'Company'}</span>
              <span className="text-secondary-text">• {state.company?.gstin || 'No GSTIN'}</span>
            </div>

            <select
              value={state.company?.id || ''}
              onChange={(e) => switchCompany(e.target.value)}
              className="hidden sm:block px-2 py-1.5 text-xs border border-border rounded bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-green"
            >
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>

            <button className="p-2 text-secondary-text hover:text-green hover:bg-green/10 rounded-lg transition-colors" title="Notifications">
              <Bell size={20} />
            </button>
            <button className="p-2 text-secondary-text hover:text-info hover:bg-info/10 rounded-lg transition-colors" title="Help">
              <HelpCircle size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-primary-text overflow-hidden">
              {state.user?.full_name?.[0] || 'U'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};






