import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { billsCreate, billsGet, billsUpdate, vendorsList, accountsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { calcLine, grandTotal, isIntraState, sumLines } from '../utils/calc';
import { useAuth } from '../context/AuthContext';
import { FileText, Minus, PlusCircle, Save } from 'lucide-react';
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
      <div className="px-4 py-5 lg:px-6">
        <div className="h-64 shimmer rounded-xl border border-line mx-auto" />
      </div>
    );
  }

  const isEdit = !!id;

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title={isEdit ? 'Edit Bill' : 'Create Bill'}
        description="Record a purchase bill with GST line items."
        actions={
          <Button type="submit" form="bill-form" variant="green" disabled={saving} className="ml-auto">
            <Save size={16} className="text-on-secondary mr-2" /> {saving ? 'Saving…' : `${isEdit ? 'Update' : 'Create'} Bill`}
          </Button>
        }
        breadcrumb={[{ label: 'Bills', to: '/bills' }, { label: isEdit ? 'Edit Bill' : 'Create Bill', to: '#' }]}
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <form id="bill-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Bill Details</h2>
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="bill-number"
              label="Bill Number"
              {...register('bill_number')}
              error={errors.bill_number?.message}
              placeholder="e.g. BILL-1001"
            />
            {errors.bill_number?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.bill_number.message}</p>}
            <Select
              id="vendor"
              label="Vendor"
              value={watch('vendor_id')}
              onChange={(e) => {
                setValue('vendor_id', e.target.value);
                const v = vendors.find((x) => x.id === e.target.value);
                setValue('vendor_name', v ? v.name : '');
                setValue('vendor_gstin', v ? v.gstin : '');
              }}
              required
              hint="Select vendor"
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
            {errors.vendor_id?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.vendor_id.message}</p>}
            <Input
              id="vendor-gstin"
              label="Vendor GSTIN"
              {...register('vendor_gstin')}
              hint="22AAAAA0000A1Z5"
            />
            <Input
              id="invoice-number"
              label="Invoice Number"
              {...register('invoice_number')}
              placeholder="e.g. INV-88"
            />
            <Input
              id="invoice-date"
              label="Invoice Date"
              type="date"
              {...register('invoice_date')}
            />
            <Input
              id="due-date"
              label="Due Date"
              type="date"
              {...register('due_date')}
            />
            <Select
              id="purchase-account"
              label="Purchase Account"
              value={watch('purchase_account')}
              onChange={(e) => setValue('purchase_account', e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
              ))}
            </Select>
            <Input
              id="cost-centre"
              label="Cost Centre"
              {...register('cost_centre')}
              placeholder="e.g. Head Office"
            />
            <Input
              id="payment-terms"
              label="Payment Terms"
              {...register('payment_terms')}
              placeholder="e.g. Net 30"
            />
            <Select
              id="status"
              label="Status"
              value={watch('status')}
              onChange={(e) => setValue('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Input
              id="vendor-name"
              label="Vendor Name"
              {...register('vendor_name')}
            />
            <Input
              id="notes"
              label="Notes"
              {...register('notes')}
            />
            <Input
              id="tds-section"
              label="TDS Section"
              {...register('tds_section')}
              placeholder="e.g. 194C"
            />
          </div>
        </Card>

        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Line Items</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <PlusCircle size={14} className="text-on-secondary mr-1" /> Add Item
            </Button>
          </div>
          <div className="overflow-x-auto p-4 border-t border-line">
            <div className="min-w-[700px] divide-y divide-line">
              <div className="grid grid-cols-12 border-b border-line px-3 py-2.5">
                <div className="col-span-4 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Description</div>
                <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">HSN / SAC</div>
                <div className="col-span-1 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Qty</div>
                <div className="col-span-1 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Unit</div>
                <div className="col-span-1 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Rate</div>
                <div className="col-span-1 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">GST %</div>
                <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Total (₹)</div>
              </div>
              {items.map((_, index) => (
                <div key={index} className="grid grid-cols-12 border-b border-line px-3 py-2.5 items-center">
                  <div className="col-span-4">
                    <Input
                      id={`item-desc-${index}`}
                      {...register(`items.${index}.description`)}
                      error={errors.items?.[index]?.description?.message}
                    />
                    {errors.items?.[index]?.description?.message && (
                      <p className="mt-0.5 text-[9px] text-danger-ink">{errors.items[index].description.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input id={`item-hsn-${index}`} {...register(`items.${index}.hsn_sac`)} />
                  </div>
                  <div className="col-span-1 text-right">
                    <Input id={`item-qty-${index}`} type="number" {...register(`items.${index}.quantity`)} />
                  </div>
                  <div className="col-span-1 text-right">
                    <Input id={`item-unit-${index}`} {...register(`items.${index}.unit`)} />
                  </div>
                  <div className="col-span-1 text-right">
                    <Input id={`item-rate-${index}`} type="number" {...register(`items.${index}.rate`)} />
                  </div>
                  <div className="col-span-1 text-right">
                    <Input id={`item-gst-${index}`} type="number" {...register(`items.${index}.gst_rate`)} />
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[11px] font-medium leading-4 text-primary-text tnum">{formatMoneyIN(calcLine(items[index], intraState).total)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="w-8 h-8 rounded border border-line flex items-center justify-center text-error hover:bg-neg-soft disabled:opacity-40 disabled:pointer-events-none transition-colors duration-micro"
                      title={items.length <= 1 ? 'A bill needs at least one item' : 'Remove item'}
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">GST & Totals</h2>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Taxable Value</p>
                <p className="text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(totals.taxable)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">CGST</p>
                <p className="text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(totals.cgst)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">SGST</p>
                <p className="text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(totals.sgst)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">IGST</p>
                <p className="text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(totals.igst)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="space-y-1">
                <Input id="cess" label="Cess" type="number" {...register('cess')} />
              </div>
              <div className="space-y-1">
                <Input id="discount" label="Discount" type="number" {...register('discount')} />
              </div>
              <div className="space-y-1">
                <Input id="round-off" label="Round Off" type="number" {...register('round_off')} />
              </div>
              <div className="space-y-1 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Grand Total</p>
                <p className="text-[15px] font-bold leading-6 text-primary-text tnum">{formatMoneyIN(totals.grand)}</p>
              </div>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}