import React, { useEffect, useState, type FormEvent } from 'react';
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

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'active' || normalized === 'approved' || normalized === 'enabled') {
    return 'bg-secondary-container/40 text-secondary font-semibold';
  }
  if (normalized === 'inactive' || normalized === 'pending' || normalized === 'invited') {
    return 'bg-warning/10 text-warning font-semibold';
  }
  if (normalized === 'rejected' || normalized === 'suspended') {
    return 'bg-error-container/50 text-error font-semibold';
  }
  return 'bg-surface-container text-on-surface-variant';
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

function DetailItem({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className={`mt-1 break-words text-body-md text-body-md text-on-surface ${mono ? 'font-code-mono text-code-mono' : ''}`}>
        {valueOrDash(value)}
      </dd>
    </div>
  );
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
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Companies</h1>
          <p className="mt-space-2xs text-body-md text-body-md text-on-surface-variant">
            Manage the companies you are a member of and update their registration details.
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
          aria-controls="company-create-form"
        >
          {showCreateForm ? <X size={15} /> : <Plus size={15} />}
          {showCreateForm ? 'Cancel' : 'Add company'}
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
            onClick={() => void loadCompanies()}
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
          id="company-create-form"
          aria-labelledby="company-create-heading"
          className="rounded-lg border border-outline bg-surface-container-lowest shadow-sm"
        >
          <div className="flex items-center justify-between gap-space-md border-b border-outline px-space-md py-space-sm">
            <div>
              <h2 id="company-create-heading" className="text-headline-sm text-headline-sm font-bold text-on-surface">
                Add company
              </h2>
              <p className="text-xs text-on-surface-variant">Enter the legal and registration details for the new company.</p>
            </div>
            <Building2 size={18} className="shrink-0 text-secondary" />
          </div>
          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-1 gap-space-md p-space-md md:grid-cols-2 xl:grid-cols-3">
              <TextField
                id="company-legal-name"
                label="Legal name"
                value={createForm.legal_name}
                onChange={(value) => updateCreateField('legal_name', value)}
                error={createError}
                required
                autoComplete="organization"
              />
              <TextField
                id="company-trade-name"
                label="Trade name"
                value={createForm.trade_name}
                onChange={(value) => updateCreateField('trade_name', value)}
              />
              <TextField
                id="company-business-type"
                label="Business type"
                value={createForm.business_type}
                onChange={(value) => updateCreateField('business_type', value)}
              />
              <TextField
                id="company-pan"
                label="PAN"
                value={createForm.pan}
                onChange={(value) => updateCreateField('pan', value)}
                className="font-code-mono text-code-mono"
              />
              <TextField
                id="company-gstin"
                label="GSTIN"
                value={createForm.gstin}
                onChange={(value) => updateCreateField('gstin', value)}
                className="font-code-mono text-code-mono"
              />
              <TextField
                id="company-tan"
                label="TAN"
                value={createForm.tan}
                onChange={(value) => updateCreateField('tan', value)}
                className="font-code-mono text-code-mono"
              />
              <div className="md:col-span-2 xl:col-span-3">
                <TextAreaField
                  id="company-registered-address"
                  label="Registered address"
                  value={createForm.registered_address}
                  onChange={(value) => updateCreateField('registered_address', value)}
                />
              </div>
              <TextField
                id="company-state"
                label="State"
                value={createForm.state}
                onChange={(value) => updateCreateField('state', value)}
              />
              <TextField
                id="company-city"
                label="City"
                value={createForm.city}
                onChange={(value) => updateCreateField('city', value)}
              />
              <TextField
                id="company-pincode"
                label="Pincode"
                value={createForm.pincode}
                onChange={(value) => updateCreateField('pincode', value)}
                inputMode="numeric"
              />
              <TextField
                id="company-contact-email"
                label="Contact email"
                type="email"
                value={createForm.contact_email}
                onChange={(value) => updateCreateField('contact_email', value)}
                autoComplete="email"
              />
              <TextField
                id="company-contact-phone"
                label="Contact phone"
                type="tel"
                value={createForm.contact_phone}
                onChange={(value) => updateCreateField('contact_phone', value)}
                autoComplete="tel"
              />
              <TextField
                id="company-financial-year-start"
                label="Financial year start"
                type="date"
                value={createForm.financial_year_start}
                onChange={(value) => updateCreateField('financial_year_start', value)}
              />
              <TextField
                id="company-financial-year-end"
                label="Financial year end"
                type="date"
                value={createForm.financial_year_end}
                onChange={(value) => updateCreateField('financial_year_end', value)}
              />
            </div>
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
                {creating ? 'Adding company' : 'Add company'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="space-y-space-sm" aria-label="Loading companies" aria-busy="true">
          <div className="h-11 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
          <div className="h-11 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
          <div className="h-11 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
        </div>
      ) : companies.length === 0 ? (
        <section className="rounded-lg border border-outline bg-surface-container-lowest px-space-lg py-space-xl text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-secondary">
            <Building2 size={20} />
          </div>
          <h2 className="mt-space-md text-headline-sm text-headline-sm font-bold text-on-surface">No companies yet</h2>
          <p className="mx-auto mt-space-2xs max-w-md text-body-md text-body-md text-on-surface-variant">
            Add a company to start managing its financial workspace.
          </p>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-space-md inline-flex h-10 items-center justify-center gap-space-xs rounded-md bg-secondary px-space-md text-label-md text-label-md font-semibold text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <Plus size={15} /> Add company
            </button>
          )}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-outline bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between gap-space-md border-b border-outline px-space-md py-space-sm">
            <div>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface">Company directory</h2>
              <p className="text-xs text-on-surface-variant">{companies.length} {companies.length === 1 ? 'company' : 'companies'}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th scope="col" className="table-header">Company</th>
                  <th scope="col" className="table-header">GSTIN</th>
                  <th scope="col" className="table-header">PAN</th>
                  <th scope="col" className="table-header">City / State</th>
                  <th scope="col" className="table-header">Role</th>
                  <th scope="col" className="table-header">Created</th>
                  <th scope="col" className="table-header">Status</th>
                  <th scope="col" className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const status = companyStatus(company);
                  return (
                    <tr key={company.id} className="transition-colors hover:bg-surface-container-low/60">
                      <td className="table-cell">
                        <div className="flex items-center gap-space-sm">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-container text-label-sm text-label-sm font-bold text-on-secondary">
                            {(company.legal_name || '?').trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-label-md text-label-md font-semibold text-on-surface">{company.legal_name}</p>
                            {company.trade_name && (
                              <p className="truncate text-xs text-on-surface-variant">{company.trade_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-code-mono text-code-mono">{valueOrDash(company.gstin)}</td>
                      <td className="table-cell font-code-mono text-code-mono">{valueOrDash(company.pan)}</td>
                      <td className="table-cell text-body-md text-body-md text-on-surface-variant">
                        {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="table-cell text-body-md text-body-md text-on-surface-variant">{valueOrDash(company.role_name)}</td>
                      <td className="table-cell text-body-md text-body-md text-on-surface-variant tnum">
                        {company.created_at ? formatDateIN(company.created_at) : '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${statusClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          type="button"
                          onClick={() => void openDetails(company.company_id)}
                          className="inline-flex items-center gap-space-xs rounded-md px-space-sm py-space-xs text-label-sm text-label-sm font-semibold text-secondary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                        >
                          Open details <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedCompanyId && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-primary/40"
            onClick={() => setSelectedCompanyId(null)}
            aria-label="Close company details"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-detail-heading"
            className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-outline bg-background shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-space-md border-b border-outline bg-surface-container-lowest px-space-md py-space-sm">
              <div>
                <p className="text-label-sm text-label-sm font-semibold uppercase tracking-wide text-secondary">Company details</p>
                <h2 id="company-detail-heading" className="text-headline-sm text-headline-sm font-bold text-on-surface">
                  {detail?.legal_name || 'Open company'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                aria-label="Close company details"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-space-sm p-space-md" aria-label="Loading company details" aria-busy="true">
                <div className="h-20 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
                <div className="h-64 animate-pulse rounded-lg border border-outline bg-surface-container-lowest" />
              </div>
            ) : detailError ? (
              <div className="m-space-md rounded-lg border border-error bg-error-container/40 p-space-md">
                <div className="flex items-start gap-space-sm text-body-md text-body-md text-error">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{detailError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void openDetails(selectedCompanyId)}
                  className="mt-space-md inline-flex items-center gap-space-xs text-label-md text-label-md font-semibold text-error underline underline-offset-2"
                >
                  <RefreshCw size={13} /> Try again
                </button>
              </div>
            ) : detail ? (
              <div className="space-y-space-md p-space-md">
                <section className="rounded-lg border border-outline bg-surface-container-lowest p-space-md shadow-sm">
                  <div className="flex items-start gap-space-md">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container text-headline-sm text-headline-sm font-bold text-on-secondary">
                      {detail.legal_name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-headline-sm text-headline-sm font-bold text-on-surface">{detail.legal_name}</h3>
                      <p className="mt-space-2xs text-body-md text-body-md text-on-surface-variant">
                        {valueOrDash(detail.business_type)}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-space-md grid grid-cols-1 gap-space-md border-t border-outline pt-space-md sm:grid-cols-2">
                    <DetailItem label="Company ID" value={detail.id} mono />
                    <DetailItem label="Status" value={companyActiveStatus(detail.is_active)} />
                    <DetailItem label="Trade name" value={detail.trade_name} />
                    <DetailItem label="PAN" value={detail.pan} mono />
                    <DetailItem label="GSTIN" value={detail.gstin} mono />
                    <DetailItem label="TAN" value={detail.tan} mono />
                    <DetailItem label="State" value={detail.state} />
                    <DetailItem label="City" value={detail.city} />
                    <DetailItem label="Pincode" value={detail.pincode} />
                    <DetailItem
                      label="Financial year"
                      value={
                        detail.financial_year_start && detail.financial_year_end
                          ? `${formatDateIN(detail.financial_year_start)} to ${formatDateIN(detail.financial_year_end)}`
                          : formatDateIN(detail.financial_year_start || detail.financial_year_end || '')
                      }
                    />
                    <div className="sm:col-span-2">
                      <DetailItem label="Registered address" value={detail.registered_address} />
                    </div>
                    <DetailItem label="Created" value={detail.created_at ? formatDateIN(detail.created_at) : null} />
                    <DetailItem label="Updated" value={detail.updated_at ? formatDateIN(detail.updated_at) : null} />
                  </dl>
                </section>

                <section className="rounded-lg border border-outline bg-surface-container-lowest p-space-md shadow-sm">
                  <div className="mb-space-md">
                    <h3 className="text-headline-sm text-headline-sm font-bold text-on-surface">Editable details</h3>
                    <p className="mt-space-2xs text-xs text-on-surface-variant">Update the company trade name, tax identifiers and contact details.</p>
                  </div>
                  <form onSubmit={handleUpdate} noValidate className="space-y-space-md">
                    <TextField
                      id="detail-trade-name"
                      label="Trade name"
                      value={editForm.trade_name}
                      onChange={(value) => updateEditField('trade_name', value)}
                    />
                    <TextField
                      id="detail-pan"
                      label="PAN"
                      value={editForm.pan}
                      onChange={(value) => updateEditField('pan', value)}
                      className="font-code-mono text-code-mono"
                    />
                    <TextField
                      id="detail-gstin"
                      label="GSTIN"
                      value={editForm.gstin}
                      onChange={(value) => updateEditField('gstin', value)}
                      className="font-code-mono text-code-mono"
                    />
                    <TextField
                      id="detail-contact-email"
                      label="Contact email"
                      type="email"
                      value={editForm.contact_email}
                      onChange={(value) => updateEditField('contact_email', value)}
                      autoComplete="email"
                    />
                    <TextField
                      id="detail-contact-phone"
                      label="Contact phone"
                      type="tel"
                      value={editForm.contact_phone}
                      onChange={(value) => updateEditField('contact_phone', value)}
                      autoComplete="tel"
                    />
                    {saveError && (
                      <div className="flex items-start gap-space-sm rounded-md bg-error-container/40 px-space-sm py-space-sm text-body-sm text-body-sm text-error">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" />
                        <span>{saveError}</span>
                      </div>
                    )}
                    <div className="flex justify-end border-t border-outline pt-space-md">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-10 items-center justify-center gap-space-xs rounded-md bg-secondary px-space-md text-label-md text-label-md font-semibold text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? 'Saving changes' : 'Save changes'}
                      </button>
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
