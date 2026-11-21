import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, RefreshCw, Search } from 'lucide-react';
import { activityLogsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDateIN } from '../utils/format';

interface ActivityLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | Record<string, unknown> | null;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
}

interface ActivityPayload {
  activity_logs?: ActivityLog[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response;
    if (typeof response?.data?.error === 'string') {
      return response.data.error;
    }
  }
  return fallback;
}

function getActor(log: ActivityLog): string {
  return log.full_name?.trim() || log.email?.trim() || '—';
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ');
}

function formatEntityType(entityType?: string | null): string {
  return entityType ? entityType.replace(/_/g, ' ') : '—';
}

function formatDetails(details?: string | Record<string, unknown> | null): string {
  if (details === null || details === undefined || details === '') return '—';

  if (typeof details === 'object') {
    return JSON.stringify(details, null, 2);
  }

  try {
    const parsed: unknown = JSON.parse(details);
    if (typeof parsed === 'string') return parsed;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return details;
  }
}

function formatTime(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Activity() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await activityLogsList();
      const payload = response.data as ActivityPayload;
      setLogs(Array.isArray(payload.activity_logs) ? payload.activity_logs : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load the activity log. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, []);

  const filteredLogs = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) => {
      const actor = getActor(log).toLowerCase();
      const action = formatAction(log.action).toLowerCase();
      return actor.includes(query) || action.includes(query);
    });
  }, [filter, logs]);

  return (
    <div className="p-6 space-y-space-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
          Activity log
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Review actions recorded across your workspace.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm rounded-md bg-error-container/40 px-space-md py-space-sm text-body-sm text-error"
        >
          <span className="flex items-start gap-space-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadActivity()}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      )}

      <section className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md border-b border-outline px-space-md py-space-md">
          <div className="flex items-center gap-space-sm">
            <History size={18} className="text-secondary" />
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Recorded activity</h2>
              <p className="text-body-sm text-on-surface-variant">
                {loading ? 'Loading activity…' : `${filteredLogs.length} of ${logs.length} entries`}
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <Input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by actor or action"
              className="pl-9"
              aria-label="Filter activity by actor or action"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-space-sm p-space-md" aria-live="polite">
            <span className="sr-only">Loading activity log</span>
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-md bg-surface-container-low" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-header">Actor</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Entity type</th>
                  <th className="table-header">Date and time</th>
                  <th className="table-header">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <History size={30} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
                      <p className="text-body-md font-medium text-on-surface">No activity recorded</p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Workspace actions will appear here.
                      </p>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Search size={28} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
                      <p className="text-body-md font-medium text-on-surface">No matching activity</p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Try a different actor or action.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low/60">
                      <td className="table-cell align-top font-medium text-on-surface">{getActor(log)}</td>
                      <td className="table-cell align-top capitalize text-on-surface">
                        {formatAction(log.action)}
                      </td>
                      <td className="table-cell align-top text-on-surface-variant">
                        {formatEntityType(log.entity_type)}
                      </td>
                      <td className="table-cell align-top">
                        <div className="text-on-surface tnum">{formatDateIN(log.created_at) || '—'}</div>
                        <div className="mt-0.5 text-label-sm text-on-surface-variant tnum">
                          {formatTime(log.created_at)}
                        </div>
                      </td>
                      <td className="table-cell align-top">
                        <pre className="max-w-[380px] max-h-24 overflow-auto whitespace-pre-wrap break-words font-code-mono text-code-mono text-on-surface-variant">
                          {formatDetails(log.details)}
                        </pre>
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
