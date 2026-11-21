import React, { useEffect, useState } from 'react';
import {
  auditEngagementsList,
  auditEvidenceCreate,
  auditEvidenceList,
  auditEvidenceUpdate,
} from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateIN } from '../utils/format';
import { Upload } from 'lucide-react';

const VERIFICATION_STATES = ['pending', 'under_review', 'auditor_verified', 'discrepancy_flagged'];

export default function AuditEvidence() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ engagement_id: '', document_name: '', category: '', source: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ev, eng] = await Promise.all([auditEvidenceList(), auditEngagementsList()]);
      setEvidence(ev.data?.audit_evidence || []);
      setEngagements(eng.data?.audit_engagements || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load evidence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Evidence and papers</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">
            Documents collected against each engagement, with the auditor verification status.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-on-secondary-container transition-all font-label-md text-label-md font-semibold self-start"
        >
          <Upload size={14} /> Add evidence
        </button>
      </div>

      {error && <p className="rounded bg-error-container/40 border border-error/40 px-space-md py-space-sm text-sm text-error">{error}</p>}
      {message && <p className="rounded bg-secondary-container/40 border border-secondary/40 px-space-md py-space-sm text-sm text-on-secondary-container">{message}</p>}

      {showForm && (
        <form onSubmit={submit} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          <label className="text-xs font-semibold text-on-surface-variant">
            Engagement
            <select
              required
              value={form.engagement_id}
              onChange={(e) => setForm({ ...form, engagement_id: e.target.value })}
              className="select-field mt-1"
            >
              <option value="">Select an engagement</option>
              {engagements.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.engagement_name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Document name
            <input
              required
              value={form.document_name}
              onChange={(e) => setForm({ ...form, document_name: e.target.value })}
              className="input-field mt-1"
              placeholder="March bank statement"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Category
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="select-field mt-1"
            >
              <option value="">Select a category</option>
              <option value="bank_statement">Bank statement</option>
              <option value="invoice">Invoice</option>
              <option value="ledger">Ledger extract</option>
              <option value="tax">Tax document</option>
              <option value="contract">Contract</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Source
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="input-field mt-1"
              placeholder="Client portal"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant md:col-span-2">
            File (optional)
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input-field mt-1"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-space-sm">
            <button
              type="submit"
              disabled={busy}
              className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold disabled:opacity-60"
            >
              {busy ? 'Saving' : 'Add evidence'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-space-md py-space-xs rounded border border-outline text-label-md font-semibold text-on-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
        {loading ? (
          <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">Loading evidence...</p>
        ) : evidence.length === 0 ? (
          <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">
            No evidence collected yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline">
                  <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Evidence</th>
                  <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Category</th>
                  <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Source</th>
                  <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Uploaded</th>
                  <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Verification</th>
                </tr>
              </thead>
              <tbody>
                {evidence.map((item) => (
                  <tr key={item.id} className="border-b border-outline last:border-0">
                    <td className="px-space-md py-space-sm">
                      <p className="text-on-surface">{item.document_name}</p>
                      <p className="font-code-mono text-code-mono text-on-surface-variant">{item.evidence_id}</p>
                    </td>
                    <td className="px-space-md py-space-sm text-on-surface-variant capitalize">
                      {String(item.category || '').replace(/_/g, ' ')}
                    </td>
                    <td className="px-space-md py-space-sm text-on-surface-variant">{item.source || '—'}</td>
                    <td className="px-space-md py-space-sm text-right text-on-surface-variant tnum">
                      {formatDateIN(item.upload_date || item.created_at)}
                    </td>
                    <td className="px-space-md py-space-sm text-right">
                      <select
                        value={item.verification_status || 'pending'}
                        onChange={(e) => setVerification(item.id, e.target.value)}
                        className="select-field py-1 text-xs"
                      >
                        {VERIFICATION_STATES.map((state) => (
                          <option key={state} value={state}>{state.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center gap-space-sm">
        <StatusBadge status="auditor_verified" />
        <p className="text-xs text-on-surface-variant">
          Files are stored with a SHA-256 hash so the file on disk can be matched to the record.
        </p>
      </div>
    </div>
  );
}
