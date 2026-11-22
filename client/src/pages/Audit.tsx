import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  auditEngagementsCreate,
  auditEngagementsList,
  auditEvidenceList,
  auditObservationsCreate,
  auditObservationsList,
  auditObservationsUpdate,
  auditWorkingPapersList,
  clientsList,
  usersList,
} from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { ClipboardList, FileCheck, Plus, ScrollText } from 'lucide-react';
import { formatDateIN, formatMoneyIN } from '../utils/format';

export default function Audit() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
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
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createEngagement = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auditEngagementsCreate(engagementForm);
      setMessage('Engagement created.');
      setShowEngagementForm(false);
      setEngagementForm({
        client_id: '',
        engagement_name: '',
        audit_type: 'statutory',
        audit_period_start: '',
        audit_period_end: '',
        lead_auditor_id: '',
      });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create the engagement');
    } finally {
      setBusy(false);
    }
  };

  const createObservation = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auditObservationsCreate(observationForm);
      setMessage('Observation recorded.');
      setShowObservationForm(false);
      setObservationForm({
        engagement_id: '',
        title: '',
        description: '',
        observation_type: 'auditor_finding',
        severity: 'medium',
        amount_involved: '',
      });
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

  const openObservations = observations.filter((o) => !['resolved', 'closed'].includes(o.status)).length;

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Audit workspace"
        description="Engagements, evidence, working papers and observations for this firm."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowObservationForm((v) => !v)} disabled={busy}>
              <Plus size={16} /> Observation
            </Button>
            <Button variant="green" onClick={() => setShowEngagementForm((v) => !v)} disabled={busy} className="ml-auto">
              <Plus size={16} className="text-on-secondary" /> New engagement
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm text-brand-ink flex items-center gap-2">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Engagements" metrics={[{ label: 'Count', value: String(engagements.length) }]} />
        <StatCard title="Evidence items" metrics={[{ label: 'Count', value: String(evidence.length) }]} />
        <StatCard title="Working papers" metrics={[{ label: 'Count', value: String(papers.length) }]} />
        <StatCard
          title="Open observations"
          readout={{ value: String(openObservations), tone: openObservations > 0 ? 'negative' : 'positive' }}
          metrics={[{ label: 'Items', value: String(openObservations) }]}
        />
      </div>

      {showEngagementForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">New engagement</h2>
          </div>
          <form onSubmit={createEngagement} noValidate className="p-4 pb-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              id="engagement-client"
              label="Client"
              value={engagementForm.client_id}
              onChange={(e) => setEngagementForm((c) => ({ ...c, client_id: e.target.value }))}
              required
              hint="Select a client"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </Select>
            <Input
              id="engagement-name"
              label="Engagement name"
              value={engagementForm.engagement_name}
              onChange={(e) => setEngagementForm((c) => ({ ...c, engagement_name: e.target.value }))}
              required
              placeholder="FY 2025-26 statutory audit"
            />
            <Select
              id="engagement-type"
              label="Audit type"
              value={engagementForm.audit_type}
              onChange={(e) => setEngagementForm((c) => ({ ...c, audit_type: e.target.value }))}
            >
              <option value="statutory">Statutory</option>
              <option value="internal">Internal</option>
              <option value="tax">Tax</option>
              <option value="due_diligence">Due diligence</option>
            </Select>
            <Select
              id="engagement-auditor"
              label="Lead auditor"
              value={engagementForm.lead_auditor_id}
              onChange={(e) => setEngagementForm((c) => ({ ...c, lead_auditor_id: e.target.value }))}
              required
              hint="Select a lead auditor"
            >
              <option value="">Select a lead auditor</option>
              {auditors.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </Select>
            <Input id="engagement-period-start" label="Period start" type="date" value={engagementForm.audit_period_start} onChange={(e) => setEngagementForm((c) => ({ ...c, audit_period_start: e.target.value }))} required />
            <Input id="engagement-period-end" label="Period end" type="date" value={engagementForm.audit_period_end} onChange={(e) => setEngagementForm((c) => ({ ...c, audit_period_end: e.target.value }))} required />
            <div className="md:col-span-3 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEngagementForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={busy} loading={busy} className="ml-auto">
                Create engagement
              </Button>
              {clients.length === 0 && (
                <span className="mt-2 text-[10px] text-ink-3">Add a client first: <Link to="/clients" className="text-brand hover:underline">Clients</Link></span>
              )}
            </div>
          </form>
        </Card>
      )}

      {showObservationForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Record observation</h2>
          </div>
          <form onSubmit={createObservation} noValidate className="p-4 pb-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              id="observation-engagement"
              label="Engagement"
              value={observationForm.engagement_id}
              onChange={(e) => setObservationForm((c) => ({ ...c, engagement_id: e.target.value }))}
              required
              hint="Select an engagement"
            >
              <option value="">Select an engagement</option>
              {engagements.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.engagement_name}</option>
              ))}
            </Select>
            <Input
              id="observation-title"
              label="Title"
              value={observationForm.title}
              onChange={(e) => setObservationForm((c) => ({ ...c, title: e.target.value }))}
              required
              placeholder="Bank reconciliation not evidenced for March"
            />
            <Select
              id="observation-type"
              label="Type"
              value={observationForm.observation_type}
              onChange={(e) => setObservationForm((c) => ({ ...c, observation_type: e.target.value }))}
            >
              <option value="ai_suggestion">AI suggestion</option>
              <option value="auditor_finding">Auditor finding</option>
              <option value="reviewer_comment">Reviewer comment</option>
              <option value="approved_conclusion">Approved conclusion</option>
            </Select>
            <Select
              id="observation-severity"
              label="Severity"
              value={observationForm.severity}
              onChange={(e) => setObservationForm((c) => ({ ...c, severity: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Input
              id="observation-amount"
              label="Amount involved (₹)"
              type="number"
              min="0"
              step="0.01"
              value={observationForm.amount_involved}
              onChange={(e) => setObservationForm((c) => ({ ...c, amount_involved: e.target.value }))}
            />
            <Textarea
              id="observation-description"
              label="Description"
              rows={3}
              value={observationForm.description}
              onChange={(e) => setObservationForm((c) => ({ ...c, description: e.target.value }))}
            />
            <div className="md:col-span-3 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowObservationForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={busy} loading={busy} className="ml-auto">
                Record observation
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Engagements</h2>
            </div>
            <div className="overflow-x-auto p-4">
              <DataTable
                columns={[
                  { key: 'name', label: 'ENGAGEMENT', render: (row) => <span className="text-[11px] font-medium leading-4 text-primary-text">{row.engagement_name}</span> },
                  { key: 'client', label: 'CLIENT', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.client_name}</span> },
                  { key: 'type', label: 'TYPE', render: (row) => <span className="text-[10px] leading-4 text-ink-3 capitalize">{row.audit_type}</span> },
                  { key: 'period', label: 'PERIOD', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{formatDateIN(row.audit_period_start)} to {formatDateIN(row.audit_period_end)}</span> },
                  { key: 'status', label: 'STATUS', align: 'right', render: (row) => <StatusBadge status={row.status || 'draft'} /> },
                ]}
                rows={engagements}
                emptyMessage="No engagement yet. Create one to start collecting evidence."
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Observations</h2>
            </div>
            <div className="p-4 space-y-3">
              {observations.length === 0 ? (
                <p className="py-4 text-center text-[11px] leading-4 text-ink-3">No observation recorded.</p>
              ) : (
                observations.map((obs) => (
                  <div key={obs.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="block text-[11px] font-medium leading-4 text-primary-text">{obs.title}</p>
                        <p className="mt-0.5 block text-[10px] leading-4 text-ink-3">
                          {obs.severity} severity · {formatMoneyIN(obs.amount_involved || 0)}
                        </p>
                      </div>
                      <StatusBadge status={obs.status || 'open'} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {['open', 'in_review', 'responded', 'resolved', 'closed'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => moveObservation(obs.id, status)}
                          className={`px-2 py-1 rounded text-[9px] font-semibold leading-none transition-colors duration-micro ${
                            obs.status === status ? 'bg-sub text-primary-text' : 'text-ink-3 hover:bg-sub hover:text-primary-text'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/audit/evidence" className="rounded-xl border border-line p-6 hover:border-brand transition-colors duration-micro">
          <div className="flex items-center justify-between gap-3">
            <ClipboardList size={18} className="text-ink-3" aria-hidden="true" />
            <span className="text-[11px] font-semibold leading-4 text-primary-text">Evidence and papers</span>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-ink-3">{evidence.length} evidence items uploaded against engagements</p>
        </Link>
        <Link to="/audit/working-papers" className="rounded-xl border border-line p-6 hover:border-brand transition-colors duration-micro">
          <div className="flex items-center justify-between gap-3">
            <ScrollText size={18} className="text-ink-3" aria-hidden="true" />
            <span className="text-[11px] font-semibold leading-4 text-primary-text">Working papers</span>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-ink-3">{papers.length} working papers with approval status</p>
        </Link>
        <div className="rounded-xl border border-line p-6">
          <div className="flex items-center justify-between gap-3">
            <FileCheck size={18} className="text-ink-3" aria-hidden="true" />
            <span className="text-[11px] font-semibold leading-4 text-primary-text">Client records</span>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-ink-3">{clients.length} clients available for engagements</p>
        </div>
      </div>
    </div>
  );
}