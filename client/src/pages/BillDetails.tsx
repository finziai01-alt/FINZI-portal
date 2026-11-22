import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { billsGet, billsRecordPayment, billsDuplicate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Printer, CreditCard } from 'lucide-react';

export default function BillDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [actionError, setActionError] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    loadBill();
  }, [id]);

  const loadBill = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await billsGet(id!);
      setBill(res.data.bill);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || 'Could not load this bill');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaymentError('');
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Enter an amount greater than zero');
      return;
    }
    setPayLoading(true);
    try {
      await billsRecordPayment(id!, {
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
      });
      await loadBill();
      setPaymentAmount('');
      setReferenceNumber('');
    } catch (err: any) {
      setPaymentError(err.response?.data?.error || err.message || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setActionError('');
    setDuplicating(true);
    try {
      const res = await billsDuplicate(id!);
      const newBillId = res.data.billId;
      if (!newBillId) throw new Error('Duplicate did not return a bill identifier');
      navigate(`/bills/${newBillId}`);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Could not duplicate bill');
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <div className="h-64 shimmer rounded-xl border border-line mx-auto" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <Card flush className="text-center py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
            <CreditCard size={20} />
          </div>
          <h2 className="mt-4 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
            {loadError || 'Bill not found'}
          </h2>
          <Button variant="outline" onClick={() => loadBill()} className="mt-4">
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate('/bills')} className="mt-2 ml-2">
            Back to bills
          </Button>
        </Card>
      </div>
    );
  }

  const balanceDue = Number(bill.grand_total) - Number(bill.amount_paid || 0);

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Bill Details"
        description={bill.bill_number}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </Button>
            <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? 'Duplicating…' : 'Duplicate'}
            </Button>
          </>
        }
        breadcrumb={[{ label: 'Bills', to: '/bills' }, { label: bill.bill_number, to: '#' }]}
      />

      {actionError && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Bill Summary</h2>
            </div>
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Vendor</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{bill.vendor_name}</p>
                <p className="mt-0.5 text-[10px] text-ink-3">{bill.vendor_gstin || 'No GSTIN'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Bill Number</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{bill.bill_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Invoice Number</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{bill.invoice_number || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Invoice Date</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{bill.invoice_date ? formatDateIN(bill.invoice_date) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Due Date</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{bill.due_date ? formatDateIN(bill.due_date) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Grand Total</p>
                <p className="text-[13px] font-bold leading-6 text-primary-text tnum">{formatMoneyIN(bill.grand_total)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Amount Paid</p>
                <p className="text-[13px] font-medium leading-6 text-primary-text tnum">{formatMoneyIN(bill.amount_paid || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Balance Due</p>
                <p className="text-[13px] font-bold leading-6 text-error tnum">{formatMoneyIn(balanceDue)}</p>
              </div>
              <div className="space-y-1 flex items-end">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Status</p>
                <StatusBadge status={bill.status} />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Record Payment</h2>
            </div>
            <div className="px-4 pb-4">
              <form onSubmit={handleRecordPayment} className="space-y-3">
                <Input
                  id="payment-amount"
                  label="Amount (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  error={paymentError ? 'Enter an amount greater than zero' : undefined}
                />
                {paymentError && <p className="text-[10px] text-danger-ink">{paymentError}</p>}
                <Select
                  id="payment-method"
                  label="Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="rtgs">RTGS</option>
                  <option value="neft">NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </Select>
                <Input
                  id="payment-reference"
                  label="Reference Number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR1234567890"
                />
                <Button type="submit" disabled={payLoading} loading={payLoading} className="w-auto">
                  Record Payment
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Line Items</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'description',
                label: 'DESCRIPTION',
                render: (row) => <span className="text-[11px] font-medium leading-4 text-primary-text">{row.description}</span>,
              },
              { key: 'hsn_sac', label: 'HSN / SAC', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.hsn_sac || '—'}</span> },
              { key: 'qty', label: 'QTY', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{row.quantity}</span> },
              { key: 'rate', label: 'RATE', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{formatMoneyIN(row.rate || 0)}</span> },
              { key: 'gst_rate', label: 'GST %', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-ink-3 tnum">{row.gst_rate || 0}%</span> },
              { key: 'amount', label: 'AMOUNT', align: 'right', render: (row) => <span className="block text-right text-[11px] leading-4 text-primary-text tnum">{formatMoneyIN(row.total || 0)}</span> },
            ]}
            rows={(bill.items || []) as any[]}
            emptyMessage="No line items."
          />
        </div>
      </Card>
    </div>
  );
}

function formatMoneyIn(value: number | undefined | null): string {
  return formatMoneyIN(Number(value || 0));
}