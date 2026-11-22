import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { taxDashboard, taxGSTR2BReconciliation, taxGSTR3B, taxRecordsCreate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { formatDateIN, formatMoneyIN } from '../utils/format';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const currentTaxPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const filingStatusLabel: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'Preparation in progress',
  ready_for_review: 'Ready for review',
  reviewed: 'Reviewed',
  filed: 'Filed',
  attention_required: 'Attention required',
};

const filingStatusBadge: Record<string, string> = {
  not_started: 'pending',
  in_progress: 'processing',
  ready_for_review: 'pending',
  reviewed: 'approved',
  filed: 'approved',
  attention_required: 'rejected',
};

export default function Tax() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [gstr3b, setGSTR3B] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [taxPeriod, setTaxPeriod] = useState(currentTaxPeriod());
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, gstr3bRes, reconciliationRes] = await Promise.all([
        taxDashboard(),
        taxGSTR3B(),
        taxGSTR2BReconciliation(),
      ]);
      setDashboard(dashboardRes.data);
      setGSTR3B(gstr3bRes.data?.gstr3b || null);
      setReconciliation(reconciliationRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load tax data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const taxRecords = dashboard?.tax_records || [];
  const currentRecord = taxRecords.find(
    (record: any) => record.tax_type === 'gst' && record.tax_period === taxPeriod,
  );
  const currentStatus = currentRecord?.filing_status || 'not_started';

  const updateTaxRecord = async (filingStatus: string, successMessage: string) => {
    if (!taxPeriod.trim()) {
      setError('Choose a tax period before preparing the return.');
      return;
    }
    setPreparing(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await taxRecordsCreate({
        tax_type: 'gst',
        tax_period: taxPeriod,
        filing_status: filingStatus,
        notes: 'Prepared from stored accounting data in FINZI AI. Review is required before any portal filing.',
      });
      setActionMessage(res.data?.message || successMessage);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not save the tax record.');
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Tax and compliance"
        description="Prepare GST records from stored accounting data and review them before filing."
        actions={
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={16} className="text-on-surface-variant" /> Refresh Books
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {actionMessage && (
        <div className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm text-brand-ink flex items-center gap-2">
          {actionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="GST Liability" note={`As per ${taxPeriod}`} readout={{ value: dashboard ? formatMoneyIN(dashboard.gst_liability || 0) : '—', tone: 'accent' }} metrics={[{ label: 'Amount', value: dashboard ? formatMoneyIN(dashboard.gst_liability || 0) : '—' }]} />
        <StatCard title="ITC Available" note="Input tax credit available" readout={{ value: dashboard ? formatMoneyIN(dashboard.itc_available || 0) : '—', tone: 'accent' }} metrics={[{ label: 'Amount', value: dashboard ? formatMoneyIN(dashboard.itc_available || 0) : '—' }]} />
        <StatCard title="TDS Payable" note="Tax deducted at source payable" readout={{ value: dashboard ? formatMoneyIN(dashboard.tds_payable || 0) : '—', tone: 'accent' }} metrics={[{ label: 'Amount', value: dashboard ? formatMoneyIN(dashboard.tds_payable || 0) : '—' }]} />
        <StatCard title="Returns Filed" note={dashboard ? `${dashboard.returns_filed} returns` : '—'} readout={{ value: dashboard ? String(dashboard.returns_filed) : '—' }} metrics={[{ label: 'Count', value: dashboard ? String(dashboard.returns_filed) : '—' }]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <div>
                <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">GSTR-3B Summary</h2>
                <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                  Books period: {gstr3b?.period || dashboard?.period || 'All time'}
                </p>
              </div>
            </div>
            <div className="px-4 pb-4">
              {loading && !gstr3b ? (
                <div className="h-32 shimmer rounded-lg border border-line mx-auto" />
              ) : gstr3b ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-[10px] font-semibold leading-4 text-ink-3">Taxable Value Outward</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(gstr3b.taxable_value_outward || 0)}</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-[10px] font-semibold leading-4 text-ink-3">Outward Tax</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(gstr3b.output_tax || 0)}</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-[10px] font-semibold leading-4 text-ink-3">Taxable Value Inward</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(gstr3b.taxable_value_inward || 0)}</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-[10px] font-semibold leading-4 text-ink-3">Input Tax Credit</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(gstr3b.input_tax_credit || 0)}</p>
                    </div>
                    <div className="sm:col-span-2 rounded-xl border border-line p-3">
                      <p className="text-[10px] font-semibold leading-4 text-ink-3">Net Tax Payable</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-6 text-error tnum">{formatMoneyIN(gstr3b.net_tax_payable || 0)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-ink-3">
                    Preparation: draft prepared from books. This summary is not an acknowledgement of a filed return.
                  </p>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-[10px] leading-4 text-ink-3">GSTR-3B data is unavailable.</div>
              )}
            </div>
          </Card>

          <div className="mt-6">
            <Card flush>
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
                <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Preparation and Review</h2>
              </div>
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium leading-4 text-primary-text">Tax Period</p>
                    <Input id="tax-period" type="month" value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium leading-4 text-primary-text">Selected Period Status</p>
                    </div>
                    <StatusBadge status={filingStatusBadge[currentStatus] || 'pending'} />
                  </div>
                </div>
                <div className="space-y-2 text-[10px] leading-4 text-ink-3">
                  <p><span className="font-medium text-primary-text">Draft:</span> prepare a tax record from stored books.</p>
                  <p>
                    <span className="font-medium text-primary-text">Review:</span> {filingStatusLabel[currentStatus] || currentStatus}.
                  </p>
                  <p>
                    <span className="font-medium text-primary-text">Actual filing:</span>{' '}
                    {currentRecord?.filing_status === 'filed'
                      ? 'A filed record exists in FINZI AI.'
                      : 'No filing is recorded for this period.'}
                  </p>
                </div>
                {(!currentRecord || currentStatus === 'not_started') && (
                  <Button variant="green" disabled={preparing} onClick={() => updateTaxRecord('in_progress', 'GSTR-3B draft preparation started.')}>
                    {preparing ? 'Saving…' : 'Prepare GSTR-3B Draft'}
                  </Button>
                )}
                {currentStatus === 'in_progress' && (
                  <Button variant="green" disabled={preparing} onClick={() => updateTaxRecord('ready_for_review', 'GSTR-3B draft is ready for review.')}>
                    {preparing ? 'Saving…' : 'Mark Ready for Review'}
                  </Button>
                )}
                {currentStatus === 'ready_for_review' && (
                  <Button variant="green" disabled={preparing} onClick={() => updateTaxRecord('reviewed', 'GSTR-3B record marked as reviewed.')}>
                    {preparing ? 'Saving…' : 'Mark Reviewed'}
                  </Button>
                )}
                <div className="rounded-xl border border-line bg-sub p-3">
                  <p className="text-[10px] font-medium leading-4 text-primary-text">GST portal filing</p>
                  <p className="mt-0.5 text-[9px] leading-4 text-ink-3">
                    Direct filing is pending integration. This page prepares and records review only; it does not submit a return or mark one as filed.
                  </p>
                  <Button variant="outline" size="sm" disabled className="mt-2 w-auto">
                    File to GSTN — pending integration
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">GSTR-2B Reconciliation</h2>
            </div>
            <div className="px-4 pb-4">
              {reconciliation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[10px] leading-4 text-ink-3">Matched Invoices</span>
                    <span className="text-[11px] font-semibold leading-4 text-primary-text tnum">{reconciliation.matched_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[10px] leading-4 text-ink-3">Unmatched Invoices</span>
                    <span className="text-[11px] font-semibold leading-4 text-warning tnum">{reconciliation.unmatched_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[10px] leading-4 text-ink-3">ITC Difference</span>
                    <span className="text-[11px] font-semibold leading-4 text-primary-text tnum">
                      {reconciliation.status === 'pending_integration' ? 'Pending integration' : formatMoneyIN(reconciliation.itc_difference || 0)}
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-ink-3">{reconciliation.note}</p>
                  <Button variant="outline" onClick={() => void loadData()} disabled={loading} size="sm" className="w-auto mt-3">
                    <RefreshCw size={16} className="text-on-surface-variant mr-1" /> Refresh Books Data
                  </Button>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-[10px] leading-4 text-ink-3 animate-pulse">Loading…</div>
              )}
            </div>
          </Card>

          <div className="mt-6">
            <Card flush>
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
                <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Tax Records</h2>
              </div>
              <div className="px-4 pb-4 divide-y divide-line">
                {taxRecords.length === 0 ? (
                  <p className="py-4 text-center text-[11px] leading-4 text-ink-3">No tax records have been prepared.</p>
                ) : (
                  taxRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="block text-[11px] font-medium leading-4 text-primary-text truncate">
                          {String(record.tax_type || 'Tax').toUpperCase()} · {record.tax_period}
                        </p>
                        <p className="mt-0.5 block text-[10px] leading-4 text-ink-3 truncate">
                          {record.prepared_at ? `Prepared ${formatDateIN(record.prepared_at)}` : 'Preparation date unavailable'}
                        </p>
                      </div>
                      <StatusBadge status={filingStatusBadge[record.filing_status] || 'pending'} />
                    </div>
                  ))
                )}
                <div className="pt-4">
                  <Link to="/reports" className="text-[11px] font-medium leading-4 text-brand hover:underline">
                    View statutory statements →
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}