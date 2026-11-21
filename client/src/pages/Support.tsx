import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { integrationsStatus, settingsGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, CircleDashed, LifeBuoy } from 'lucide-react';

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
    <div className="p-6 space-y-space-md max-w-4xl">
      <div>
        <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight flex items-center gap-space-sm">
          <LifeBuoy size={20} className="text-secondary" /> Help and support
        </h1>
        <p className="text-body-md text-body-md text-on-surface-variant mt-space-2xs">
          What is connected on this server and where to get help inside the workspace.
        </p>
      </div>

      {error && <p className="rounded bg-error-container/40 border border-error/40 px-space-md py-space-sm text-sm text-error">{error}</p>}

      <section className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
        <div className="px-space-md py-space-sm border-b border-outline">
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Service status</h2>
          <p className="text-xs text-on-surface-variant">Read from the server environment, not from the browser</p>
        </div>
        {loading ? (
          <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">Checking services...</p>
        ) : (
          <ul className="divide-y divide-outline">
            {integrations.map((item) => (
              <li key={item.key} className="px-space-md py-space-sm flex items-center justify-between gap-space-sm">
                <span className="text-sm text-on-surface">{item.label}</span>
                <span className={`inline-flex items-center gap-space-2xs text-xs font-semibold ${
                  item.configured ? 'text-secondary' : 'text-warning'
                }`}>
                  {item.configured ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}
                  {item.configured ? 'Configured' : 'Pending integration'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="px-space-md py-space-sm border-t border-outline text-xs text-on-surface-variant bg-surface-container-low/40">
          While a service is pending integration, the related action stays unavailable instead of reporting a
          filing or an extraction that did not happen.
        </p>
      </section>

      <section className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
        <div className="px-space-md py-space-sm border-b border-outline">
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">This workspace</h2>
        </div>
        <dl className="divide-y divide-outline">
          <div className="px-space-md py-space-sm flex items-center justify-between gap-space-sm">
            <dt className="text-sm text-on-surface-variant">Company</dt>
            <dd className="text-sm text-on-surface">{settings?.company?.legal_name || state.company?.legal_name || '—'}</dd>
          </div>
          <div className="px-space-md py-space-sm flex items-center justify-between gap-space-sm">
            <dt className="text-sm text-on-surface-variant">GSTIN</dt>
            <dd className="font-code-mono text-code-mono text-on-surface">{settings?.company?.gstin || state.company?.gstin || 'Not set'}</dd>
          </div>
          <div className="px-space-md py-space-sm flex items-center justify-between gap-space-sm">
            <dt className="text-sm text-on-surface-variant">Accounting method</dt>
            <dd className="text-sm text-on-surface capitalize">{settings?.company?.accounting_method || 'accrual'}</dd>
          </div>
          <div className="px-space-md py-space-sm flex items-center justify-between gap-space-sm">
            <dt className="text-sm text-on-surface-variant">Signed in as</dt>
            <dd className="text-sm text-on-surface">{state.user?.email}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
        <div className="px-space-md py-space-sm border-b border-outline">
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Where to go next</h2>
        </div>
        <ul className="divide-y divide-outline">
          {[
            { to: '/settings', label: 'Workspace settings', note: 'Company profile, modules and preferences' },
            { to: '/reminders', label: 'Reminders', note: 'Due dates for GST, TDS and reconciliations' },
            { to: '/audit/evidence', label: 'Audit evidence', note: 'Documents collected per engagement' },
            { to: '/settings/team', label: 'Team and roles', note: 'Invite colleagues and set their access' },
          ].map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="flex items-center justify-between gap-space-sm px-space-md py-space-sm hover:bg-surface-container-low transition-colors">
                <span>
                  <span className="block text-sm text-on-surface">{item.label}</span>
                  <span className="block text-xs text-on-surface-variant">{item.note}</span>
                </span>
                <span className="text-xs text-secondary font-semibold">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
