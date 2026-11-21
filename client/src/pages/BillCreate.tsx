import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { billsCreate, billsGet, billsUpdate, vendorsList, accountsList } from '../services/api';
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

const billSchema = z.object({
  bill_number: z.string().min(1, 'Bill number is required'),
  vendor_id: z.string().min(1, 'Select a vendor'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_gstin: z.string().optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  purchase_account: z.string().optional(),
  cost_centre: z.string().optional(),
  taxable_value: z.coerce.number().min(0),
  cgst: z.coerce.number().min(0),
  sgst: z.coerce.number().min(0),
  igst: z.coerce.number().min(0),
  cess: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  round_off: z.coerce.number().min(0).optional(),
  grand_total: z.coerce.number().min(0),
  tds_amount: z.coerce.number().min(0).optional(),
  tds_section: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
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

type BillForm = z.infer<typeof billSchema>;

const initialItem = {
  description: '', hsn_sac: '', quantity: 1, unit: '', rate: 0,
  discount_percent: 0, taxable_amount: 0, gst_rate: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
};

const dateInputValue = (value?: string) => value ? value.slice(0, 10) : '';

export default function BillCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vendors, setVendors] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, watch, setValue, getValues,
    formState: { errors },
  } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      bill_number: '', vendor_id: '', vendor_name: '', vendor_gstin: '',
      invoice_number: '', invoice_date: '', due_date: '', purchase_account: '',
      cost_centre: '', taxable_value: 0, cgst: 0, sgst: 0, igst: 0, cess: 0,
      discount: 0, round_off: 0, grand_total: 0, tds_amount: 0, tds_section: '',
      payment_terms: '', notes: '', status: 'draft', items: [initialItem],
    },
  });

  const items = watch('items');
  const { state } = useAuth();
  // Recompute GST whenever the vendor GSTIN or a header adjustment changes.
  const intraState = isIntraState(state.company?.gstin, watch('vendor_gstin'));
  const [cessValue, discountValue, roundOffValue] = watch(['cess', 'discount', 'round_off']);

  useEffect(() => {
    loadData();
    if (id) loadBill(id);
  }, [id]);

  const loadData = async () => {
    try {
      const [vRes, aRes] = await Promise.all([vendorsList(), accountsList()]);
      setVendors(vRes.data.vendors || []);
      setAccounts(aRes.data.accounts || []);
    } catch {}
    setLoading(false);
  };

  const loadBill = async (billId: string) => {
    try {
      const res = await billsGet(billId);
      const b = res.data.bill;
      setValue('bill_number', b.bill_number);
      setValue('vendor_id', b.vendor_id || '');
      setValue('vendor_name', b.vendor_name);
      setValue('vendor_gstin', b.vendor_gstin || '');
      setValue('invoice_number', b.invoice_number || '');
      setValue('invoice_date', dateInputValue(b.invoice_date));
      setValue('due_date', dateInputValue(b.due_date));
      setValue('purchase_account', b.purchase_account || '');
      setValue('cost_centre', b.cost_centre || '');
      setValue('taxable_value', b.taxable_value || 0);
      setValue('cgst', b.cgst || 0);
      setValue('sgst', b.sgst || 0);
      setValue('igst', b.igst || 0);
      setValue('cess', b.cess || 0);
      setValue('discount', b.discount || 0);
      setValue('round_off', b.round_off || 0);
      setValue('grand_total', b.grand_total || 0);
      setValue('tds_amount', b.tds_amount || 0);
      setValue('tds_section', b.tds_section || '');
      setValue('payment_terms', b.payment_terms || '');
      setValue('notes', b.notes || '');
      setValue('status', b.status || 'draft');
      setValue('items', (b.items || []).map((it: any) => ({
        description: it.description, hsn_sac: it.hsn_sac || '', quantity: it.quantity || 1,
        unit: it.unit || '', rate: it.rate || 0, discount_percent: it.discount_percent || 0,
        taxable_amount: it.taxable_amount || 0, gst_rate: it.gst_rate || 0,
        cgst: it.cgst || 0, sgst: it.sgst || 0, igst: it.igst || 0, total: it.total || 0,
      })));
    } catch {}
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
      ...sum,
      grand: grandTotal(sum, Number(cessValue) || 0, Number(discountValue) || 0, Number(roundOffValue) || 0),
    };
  };

  const totals = computeTotals();

  const onSubmit = async (data: BillForm) => {
    setSaving(true);
    setError('');
    try {
      const intra = isIntraState(state.company?.gstin, data.vendor_gstin);
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
        taxable_value: sum.taxable,
        cgst: sum.cgst,
        sgst: sum.sgst,
        igst: sum.igst,
        grand_total: grandTotal(sum, Number(data.cess) || 0, Number(data.discount) || 0, Number(data.round_off) || 0),
      };
      if (id) {
        await billsUpdate(id, payload);
      } else {
        await billsCreate(payload);
      }
      navigate('/bills');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save bill');
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

  const isEdit = !!id;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/bills')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{isEdit ? 'Edit Bill' : 'Create Bill'}</h1>
            <p className="text-on-surface-variant">Record a purchase bill with GST line items.</p>
          </div>
        </div>
        <Button type="submit" form="bill-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="text-on-secondary" /> {isEdit ? 'Update' : 'Create'} Bill</>}
        </Button>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <form id="bill-form" onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2">
              <FileText size={16} /> Bill Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Bill Number</label>
                <Input {...register('bill_number')} placeholder="e.g. BILL-1001" error={errors.bill_number?.message} />
                {errors.bill_number?.message && <p className="text-xs text-error">{errors.bill_number.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Vendor</label>
                <select
                  {...register('vendor_id')}
                  onChange={(e) => {
                    setValue('vendor_id', e.target.value);
                    const v = vendors.find((x) => x.id === e.target.value);
                    setValue('vendor_name', v ? v.name : '');
                    setValue('vendor_gstin', v ? v.gstin : '');
                  }}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {errors.vendor_id?.message && <p className="text-xs text-error">{errors.vendor_id.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Vendor GSTIN</label>
                <Input {...register('vendor_gstin')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Invoice Number</label>
                <Input {...register('invoice_number')} placeholder="e.g. INV-88" />
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
                <label className="text-sm font-medium text-on-surface">Purchase Account</label>
                <select
                  {...register('purchase_account')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Cost Centre</label>
                <Input {...register('cost_centre')} placeholder="e.g. Head Office" />
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
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Vendor Name</label>
                <Input {...register('vendor_name')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Notes</label>
                <Input {...register('notes')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">TDS Section</label>
                <Input {...register('tds_section')} placeholder="e.g. 194C" />
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
                <label className="text-xs font-medium text-on-surface-variant">Taxable Value</label>
                <p className="text-sm font-medium text-on-surface tnum">{formatMoneyIN(totals.taxable)}</p>
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
