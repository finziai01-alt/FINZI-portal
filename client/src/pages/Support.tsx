import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { integrationsStatus, settingsGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LifeBuoy } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';

export default function Support() {
  const { state } = useAuth();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [status, settingsRes] = await Promise.all([integrationsStatus(), settingsGet()]);
      setIntegrations(status.data?.integrations || []);
      setSettings(settingsRes.data?.settings || null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load the service status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8 max-w-[960px] mx-auto">
      <PageHeader
        title="Help and support"
        description="What is connected on this server and where to get help inside the workspace."
        actions={
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sub text-[12px] font-bold text-ink-2">
            <LifeBuoy size={16} className="size-5" aria-hidden="true" />
          </span>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Service status</h2>
          <p className="text-[10px] leading-4 text-ink-3">Read from the server environment, not from the browser</p>
        </div>
        <div className="divide-y divide-line p-4">
          {loading ? (
            <p className="py-3 text-center text-[11px] leading-4 text-ink-3">Checking services…</p>
          ) : (
            integrations.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3">
                <span className="text-[11px] leading-4 text-primary-text">{item.label}</span>
                <StatusBadge status={item.configured ? 'configured' : 'pending_integration'} />
              </div>
            ))
          )}
          <p className="mt-4 text-[10px] leading-4 text-ink-3">
            While a service is pending integration, the related action stays unavailable instead of reporting a
            filing or an extraction that did not happen.
          </p>
        </div>
      </Card>

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">This workspace</h2>
        </div>
        <div className="divide-y divide-line p-4">
          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] leading-4 text-ink-3">Company</span>
            <span className="text-[11px] leading-4 text-primary-text">{settings?.company?.legal_name || state.company?.legal_name || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] leading-4 text-ink-3">GSTIN</span>
            <span className="font-mono text-[10px] leading-4 text-primary-text">{settings?.company?.gstin || state.company?.gstin || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] leading-4 text-ink-3">Accounting method</span>
            <span className="text-[10px] leading-4 text-primary-text capitalize">{settings?.company?.accounting_method || 'accrual'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] leading-4 text-ink-3">Signed in as</span>
            <span className="text-[11px] leading-4 text-primary-text">{state.user?.email}</span>
          </div>
        </div>
      </Card>

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Where to go next</h2>
        </div>
        <div className="divide-y divide-line p-4">
          {[
            { to: '/settings', label: 'Workspace settings', note: 'Company profile, modules and preferences' },
            { to: '/reminders', label: 'Reminders', note: 'Due dates for GST, TDS and reconciliations' },
            { to: '/audit/evidence', label: 'Audit evidence', note: 'Documents collected per engagement' },
            { to: '/settings/team', label: 'Team and roles', note: 'Invite colleagues and set their access' },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center justify-between gap-3 py-3 text-left hover:bg-sub transition-colors duration-micro">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium leading-4 text-primary-text truncate">{item.label}</span>
                <span className="mt-0.5 block text-[10px] leading-3 text-ink-3 truncate">{item.note}</span>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-ink-4">Open</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}