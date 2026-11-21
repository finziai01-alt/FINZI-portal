import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  auditEngagementsCreate,
  auditEngagementsList,
  auditEvidenceList,
  auditObservationsList,
  auditObservationsCreate,
  auditObservationsUpdate,
  auditWorkingPapersList,
  clientsList,
  usersList,
} from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateIN, formatMoneyIN } from '../utils/format';
import { ClipboardList, FileCheck, Plus, ScrollText } from 'lucide-react';

export default function Audit() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showEngagementForm, setShowEngagementForm] = useState(false);
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [engagementForm, setEngagementForm] = useState({
    client_id: '',
    engagement_name: '',
    audit_type: 'statutory',
    audit_period_start: '',
    audit_period_end: '',
    lead_auditor_id: '',
  });
  const [observationForm, setObservationForm] = useState({
    engagement_id: '',
    title: '',
    description: '',
    observation_type: 'auditor_finding',
    severity: 'medium',
    amount_involved: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [eng, ev, wp, obs, cl, us] = await Promise.all([
        auditEngagementsList(),
        auditEvidenceList(),
        auditWorkingPapersList(),
        auditObservationsList(),
        clientsList(),
        usersList(),
      ]);
      setEngagements(eng.data?.audit_engagements || []);
      setEvidence(ev.data?.audit_evidence || []);
      setPapers(wp.data?.working_papers || []);
      setObservations(obs.data?.audit_observations || []);
      setClients(cl.data?.clients || []);
      setAuditors(us.data?.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load the audit workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auditEngagementsCreate(engagementForm);
      setMessage('Engagement created.');
      setShowEngagementForm(false);
      setEngagementForm({ client_id: '', engagement_name: '', audit_type: 'statutory', audit_period_start: '', audit_period_end: '', lead_auditor_id: '' });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create the engagement');
    } finally {
      setBusy(false);
    }
  };

  const createObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auditObservationsCreate(observationForm);
      setMessage('Observation recorded.');
      setShowObservationForm(false);
      setObservationForm({ engagement_id: '', title: '', description: '', observation_type: 'auditor_finding', severity: 'medium', amount_involved: '' });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not record the observation');
    } finally {
      setBusy(false);
    }
  };

  const moveObservation = async (id: string, status: string) => {
    setError('');
    try {
      await auditObservationsUpdate(id, { status });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update the observation');
    }
  };

  const counts = [
    { label: 'Engagements', value: engagements.length },
    { label: 'Evidence items', value: evidence.length },
    { label: 'Working papers', value: papers.length },
    { label: 'Open observations', value: observations.filter((o) => !['resolved', 'closed'].includes(o.status)).length },
  ];

  return (
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Audit workspace</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">
            Engagements, evidence, working papers and observations for this firm.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setShowObservationForm((v) => !v)}
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg border border-outline text-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <Plus size={14} /> Observation
          </button>
          <button
            onClick={() => setShowEngagementForm((v) => !v)}
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-on-secondary-container transition-all font-label-md text-label-md font-semibold"
          >
            <Plus size={14} /> New engagement
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded bg-error-container/40 border border-error/40 px-space-md py-space-sm text-sm text-error">{error}</p>
      )}
      {message && (
        <p className="rounded bg-secondary-container/40 border border-secondary/40 px-space-md py-space-sm text-sm text-on-secondary-container">{message}</p>
      )}

      {showEngagementForm && (
        <form onSubmit={createEngagement} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          <label className="text-xs font-semibold text-on-surface-variant">
            Client
            <select
              required
              value={engagementForm.client_id}
              onChange={(e) => setEngagementForm({ ...engagementForm, client_id: e.target.value })}
              className="select-field mt-1"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Engagement name
            <input
              required
              value={engagementForm.engagement_name}
              onChange={(e) => setEngagementForm({ ...engagementForm, engagement_name: e.target.value })}
              className="input-field mt-1"
              placeholder="FY 2025-26 statutory audit"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Audit type
            <select
              value={engagementForm.audit_type}
              onChange={(e) => setEngagementForm({ ...engagementForm, audit_type: e.target.value })}
              className="select-field mt-1"
            >
              <option value="statutory">Statutory</option>
              <option value="internal">Internal</option>
              <option value="tax">Tax</option>
              <option value="due_diligence">Due diligence</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Lead auditor
            <select
              required
              value={engagementForm.lead_auditor_id}
              onChange={(e) => setEngagementForm({ ...engagementForm, lead_auditor_id: e.target.value })}
              className="select-field mt-1"
            >
              <option value="">Select a lead auditor</option>
              {auditors.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Period start
            <input
              type="date"
              required
              value={engagementForm.audit_period_start}
              onChange={(e) => setEngagementForm({ ...engagementForm, audit_period_start: e.target.value })}
              className="input-field mt-1"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Period end
            <input
              type="date"
              required
              value={engagementForm.audit_period_end}
              onChange={(e) => setEngagementForm({ ...engagementForm, audit_period_end: e.target.value })}
              className="input-field mt-1"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-space-sm">
            <button
              type="submit"
              disabled={busy}
              className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold disabled:opacity-60"
            >
              {busy ? 'Saving' : 'Create engagement'}
            </button>
            <button
              type="button"
              onClick={() => setShowEngagementForm(false)}
              className="px-space-md py-space-xs rounded border border-outline text-label-md font-semibold text-on-surface"
            >
              Cancel
            </button>
            {clients.length === 0 && (
              <span className="text-xs text-on-surface-variant">
                Add a client first: <Link to="/clients" className="text-secondary underline">Clients</Link>
              </span>
            )}
          </div>
        </form>
      )}

      {showObservationForm && (
        <form onSubmit={createObservation} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          <label className="text-xs font-semibold text-on-surface-variant">
            Engagement
            <select
              required
              value={observationForm.engagement_id}
              onChange={(e) => setObservationForm({ ...observationForm, engagement_id: e.target.value })}
              className="select-field mt-1"
            >
              <option value="">Select an engagement</option>
              {engagements.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.engagement_name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Title
            <input
              required
              value={observationForm.title}
              onChange={(e) => setObservationForm({ ...observationForm, title: e.target.value })}
              className="input-field mt-1"
              placeholder="Bank reconciliation not evidenced for March"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Type
            <select
              value={observationForm.observation_type}
              onChange={(e) => setObservationForm({ ...observationForm, observation_type: e.target.value })}
              className="select-field mt-1"
            >
              <option value="ai_suggestion">AI suggestion</option>
              <option value="auditor_finding">Auditor finding</option>
              <option value="reviewer_comment">Reviewer comment</option>
              <option value="approved_conclusion">Approved conclusion</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Severity
            <select
              value={observationForm.severity}
              onChange={(e) => setObservationForm({ ...observationForm, severity: e.target.value })}
              className="select-field mt-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant md:col-span-2">
            Amount involved (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={observationForm.amount_involved}
              onChange={(e) => setObservationForm({ ...observationForm, amount_involved: e.target.value })}
              className="input-field mt-1 tnum"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant md:col-span-2">
            Description
            <textarea
              rows={3}
              value={observationForm.description}
              onChange={(e) => setObservationForm({ ...observationForm, description: e.target.value })}
              className="input-field mt-1"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-space-sm">
            <button
              type="submit"
              disabled={busy}
              className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold disabled:opacity-60"
            >
              {busy ? 'Saving' : 'Record observation'}
            </button>
            <button
              type="button"
              onClick={() => setShowObservationForm(false)}
              className="px-space-md py-space-xs rounded border border-outline text-label-md font-semibold text-on-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
        {counts.map((item) => (
          <div key={item.label} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{item.label}</p>
            <p className="font-numeric-kpi text-numeric-kpi font-bold text-on-surface tnum mt-space-2xs">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
          <div className="px-space-md py-space-sm border-b border-outline">
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Engagements</h2>
          </div>
          {loading ? (
            <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">Loading engagements...</p>
          ) : engagements.length === 0 ? (
            <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">
              No engagement yet. Create one to start collecting evidence.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Engagement</th>
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Client</th>
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Type</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Period</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {engagements.map((eng) => (
                    <tr key={eng.id} className="border-b border-outline last:border-0">
                      <td className="px-space-md py-space-sm text-on-surface">{eng.engagement_name}</td>
                      <td className="px-space-md py-space-sm text-on-surface-variant">{eng.client_name}</td>
                      <td className="px-space-md py-space-sm text-on-surface-variant capitalize">{eng.audit_type}</td>
                      <td className="px-space-md py-space-sm text-right text-on-surface-variant tnum">
                        {formatDateIN(eng.audit_period_start)} to {formatDateIN(eng.audit_period_end)}
                      </td>
                      <td className="px-space-md py-space-sm text-right"><StatusBadge status={eng.status || 'draft'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
          <div className="px-space-md py-space-sm border-b border-outline">
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Observations</h2>
          </div>
          {observations.length === 0 ? (
            <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">No observation recorded.</p>
          ) : (
            <ul className="divide-y divide-outline">
              {observations.map((obs) => (
                <li key={obs.id} className="px-space-md py-space-sm">
                  <div className="flex items-start justify-between gap-space-sm">
                    <div className="min-w-0">
                      <p className="text-sm text-on-surface">{obs.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {obs.severity} severity · {formatMoneyIN(obs.amount_involved)}
                      </p>
                    </div>
                    <StatusBadge status={obs.status || 'open'} />
                  </div>
                  <div className="mt-space-2xs flex items-center gap-space-2xs">
                    {['open', 'in_review', 'responded', 'resolved', 'closed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => moveObservation(obs.id, status)}
                        className={`px-space-sm py-space-2xs rounded text-[11px] font-semibold border transition-colors ${
                          obs.status === status
                            ? 'bg-secondary text-on-secondary border-secondary'
                            : 'border-outline text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <Link to="/audit/evidence" className="bg-surface-container-lowest border border-outline rounded-lg p-space-md hover:border-secondary transition-colors">
          <ClipboardList size={18} className="text-secondary" />
          <p className="mt-space-sm text-sm font-semibold text-on-surface">Evidence and papers</p>
          <p className="text-xs text-on-surface-variant">{evidence.length} evidence items uploaded against engagements</p>
        </Link>
        <Link to="/audit/working-papers" className="bg-surface-container-lowest border border-outline rounded-lg p-space-md hover:border-secondary transition-colors">
          <ScrollText size={18} className="text-secondary" />
          <p className="mt-space-sm text-sm font-semibold text-on-surface">Working papers</p>
          <p className="text-xs text-on-surface-variant">{papers.length} working papers with approval status</p>
        </Link>
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-space-md">
          <FileCheck size={18} className="text-secondary" />
          <p className="mt-space-sm text-sm font-semibold text-on-surface">Client records</p>
          <p className="text-xs text-on-surface-variant">{clients.length} clients available for engagements</p>
        </div>
      </div>
    </div>
  );
}
