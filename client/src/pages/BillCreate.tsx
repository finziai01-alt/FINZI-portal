import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  billsCreate, billsGet, vendorsList, accountsList,
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

export default function BillCreate() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [vendors, setVendors] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, control, handleSubmit, watch, setValue, getValues, clearErrors,
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
      setValue('invoice_date', b.invoice_date ? formatDateIN(b.invoice_date) : '');
      setValue('due_date', b.due_date ? formatDateIN(b.due_date) : '');
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
    const cur = getValues('items');
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, cess = 0, grand = 0;
    for (const it of cur) {
      taxable += it.taxable_amount || 0;
      cgst += it.cgst || 0;
      sgst += it.sgst || 0;
      igst += it.igst || 0;
      cess += 0;
      grand += it.total || 0;
    }
    return { taxable, cgst, sgst, igst, cess, grand };
  };

  const totals = computeTotals();

  const onSubmit = async (data: BillForm) => {
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
          <button onClick={() => navigate('/bills')} className="p-2 text-secondary-text hover:text-primary-text hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Bill' : 'Create Bill'}</h1>
            <p className="text-secondary-text">Record a purchase bill with GST line items.</p>
          </div>
        </div>
        <Button type="submit" form="bill-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="mr-2" /> {isEdit ? 'Update' : 'Create'} Bill</>}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form id="bill-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText size={16} /> Bill Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Bill Number</label>
                <Input
                  {...register('bill_number')}
                  placeholder="e.g. BILL-1001"
                  error={errors.bill_number?.message}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Vendor</label>
                <select
                  {...register('vendor_id')}
                  onChange={(e) => {
                    setValue('vendor_id', e.target.value);
                    const v = vendors.find((x) => x.id === e.target.value);
                    setValue('vendor_name', v ? v.name : '');
                    setValue('vendor_gstin', v ? v.gstin : '');
                  }}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {errors.vendor_id?.message && <p className="text-xs text-danger">{errors.vendor_id.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Vendor GSTIN</label>
                <Input
                  {...register('vendor_gstin')}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Invoice Number</label>
                <Input {...register('invoice_number')} placeholder="e.g. INV-88" />
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
                <label className="text-sm font-medium text-primary-text">Purchase Account</label>
                <select
                  {...register('purchase_account')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Cost Centre</label>
                <Input {...register('cost_centre')} placeholder="e.g. Head Office" />
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
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Vendor Name</label>
                <Input {...register('vendor_name')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Notes</label>
                <Input {...register('notes')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">TDS Section</label>
                <Input {...register('tds_section')} placeholder="e.g. 194C" />
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
                <label className="text-xs font-medium text-secondary-text">Taxable Value</label>
                <p className="text-sm font-medium text-primary-text tnum">{formatMoneyIN(totals.taxable)}</p>
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


