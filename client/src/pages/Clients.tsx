import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { clientsCreate, clientsList } from '../services/api';
import { formatMoneyIN } from '../utils/format';

interface ClientRecord {
  id: string;
  firm_id?: string | null;
  legal_name: string;
  trade_name?: string | null;
  business_type?: string | null;
  pan?: string | null;
  gstin?: string | null;
  tan?: string | null;
  registered_address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  engagement_type?: string | null;
  retainer_fee?: number | string | null;
  created_at?: string | null;
}

interface ClientForm {
  legal_name: string;
  trade_name: string;
  business_type: string;
  pan: string;
  gstin: string;
  tan: string;
  registered_address: string;
  state: string;
  city: string;
  pincode: string;
  contact_email: string;
  contact_phone: string;
  engagement_type: string;
  retainer_fee: string;
}

interface ClientCreatePayload {
  legal_name: string;
  trade_name?: string;
  business_type?: string;
  pan?: string;
  gstin?: string;
  tan?: string;
  registered_address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  contact_email?: string;
  contact_phone?: string;
  engagement_type?: string;
  retainer_fee?: number;
}

const EMPTY_CLIENT_FORM: ClientForm = {
  legal_name: '',
  trade_name: '',
  business_type: '',
  pan: '',
  gstin: '',
  tan: '',
  registered_address: '',
  state: '',
  city: '',
  pincode: '',
  contact_email: '',
  contact_phone: '',
  engagement_type: '',
  retainer_fee: '',
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response;
    if (typeof response?.data?.error === 'string' && response.data.error.trim()) {
      return response.data.error;
    }
  }
  return fallback;
}

function valueOrDash(value?: string | number | null): string {
  if (value === null || value === undefined) return '—';
  const text = String(value).trim();
  return text || '—';
}

function formatRetainer(value?: number | string | null): string {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? formatMoneyIN(amount) : '—';
}

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

