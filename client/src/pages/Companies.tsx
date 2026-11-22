import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import {
  companiesCreate,
  companiesGet,
  companiesList,
  companiesUpdate,
} from '../services/api';
import { formatDateIN } from '../utils/format';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { DataTable, RowLabel } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { cn } from '../utils/cn';

interface CompanyMembership {
  id: string;
  company_id: string;
  legal_name: string;
  trade_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  state?: string | null;
  city?: string | null;
  is_active?: number | boolean | null;
  created_at?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  status?: string | null;
}

interface CompanyDetails {
  id: string;
  organization_id?: string | null;
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
  financial_year_start?: string | null;
  financial_year_end?: string | null;
  is_active?: number | boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface CompanyForm {
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
  financial_year_start: string;
  financial_year_end: string;
}

interface CompanyEditForm {
  trade_name: string;
  pan: string;
  gstin: string;
  contact_email: string;
  contact_phone: string;
}

type CompanyCreatePayload = Partial<CompanyForm>;
type CompanyUpdatePayload = CompanyEditForm;

const EMPTY_COMPANY_FORM: CompanyForm = {
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
  financial_year_start: '',
  financial_year_end: '',
};

const EMPTY_EDIT_FORM: CompanyEditForm = {
  trade_name: '',
  pan: '',
  gstin: '',
  contact_email: '',
  contact_phone: '',
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

function companyStatus(company: CompanyMembership): string {
  if (company.status) return company.status;
  if (company.is_active === 0 || company.is_active === false) return 'inactive';
  if (company.is_active === 1 || company.is_active === true) return 'active';
  return 'unknown';
}

function companyActiveStatus(value?: number | boolean | null): string {
  if (value === 0 || value === false) return 'Inactive';
  if (value === 1 || value === true) return 'Active';
  return 'Unknown';
}

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CompanyForm>(EMPTY_COMPANY_FORM);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editForm, setEditForm] = useState<CompanyEditForm>(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadCompanies = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await companiesList();
      setCompanies(Array.isArray(response.data.companies) ? response.data.companies : []);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load companies'));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedCompanyId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedCompanyId]);

  const openDetails = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setDetail(null);
    setDetailError('');
    setSaveError('');
    setDetailLoading(true);
    try {
      const response = await companiesGet(companyId);
      const company = response.data.company as CompanyDetails;
      setDetail(company);
      setEditForm({
        trade_name: company.trade_name || '',
        pan: company.pan || '',
        gstin: company.gstin || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
      });
    } catch (requestError) {
      setDetailError(apiErrorMessage(requestError, 'Could not load company details'));
    } finally {
      setDetailLoading(false);
    }
  };

  const updateCreateField = (field: keyof CompanyForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    if (field === 'legal_name') setCreateError('');
  };

  const updateEditField = (field: keyof CompanyEditForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    setSaveError('');
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const legalName = createForm.legal_name.trim();
    if (!legalName) {
      setCreateError('Legal name is required.');
      return;
    }

    setCreating(true);
    setCreateError('');
    setError('');
    setSuccess('');

    const payload: CompanyCreatePayload = {
      ...createForm,
      legal_name: legalName,
    };

    try {
      await companiesCreate(payload);
      setCreateForm(EMPTY_COMPANY_FORM);
      setShowCreateForm(false);
      await loadCompanies(false);
      setSuccess('Company added successfully.');
    } catch (requestError) {
      setCreateError(apiErrorMessage(requestError, 'Could not add company'));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCompanyId) return;

    setSaving(true);
    setSaveError('');
    setSuccess('');
    const payload: CompanyUpdatePayload = editForm;

    try {
      await companiesUpdate(selectedCompanyId, payload);
      const [detailResponse, listResponse] = await Promise.all([
        companiesGet(selectedCompanyId),
        companiesList(),
      ]);
      const company = detailResponse.data.company as CompanyDetails;
      setDetail(company);
      setEditForm({
        trade_name: company.trade_name || '',
        pan: company.pan || '',
        gstin: company.gstin || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
      });
      setCompanies(Array.isArray(listResponse.data.companies) ? listResponse.data.companies : []);
      setSuccess('Company details updated.');
    } catch (requestError) {
      setSaveError(apiErrorMessage(requestError, 'Could not update company details'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Companies"
        description="Manage the companies you are a member of and update their registration details."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setCreateError('');
            }}
            aria-expanded={showCreateForm}
            aria-controls="company-create-form"
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? 'Cancel' : 'Add company'}
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadCompanies()}
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

