import { useEffect, useState } from 'react';
import {
  auditEngagementsList,
  auditWorkingPapersCreate,
  auditWorkingPapersList,
  auditWorkingPapersUpdate,
} from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { Plus } from 'lucide-react';

const APPROVAL_STATES = ['draft', 'submitted', 'reviewed', 'approved', 'rejected'];

export default function AuditWorkingPapers() {
  const [papers, setPapers] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    engagement_id: '',
    wp_number: '',
    audit_area: '',
    objective: '',
    procedure: '',
    evidence_references: '',
    auditor_conclusion: '',
  });

  const load = async () => {
    setError('');
    try {
      const [wp, eng] = await Promise.all([auditWorkingPapersList(), auditEngagementsList()]);
      setPapers(wp.data?.working_papers || []);
      setEngagements(eng.data?.audit_engagements || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load working papers');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auditWorkingPapersCreate(form);
      setMessage('Working paper created as a draft.');
      setShowForm(false);
      setForm({
        engagement_id: '',
        wp_number: '',
        audit_area: '',
        objective: '',
        procedure: '',
        evidence_references: '',
        auditor_conclusion: '',
      });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create the working paper');
    } finally {
      setBusy(false);
    }
  };

  const setApproval = async (id: string, approval_status: string) => {
    setError('');
    try {
      await auditWorkingPapersUpdate(id, { approval_status });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update the approval status');
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Working papers"
        description="Objectives, procedures and conclusions, each moving through a review and approval trail."
        actions={
          <Button variant="green" onClick={() => setShowForm((v) => !v)} disabled={busy} className="ml-auto">
            <Plus size={16} className="text-on-secondary" /> New working paper
          </Button>
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

      {showForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">New working paper</h2>
          </div>
          <form onSubmit={submit} noValidate className="p-4 pb-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              id="wp-engagement"
              label="Engagement"
              value={form.engagement_id}
              onChange={(e) => setForm((c) => ({ ...c, engagement_id: e.target.value }))}
              required
              hint="Select an engagement"
            >
              <option value="">Select an engagement</option>
              {engagements.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.engagement_name}</option>
              ))}
            </Select>
            <Input
              id="wp-number"
              label="Working paper number"
              value={form.wp_number}
              onChange={(e) => setForm((c) => ({ ...c, wp_number: e.target.value }))}
              required
              hint="WP-01"
            />
            <Input
              id="wp-audit-area"
              label="Audit area"
              value={form.audit_area}
              onChange={(e) => setForm((c) => ({ ...c, audit_area: e.target.value }))}
              required
              placeholder="Revenue recognition"
            />
            <Input
              id="wp-evidence-refs"
              label="Evidence references"
              value={form.evidence_references}
              onChange={(e) => setForm((c) => ({ ...c, evidence_references: e.target.value }))}
              hint="EVD-101, EVD-104"
            />
            <Input
              id="wp-objective"
              label="Objective"
              value={form.objective}
              onChange={(e) => setForm((c) => ({ ...c, objective: e.target.value }))}
            />
            <Textarea id="wp-procedure" label="Procedure" rows={3} value={form.procedure} onChange={(e) => setForm((c) => ({ ...c, procedure: e.target.value }))} />
            <Textarea id="wp-conclusion" label="Auditor conclusion" rows={3} value={form.auditor_conclusion} onChange={(e) => setForm((c) => ({ ...c, auditor_conclusion: e.target.value }))} />
            <div className="md:col-span-3 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={busy} loading={busy} className="ml-auto">
                Create working paper
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Working papers register</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'wp',
                label: 'WORKING PAPER',
                render: (row) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-[11px] font-medium leading-4 text-primary-text">{row.wp_number}</span>
                    <span className="mt-0.5 block text-[10px] leading-3 text-ink-3">{row.audit_area}</span>
                  </span>
                ),
              },
              { key: 'engagement', label: 'ENGAGEMENT', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.engagement_name}</span> },
              { key: 'procedure', label: 'PROCEDURE', render: (row) => <span className="text-[10px] leading-4 text-ink-3">{row.procedure || '—'}</span> },
              { key: 'status', label: 'APPROVAL', align: 'right', render: (row) => (
                <Select
                  value={row.approval_status || 'draft'}
                  onChange={(e) => setApproval(row.id, e.target.value)}
                  className="text-[10px]"
                >
                  {APPROVAL_STATES.map((state) => (
                    <option key={state} value={state}>{state.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              )},
              {
                key: 'conclusion',
                label: 'CONCLUSION',
                render: (row) => <span className="text-[10px] leading-4 text-ink-3">{row.auditor_conclusion || '—'}</span>,
              },
            ]}
            rows={(papers || []) as any[]}
            emptyMessage="No working papers yet."
          />
        </div>
      </Card>
    </div>
  );
}