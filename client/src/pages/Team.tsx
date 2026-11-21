import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, Users } from 'lucide-react';
import { rolesList, usersList } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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

type MembershipVariant = 'default' | 'success' | 'warning' | 'danger';

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

function membershipVariant(status: string): MembershipVariant {
  const normalized = status.toLowerCase();
  if (normalized === 'active' || normalized === 'approved') return 'success';
  if (normalized === 'pending' || normalized === 'invited') return 'warning';
  if (normalized === 'inactive' || normalized === 'suspended' || normalized === 'removed') return 'danger';
  return 'default';
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim();
  if (!source) return '—';

  const words = source.split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

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

  const roleNames = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles],
  );

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
    <div className="p-6 space-y-space-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Team</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Review workspace members, assigned roles, and access status.
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
          <Button type="button" variant="outline" size="sm" onClick={() => void loadTeam()}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      )}

      <section className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md border-b border-outline px-space-md py-space-md">
          <div className="flex items-center gap-space-sm">
            <Users size={18} className="text-secondary" />
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Team members</h2>
              <p className="text-body-sm text-on-surface-variant">
                {loading ? 'Loading members…' : `${filteredUsers.length} of ${users.length} members`}
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
              aria-label="Search team members by name or email"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-space-sm p-space-md" aria-live="polite">
            <span className="sr-only">Loading team members</span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-md bg-surface-container-low" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-header">Full name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Designation</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Membership status</th>
                  <th className="table-header">Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Users size={30} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
                      <p className="text-body-md font-medium text-on-surface">No team members found</p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Members added to this workspace will appear here.
                      </p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Search size={28} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
                      <p className="text-body-md font-medium text-on-surface">No matching team members</p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Try a different name or email.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const membershipStatus = getMembershipStatus(user);
                    const role = user.role_id
                      ? roleNames.get(user.role_id) || user.role_id
                      : 'Unassigned';

                    return (
                      <tr key={user.id} className="hover:bg-surface-container-low/60">
                        <td className="table-cell">
                          <div className="flex items-center gap-space-sm">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container/40 text-label-sm font-semibold text-secondary"
                              aria-hidden="true"
                            >
                              {getInitials(user.full_name, user.email)}
                            </span>
                            <span className="font-medium text-on-surface">{user.full_name || '—'}</span>
                          </div>
                        </td>
                        <td className="table-cell text-on-surface-variant">{user.email}</td>
                        <td className="table-cell text-on-surface-variant">{user.designation || '—'}</td>
                        <td className="table-cell text-on-surface-variant">{user.department || '—'}</td>
                        <td className="table-cell text-on-surface-variant">{role}</td>
                        <td className="table-cell">
                          <Badge variant={membershipVariant(membershipStatus)} className="capitalize">
                            {membershipStatus}
                          </Badge>
                        </td>
                        <td className="table-cell text-on-surface-variant tnum">
                          {formatDateIN(user.last_login_at || '') || 'Never'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
