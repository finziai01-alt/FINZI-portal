import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesCreate, customersList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { calcLine, grandTotal, isIntraState, sumLines } from '../utils/calc';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Minus, FileText, Save, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const invoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  customer_id: z.string().min(1, 'Select a customer'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_gstin: z.string().optional(),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  place_of_supply: z.string().optional(),
  payment_terms: z.string().optional(),
  bank_details: z.string().optional(),
  upi_id: z.string().optional(),
  tds_section: z.string().optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  subtotal: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  cgst: z.coerce.number().min(0),
  sgst: z.coerce.number().min(0),
  igst: z.coerce.number().min(0),
  cess: z.coerce.number().min(0),
  round_off: z.coerce.number().min(0).optional(),
  grand_total: z.coerce.number().min(0),
  status: z.string(),
  items: z.array(
    z.object({
      description: z.string().min(1, 'Description is required'),
      hsn_sac: z.string().optional(),
      quantity: z.coerce.number().min(0),
      unit: z.string().optional(),
      rate: z.coerce.number().min(0),
      discount_percent: z.coerce.number().min(0).optional(),
      taxable_amount: z.coerce.number().min(0),
      gst_rate: z.coerce.number().min(0),
      cgst: z.coerce.number().min(0),
      sgst: z.coerce.number().min(0),
      igst: z.coerce.number().min(0),
      total: z.coerce.number().min(0),
    }),
  ).min(1, 'Add at least one item'),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

const initialItem = {
  description: '', hsn_sac: '', quantity: 1, unit: '', rate: 0,
  discount_percent: 0, taxable_amount: 0, gst_rate: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
};

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, watch, setValue, getValues,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: '', customer_id: '', customer_name: '', customer_gstin: '',
      invoice_date: '', due_date: '', place_of_supply: '', payment_terms: '',
      bank_details: '', upi_id: '', tds_section: '', terms_conditions: '', notes: '',
      subtotal: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0,
      round_off: 0, grand_total: 0, status: 'sent', items: [initialItem],
    },
  });

  const items = watch('items');
  const { state } = useAuth();
  // Recompute GST whenever the customer GSTIN or a header adjustment changes.
  const intraState = isIntraState(state.company?.gstin, watch('customer_gstin'));
  const [cessValue, discountValue, roundOffValue] = watch(['cess', 'discount', 'round_off']);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await customersList();
      setCustomers(res.data.customers || []);
    } catch {}
    setLoading(false);
  };

  const addItem = () => {
    setValue('items', [...getValues('items'), { ...initialItem }]);
  };

  const removeItem = (index: number) => {
    const current = getValues('items');
    if (current.length <= 1) return;
    setValue('items', current.filter((_, i) => i !== index));
  };

  const computeTotals = () => {
    const sum = sumLines(items.map((it) => calcLine(it, intraState)));
    return {
      subtotal: sum.taxable,
      cgst: sum.cgst,
      sgst: sum.sgst,
      igst: sum.igst,
      cess: 0,
      grand: grandTotal(sum, Number(cessValue) || 0, Number(discountValue) || 0, Number(roundOffValue) || 0),
    };
  };

  const totals = computeTotals();

  const onSubmit = async (data: InvoiceForm) => {
    setSaving(true);
    setError('');
    try {
      const intra = isIntraState(state.company?.gstin, data.customer_gstin);
      const pricedItems = data.items.map((it) => ({ ...it, ...calcLine(it, intra) }));
      const sum = sumLines(pricedItems);
      const payload = {
        ...data,
        invoice_date: data.invoice_date || undefined,
        due_date: data.due_date || undefined,
        items: pricedItems.map((it) => ({
          ...it,
          hsn_sac: it.hsn_sac || undefined,
          unit: it.unit || undefined,
        })),
        subtotal: sum.taxable,
        cgst: sum.cgst,
        sgst: sum.sgst,
        igst: sum.igst,
        grand_total: grandTotal(sum, Number(data.cess) || 0, Number(data.discount) || 0, Number(data.round_off) || 0),
      };
      await invoicesCreate(payload);
      navigate('/invoices');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 h-64 flex items-center justify-center animate-pulse">
          <div className="text-on-surface-variant">Loading...</div>
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
            <h1 className="text-2xl font-bold text-on-surface">Create Invoice</h1>
            <p className="text-on-surface-variant">Record a sales invoice with GST line items.</p>
          </div>
        </div>
        <Button type="submit" form="invoice-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="text-on-secondary" /> Create Invoice</>}
        </Button>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2">
              <FileText size={16} /> Invoice Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Invoice Number</label>
                <Input {...register('invoice_number')} placeholder="e.g. INV-2001" error={errors.invoice_number?.message} />
                {errors.invoice_number?.message && <p className="text-xs text-error">{errors.invoice_number.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Customer</label>
                <select
                  {...register('customer_id')}
                  onChange={(e) => {
                    setValue('customer_id', e.target.value);
                    const c = customers.find((x) => x.id === e.target.value);
                    setValue('customer_name', c ? c.name : '');
                    setValue('customer_gstin', c ? c.gstin : '');
                  }}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.customer_id?.message && <p className="text-xs text-error">{errors.customer_id.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Customer GSTIN</label>
                <Input {...register('customer_gstin')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Invoice Date</label>
                <Input type="date" {...register('invoice_date')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Due Date</label>
                <Input type="date" {...register('due_date')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Place of Supply</label>
                <Input {...register('place_of_supply')} placeholder="e.g. Maharashtra" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Payment Terms</label>
                <Input {...register('payment_terms')} placeholder="e.g. Net 30" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Status</label>
                <select
                  {...register('status')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Customer Name</label>
                <Input {...register('customer_name')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Bank Details</label>
                <Input {...register('bank_details')} placeholder="e.g. HDFC A/C XXXX1234" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">UPI ID</label>
                <Input {...register('upi_id')} placeholder="e.g. name@upi" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">TDS Section</label>
                <Input {...register('tds_section')} placeholder="e.g. 194J" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Terms & Conditions</label>
                <Input {...register('terms_conditions')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Notes</label>
                <Input {...register('notes')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} className="text-secondary" />
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Line Items</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus size={14} className="text-on-surface-variant mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-space-sm">
              {items.map((_, index) => (
                <Card key={index} className="p-3 border border-outline">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Description</label>
                      <Input
                        {...register(`items.${index}.description`)}
                        error={errors.items?.[index]?.description?.message}
                      />
                      {errors.items?.[index]?.description?.message && <p className="text-xs text-error">{errors.items[index].description.message}</p>}
                    </div>
                    <div className="md:col-span-2 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">HSN / SAC</label>
                      <Input {...register(`items.${index}.hsn_sac`)} />
                    </div>
                    <div className="md:col-span-1 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Qty</label>
                      <Input type="number" {...register(`items.${index}.quantity`)} />
                    </div>
                    <div className="md:col-span-1 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Unit</label>
                      <Input {...register(`items.${index}.unit`)} />
                    </div>
                    <div className="md:col-span-1 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Rate</label>
                      <Input type="number" {...register(`items.${index}.rate`)} />
                    </div>
                    <div className="md:col-span-1 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">GST %</label>
                      <Input type="number" {...register(`items.${index}.gst_rate`)} />
                    </div>
                    <div className="md:col-span-2 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Total (₹)</label>
                      <input
                        type="number"
                        readOnly
                        value={calcLine(items[index], intraState).total}
                        className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface font-mono font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="md:col-span-1 space-y-space-sm">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full py-2.5 border border-error rounded-md text-error text-xs hover:bg-error-container/40"
                      >
                        <Minus size={14} className="text-error" /> Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">GST & Totals</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">Subtotal</label>
                <p className="text-sm font-medium text-on-surface tnum">{formatMoneyIN(totals.subtotal)}</p>
              </div>
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">CGST</label>
                <p className="text-sm font-medium text-on-surface tnum">{formatMoneyIN(totals.cgst)}</p>
              </div>
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">SGST</label>
                <p className="text-sm font-medium text-on-surface tnum">{formatMoneyIN(totals.sgst)}</p>
              </div>
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">IGST</label>
                <p className="text-sm font-medium text-on-surface tnum">{formatMoneyIN(totals.igst)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md mt-space-md">
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">Cess</label>
                <Input type="number" {...register('cess')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">Discount</label>
                <Input type="number" {...register('discount')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface-variant">Round Off</label>
                <Input type="number" {...register('round_off')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-xs font-medium text-on-surface">Grand Total</label>
                <p className="text-sm font-bold text-on-surface tnum">{formatMoneyIN(totals.grand)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
