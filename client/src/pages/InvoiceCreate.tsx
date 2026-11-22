import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoicesCreate, invoicesGet, invoicesUpdate, customersList } from '../services/api';
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

const dateInputValue = (value?: string) => value ? value.slice(0, 10) : '';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
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
  const intraState = isIntraState(state.company?.gstin, watch('customer_gstin'));
  const [cessValue, discountValue, roundOffValue] = watch(['cess', 'discount', 'round_off']);

  useEffect(() => {
    loadData();
    if (id) loadInvoice(id);
  }, [id]);

  const loadData = async () => {
    try {
      const cRes = await customersList();
      setCustomers(cRes.data.customers || []);
    } catch {}
    setLoading(false);
  };

  const loadInvoice = async (invoiceId: string) => {
    try {
      const res = await invoicesGet(invoiceId);
      const inv = res.data.invoice;
      setValue('invoice_number', inv.invoice_number);
      setValue('customer_id', inv.customer_id || '');
      setValue('customer_name', inv.customer_name);
      setValue('customer_gstin', inv.customer_gstin || '');
      setValue('invoice_number', inv.invoice_number);
      setValue('invoice_date', dateInputValue(inv.invoice_date));
      setValue('due_date', dateInputValue(inv.due_date));
      setValue('place_of_supply', inv.place_of_supply || '');
      setValue('payment_terms', inv.payment_terms || '');
      setValue('bank_details', inv.bank_details || '');
      setValue('upi_id', inv.upi_id || '');
      setValue('tds_section', inv.tds_section || '');
      setValue('terms_conditions', inv.terms_conditions || '');
      setValue('notes', inv.notes || '');
      setValue('subtotal', inv.subtotal || 0);
      setValue('discount', inv.discount || 0);
      setValue('cgst', inv.cgst || 0);
      setValue('sgst', inv.sgst || 0);
      setValue('igst', inv.igst || 0);
      setValue('cess', inv.cess || 0);
      setValue('round_off', inv.round_off || 0);
      setValue('grand_total', inv.grand_total || 0);
      setValue('status', inv.status || 'sent');
      setValue('items', (inv.items || []).map((it: any) => ({
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
      if (id) {
        await invoicesUpdate(id, payload);
      } else {
        await invoicesCreate(payload);
      }
      navigate('/invoices');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save invoice');
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
        title={isEdit ? 'Edit Invoice' : 'Create Invoice'}
        description="Record a sales invoice with GST line items."
        actions={
          <Button type="submit" form="invoice-form" variant="green" disabled={saving} className="ml-auto">
            <Save size={16} className="text-on-secondary mr-2" /> {saving ? 'Saving…' : `${isEdit ? 'Update' : 'Create'} Invoice`}
          </Button>
        }
        breadcrumb={[{ label: 'Sales', to: '/invoices' }, { label: isEdit ? 'Edit Invoice' : 'Create Invoice', to: '#' }]}
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Invoice Details</h2>
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="invoice-number"
              label="Invoice Number"
              {...register('invoice_number')}
              error={errors.invoice_number?.message}
              placeholder="e.g. INV-1001"
            />
            {errors.invoice_number?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.invoice_number.message}</p>}
            <Select
              id="customer"
              label="Customer"
              value={watch('customer_id')}
              onChange={(e) => {
                setValue('customer_id', e.target.value);
                const c = customers.find((x) => x.id === e.target.value);
                setValue('customer_name', c ? c.name : '');
                setValue('customer_gstin', c ? c.gstin : '');
              }}
              required
              hint="Select customer"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {errors.customer_id?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.customer_id.message}</p>}
            <Input
              id="customer-gstin"
              label="Customer GSTIN"
              {...register('customer_gstin')}
              hint="22AAAAA0000A1Z5"
            />
            <Input
              id="invoice-number-2"
              label="Invoice Number"
              {...register('invoice_number')}
              placeholder="e.g. INV-88"
            />
            {/* duplicate key fixed below */}
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
            <Input
              id="place-of-supply"
              label="Place of Supply"
              {...register('place_of_supply')}
              placeholder="e.g. Maharashtra"
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
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Input
              id="customer-name"
              label="Customer Name"
              {...register('customer_name')}
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
                    <Input id={`item-desc-${index}`} {...register(`items.${index}.description`)} error={errors.items?.[index]?.description?.message} />
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
                      title={items.length <= 1 ? 'An invoice needs at least one item' : 'Remove item'}
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Subtotal</p>
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
                <Input id="invoice-cess" label="Cess" type="number" {...register('cess')} />
              </div>
              <div className="space-y-1">
                <Input id="invoice-discount" label="Discount" type="number" {...register('discount')} />
              </div>
              <div className="space-y-1">
                <Input id="invoice-round-off" label="Round Off" type="number" {...register('round_off')} />
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