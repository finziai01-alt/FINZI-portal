import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { rolesList, usersList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { formatDateIN } from '../utils/format';

interface TeamUser {
  id: string;
  email: string;
  phone?: string | null;
  full_name?: string | null;
  designation?: string | null;
  department?: string | null;
  employee_id?: string | null;
  avatar_url?: string | null;
  role_id?: string | null;
  status?: string | null;
  membership_status?: string | null;
  is_active?: boolean | number | null;
  created_at?: string | null;
  last_login_at?: string | null;
}

interface RoleSummary {
  id: string;
  name: string;
  description?: string | null;
  level?: number | null;
  is_system?: boolean | number | null;
}

interface UsersPayload {
  users?: TeamUser[];
}

interface RolesPayload {
  roles?: RoleSummary[];
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

function getMembershipStatus(user: TeamUser): string {
  const status = user.membership_status || user.status;
  if (status) return status;
  if (user.is_active === 0 || user.is_active === false) return 'inactive';
  if (user.is_active === 1 || user.is_active === true) return 'active';
  return 'unknown';
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim();
  if (!source) return '—';
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
  return initials || source.charAt(0).toUpperCase();
}

export default function Team() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([usersList(), rolesList()]);
      const usersPayload = usersResponse.data as UsersPayload;
      const rolesPayload = rolesResponse.data as RolesPayload;
      setUsers(Array.isArray(usersPayload.users) ? usersPayload.users : []);
      setRoles(Array.isArray(rolesPayload.roles) ? rolesPayload.roles : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load team members. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, []);

  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const fullName = user.full_name?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';
      return fullName.includes(query) || email.includes(query);
    });
  }, [search, users]);

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Team"
        description="Review workspace members, assigned roles, and access status."
        actions={
          <Button variant="outline" onClick={() => void loadTeam()}>
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
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Team members</h2>
            <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
              {loading ? 'Loading members…' : `${filteredUsers.length} of ${users.length} members`}
            </p>
          </div>
          <div className="flex-1 max-w-md sm:max-w-none">
            <Input
              icon={<Search size={16} className="text-on-surface-variant" />}
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search team members by name or email"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'member',
                label: 'FULL NAME',
                render: (row) => (
                  <span className="block min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sub text-[11px] font-bold text-ink-2">
                        {getInitials(row.full_name, row.email)}
                      </span>
                      <span className="block truncate text-[11.5px] font-medium leading-4 text-primary-text">
                        {row.full_name || '—'}
                      </span>
                    </span>
                  </span>
                ),
              },
              { key: 'email', label: 'EMAIL', render: (row) => <span className="text-[11.5px] leading-4 text-primary-text tnum">{row.email}</span> },
              { key: 'designation', label: 'DESIGNATION', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.designation || '—'}</span> },
              { key: 'department', label: 'DEPARTMENT', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.department || '—'}</span> },
              { key: 'role', label: 'ROLE', render: (row) => {
                const role = row.role_id ? roleNames.get(row.role_id) || row.role_id : 'Unassigned';
                return <span className="text-[11.5px] leading-4 text-primary-text">{role}</span>;
              } },
              {
                key: 'status',
                label: 'MEMBERSHIP STATUS',
                align: 'right',
                render: (row) => <StatusBadge status={getMembershipStatus(row)} />,
              },
              {
                key: 'login',
                label: 'LAST LOGIN',
                align: 'right',
                render: (row) => (
                  <span className="block text-right text-[11.5px] leading-4 text-ink-3 tnum">
                    {formatDateIN(row.last_login_at || '') || 'Never'}
                  </span>
                ),
              },
            ]}
            rows={filteredUsers}
            emptyMessage="No team members found"
            footer={
              <div className="border-t border-line px-4 py-3">
                <div className="flex justify-between">
                  <span className="text-[11px] font-medium leading-4 text-ink-2 tnum">{users.length} member{users.length !== 1 ? 's' : ''} in this workspace</span>
                </div>
              </div>
            }
          />
        </div>
      </Card>
    </div>
  );
}