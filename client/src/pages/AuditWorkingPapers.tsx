import React, { useEffect, useState } from 'react';
import {
  auditEngagementsList,
  auditWorkingPapersCreate,
  auditWorkingPapersList,
  auditWorkingPapersUpdate,
} from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateIN } from '../utils/format';
import { Plus } from 'lucide-react';

const APPROVAL_STATES = ['draft', 'submitted', 'reviewed', 'approved', 'rejected'];

export default function AuditWorkingPapers() {
  const [papers, setPapers] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setError('');
    try {
      const [wp, eng] = await Promise.all([auditWorkingPapersList(), auditEngagementsList()]);
      setPapers(wp.data?.working_papers || []);
      setEngagements(eng.data?.audit_engagements || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load working papers');
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
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Working papers</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">
            Objectives, procedures and conclusions, each moving through a review and approval trail.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-on-secondary-container transition-all font-label-md text-label-md font-semibold self-start"
        >
          <Plus size={14} /> New working paper
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
            Working paper number
            <input
              required
              value={form.wp_number}
              onChange={(e) => setForm({ ...form, wp_number: e.target.value })}
              className="input-field mt-1 font-code-mono text-code-mono"
              placeholder="WP-01"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Audit area
            <input
              required
              value={form.audit_area}
              onChange={(e) => setForm({ ...form, audit_area: e.target.value })}
              className="input-field mt-1"
              placeholder="Revenue recognition"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Evidence references
            <input
              value={form.evidence_references}
              onChange={(e) => setForm({ ...form, evidence_references: e.target.value })}
              className="input-field mt-1"
              placeholder="EVD-101, EVD-104"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant md:col-span-2">
            Objective
            <textarea
              rows={2}
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              className="input-field mt-1"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant md:col-span-2">
            Procedure
            <textarea
              rows={3}
              value={form.procedure}
              onChange={(e) => setForm({ ...form, procedure: e.target.value })}
              className="input-field mt-1"
            />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant md:col-span-2">
            Conclusion
            <textarea
              rows={2}
              value={form.auditor_conclusion}
              onChange={(e) => setForm({ ...form, auditor_conclusion: e.target.value })}
              className="input-field mt-1"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-space-sm">
            <button
              type="submit"
              disabled={busy}
              className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold disabled:opacity-60"
            >
              {busy ? 'Saving' : 'Create working paper'}
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

      <div className="space-y-space-sm">
        {loading ? (
          <p className="text-sm text-on-surface-variant text-center py-space-lg">Loading working papers...</p>
        ) : papers.length === 0 ? (
          <p className="bg-surface-container-lowest border border-outline rounded-lg px-space-md py-space-lg text-sm text-on-surface-variant text-center">
            No working paper yet.
          </p>
        ) : (
          papers.map((paper) => (
            <article key={paper.id} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
                <div className="min-w-0">
                  <p className="font-code-mono text-code-mono text-on-surface-variant">{paper.wp_number}</p>
                  <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">{paper.audit_area}</h2>
                  {paper.objective && <p className="text-sm text-on-surface-variant mt-space-2xs">{paper.objective}</p>}
                  {paper.auditor_conclusion && (
                    <p className="text-sm text-on-surface mt-space-2xs">Conclusion: {paper.auditor_conclusion}</p>
                  )}
                  {paper.prepared_at && (
                    <p className="text-xs text-on-surface-variant mt-space-2xs">Prepared {formatDateIN(paper.prepared_at)}</p>
                  )}
                </div>
                <div className="flex items-center gap-space-sm shrink-0">
                  <StatusBadge status={paper.approval_status || 'draft'} />
                  <select
                    value={paper.approval_status || 'draft'}
                    onChange={(e) => setApproval(paper.id, e.target.value)}
                    className="select-field py-1 text-xs"
                  >
                    {APPROVAL_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
