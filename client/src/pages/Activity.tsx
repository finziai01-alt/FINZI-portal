import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { activityLogsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
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
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Activity log"
        description="Review actions recorded across your workspace."
        actions={
          <Button variant="outline" onClick={() => void loadActivity()}>
            <RefreshCw size={16} /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <div>
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Recorded activity</h2>
            <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
              {loading ? 'Loading activity…' : `${filteredLogs.length} of ${logs.length} entries`}
            </p>
          </div>
          <div className="flex-1 max-w-md sm:max-w-none">
            <Input
              icon={<Search size={16} className="text-on-surface-variant" />}
              placeholder="Filter by actor or action"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter activity by actor or action"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'actor',
                label: 'ACTOR',
                render: (row) => <span className="text-[11.5px] font-medium leading-4 text-primary-text">{getActor(row)}</span>,
              },
              { key: 'action', label: 'ACTION', render: (row) => <span className="text-[11.5px] leading-4 text-primary-text capitalize">{formatAction(row.action)}</span> },
              { key: 'entity', label: 'ENTITY TYPE', render: (row) => <span className="text-[10px] leading-4 text-ink-3">{formatEntityType(row.entity_type)}</span> },
              {
                key: 'when',
                label: 'DATE AND TIME',
                align: 'right',
                render: (row) => (
                  <span className="block text-right">
                    <span className="text-[11.5px] leading-4 text-primary-text tnum">{formatDateIN(row.created_at) || '—'}</span>
                    <span className="mt-0.5 block text-[10px] leading-3 text-ink-3 tnum">{formatTime(row.created_at)}</span>
                  </span>
                ),
              },
              { key: 'details', label: 'DETAILS', render: (row) => <pre className="max-w-[44ch] max-h-20 overflow-auto whitespace-pre-wrap break-words font-code-mono text-code-mono text-[10px] leading-4 text-ink-3">{formatDetails(row.details)}</pre> },
            ]}
            rows={filteredLogs}
            emptyMessage="No activity recorded"
            footer={
              <div className="border-t border-line px-4 py-3">
                <div className="flex justify-between">
                  <span className="text-[11px] font-medium leading-4 text-ink-2 tnum">{logs.length} entr{logs.length !== 1 ? 'ies' : 'y'} recorded</span>
                </div>
              </div>
            }
          />
        </div>
      </Card>
    </div>
  );
}