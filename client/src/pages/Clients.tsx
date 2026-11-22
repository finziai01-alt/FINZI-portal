import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { clientsCreate, clientsList } from '../services/api';
import { formatMoneyIN } from '../utils/format';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';

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
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
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
      setError(apiErrorMessage(requestError, 'Could not add client'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Clients"
        description="Maintain client entity, engagement and retainer details for your practice."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateForm((current) => !current);
            }}
            aria-expanded={showCreateForm}
            aria-controls="client-create-form"
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? 'Cancel' : 'Add client'}
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadClients()}
            className="ml-auto text-[11px] font-medium underline underline-offset-2"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm text-brand-ink flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 max-w-md">
          <Input
            icon={<Search size={16} className="text-on-surface-variant" />}
            placeholder="Search by client name or GSTIN..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {showCreateForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div>
              <h2 className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Add client</h2>
              <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                Enter the client entity and engagement details.
              </p>
            </div>
            <UserRound size={18} className="shrink-0 text-brand" />
          </div>
          <form onSubmit={handleCreate} noValidate className="p-4 pb-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input
                id="client-legal-name"
                label="Legal name"
                value={createForm.legal_name}
                onChange={(e) => updateCreateField('legal_name', e.target.value)}
                error={legalNameError ? 'Legal name is required.' : undefined}
                required
                autoComplete="organization"
              />
              <Input
                id="client-trade-name"
                label="Trade name"
                value={createForm.trade_name}
                onChange={(e) => updateCreateField('trade_name', e.target.value)}
              />
              <Input
                id="client-business-type"
                label="Business type"
                value={createForm.business_type}
                onChange={(e) => updateCreateField('business_type', e.target.value)}
              />
              <Input
                id="client-pan"
                label="PAN"
                value={createForm.pan}
                onChange={(e) => updateCreateField('pan', e.target.value)}
                hint="Permanent Account Number"
              />
              <Input
                id="client-gstin"
                label="GSTIN"
                value={createForm.gstin}
                onChange={(e) => updateCreateField('gstin', e.target.value)}
                hint="Goods and Services Tax Identification Number"
              />
              <Input
                id="client-tan"
                label="TAN"
                value={createForm.tan}
                onChange={(e) => updateCreateField('tan', e.target.value)}
                hint="Tax Deduction and Collection Account Number"
              />
              <div className="md:col-span-2 xl:col-span-3">
                <Textarea
                  id="client-registered-address"
                  label="Registered address"
                  value={createForm.registered_address}
                  onChange={(e) => updateCreateField('registered_address', e.target.value)}
                  rows={3}
                />
              </div>
              <Input
                id="client-state"
                label="State"
                value={createForm.state}
                onChange={(e) => updateCreateField('state', e.target.value)}
              />
              <Input
                id="client-city"
                label="City"
                value={createForm.city}
                onChange={(e) => updateCreateField('city', e.target.value)}
              />
              <Input
                id="client-pincode"
                label="Pincode"
                value={createForm.pincode}
                onChange={(e) => updateCreateField('pincode', e.target.value)}
                inputMode="numeric"
              />
              <Input
                id="client-contact-email"
                label="Contact email"
                type="email"
                value={createForm.contact_email}
                onChange={(e) => updateCreateField('contact_email', e.target.value)}
                autoComplete="email"
              />
              <Input
                id="client-contact-phone"
                label="Contact phone"
                type="tel"
                value={createForm.contact_phone}
                onChange={(e) => updateCreateField('contact_phone', e.target.value)}
                autoComplete="tel"
              />
              <Input
                id="client-engagement-type"
                label="Engagement type"
                value={createForm.engagement_type}
                onChange={(e) => updateCreateField('engagement_type', e.target.value)}
                hint="e.g. Statutory audit, internal audit, bookkeeping"
              />
              <Input
                id="client-retainer-fee"
                label="Retainer fee (₹)"
                type="number"
                value={createForm.retainer_fee}
                onChange={(e) => updateCreateField('retainer_fee', e.target.value)}
                error={retainerError ? 'Enter a valid non-negative retainer fee.' : undefined}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                }}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={creating} className="ml-auto">
                {creating ? <Loader2 size={16} className="animate-spin-slow opacity-80" /> : <Plus size={16} />}
                {creating ? 'Adding client' : 'Add client'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Loading clients" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 shimmer rounded-lg border border-line" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card flush className="text-center py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
            <UserRound size={20} />
          </div>
          <h2 className="mt-4 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">No clients yet</h2>
          <p className="mt-1 max-w-[45ch] mx-auto text-[11.5px] leading-4 text-ink-3">
            Add a client to start managing its engagement and retainer.
          </p>
          {!showCreateForm && (
            <div className="mt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                <Plus size={16} /> Add client
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div>
              <h2 className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                Client directory
              </h2>
              <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            <DataTable
              columns={[
                {
                  key: 'client',
                  label: 'CLIENT',
                  render: (row) => (
                    <span className="block min-w-0">
                      <span className="block truncate text-[11.5px] font-medium leading-4 text-primary-text">
                        {row.legal_name}
                      </span>
                      {row.trade_name && <span className="mt-0.5 block truncate text-[10px] leading-3 text-ink-3">{row.trade_name}</span>}
                    </span>
                  ),
                },
                { key: 'gstin', label: 'GSTIN', render: (row) => <RowValueCell value={valueOrDash(row.gstin)} mono /> },
                { key: 'pan', label: 'PAN', render: (row) => <RowValueCell value={valueOrDash(row.pan)} mono /> },
                { key: 'engagement', label: 'ENGAGEMENT', render: (row) => <RowValueCell value={valueOrDash(row.engagement_type)} /> },
                { key: 'retainer', label: 'RETAINER', align: 'right', render: (row) => <RowValueCell value={formatRetainer(row.retainer_fee)} /> },
                { key: 'city', label: 'CITY', render: (row) => <RowValueCell value={valueOrDash(row.city)} /> },
              ]}
              rows={filteredClients}
              emptyMessage="No clients found"
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function RowValueCell({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <span className={cn('block text-right', mono ? 'font-code-mono text-code-mono' : '')}>
      {value}
    </span>
  );
}