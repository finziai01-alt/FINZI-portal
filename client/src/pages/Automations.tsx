import { useEffect, useState, type FormEvent } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { automationsCreate, automationsList, automationsUpdate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { formatDateIN } from '../utils/format';

type AutomationStatus = 'active' | 'paused' | 'disabled';

interface AutomationWorkflow {
  id: string;
  name: string;
  category: string;
  trigger_condition?: string | null;
  workflow_steps?: string | null;
  status: AutomationStatus;
  owner_id?: string | null;
  created_at: string;
  updated_at?: string;
}

interface AutomationListPayload {
  workflows?: AutomationWorkflow[];
  note?: string;
}

interface AutomationForm {
  name: string;
  category: string;
  triggerCondition: string;
}

const categories = ['GST', 'TDS', 'Reconciliations', 'Reminders', 'Reporting'];

const initialForm: AutomationForm = {
  name: '',
  category: '',
  triggerCondition: '',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response;
    if (typeof response?.data?.error === 'string') {
      return response.data.error;
    }
  }
  return fallback;
}

function formatTriggerCondition(value?: string | null): string {
  if (!value?.trim()) return '—';
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'string') return parsed;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default function Automations() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AutomationForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(null);

  const loadAutomations = async () => {
    setError(null);
    try {
      const response = await automationsList();
      const payload = response.data as AutomationListPayload;
      setWorkflows(Array.isArray(payload.workflows) ? payload.workflows : []);
      setNote(typeof payload.note === 'string' ? payload.note : '');
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to load automations. Please try again.'));
    }
  };

  useEffect(() => {
    void loadAutomations();
  }, []);

  const handleStatusChange = async (workflowId: string, status: AutomationStatus) => {
    setUpdatingWorkflowId(workflowId);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await automationsUpdate(workflowId, { status });
      await loadAutomations();
      setSuccessMessage(`Automation status updated to ${status}.`);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to update the automation status.'));
    } finally {
      setUpdatingWorkflowId(null);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const category = form.category.trim();
    if (!name || !category) {
      setFormError('Enter a name and choose a category.');
      return;
    }
    setCreating(true);
    setFormError(null);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await automationsCreate({
        name,
        category,
        trigger_condition: form.triggerCondition.trim() || undefined,
      });
      await loadAutomations();
      setForm(initialForm);
      setShowForm(false);
      setSuccessMessage('Automation created.');
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to create the automation.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Automations"
        description="Create and control scheduled workflows for accounting and reporting."
        actions={
          <Button variant="outline" onClick={() => setShowForm((current) => !current)} disabled={creating} aria-expanded={showForm} aria-controls="new-automation-form">
            <Plus size={16} /> New automation
          </Button>
        }
      />

      {note && (
        <Card flush className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
            <span className="text-[11px] leading-4 text-ink-3">{note}</span>
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm text-brand-ink flex items-center gap-2">
          <span className="text-[10px] font-semibold text-brand-ink">Success</span>
          <span className="ml-2 text-[11px] leading-4 text-ink-3">{successMessage}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {actionError}
        </div>
      )}

      {showForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">New automation</h2>
          </div>
          <form onSubmit={handleCreate} noValidate className="p-4 pb-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                id="automation-name"
                label="Name"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                error={formError ? 'Enter a name and choose a category.' : undefined}
                required
                placeholder="e.g. Monthly GST review"
              />
              <Select
                id="automation-category"
                label="Category"
                value={form.category}
                onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <Input
                id="automation-trigger"
                label="Trigger condition"
                value={form.triggerCondition}
                onChange={(e) => setForm((current) => ({ ...current, triggerCondition: e.target.value }))}
                hint='{"event": "invoice_due", "days": 3}'
              />
            </div>
            <div className="md:col-span-3 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={creating} loading={creating} className="ml-auto">
                Create automation
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card flush>
        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'WORKFLOW',
                render: (row) => <span className="text-[11px] font-medium leading-4 text-primary-text">{row.name}</span>,
              },
              { key: 'category', label: 'CATEGORY', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.category}</span> },
              { key: 'trigger', label: 'TRIGGER', render: (row) => <span className="text-[10px] leading-4 text-ink-3">{formatTriggerCondition(row.trigger_condition)}</span> },
              { key: 'status', label: 'STATUS', align: 'right', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'updated', label: 'UPDATED', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{formatDateIN(row.updated_at || row.created_at || '')}</span> },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (row) => {
                  const next = row.status === 'active' ? 'paused' : 'active';
                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={row.id === updatingWorkflowId}
                      loading={row.id === updatingWorkflowId}
                      onClick={() => handleStatusChange(row.id, next)}
                      className="w-auto"
                    >
                      {next}
                    </Button>
                  );
                },
              },
            ]}
            rows={(workflows || []) as any[]}
            emptyMessage="No automation workflows yet."
          />
        </div>
      </Card>
    </div>
  );
}