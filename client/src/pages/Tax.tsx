import { useEffect, useState } from 'react';
import {
  taxDashboard,
  taxGSTR2BReconciliation,
  taxGSTR3B,
  taxRecordsCreate,
} from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
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
  const [taxPeriod, setTaxPeriod] = useState(currentTaxPeriod);
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
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Tax & Compliance</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">
            Prepare GST records from stored accounting data and review them before filing.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className="text-on-surface-variant" /> Refresh Books
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm flex items-center gap-space-sm">
          <AlertTriangle size={14} className="text-secondary shrink-0" />
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="mb-space-md p-space-md rounded-md bg-green/10 border border-green text-on-surface text-sm">
          {actionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">GST Liability</div>
          <div className="text-2xl font-bold text-on-surface tnum">
            {dashboard ? formatMoneyIN(dashboard.gst_liability || 0) : '—'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">ITC Available</div>
          <div className="text-2xl font-bold text-on-surface tnum">
            {dashboard ? formatMoneyIN(dashboard.itc_available || 0) : '—'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">TDS Payable</div>
          <div className="text-2xl font-bold text-on-surface tnum">
            {dashboard ? formatMoneyIN(dashboard.tds_payable || 0) : '—'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary">Returns Filed</div>
          <div className="text-2xl font-bold text-secondary tnum">
            {dashboard ? dashboard.returns_filed : '—'}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">GSTR-3B Summary</h2>
                <span className="text-xs text-on-surface-variant">Books period: {gstr3b?.period || dashboard?.period || 'All time'}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-space-md">
              {loading && !gstr3b ? (
                <div className="h-32 flex items-center justify-center text-on-surface-variant animate-pulse">Loading GSTR-3B...</div>
              ) : gstr3b ? (
                <>
                  <div className="grid grid-cols-2 gap-space-md">
                    <div className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                      <p className="text-xs font-semibold text-on-surface-variant">Taxable Value Outward</p>
                      <p className="text-lg font-bold text-on-surface tnum">{formatMoneyIN(gstr3b.taxable_value_outward || 0)}</p>
                    </div>
                    <div className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                      <p className="text-xs font-semibold text-on-surface-variant">Outward Tax</p>
                      <p className="text-lg font-bold text-on-surface tnum">{formatMoneyIN(gstr3b.output_tax || 0)}</p>
                    </div>
                    <div className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                      <p className="text-xs font-semibold text-on-surface-variant">Taxable Value Inward</p>
                      <p className="text-lg font-bold text-on-surface tnum">{formatMoneyIN(gstr3b.taxable_value_inward || 0)}</p>
                    </div>
                    <div className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                      <p className="text-xs font-semibold text-on-surface-variant">Input Tax Credit</p>
                      <p className="text-lg font-bold text-on-surface tnum">{formatMoneyIN(gstr3b.input_tax_credit || 0)}</p>
                    </div>
                    <div className="p-space-md rounded-lg border border-outline bg-surface-container-low sm:col-span-2">
                      <p className="text-xs font-semibold text-on-surface-variant">Net Tax Payable</p>
                      <p className="text-lg font-bold text-error tnum">{formatMoneyIN(gstr3b.net_tax_payable || 0)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Preparation: draft prepared from books. This summary is not an acknowledgement of a filed return.
                  </p>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-on-surface-variant">GSTR-3B data is unavailable.</div>
              )}
            </CardContent>
          </Card>

          <div className="mt-space-md">
            <Card>
              <CardHeader>
                <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Preparation and Review</h2>
              </CardHeader>
              <CardContent className="space-y-space-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="space-y-space-sm">
                    <label className="text-sm font-medium text-on-surface" htmlFor="tax-period">Tax Period</label>
                    <Input
                      id="tax-period"
                      type="month"
                      value={taxPeriod}
                      onChange={(event) => setTaxPeriod(event.target.value)}
                    />
                  </div>
                  <div className="space-y-space-sm">
                    <p className="text-sm font-medium text-on-surface">Selected Period Status</p>
                    <div>
                      <StatusBadge status={filingStatusBadge[currentStatus] || 'pending'} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-on-surface-variant">
                  <p><span className="font-medium text-on-surface">Draft:</span> prepare a tax record from stored books.</p>
                  <p><span className="font-medium text-on-surface">Review:</span> {filingStatusLabel[currentStatus] || currentStatus}.</p>
                  <p><span className="font-medium text-on-surface">Actual filing:</span> {currentRecord?.filing_status === 'filed' ? 'A filed record exists in FINZI AI.' : 'No filing is recorded for this period.'}</p>
                </div>

                {(!currentRecord || currentStatus === 'not_started') && (
                  <Button
                    variant="green"
                    disabled={preparing}
                    onClick={() => updateTaxRecord('in_progress', 'GSTR-3B draft preparation started.')}
                  >
                    {preparing ? 'Saving...' : 'Prepare GSTR-3B Draft'}
                  </Button>
                )}
                {currentStatus === 'in_progress' && (
                  <Button
                    variant="green"
                    disabled={preparing}
                    onClick={() => updateTaxRecord('ready_for_review', 'GSTR-3B draft is ready for review.')}
                  >
                    {preparing ? 'Saving...' : 'Mark Ready for Review'}
                  </Button>
                )}
                {currentStatus === 'ready_for_review' && (
                  <Button
                    variant="green"
                    disabled={preparing}
                    onClick={() => updateTaxRecord('reviewed', 'GSTR-3B record marked as reviewed.')}
                  >
                    {preparing ? 'Saving...' : 'Mark Reviewed'}
                  </Button>
                )}

                <div className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                  <p className="text-sm font-medium text-on-surface">GST portal filing</p>
                  <p className="text-xs text-on-surface-variant mt-space-xs">
                    Direct filing is pending integration. This page prepares and records review only; it does not submit a return or mark one as filed.
                  </p>
                  <Button variant="outline" size="sm" className="mt-space-sm" disabled>
                    File to GSTN — pending integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">GSTR-2B Reconciliation</h2>
            </CardHeader>
            <CardContent className="space-y-space-md">
              {reconciliation ? (
                <div className="space-y-space-sm">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Matched Invoices</span>
                    <span className="text-on-surface font-medium">{reconciliation.matched_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Unmatched Invoices</span>
                    <span className="text-warning font-medium">{reconciliation.unmatched_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">ITC Difference</span>
                    <span className="text-on-surface font-medium">
                      {reconciliation.status === 'pending_integration'
                        ? 'Pending integration'
                        : formatMoneyIN(reconciliation.itc_difference || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">{reconciliation.note}</p>
                  <Button variant="outline" className="w-full text-xs" onClick={loadData} disabled={loading}>
                    <RefreshCw size={14} className="text-on-surface-variant mr-1" /> Refresh Books Data
                  </Button>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-on-surface-variant animate-pulse">Loading...</div>
              )}
            </CardContent>
          </Card>

          <div className="mt-space-md">
            <Card>
              <CardHeader>
                <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Tax Records</h2>
              </CardHeader>
              <CardContent className="space-y-space-sm">
                {taxRecords.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No tax records have been prepared.</p>
                ) : (
                  taxRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-space-md rounded-lg border border-outline bg-surface-container-low">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{String(record.tax_type || 'Tax').toUpperCase()} · {record.tax_period}</p>
                        <p className="text-xs text-on-surface-variant">
                          {record.prepared_at ? `Prepared ${formatDateIN(record.prepared_at)}` : 'Preparation date unavailable'}
                        </p>
                      </div>
                      <StatusBadge status={filingStatusBadge[record.filing_status] || 'pending'} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
