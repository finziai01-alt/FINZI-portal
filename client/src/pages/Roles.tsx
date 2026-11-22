import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { rolePermissions, rolesList } from '../services/api';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';

interface Role {
  id: string;
  name: string;
  description?: string | null;
  level?: number | null;
  is_system?: boolean | number | null;
}

interface PermissionObject {
  id?: string;
  name?: string;
  resource?: string;
  action?: string;
}

type PermissionEntry = PermissionObject | string;
type RolePermissionsPayload = PermissionEntry[] | { permissions?: PermissionEntry[] };

interface RolesPayload {
  roles?: Role[];
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

function getPermissionName(permission: PermissionEntry): string {
  if (typeof permission === 'string') return permission;
  if (permission.name) return permission.name;
  const resourceAction = [permission.resource, permission.action].filter(Boolean).join(' · ');
  return resourceAction || permission.id || 'Unnamed permission';
}

function getPermissionContext(permission: PermissionEntry): string | null {
  if (typeof permission === 'string') return null;
  const resourceAction = [permission.resource, permission.action].filter(Boolean).join(' · ');
  return resourceAction && resourceAction !== permission.name ? resourceAction : null;
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const permissionsRequest = useRef(0);

  const loadPermissions = async (roleId: string) => {
    const requestId = ++permissionsRequest.current;
    setPermissionsLoading(true);
    setPermissionsError(null);
    setPermissions([]);
    try {
      const response = await rolePermissions(roleId);
      const payload = response.data as RolePermissionsPayload;
      const permissionEntries = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.permissions)
          ? payload.permissions
          : [];
      if (requestId === permissionsRequest.current) {
        setPermissions(permissionEntries);
      }
    } catch (error) {
      if (requestId === permissionsRequest.current) {
        setPermissionsError(getErrorMessage(error, 'Unable to load permissions for this role.'));
      }
    } finally {
      if (requestId === permissionsRequest.current) {
        setPermissionsLoading(false);
      }
    }
  };

  const loadRoles = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await rolesList();
      const payload = response.data as RolesPayload;
      const loadedRoles = Array.isArray(payload.roles) ? payload.roles : [];
      setRoles(loadedRoles);
      const firstRole = loadedRoles[0];
      if (firstRole) {
        setSelectedRoleId(firstRole.id);
        await loadPermissions(firstRole.id);
      } else {
        setSelectedRoleId(null);
        setPermissions([]);
      }
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Unable to load roles. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) || null;

  const selectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    void loadPermissions(roleId);
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Roles and permissions"
        description="Review role definitions and the permissions assigned to each role."
        actions={
          <Button variant="outline" onClick={() => void loadRoles()}>
            <RefreshCw size={16} /> Refresh
          </Button>
        }
      />

      {loadError && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading || roles.length === 0 ? (
        <Card flush className="text-center py-16">
          {loading ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
                <KeyRound size={20} />
              </div>
              <h2 className="mt-4 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Loading roles</h2>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
                <KeyRound size={20} />
              </div>
              <h2 className="mt-4 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">No roles found</h2>
              <p className="mt-1 max-w-[45ch] mx-auto text-[11.5px] leading-4 text-ink-3">
                Roles returned by the workspace will appear here.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <Card flush>
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
                <div>
                  <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Roles</h2>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">Select a role to inspect its access.</p>
                </div>
              </div>
              <div className="overflow-x-auto p-4">
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      label: 'ROLE',
                      render: (row) => (
                        <span className="block min-w-0">
                          <span className="block truncate text-[11.5px] font-medium leading-4 text-primary-text">{row.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] leading-3 text-ink-3">{row.description || 'No description provided.'}</span>
                        </span>
                      ),
                    },
                    { key: 'level', label: 'LEVEL', align: 'right', render: (row) => <span className="block text-right text-[11.5px] leading-4 text-ink-3 tnum">{row.level ?? '—'}</span> },
                    {
                      key: 'type',
                      label: 'TYPE',
                      align: 'right',
                      render: (row) => (
                        <StatusBadge status={row.is_system ? 'system_role' : 'custom_role'} />
                      ),
                    },
                    {
                      key: 'action',
                      label: '',
                      align: 'right',
                      render: (row) => (
                        <button
                          type="button"
                          onClick={() => selectRole(row.id)}
                          aria-pressed={row.id === selectedRoleId}
                          title={`View ${row.name} permissions`}
                          className={cn(
                            'p-1.5 rounded-lg',
                            row.id === selectedRoleId ? 'bg-sub text-primary-text' : 'text-on-surface-variant hover:bg-sub hover:text-primary-text',
                            'transition-colors duration-micro'
                          )}
                        >
                          <ShieldCheck size={14} />
                        </button>
                      ),
                    },
                  ]}
                  rows={roles}
                  emptyMessage="No roles found"
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card flush>
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
                <div>
                  <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                    {selectedRole ? `${selectedRole.name} permissions` : 'Permissions'}
                  </h2>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                    {selectedRole ? `Permissions granted to ${selectedRole.name}.` : 'Select a role to view its permissions.'}
                  </p>
                </div>
              </div>

              {permissionsLoading ? (
                <div className="space-y-3 p-4" aria-live="polite">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-10 shimmer rounded-lg border border-line" />
                  ))}
                </div>
              ) : permissionsError ? (
                <div className="rounded-xl border border-line bg-neg-soft p-4 text-sm text-danger-ink flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{permissionsError}</span>
                  {selectedRoleId && (
                    <Button variant="outline" onClick={() => void loadPermissions(selectedRoleId)} className="ml-auto">
                      <RefreshCw size={16} /> Retry
                    </Button>
                  )}
                </div>
              ) : permissions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
                    <KeyRound size={20} />
                  </div>
                  <p className="mt-4 text-[11.5px] leading-4 text-ink-3">No permissions returned</p>
                </div>
              ) : (
                <div className="divide-y divide-line p-4">
                  {permissions.map((permission, index) => {
                    const context = getPermissionContext(permission);
                    const key = typeof permission === 'string' ? permission : permission.id || permission.name || String(index);
                    return (
                      <div key={key} className="flex items-start gap-3 px-3 py-2.5">
                        <span className="mt-1 shrink-0 size-4 rounded-full bg-brand-soft flex items-center justify-center text-[10px] font-bold text-brand-ink">
                          <Check size={12} strokeWidth={2} stroke="currentColor" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-medium leading-4 text-primary-text">{getPermissionName(permission)}</p>
                          {context && <p className="mt-0.5 text-[10px] leading-3 text-ink-3">{context}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}