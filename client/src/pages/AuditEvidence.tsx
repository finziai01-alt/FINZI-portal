import { useEffect, useState } from 'react';
import {
  auditEngagementsList,
  auditEvidenceCreate,
  auditEvidenceList,
  auditEvidenceUpdate,
} from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { Upload } from 'lucide-react';
import { formatDateIN } from '../utils/format';

const VERIFICATION_STATES = ['pending', 'under_review', 'auditor_verified', 'discrepancy_flagged'];

export default function AuditEvidence() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ engagement_id: '', document_name: '', category: '', source: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setError('');
    try {
      const [ev, eng] = await Promise.all([auditEvidenceList(), auditEngagementsList()]);
      setEvidence(ev.data?.audit_evidence || []);
      setEngagements(eng.data?.audit_engagements || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load evidence');
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
      await auditEvidenceCreate(form, file || undefined);
      setMessage('Evidence added.');
      setShowForm(false);
      setForm({ engagement_id: '', document_name: '', category: '', source: '' });
      setFile(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not add the evidence');
    } finally {
      setBusy(false);
    }
  };

  const setVerification = async (id: string, verification_status: string) => {
    setError('');
    try {
      await auditEvidenceUpdate(id, { verification_status });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update the verification status');
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Evidence and papers"
        description="Documents collected against each engagement, with the auditor verification status."
        actions={
          <Button variant="green" onClick={() => setShowForm((v) => !v)} disabled={busy} className="ml-auto">
            <Upload size={16} className="text-on-secondary" /> Add evidence
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
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Add evidence</h2>
          </div>
          <form onSubmit={submit} noValidate className="p-4 pb-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              id="evidence-engagement"
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
              id="evidence-document-name"
              label="Document name"
              value={form.document_name}
              onChange={(e) => setForm((c) => ({ ...c, document_name: e.target.value }))}
              required
              placeholder="March bank statement"
            />
            <Select
              id="evidence-category"
              label="Category"
              value={form.category}
              onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
              required
              hint="Select a category"
            >
              <option value="">Select a category</option>
              <option value="bank_statement">Bank statement</option>
              <option value="invoice">Invoice</option>
              <option value="ledger">Ledger extract</option>
              <option value="tax">Tax document</option>
              <option value="contract">Contract</option>
              <option value="other">Other</option>
            </Select>
            <Input
              id="evidence-source"
              label="Source"
              value={form.source}
              onChange={(e) => setForm((c) => ({ ...c, source: e.target.value }))}
              placeholder="Client portal"
            />
            <Input
              id="evidence-file"
              label="File (optional)"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="md:col-span-3 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={busy} loading={busy} className="ml-auto">
                Add evidence
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Collected evidence</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'document',
                label: 'EVIDENCE',
                render: (row) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-[11px] font-medium leading-4 text-primary-text">{row.document_name}</span>
                    <span className="mt-0.5 block text-[9px] leading-3 font-mono text-ink-3">{row.evidence_id}</span>
                  </span>
                ),
              },
              { key: 'category', label: 'CATEGORY', render: (row) => <span className="text-[10px] leading-4 text-ink-3 capitalize">{String(row.category || '').replace(/_/g, ' ')}</span> },
              { key: 'source', label: 'SOURCE', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.source || '—'}</span> },
              { key: 'uploaded', label: 'UPLOADED', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{formatDateIN(row.upload_date || row.created_at || '')}</span> },
              {
                key: 'verification',
                label: 'VERIFICATION',
                align: 'right',
                render: (row) => (
                  <Select
                    value={row.verification_status || 'pending'}
                    onChange={(e) => setVerification(row.id, e.target.value)}
                    className="text-[10px]"
                  >
                    {VERIFICATION_STATES.map((state) => (
                      <option key={state} value={state}>{state.replace(/_/g, ' ')}</option>
                    ))}
                  </Select>
                ),
              },
            ]}
            rows={(evidence || []) as any[]}
            emptyMessage="No evidence collected yet."
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <StatusBadge status="auditor_verified" />
        <p className="text-[10px] leading-4 text-ink-3">
          Files are stored with a SHA-256 hash so the file on disk can be matched to the record.
        </p>
      </div>
    </div>
  );
}