function TextField({ id, label, value, onChange, error, required, className = '', ...props }: TextFieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-label-md text-label-md font-semibold text-on-surface">
        {label}
        {required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`input-field text-body-md text-body-md ${
          error ? 'border-error focus:ring-error' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaFieldProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextAreaField({ id, label, value, onChange, className = '', ...props }: TextAreaFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-label-md text-label-md font-semibold text-on-surface">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`input-field min-h-24 resize-y text-body-md text-body-md ${className}`}
        {...props}
      />
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<ClientForm>(EMPTY_CLIENT_FORM);
  const [legalNameError, setLegalNameError] = useState('');
  const [retainerError, setRetainerError] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const loadClients = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await clientsList();
      setClients(Array.isArray(response.data.clients) ? response.data.clients : []);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load clients'));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) =>
      [client.legal_name, client.gstin, client.city].some((field) =>
        String(field || '').toLowerCase().includes(query),
      ),
    );
  }, [clients, search]);

  const updateCreateField = (field: keyof ClientForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    if (field === 'legal_name') setLegalNameError('');
    if (field === 'retainer_fee') setRetainerError('');
    setCreateError('');
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const legalName = createForm.legal_name.trim();
    if (!legalName) {
      setLegalNameError('Legal name is required.');
      return;
    }

    const retainerValue = createForm.retainer_fee.trim();
    let retainerFee: number | undefined;
    if (retainerValue) {
      const parsedRetainer = Number(retainerValue);
      if (!Number.isFinite(parsedRetainer) || parsedRetainer < 0) {
        setRetainerError('Enter a valid non-negative retainer fee.');
        return;
      }
      retainerFee = parsedRetainer;
    }

    setCreating(true);
    setCreateError('');
    setSuccess('');

    const payload: ClientCreatePayload = {
      legal_name: legalName,
      trade_name: createForm.trade_name.trim(),
      business_type: createForm.business_type.trim(),
      pan: createForm.pan.trim(),
      gstin: createForm.gstin.trim(),
      tan: createForm.tan.trim(),
      registered_address: createForm.registered_address.trim(),
      state: createForm.state.trim(),
      city: createForm.city.trim(),
      pincode: createForm.pincode.trim(),
      contact_email: createForm.contact_email.trim(),
      contact_phone: createForm.contact_phone.trim(),
      engagement_type: createForm.engagement_type.trim(),
      ...(retainerFee === undefined ? {} : { retainer_fee: retainerFee }),
    };

    try {
      await clientsCreate(payload);
      setCreateForm(EMPTY_CLIENT_FORM);
      setShowCreateForm(false);
      await loadClients(false);
      setSuccess('Client added successfully.');
    } catch (requestError) {
      setCreateError(apiErrorMessage(requestError, 'Could not add client'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Clients</h1>
          <p className="mt-space-2xs text-body-md text-body-md text-on-surface-variant">
            Maintain client entity, engagement and retainer details for your practice.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setCreateError('');
          }}
          className="inline-flex h-10 items-center justify-center gap-space-xs rounded-md bg-secondary px-space-md text-label-md text-label-md font-semibold text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60"
          aria-expanded={showCreateForm}
          aria-controls="client-create-form"
        >
          {showCreateForm ? <X size={15} /> : <Plus size={15} />}
          {showCreateForm ? 'Cancel' : 'Add client'}
        </button>
      </div>

      {error && (
        <div className="flex flex-col gap-space-sm rounded-lg border border-error bg-error-container/40 px-space-md py-space-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-space-sm text-body-md text-body-md text-error">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadClients()}
            className="inline-flex items-center gap-space-xs self-start text-label-md text-label-md font-semibold text-error underline underline-offset-2 sm:self-auto"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-space-sm rounded-lg border border-secondary bg-secondary-container/30 px-space-md py-space-sm text-body-md text-body-md text-secondary">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {showCreateForm && (
        <section
          id="client-create-form"
          aria-labelledby="client-create-heading"
          className="rounded-lg border border-outline bg-surface-container-lowest shadow-sm"
        >
          <div className="flex items-center justify-between gap-space-md border-b border-outline px-space-md py-space-sm">
            <div>
              <h2 id="client-create-heading" className="text-headline-sm text-headline-sm font-bold text-on-surface">
                Add client
              </h2>
              <p className="text-xs text-on-surface-variant">Enter the client entity and engagement details.</p>
            </div>
            <UserRound size={18} className="shrink-0 text-secondary" />
          </div>
          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-1 gap-space-md p-space-md md:grid-cols-2 xl:grid-cols-3">
              <TextField
                id="client-legal-name"
                label="Legal name"
                value={createForm.legal_name}
                onChange={(value) => updateCreateField('legal_name', value)}
                error={legalNameError}
                required
                autoComplete="organization"
              />
              <TextField
                id="client-trade-name"
                label="Trade name"
                value={createForm.trade_name}
                onChange={(value) => updateCreateField('trade_name', value)}
              />
              <TextField
                id="client-business-type"
                label="Business type"
                value={createForm.business_type}
                onChange={(value) => updateCreateField('business_type', value)}
              />
              <TextField
                id="client-pan"
                label="PAN"
                value={createForm.pan}
                onChange={(value) => updateCreateField('pan', value)}
                className="font-code-mono text-code-mono"
              />
              <TextField
                id="client-gstin"
                label="GSTIN"
                value={createForm.gstin}
                onChange={(value) => updateCreateField('gstin', value)}
                className="font-code-mono text-code-mono"
              />
              <TextField
                id="client-tan"
                label="TAN"
                value={createForm.tan}
                onChange={(value) => updateCreateField('tan', value)}
                className="font-code-mono text-code-mono"
              />
              <div className="md:col-span-2 xl:col-span-3">
                <TextAreaField
                  id="client-registered-address"
                  label="Registered address"
                  value={createForm.registered_address}
                  onChange={(value) => updateCreateField('registered_address', value)}
                />
              </div>
              <TextField
                id="client-state"
                label="State"
                value={createForm.state}
                onChange={(value) => updateCreateField('state', value)}
              />
              <TextField
                id="client-city"
                label="City"
                value={createForm.city}
                onChange={(value) => updateCreateField('city', value)}
              />
              <TextField
                id="client-pincode"
                label="Pincode"
                value={createForm.pincode}
                onChange={(value) => updateCreateField('pincode', value)}
                inputMode="numeric"
              />
              <TextField
                id="client-contact-email"
                label="Contact email"
                type="email"
                value={createForm.contact_email}
                onChange={(value) => updateCreateField('contact_email', value)}
                autoComplete="email"
              />
              <TextField
                id="client-contact-phone"
                label="Contact phone"
                type="tel"
                value={createForm.contact_phone}
                onChange={(value) => updateCreateField('contact_phone', value)}
                autoComplete="tel"
              />
              <TextField
                id="client-engagement-type"
                label="Engagement type"
                value={createForm.engagement_type}
                onChange={(value) => updateCreateField('engagement_type', value)}
                placeholder="For example, statutory audit"
              />
              <TextField
                id="client-retainer-fee"
                label="Retainer fee (₹)"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={createForm.retainer_fee}
                onChange={(value) => updateCreateField('retainer_fee', value)}
                error={retainerError}
                className="tnum"
              />
            </div>
            {createError && (
              <div className="mx-space-md mb-space-md flex items-start gap-space-sm rounded-md bg-error-container/40 px-space-sm py-space-sm text-body-sm text-body-sm text-error">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-space-sm border-t border-outline bg-surface-container-low/50 px-space-md py-space-sm sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError('');
                }}
                className="inline-flex h-10 items-center justify-center rounded-md border border-outline bg-surface-container-lowest px-space-md text-label-md text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-10 items-center justify-center gap-space-xs rounded-md bg-secondary px-space-md text-label-md text-label-md font-semibold text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {creating ? 'Adding client' : 'Add client'}
              </button>
            </div>
          </form>
        </section>
      )}

      {!loading && clients.length > 0 && (
        <section className="rounded-lg border border-outline bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col gap-space-sm border-b border-outline p-space-md sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <label htmlFor="client-search" className="sr-only">Search clients</label>
              <Search size={16} className="pointer-events-none absolute left-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="client-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by legal name, GSTIN or city"
                className="input-field pl-9 text-body-md text-body-md"
              />
            </div>
            <p className="text-xs text-on-surface-variant" aria-live="polite">
              {search.trim()
                ? `${filteredClients.length} ${filteredClients.length === 1 ? 'client' : 'clients'} found`
                : `${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
            </p>
          </div>

          {filteredClients.length === 0 ? (
            <div className="px-space-lg py-space-xl text-center">
              <Search size={20} className="mx-auto text-on-surface-variant" />
              <h2 className="mt-space-sm text-headline-sm text-headline-sm font-bold text-on-surface">No clients match this search</h2>
              <p className="mt-space-2xs text-body-md text-body-md text-on-surface-variant">Clear the search to view all clients.</p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-space-md inline-flex items-center gap-space-xs text-label-md text-label-md font-semibold text-secondary underline underline-offset-2"
              >
                <X size={14} /> Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th scope="col" className="table-header">Client</th>
                    <th scope="col" className="table-header">Engagement</th>
                    <th scope="col" className="table-header">GSTIN</th>
                    <th scope="col" className="table-header">City</th>
                    <th scope="col" className="table-header text-right">Retainer fee</th>
                    <th scope="col" className="table-header">Contact email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="transition-colors hover:bg-surface-container-low/60">
                      <td className="table-cell">
                        <div className="flex items-center gap-space-sm">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-container text-label-sm text-label-sm font-bold text-on-secondary">
                            {(client.legal_name || '?').trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-label-md text-label-md font-semibold text-on-surface">{client.legal_name}</p>
                            {client.trade_name && (
                              <p className="truncate text-xs text-on-surface-variant">{client.trade_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-space-xs text-body-md text-body-md text-on-surface">
                          <Briefcase size={13} className="shrink-0 text-on-surface-variant" />
                          {valueOrDash(client.engagement_type)}
                        </span>
                      </td>
                      <td className="table-cell font-code-mono text-code-mono">{valueOrDash(client.gstin)}</td>
                      <td className="table-cell text-body-md text-body-md text-on-surface-variant">{valueOrDash(client.city)}</td>
                      <td className="table-cell text-right">
                        <span className="font-numeric-table text-numeric-table text-on-surface tnum">
                          {formatRetainer(client.retainer_fee)}
                        </span>
                      </td>
                      <td className="table-cell text-body-md text-body-md text-on-surface">
                        {client.contact_email ? (
                          <a
                            href={`mailto:${client.contact_email}`}
                            className="inline-flex max-w-[260px] items-center gap-space-xs truncate text-secondary hover:underline"
                          >
                            <Mail size={13} className="shrink-0" />
                            <span className="truncate">{client.contact_email}</span>
                          </a>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="space-y-space-sm" aria-label="Loading clients" aria-busy="true">
          <div className="h-11 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
          <div className="h-11 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
          <div className="h-11 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
        </div>
      ) : clients.length === 0 ? (
        <section className="rounded-lg border border-outline bg-surface-container-lowest px-space-lg py-space-xl text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-secondary">
            <UserRound size={20} />
          </div>
          <h2 className="mt-space-md text-headline-sm text-headline-sm font-bold text-on-surface">No clients yet</h2>
          <p className="mx-auto mt-space-2xs max-w-md text-body-md text-body-md text-on-surface-variant">
            Add a client to record entity, engagement and retainer details.
          </p>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-space-md inline-flex h-10 items-center justify-center gap-space-xs rounded-md bg-secondary px-space-md text-label-md text-label-md font-semibold text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <Plus size={15} /> Add client
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
