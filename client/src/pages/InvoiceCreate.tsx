import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  invoicesCreate, invoicesGet, customersList, accountsList,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN, formatDateIN } from '../utils/format';
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
  po_reference: z.string().optional(),
  subtotal: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  cgst: z.coerce.number().min(0),
  sgst: z.coerce.number().min(0),
  igst: z.coerce.number().min(0),
  cess: z.coerce.number().min(0),
  round_off: z.coerce.number().min(0).optional(),
  grand_total: z.coerce.number().min(0),
  tds_deductible: z.coerce.number().min(0).optional(),
  tds_section: z.string().optional(),
  net_expected_inflow: z.coerce.number().min(0),
  payment_terms: z.string().optional(),
  bank_details: z.string().optional(),
  upi_id: z.string().optional(),
  notes: z.string().optional(),
  terms_conditions: z.string().optional(),
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
  const { state } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, control, handleSubmit, watch, setValue, getValues, clearErrors,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: '', customer_id: '', customer_name: '', customer_gstin: '',
      invoice_date: '', due_date: '', place_of_supply: '', po_reference: '',
      subtotal: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, round_off: 0,
      grand_total: 0, tds_deductible: 0, tds_section: '', net_expected_inflow: 0,
      payment_terms: '', bank_details: '', upi_id: '', notes: '', terms_conditions: '',
      status: 'draft', items: [initialItem],
    },
  });

  const items = watch('items');

  useEffect(() => {
    loadData();
    if (id) loadInvoice(id);
  }, [id]);

  const loadData = async () => {
    try {
      const [cRes, aRes] = await Promise.all([customersList(), accountsList()]);
      setCustomers(cRes.data.customers || []);
      setAccounts(aRes.data.accounts || []);
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
      setValue('invoice_date', inv.invoice_date ? formatDateIN(inv.invoice_date) : '');
      setValue('due_date', inv.due_date ? formatDateIN(inv.due_date) : '');
      setValue('place_of_supply', inv.place_of_supply || '');
      setValue('po_reference', inv.po_reference || '');
      setValue('subtotal', inv.subtotal || 0);
      setValue('discount', inv.discount || 0);
      setValue('cgst', inv.cgst || 0);
      setValue('sgst', inv.sgst || 0);
      setValue('igst', inv.igst || 0);
      setValue('cess', inv.cess || 0);
      setValue('round_off', inv.round_off || 0);
      setValue('grand_total', inv.grand_total || 0);
      setValue('tds_deductible', inv.tds_deductible || 0);
      setValue('tds_section', inv.tds_section || '');
      setValue('net_expected_inflow', inv.net_expected_inflow || 0);
      setValue('payment_terms', inv.payment_terms || '');
      setValue('bank_details', inv.bank_details || '');
      setValue('upi_id', inv.upi_id || '');
      setValue('notes', inv.notes || '');
      setValue('terms_conditions', inv.terms_conditions || '');
      setValue('status', inv.status || 'draft');
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
    const cur = getValues('items');
    let subtotal = 0, cgst = 0, sgst = 0, igst = 0, grand = 0;
    for (const it of cur) {
      subtotal += it.taxable_amount || 0;
      cgst += it.cgst || 0;
      sgst += it.sgst || 0;
      igst += it.igst || 0;
      grand += it.total || 0;
    }
    return { subtotal, cgst, sgst, igst, grand };
  };

  const totals = computeTotals();

  const onSubmit = async (data: InvoiceForm) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...data,
        invoice_date: data.invoice_date || undefined,
        due_date: data.due_date || undefined,
        items: data.items.map((it) => ({
          ...it,
          hsn_sac: it.hsn_sac || undefined,
          unit: it.unit || undefined,
        })),
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
      <div className="p-6">
        <div className="animate-pulse bg-surface border border-border rounded-lg p-8 h-64 flex items-center justify-center">
          <div className="text-secondary-text">Loading...</div>
        </div>
      </div>
    );
  }

  const isEdit = !!id;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-2 text-secondary-text hover:text-primary-text hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h1>
            <p className="text-secondary-text">Record a sales invoice with GST line items.</p>
          </div>
        </div>
        <Button type="submit" form="invoice-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="mr-2" /> {isEdit ? 'Update' : 'Create'} Invoice</>}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText size={16} /> Invoice Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Invoice Number</label>
                <Input
                  {...register('invoice_number')}
                  placeholder="e.g. INV-2001"
                  error={errors.invoice_number?.message}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Customer</label>
                <select
                  {...register('customer_id')}
                  onChange={(e) => {
                    setValue('customer_id', e.target.value);
                    const c = customers.find((x) => x.id === e.target.value);
                    setValue('customer_name', c ? c.name : '');
                    setValue('customer_gstin', c ? c.gstin : '');
                  }}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.customer_id?.message && <p className="text-xs text-danger">{errors.customer_id.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Customer GSTIN</label>
                <Input {...register('customer_gstin')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">PO Reference</label>
                <Input {...register('po_reference')} placeholder="e.g. PO-44" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Invoice Date</label>
                <Input type="date" {...register('invoice_date')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Due Date</label>
                <Input type="date" {...register('due_date')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Place of Supply</label>
                <Input {...register('place_of_supply')} placeholder="e.g. Maharashtra" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Payment Terms</label>
                <Input {...register('payment_terms')} placeholder="e.g. Net 30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Status</label>
                <select
                  {...register('status')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Customer Name</label>
                <Input {...register('customer_name')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Bank Details</label>
                <Input {...register('bank_details')} placeholder="e.g. HDFC A/C XXXX1234" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">UPI ID</label>
                <Input {...register('upi_id')} placeholder="e.g. name@upi" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">TDS Section</label>
                <Input {...register('tds_section')} placeholder="e.g. 194J" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Terms & Conditions</label>
                <Input {...register('terms_conditions')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Notes</label>
                <Input {...register('notes')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} className="text-green" />
              <h2 className="text-sm font-semibold">Line Items</h2>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus size={14} className="mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={index} className="p-3 border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Description</label>
                      <Input
                        {...register(`items.${index}.description`)}
                        error={errors.items?.[index]?.description?.message}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">HSN / SAC</label>
                      <Input {...register(`items.${index}.hsn_sac`)} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Qty</label>
                      <Input type="number" {...register(`items.${index}.quantity`)} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Unit</label>
                      <Input {...register(`items.${index}.unit`)} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Rate</label>
                      <Input type="number" {...register(`items.${index}.rate`)} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">GST %</label>
                      <Input type="number" {...register(`items.${index}.gst_rate`)} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Total (₹)</label>
                      <Input
                        type="number"
                        {...register(`items.${index}.total`)}
                        className="font-mono font-medium"
                      />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full py-2.5 border border-danger rounded-md text-danger text-xs hover:bg-danger/10"
                      >
                        <Minus size={14} /> Remove
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
            <h2 className="text-sm font-semibold">GST & Totals</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">Subtotal</label>
                <p className="text-sm font-medium text-primary-text tnum">{formatMoneyIN(totals.subtotal)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">CGST</label>
                <p className="text-sm font-medium text-primary-text tnum">{formatMoneyIN(totals.cgst)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">SGST</label>
                <p className="text-sm font-medium text-primary-text tnum">{formatMoneyIN(totals.sgst)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">IGST</label>
                <p className="text-sm font-medium text-primary-text tnum">{formatMoneyIN(totals.igst)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">Cess</label>
                <Input type="number" {...register('cess')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">Discount</label>
                <Input type="number" {...register('discount')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">Round Off</label>
                <Input type="number" {...register('round_off')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">Grand Total</label>
                <p className="text-sm font-bold text-primary-text tnum">{formatMoneyIN(totals.grand)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}


