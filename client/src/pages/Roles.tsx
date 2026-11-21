import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { rolePermissions, rolesList } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

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
    <div className="p-6 space-y-space-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
          Roles and permissions
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Review role definitions and the permissions assigned to each role.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm rounded-md bg-error-container/40 px-space-md py-space-sm text-body-sm text-error"
        >
          <span className="flex items-start gap-space-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {loadError}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRoles()}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg" aria-live="polite">
          <span className="sr-only">Loading roles and permissions</span>
          <div className="h-80 animate-pulse rounded-lg bg-surface-container-low" />
          <div className="h-80 animate-pulse rounded-lg bg-surface-container-low" />
        </div>
      ) : roles.length === 0 ? (
        <section className="card px-4 py-12 text-center">
          <KeyRound size={30} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
          <h2 className="text-body-md font-medium text-on-surface">No roles found</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Roles returned by the workspace will appear here.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">
          <section className="card overflow-hidden">
            <div className="flex items-center gap-space-sm border-b border-outline px-space-md py-space-md">
              <KeyRound size={18} className="text-secondary" />
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Roles</h2>
                <p className="text-body-sm text-on-surface-variant">Select a role to inspect its access.</p>
              </div>
            </div>

            <div className="divide-y divide-outline">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role.id)}
                    className={`w-full px-space-md py-space-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary ${
                      isSelected
                        ? 'bg-secondary-container/30'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-start justify-between gap-space-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">{role.name}</p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {role.description || 'No description provided.'}
                        </p>
                      </div>
                      <Badge variant={role.is_system ? 'info' : 'default'} className="shrink-0">
                        {role.is_system ? 'System role' : 'Custom role'}
                      </Badge>
                    </div>
                    <p className="mt-space-sm text-label-sm text-on-surface-variant">
                      Level {role.level ?? '—'}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center gap-space-sm border-b border-outline px-space-md py-space-md">
              <ShieldCheck size={18} className="text-secondary" />
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {selectedRole ? `${selectedRole.name} permissions` : 'Permissions'}
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  {selectedRole
                    ? `Permissions granted to ${selectedRole.name}.`
                    : 'Select a role to view its permissions.'}
                </p>
              </div>
            </div>

            {permissionsLoading ? (
              <div className="space-y-space-sm p-space-md" aria-live="polite">
                <span className="sr-only">Loading permissions</span>
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-10 animate-pulse rounded-md bg-surface-container-low" />
                ))}
              </div>
            ) : permissionsError ? (
              <div className="p-space-md">
                <div
                  role="alert"
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm rounded-md bg-error-container/40 px-space-md py-space-sm text-body-sm text-error"
                >
                  <span className="flex items-start gap-space-sm">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    {permissionsError}
                  </span>
                  {selectedRoleId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadPermissions(selectedRoleId)}
                    >
                      <RefreshCw size={14} />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ) : permissions.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <KeyRound size={28} className="mx-auto mb-space-sm text-on-surface-variant opacity-50" />
                <p className="text-body-md font-medium text-on-surface">No permissions returned</p>
              </div>
            ) : (
              <ul className="divide-y divide-outline">
                {permissions.map((permission, index) => {
                  const context = getPermissionContext(permission);
                  const key = typeof permission === 'string' ? permission : permission.id || permission.name || index;

                  return (
                    <li key={key} className="flex items-start gap-space-sm px-space-md py-space-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-container/40 text-secondary">
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-on-surface">
                          {getPermissionName(permission)}
                        </p>
                        {context && (
                          <p className="mt-0.5 text-label-sm text-on-surface-variant">{context}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
