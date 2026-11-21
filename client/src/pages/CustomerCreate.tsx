import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customersCreate, customersGet, customersUpdate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { ArrowLeft, Save, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  trade_name: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  category: z.string().optional(),
  payment_terms: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

export default function CustomerCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, setValue,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '', trade_name: '', gstin: '', pan: '', address: '', city: '',
      state: '', pincode: '', contact_email: '', contact_phone: '', category: '',
      payment_terms: '',
    },
  });

  useEffect(() => {
    if (id) loadCustomer(id);
    else setLoading(false);
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    try {
      const res = await customersGet(customerId);
      const c = res.data.customer || res.data;
      setValue('name', c.name);
      setValue('trade_name', c.trade_name || '');
      setValue('gstin', c.gstin || '');
      setValue('pan', c.pan || '');
      setValue('address', c.address || '');
      setValue('city', c.city || '');
      setValue('state', c.state || '');
      setValue('pincode', c.pincode || '');
      setValue('contact_email', c.contact_email || '');
      setValue('contact_phone', c.contact_phone || '');
      setValue('category', c.category || '');
      setValue('payment_terms', c.payment_terms || '');
    } catch {}
    setLoading(false);
  };

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...data,
        contact_email: data.contact_email || undefined,
      };
      if (id) {
        await customersUpdate(id, payload);
      } else {
        await customersCreate(payload);
      }
      navigate('/invoices');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save customer');
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
          <button onClick={() => navigate('/invoices')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{isEdit ? 'Edit Customer' : 'Create Customer'}</h1>
            <p className="text-on-surface-variant">Manage your customer master data with GSTIN and PAN.</p>
          </div>
        </div>
        <Button type="submit" form="customer-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="text-on-secondary" /> {isEdit ? 'Update' : 'Create'} Customer</>}
        </Button>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2">
              <PlusCircle size={16} className="text-secondary" />
              Customer Information
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Customer Name <span className="text-error">*</span></label>
                <Input {...register('name')} error={errors.name?.message} />
                {errors.name?.message && <p className="text-xs text-error">{errors.name.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Trade Name</label>
                <Input {...register('trade_name')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">GSTIN</label>
                <Input {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">PAN</label>
                <Input {...register('pan')} placeholder="ABCDE1234F" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Category</label>
                <Input {...register('category')} placeholder="e.g. Retail Customer" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Payment Terms</label>
                <Input {...register('payment_terms')} placeholder="e.g. Net 30" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Address</label>
                <Input {...register('address')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">City</label>
                <Input {...register('city')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">State</label>
                <Input {...register('state')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Pincode</label>
                <Input {...register('pincode')} />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Contact Email</label>
                <Input type="email" {...register('contact_email')} error={errors.contact_email?.message} />
                {errors.contact_email?.message && <p className="text-xs text-error">{errors.contact_email.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Contact Phone</label>
                <Input {...register('contact_phone')} placeholder="+91 98765 43210" />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
