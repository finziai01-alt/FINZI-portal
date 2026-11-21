import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billsGet, billsRecordPayment, billsDuplicate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { ArrowLeft, Printer, CreditCard, Mail, AlertCircle } from 'lucide-react';

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

  const handleRecordPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      <div className="p-6">
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 h-64 flex items-center justify-center animate-pulse">
          <div className="text-on-surface-variant">Loading bill...</div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/bills')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 mt-4">
          <p className="text-error font-semibold">{loadError || 'Bill not found'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadBill}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/bills')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Bill Details</h1>
            <p className="text-on-surface-variant">{bill.bill_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Bill Summary</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-space-md mb-space-md">
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Vendor</p>
                  <p className="text-on-surface font-medium">{bill.vendor_name}</p>
                  <p className="text-xs text-on-surface-variant">{bill.vendor_gstin || 'No GSTIN'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Bill Number</p>
                  <p className="text-on-surface font-medium">{bill.bill_number}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Invoice Number</p>
                  <p className="text-on-surface font-medium">{bill.invoice_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Invoice Date</p>
                  <p className="text-on-surface font-medium">{bill.invoice_date ? formatDateIN(bill.invoice_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Due Date</p>
                  <p className="text-on-surface font-medium">{formatDateIN(bill.due_date || '') || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Grand Total</p>
                  <p className="text-on-surface font-bold tnum">{formatMoneyIN(bill.grand_total)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Amount Paid</p>
                  <p className="text-on-surface font-medium tnum">{formatMoneyIN(bill.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Balance Due</p>
                  <p className="text-on-surface font-bold tnum">{formatMoneyIN(bill.balance_due)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-space-md border-t border-outline">
                <div className="text-xs text-on-surface-variant">Status</div>
                <StatusBadge status={bill.status} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Record Payment</h2>
            </CardHeader>
            <CardContent className="space-y-space-md">
              <form onSubmit={handleRecordPayment} className="space-y-space-md">
                <Input
                  label="Amount (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  error={paymentError || undefined}
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="rtgs">RTGS</option>
                  <option value="neft">NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
                <Input
                  label="Reference / UTR Number"
                  placeholder="e.g. UTR123456"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
                <Button type="submit" variant="green" className="w-full" disabled={payLoading}>
                  {payLoading ? 'Recording...' : 'Record Payment'}
                </Button>
              </form>
              {paymentError && (
                <div className="p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
                  <AlertCircle size={16} className="mr-2 text-error shrink-0" />
                  {paymentError}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-space-md">
            <Card>
              <CardHeader>
                <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Payment Options</h2>
              </CardHeader>
              <CardContent className="space-y-space-sm">
                <div className="flex items-center gap-3 p-space-md rounded-lg border border-outline bg-surface-container-low">
                  <CreditCard size={20} className="text-on-surface-variant" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">Pay via Bank</p>
                    <p className="text-xs text-on-surface-variant">Direct bank transfer from your registered account</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-space-md rounded-lg border border-outline bg-surface-container-low">
                  <Mail size={20} className="text-on-surface-variant" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">Generate Payment Advice</p>
                    <p className="text-xs text-on-surface-variant">Send payment intimation to vendor via email</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
