import { useEffect, useState, type FormEvent } from 'react';
import { remindersList, remindersCreate, remindersUpdate, remindersDelete } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatDateIN } from '../utils/format';
import { Check, Plus, Search, Trash2 } from 'lucide-react';

const emptyReminder = {
  title: '',
  category: '',
  due_date: '',
  priority: 'medium',
  description: '',
};

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(emptyReminder);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await remindersList();
      setReminders(res.data.reminders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredReminders = reminders.filter((reminder) =>
    [reminder.title, reminder.category, reminder.description].some((value) =>
      String(value || '').toLowerCase().includes(normalizedSearch)
    )
  );
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Reminders & Automation</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">Set up automated reminders for compliance and follow-ups.</p>
        </div>
        <Button type="submit" form="reminder-form" variant="green" disabled={creating}>
          <Plus size={16} className="text-on-secondary" /> {creating ? 'Creating...' : 'New Reminder'}
        </Button>
      </div>

      <Card className="mt-space-md">
        <CardHeader>
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Create Reminder</h2>
        </CardHeader>
        <CardContent>
          <form id="reminder-form" onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
              <Input
                label="Title"
                required
                value={draft.title}
                onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
              />
              <Input
                label="Category"
                required
                value={draft.category}
                onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value }))}
              />
              <Input
                label="Due Date"
                type="date"
                required
                value={draft.due_date}
                onChange={(e) => setDraft((current) => ({ ...current, due_date: e.target.value }))}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-primary-text" htmlFor="reminder-priority">Priority</label>
                <select
                  id="reminder-priority"
                  value={draft.priority}
                  onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value }))}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="mt-space-md">
              <Input
                label="Description"
                value={draft.description}
                onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl mt-space-md">
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Reminders</div>
          <div className="text-2xl font-bold text-on-surface tnum">{reminders.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Due Today</div>
          <div className="text-2xl font-bold text-warning tnum">
            {reminders.filter(r => r.status === 'pending' && String(r.due_date || '').slice(0, 10) === todayKey).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Overdue</div>
          <div className="text-2xl font-bold text-error tnum">{reminders.filter(r => r.status === 'overdue').length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary">Completed</div>
          <div className="text-2xl font-bold text-secondary tnum">
            {reminders.filter(r => r.status === 'completed').length}
          </div>
        </Card>
      </div>

      <div className="relative max-w-md mb-space-md">
        <Input
          icon={<Search size={16} className="text-on-surface-variant" />}
          placeholder="Search reminders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {actionError && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {actionError}
        </div>
      )}
      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Scheduled Reminders</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Priority</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">Loading...</td></tr>
                ) : filteredReminders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">No reminders found</td>
                  </tr>
                ) : (
                  filteredReminders.map((reminder) => (
                    <tr key={reminder.id} className="border-b border-outline hover:bg-surface-container-low">
                      <td className="px-4 py-3 text-on-surface">{reminder.title}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant capitalize">{reminder.category}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDateIN(reminder.due_date || '') || '—'}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant capitalize">{reminder.priority}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={reminder.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-on-surface-variant">
                        {reminder.assigned_name || reminder.assigned_to || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {reminder.status !== 'completed' ? (
                            <button
                              onClick={() => markDone(reminder.id)}
                              disabled={actionId === reminder.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary disabled:opacity-50"
                              title="Mark done"
                            >
                              <Check size={14} /> Done
                            </button>
                          ) : (
                            <span className="text-xs text-on-surface-variant">Completed</span>
                          )}
                          <button
                            onClick={() => deleteReminder(reminder.id, reminder.title)}
                            disabled={actionId === reminder.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-error hover:text-danger disabled:opacity-50"
                            title="Delete reminder"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
