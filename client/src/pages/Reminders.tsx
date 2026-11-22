import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { remindersCreate, remindersDelete, remindersList, remindersUpdate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { formatDateIN } from '../utils/format';

const emptyReminder = {
  title: '',
  category: '',
  due_date: '',
  priority: 'medium',
  description: '',
};

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [draft, setDraft] = useState(emptyReminder);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState('');

  const loadData = async () => {
    setError('');
    try {
      const res = await remindersList();
      setReminders(res.data.reminders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load reminders');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setActionError('');
    try {
      await remindersCreate({
        title: draft.title.trim(),
        category: draft.category.trim(),
        due_date: draft.due_date,
        priority: draft.priority,
        description: draft.description.trim() || undefined,
      });
      setDraft(emptyReminder);
      await loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Could not create reminder');
    } finally {
      setCreating(false);
    }
  };

  const markDone = async (id: string) => {
    setActionId(id);
    setActionError('');
    try {
      await remindersUpdate(id, { status: 'completed' });
      await loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Could not update reminder');
    } finally {
      setActionId('');
    }
  };

  const deleteReminder = async (id: string, title: string) => {
    if (!window.confirm(`Delete reminder “${title}”?`)) return;
    setActionId(id);
    setActionError('');
    try {
      await remindersDelete(id);
      await loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Could not delete reminder');
    } finally {
      setActionId('');
    }
  };

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Reminders"
        description="Set up automated reminders for compliance and follow-ups."
        actions={
          <Button variant="green" onClick={() => {}} disabled={creating} className="ml-auto">
            <Plus size={16} className="text-on-secondary" /> New reminder
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reminders" metrics={[{ label: 'Count', value: String(reminders.length) }]} />
        <StatCard title="Due Today" readout={{ value: String(reminders.filter((r) => r.status === 'pending' && String(r.due_date || '').slice(0, 10) === todayKey).length) }} metrics={[{ label: 'Today', value: String(reminders.filter((r) => r.status === 'pending' && String(r.due_date || '').slice(0, 10) === todayKey).length) }]} />
        <StatCard title="Overdue" readout={{ value: String(reminders.filter((r) => r.status === 'overdue').length), tone: 'negative' }} metrics={[{ label: 'Overdue', value: String(reminders.filter((r) => r.status === 'overdue').length) }]} />
        <StatCard title="Completed" readout={{ value: String(reminders.filter((r) => r.status === 'completed').length), tone: 'positive' }} metrics={[{ label: 'Completed', value: String(reminders.filter((r) => r.status === 'completed').length) }]} />
      </div>

      <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Create Reminder</h2>
          </div>
          <form onSubmit={handleCreate} noValidate className="p-4 pb-2 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              id="reminder-title"
              label="Title"
              value={draft.title}
              onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
              required
              placeholder="File GSTR-3B for Himalaya Foods"
            />
            <Input
              id="reminder-category"
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value }))}
              required
            />
            <Input id="reminder-due-date" label="Due Date" type="date" value={draft.due_date} onChange={(e) => setDraft((current) => ({ ...current, due_date: e.target.value }))} required />
            <Select
              id="reminder-priority"
              label="Priority"
              value={draft.priority}
              onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
            <Textarea id="reminder-description" label="Description" rows={3} value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} />
            <div className="md:col-span-4 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setDraft(emptyReminder)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Clear
              </button>
              <Button type="submit" disabled={creating} loading={creating} className="ml-auto">
                Create reminder
              </Button>
            </div>
          </form>
        </Card>

      <Card flush>
        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              { key: 'title', label: 'TITLE', render: (row) => <span className="text-[11px] font-medium leading-4 text-primary-text">{row.title}</span> },
              { key: 'category', label: 'CATEGORY', render: (row) => <span className="text-[10px] leading-4 text-ink-3 capitalize">{row.category}</span> },
              { key: 'due', label: 'DUE DATE', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{formatDateIN(row.due_date || '') || '—'}</span> },
              { key: 'priority', label: 'PRIORITY', align: 'right', render: (row) => <StatusBadge status={row.priority} /> },
              { key: 'status', label: 'STATUS', align: 'right', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'assigned', label: 'ASSIGNED', render: (row) => <span className="text-[11px] leading-4 text-ink-3 tnum">{row.assigned_name || row.assigned_to || '—'}</span> },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    {row.status !== 'completed' ? (
                      <Button type="button" size="sm" variant="outline" disabled={actionId === row.id} onClick={() => markDone(row.id)} className="w-auto">
                        Done
                      </Button>
                    ) : (
                      <span className="text-[10px] text-ink-3">Completed</span>
                    )}
                    <Button type="button" size="sm" variant="danger" disabled={actionId === row.id} onClick={() => deleteReminder(row.id, row.title)} className="w-auto">
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={(reminders || []) as any[]}
            emptyMessage="No reminders found"
          />
        </div>
      </Card>
    </div>
  );
}