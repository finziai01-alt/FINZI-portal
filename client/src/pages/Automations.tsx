import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Plus,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { automationsCreate, automationsList, automationsUpdate } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDateIN } from '../utils/format';

type AutomationStatus = 'active' | 'paused' | 'disabled';

type AutomationStatusVariant = 'default' | 'success' | 'warning';

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
const statuses: AutomationStatus[] = ['active', 'paused', 'disabled'];

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

function statusVariant(status: AutomationStatus): AutomationStatusVariant {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'default';
}

export default function Automations() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AutomationForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(null);

  const loadAutomations = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setLoadError(null);
    }

    try {
      const response = await automationsList();
      const payload = response.data as AutomationListPayload;
      setWorkflows(Array.isArray(payload.workflows) ? payload.workflows : []);
      setNote(typeof payload.note === 'string' ? payload.note : '');
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Unable to load automations. Please try again.'));
    } finally {
      if (showLoading) setLoading(false);
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
      await loadAutomations(false);
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
      await loadAutomations(false);
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
    <div className="p-6 space-y-space-lg">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
            Automations
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Create and control scheduled workflows for accounting and reporting.
          </p>
        </div>
        <Button
          type="button"
          variant="green"
          onClick={() => {
            setShowForm((current) => !current);
            setFormError(null);
          }}
          aria-expanded={showForm}
          aria-controls="new-automation-form"
        >
          <Plus size={16} />
          New automation
        </Button>
      </header>

      {note && (
        <div className="flex items-start gap-space-sm rounded-lg border border-outline bg-surface-container-low px-space-md py-space-md">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary" />
          <p className="text-body-sm text-on-surface-variant">{note}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-space-sm rounded-md bg-secondary-container/40 px-space-md py-space-sm text-body-sm font-medium text-secondary"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          {successMessage}
        </div>
      )}

      {(loadError || actionError) && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm rounded-md bg-error-container/40 px-space-md py-space-sm text-body-sm text-error"
        >
          <span className="flex items-start gap-space-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {loadError || actionError}
          </span>
          {loadError && (
            <Button type="button" variant="outline" size="sm" onClick={() => void loadAutomations()}>
              <RefreshCw size={14} />
              Retry
            </Button>
          )}
        </div>
      )}

      {showForm && (
        <section id="new-automation-form" className="card p-space-lg">
          <div className="mb-space-lg">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              New automation
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Define the workflow category and the event that starts it.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-space-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <Input
                label="Name *"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Monthly GST review"
                required
                maxLength={120}
              />

              <div className="space-y-1">
                <label htmlFor="automation-category" className="block text-sm font-medium text-on-surface">
                  Category *
                </label>
                <div className="relative">
                  <select
                    id="automation-category"
                    className="select-field pr-8"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                </div>
              </div>
            </div>

            <Input
              label="Trigger condition"
              value={form.triggerCondition}
              onChange={(event) =>
                setForm((current) => ({ ...current, triggerCondition: event.target.value }))
              }
              placeholder="e.g. Invoice overdue by 5 days"
              maxLength={200}
            />

            {formError && (
              <p role="alert" className="flex items-center gap-space-sm text-body-sm text-error">
                <AlertTriangle size={14} className="shrink-0" />
                {formError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-space-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm);
                  setFormError(null);
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" variant="green" disabled={creating}>
                {creating ? 'Creating…' : 'Create automation'}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm border-b border-outline px-space-md py-space-md">
          <div className="flex items-center gap-space-sm">
            <Workflow size={18} className="text-secondary" />
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Workflows</h2>
              <p className="text-body-sm text-on-surface-variant">All configured automation workflows.</p>
            </div>
          </div>
          {!loading && workflows.length > 0 && (
            <span className="text-label-sm text-on-surface-variant tnum">{workflows.length} workflows</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-space-sm p-space-md" aria-live="polite">
            <span className="sr-only">Loading automations</span>
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-md bg-surface-container-low" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-header">Automation</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Trigger condition</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Control</th>
                </tr>
              </thead>
              <tbody>
                {workflows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Workflow size={30} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
                      <p className="text-body-md font-medium text-on-surface">No automations configured</p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Create an automation to start a scheduled workflow.
                      </p>
                    </td>
                  </tr>
                ) : (
                  workflows.map((workflow) => (
                    <tr key={workflow.id} className="hover:bg-surface-container-low/60">
                      <td className="table-cell align-top">
                        <p className="font-medium text-on-surface">{workflow.name}</p>
                      </td>
                      <td className="table-cell align-top text-on-surface-variant">{workflow.category}</td>
                      <td className="table-cell align-top">
                        <pre className="max-w-[320px] whitespace-pre-wrap break-words font-code-mono text-code-mono text-on-surface-variant">
                          {formatTriggerCondition(workflow.trigger_condition)}
                        </pre>
                      </td>
                      <td className="table-cell align-top text-on-surface-variant tnum">
                        {formatDateIN(workflow.created_at) || '—'}
                      </td>
                      <td className="table-cell align-top">
                        <Badge variant={statusVariant(workflow.status)} className="capitalize">
                          {workflow.status}
                        </Badge>
                      </td>
                      <td className="table-cell align-top">
                        <div className="relative w-[124px]">
                          <select
                            className="select-field h-9 py-0 pr-7 text-body-sm"
                            value={workflow.status}
                            onChange={(event) => {
                              void handleStatusChange(workflow.id, event.target.value as AutomationStatus);
                            }}
                            disabled={updatingWorkflowId !== null}
                            aria-label={`Status for ${workflow.name}`}
                            aria-busy={updatingWorkflowId === workflow.id}
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status === workflow.status && updatingWorkflowId === workflow.id
                                  ? 'Saving…'
                                  : status}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
