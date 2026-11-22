import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoicesGet, invoiceRecordReceipt } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Printer, CreditCard } from 'lucide-react';

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await invoicesGet(id!);
      setInvoice(res.data.invoice);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || 'Could not load this invoice');
    } finally {
      setLoading(false);
    }
  };

  const recordReceipt = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const amount = Number(receiptAmount);
    if (!amount || amount <= 0) {
      setError('Enter a receipt amount greater than zero');
      return;
    }
    setSaving(true);
    try {
      await invoiceRecordReceipt(id!, { amount });
      await loadInvoice();
      setReceiptAmount('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not record the receipt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <div className="h-64 shimmer rounded-xl border border-line mx-auto" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <Card flush className="text-center py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sub text-ink-3">
            <CreditCard size={20} />
          </div>
          <h2 className="mt-4 text-[12.5px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
            {loadError || 'Invoice not found'}
          </h2>
          <Button variant="outline" onClick={() => loadInvoice()} className="mt-4">
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate('/invoices')} className="mt-2 ml-2">
            Back to invoices
          </Button>
        </Card>
      </div>
    );
  }

  const balanceDue = Number(invoice.grand_total) - Number(invoice.amount_paid || 0);

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Invoice Details"
        description={invoice.invoice_number}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </Button>
        }
        breadcrumb={[{ label: 'Sales', to: '/invoices' }, { label: invoice.invoice_number, to: '#' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Invoice Summary</h2>
            </div>
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Customer</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{invoice.customer_name}</p>
                <p className="mt-0.5 text-[10px] text-ink-3">{invoice.customer_gstin || 'No GSTIN'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Invoice Number</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{invoice.invoice_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Invoice Date</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{invoice.invoice_date ? formatDateIN(invoice.invoice_date) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Due Date</p>
                <p className="text-[11px] font-medium leading-4 text-primary-text">{invoice.due_date ? formatDateIN(invoice.due_date) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Grand Total</p>
                <p className="text-[13px] font-bold leading-6 text-primary-text tnum">{formatMoneyIN(invoice.grand_total)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Amount Paid</p>
                <p className="text-[13px] font-medium leading-6 text-primary-text tnum">{formatMoneyIN(invoice.amount_paid || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Balance Due</p>
                <p className="text-[13px] font-bold leading-6 text-error tnum">{formatMoneyIn(balanceDue)}</p>
              </div>
              <div className="space-y-1 flex items-end">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Status</p>
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card flush>
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Record Receipt</h2>
            </div>
            <div className="px-4 pb-4">
              <form onSubmit={recordReceipt} className="space-y-3">
                <Input
                  id="receipt-amount"
                  label="Amount (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  error={error ? 'Enter an amount greater than zero' : undefined}
                />
                {error && <p className="text-[10px] text-danger-ink">{error}</p>}
                <Button type="submit" disabled={saving} loading={saving} className="w-auto">
                  Record Receipt
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
            rows={(invoice.items || []) as any[]}
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