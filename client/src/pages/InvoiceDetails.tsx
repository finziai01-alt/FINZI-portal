import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoicesGet, invoiceRecordReceipt } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { ArrowLeft, Printer } from 'lucide-react';

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const loadInvoice = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoicesGet(id!);
      setInvoice(res.data.invoice);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load this invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const recordReceipt = async () => {
    const amount = Number(receiptAmount);
    if (!amount || amount <= 0) {
      setError('Enter a receipt amount greater than zero');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await invoiceRecordReceipt(id!, { amount });
      setReceiptAmount('');
      await loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not record the receipt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface mb-4">Invoice details</h1>
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 h-64 flex items-center justify-center animate-pulse">
          <p className="text-on-surface-variant">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/invoices')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 mt-4">
          <p className="text-error font-semibold">{error || 'Invoice not found'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadInvoice}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/invoices')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{invoice.invoice_number}</h1>
            <p className="text-on-surface-variant">
              {invoice.customer_name} · {invoice.invoice_date ? formatDateIN(invoice.invoice_date) : '—'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer size={14} /> Print
        </Button>
      </div>

      {error && <p className="text-sm text-error mb-space-sm">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Invoice summary</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-space-md mb-space-md">
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Customer</p>
                  <p className="text-on-surface font-medium">{invoice.customer_name}</p>
                  <p className="text-xs text-on-surface-variant">{invoice.customer_gstin || 'No GSTIN'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Invoice number</p>
                  <p className="text-on-surface font-medium">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Invoice date</p>
                  <p className="text-on-surface font-medium">{invoice.invoice_date ? formatDateIN(invoice.invoice_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Due date</p>
                  <p className="text-on-surface font-medium">{invoice.due_date ? formatDateIN(invoice.due_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Grand total</p>
                  <p className="text-on-surface font-bold tnum">{formatMoneyIN(invoice.grand_total)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Amount received</p>
                  <p className="text-on-surface font-medium tnum">{formatMoneyIN(invoice.amount_received)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">Balance due</p>
                  <p className="text-on-surface font-bold tnum">{formatMoneyIN(invoice.balance_due)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-space-md border-t border-outline">
                <p className="text-xs text-on-surface-variant">Status</p>
                <StatusBadge status={invoice.status} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Record receipt</h2>
            </CardHeader>
            <CardContent>
              <label className="text-xs font-semibold text-on-surface-variant" htmlFor="receipt-amount">
                Amount received (₹)
              </label>
              <div className="flex items-center gap-space-sm mt-space-2xs">
                <input
                  id="receipt-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field tnum"
                />
                <Button variant="green" onClick={recordReceipt} disabled={saving || !invoice.balance_due}>
                  {saving ? 'Saving' : 'Record'}
                </Button>
              </div>
              <p className="text-xs text-on-surface-variant mt-space-sm">
                Receipts post against {state.company?.legal_name || 'this company'} and reduce the balance due.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