      {showCreateForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div>
              <h2 className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Add company</h2>
              <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                Enter the legal and registration details for the new company.
              </p>
            </div>
            <Building2 size={18} className="shrink-0 text-brand" />
          </div>
          <form onSubmit={handleCreate} noValidate className="p-4 pb-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input
                id="company-legal-name"
                label="Legal name"
                value={createForm.legal_name}
                onChange={(e) => updateCreateField('legal_name', e.target.value)}
                error={createError}
                required
                autoComplete="organization"
              />
              <Input
                id="company-trade-name"
                label="Trade name"
                value={createForm.trade_name}
                onChange={(e) => updateCreateField('trade_name', e.target.value)}
              />
              <Input
                id="company-business-type"
                label="Business type"
                value={createForm.business_type}
                onChange={(e) => updateCreateField('business_type', e.target.value)}
              />
              <Input
                id="company-pan"
                label="PAN"
                value={createForm.pan}
                onChange={(e) => updateCreateField('pan', e.target.value)}
                hint="Permanent Account Number"
              />
              <Input
                id="company-gstin"
                label="GSTIN"
                value={createForm.gstin}
                onChange={(e) => updateCreateField('gstin', e.target.value)}
                hint="Goods and Services Tax Identification Number"
              />
              <Input
                id="company-tan"
                label="TAN"
                value={createForm.tan}
                onChange={(e) => updateCreateField('tan', e.target.value)}
                hint="Tax Deduction and Collection Account Number"
              />
              <div className="md:col-span-2 xl:col-span-3">
                <Textarea
                  id="company-registered-address"
                  label="Registered address"
                  value={createForm.registered_address}
                  onChange={(e) => updateCreateField('registered_address', e.target.value)}
                  rows={3}
                />
              </div>
              <Input
                id="company-state"
                label="State"
                value={createForm.state}
                onChange={(e) => updateCreateField('state', e.target.value)}
              />
              <Input
                id="company-city"
                label="City"
                value={createForm.city}
                onChange={(e) => updateCreateField('city', e.target.value)}
              />
              <Input
                id="company-pincode"
                label="Pincode"
                value={createForm.pincode}
                onChange={(e) => updateCreateField('pincode', e.target.value)}
                inputMode="numeric"
              />
              <Input
                id="company-contact-email"
                label="Contact email"
                type="email"
                value={createForm.contact_email}
                onChange={(e) => updateCreateField('contact_email', e.target.value)}
                autoComplete="email"
              />
              <Input
                id="company-contact-phone"
                label="Contact phone"
                type="tel"
                value={createForm.contact_phone}
                onChange={(e) => updateCreateField('contact_phone', e.target.value)}
                autoComplete="tel"
              />
              <Input
                id="company-financial-year-start"
                label="Financial year start"
                type="date"
                value={createForm.financial_year_start}
                onChange={(e) => updateCreateField('financial_year_start', e.target.value)}
              />
              <Input
                id="company-financial-year-end"
                label="Financial year end"
                type="date"
                value={createForm.financial_year_end}
                onChange={(e) => updateCreateField('financial_year_end', e.target.value)}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError('');
                }}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={creating}
                className="ml-auto"
              >
                {creating ? <Loader2 size={16} className="animate-spin-slow opacity-80" /> : <Plus size={16} />}
                {creating ? 'Adding company' : 'Add company'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Loading companies" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 shimmer rounded-lg border border-line" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card flush className="text-center py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
            <Building2 size={20} />
          </div>
          <h2 className="mt-4 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">No companies yet</h2>
          <p className="mt-1 max-w-[45ch] mx-auto text-[11.5px] leading-4 text-ink-3">
            Add a company to start managing its financial workspace.
          </p>
          {!showCreateForm && (
            <div className="mt-4">
              <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                <Plus size={16} /> Add company
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div>
              <h2 className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                Company directory
              </h2>
              <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                {companies.length} {companies.length === 1 ? 'company' : 'companies'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            <DataTable
              columns={[
                {
                  key: 'company',
                  label: 'COMPANY',
                  render: (row) => (
                    <RowLabel
                      title={row.legal_name}
                      meta={row.trade_name || `${row.city || ''}${row.state ? ', ' + row.state : ''}` || '—'}
                    />
                  ),
                },
                { key: 'gstin', label: 'GSTIN', render: (row) => <RowValueCell value={valueOrDash(row.gstin)} mono /> },
                { key: 'pan', label: 'PAN', render: (row) => <RowValueCell value={valueOrDash(row.pan)} mono /> },
                { key: 'role', label: 'ROLE', render: (row) => <RowValueCell value={valueOrDash(row.role_name)} /> },
                { key: 'created', label: 'CREATED', align: 'right', render: (row) => <RowValueCell value={valueOrDash(formatDateIN(row.created_at ?? ''))} /> },
                {
                  key: 'status',
                  label: 'STATUS',
                  align: 'right',
                  render: (row) => <StatusBadge status={companyStatus(row)} />,
                },
                {
                  key: 'action',
                  label: '',
                  align: 'right',
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => void openDetails(row.company_id)}
                      title={`Open details for ${row.legal_name}`}
                      aria-label={`Open details for ${row.legal_name}`}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:bg-sub hover:text-primary-text transition-colors duration-micro"
                    >
                      <ChevronRight size={14} />
                    </button>
                  ),
                },
              ]}
              rows={companies}
              emptyMessage="No companies found"
            />
          </div>
        </Card>
      )}

      {selectedCompanyId && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            onClick={() => setSelectedCompanyId(null)}
            aria-label="Close company details"
            tabIndex={-1}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-detail-heading"
            className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-surface shadow-pop"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <p className="text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4">Company details</p>
                <h2 id="company-detail-heading" className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                  {detail?.legal_name || 'Open company'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                className="grid size-8 place-items-center rounded-lg text-ink-3 transition-colors duration-micro hover:bg-sub hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                aria-label="Close company details"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-3 p-4" aria-label="Loading company details" aria-busy="true">
                <div className="h-24 shimmer rounded-lg border border-line" />
                <div className="h-64 shimmer rounded-lg border border-line" />
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-line bg-neg-soft p-4 text-sm text-danger-ink flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{detailError}</span>
                <button
                  type="button"
                  onClick={() => void openDetails(selectedCompanyId)}
                  className="ml-auto text-[11px] font-medium underline underline-offset-2"
                >
                  <RefreshCw size={13} /> Try again
                </button>
              </div>
            ) : detail ? (
              <div className="space-y-4 p-4">
                <section className="rounded-xl border border-line overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-[14px] font-bold leading-none text-on-secondary">
                      {detail.legal_name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                        {detail.legal_name}
                      </h3>
                      <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                        {valueOrDash(detail.business_type)}
                      </p>
                    </div>
                  </div>
                  <dl className="divide-y divide-line grid grid-cols-1 gap-3 border-t border-line pt-3 sm:grid-cols-2 px-4 pb-3.5">
                    <DetailView label="Company ID" value={detail.id} mono />
                    <DetailView label="Status" value={companyActiveStatus(detail.is_active)} />
                    <DetailView label="Trade name" value={detail.trade_name} />
                    <DetailView label="PAN" value={detail.pan} mono />
                    <DetailView label="GSTIN" value={detail.gstin} mono />
                    <DetailView label="TAN" value={detail.tan} mono />
                    <DetailView label="State" value={detail.state} />
                    <DetailView label="City" value={detail.city} />
                    <DetailView label="Pincode" value={detail.pincode} />
                    <DetailView
                      label="Financial year"
                      value={
                        detail.financial_year_start && detail.financial_year_end
                          ? `${formatDateIN(detail.financial_year_start)} to ${formatDateIN(detail.financial_year_end)}`
                          : formatDateIN(detail.financial_year_start || detail.financial_year_end || '')
                      }
                    />
                    <div className="sm:col-span-2">
                      <DetailView label="Registered address" value={detail.registered_address} />
                    </div>
                    <DetailView label="Created" value={detail.created_at ? formatDateIN(detail.created_at) : null} />
                    <DetailView label="Updated" value={detail.updated_at ? formatDateIN(detail.updated_at) : null} />
                  </dl>
                </section>

                <section className="rounded-xl border border-line overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-line">
                    <h3 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Editable details</h3>
                    <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                      Update the company trade name, tax identifiers and contact details.
                    </p>
                  </div>
                  <form onSubmit={handleUpdate} noValidate className="px-4 pb-4 space-y-3">
                    <Input
                      id="detail-trade-name"
                      label="Trade name"
                      value={editForm.trade_name}
                      onChange={(e) => updateEditField('trade_name', e.target.value)}
                    />
                    <Input
                      id="detail-pan"
                      label="PAN"
                      value={editForm.pan}
                      onChange={(e) => updateEditField('pan', e.target.value)}
                      hint="Permanent Account Number"
                    />
                    <Input
                      id="detail-gstin"
                      label="GSTIN"
                      value={editForm.gstin}
                      onChange={(e) => updateEditField('gstin', e.target.value)}
                      hint="Goods and Services Tax Identification Number"
                    />
                    <Input
                      id="detail-contact-email"
                      label="Contact email"
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => updateEditField('contact_email', e.target.value)}
                      autoComplete="email"
                    />
                    <Input
                      id="detail-contact-phone"
                      label="Contact phone"
                      type="tel"
                      value={editForm.contact_phone}
                      onChange={(e) => updateEditField('contact_phone', e.target.value)}
                      autoComplete="tel"
                    />
                    {saveError && (
                      <div className="rounded-lg border border-line bg-neg-soft px-3 py-2 text-sm text-danger-ink flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{saveError}</span>
                      </div>
                    )}
                    <div className="flex justify-end border-t border-line pt-3">
                      <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin-slow opacity-80" /> : <Save size={16} />}
                        {saving ? 'Saving changes' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}
          </aside>
        </div>
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

function DetailView({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9.5px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4">
        {label}
      </dt>
      <dd className={`mt-0.5 break-words text-[11.5px] leading-4 text-primary-text ${mono ? 'font-code-mono text-code-mono' : ''}`}>
        {valueOrDash(value)}
      </dd>
    </div>
  );
}