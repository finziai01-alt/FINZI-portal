import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vendorsCreate, vendorsGet, vendorsUpdate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
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
  is_msme: z.union([z.boolean(), z.string()]).optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

export default function VendorCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, setValue,
    formState: { errors },
  } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '', trade_name: '', gstin: '', pan: '', address: '', city: '',
      state: '', pincode: '', contact_email: '', contact_phone: '', category: '',
      payment_terms: '', is_msme: false,
    },
  });

  useEffect(() => {
    if (id) loadVendor(id);
    else setLoading(false);
  }, [id]);

  const loadVendor = async (vendorId: string) => {
    try {
      const res = await vendorsGet(vendorId);
      const v = res.data.vendor || res.data;
      setValue('name', v.name);
      setValue('trade_name', v.trade_name || '');
      setValue('gstin', v.gstin || '');
      setValue('pan', v.pan || '');
      setValue('address', v.address || '');
      setValue('city', v.city || '');
      setValue('state', v.state || '');
      setValue('pincode', v.pincode || '');
      setValue('contact_email', v.contact_email || '');
      setValue('contact_phone', v.contact_phone || '');
      setValue('category', v.category || '');
      setValue('payment_terms', v.payment_terms || '');
      setValue('is_msme', v.is_msme ? true : false);
    } catch {}
    setLoading(false);
  };

  const onSubmit = async (data: VendorForm) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...data,
        contact_email: data.contact_email || undefined,
        is_msme: data.is_msme === true || data.is_msme === 'true',
      };
      if (id) {
        await vendorsUpdate(id, payload);
      } else {
        await vendorsCreate(payload);
      }
      navigate('/bills');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save vendor');
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
        title={isEdit ? 'Edit Vendor' : 'Create Vendor'}
        description="Manage your supplier master data with GSTIN and PAN."
        actions={
          <Button type="submit" form="vendor-form" variant="green" disabled={saving} className="ml-auto">
            <Save size={16} className="text-on-secondary mr-2" /> {saving ? 'Saving…' : `${isEdit ? 'Update' : 'Create'} Vendor`}
          </Button>
        }
        breadcrumb={[{ label: 'Bills', to: '/bills' }, { label: isEdit ? 'Edit Vendor' : 'Create Vendor', to: '#' }]}
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card flush>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="vendor-name"
              label="Vendor Name"
              {...register('name')}
              error={errors.name?.message}
              required
            />
            {errors.name?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.name.message}</p>}
            <Input
              id="vendor-trade-name"
              label="Trade Name"
              {...register('trade_name')}
            />
            <Input
              id="vendor-gstin"
              label="GSTIN"
              {...register('gstin')}
              hint="22AAAAA0000A1Z5"
            />
            <Input
              id="vendor-pan"
              label="PAN"
              {...register('pan')}
              hint="ABCDE1234F"
            />
            <Input
              id="vendor-category"
              label="Category"
              {...register('category')}
              placeholder="e.g. Raw Material Supplier"
            />
            <Input
              id="vendor-payment-terms"
              label="Payment Terms"
              {...register('payment_terms')}
              placeholder="e.g. Net 30"
            />
            <Input
              id="vendor-address"
              label="Address"
              {...register('address')}
            />
            <Input
              id="vendor-city"
              label="City"
              {...register('city')}
            />
            <Input
              id="vendor-state"
              label="State"
              {...register('state')}
            />
            <Input
              id="vendor-pincode"
              label="Pincode"
              {...register('pincode')}
            />
            <Input
              id="vendor-email"
              label="Contact Email"
              type="email"
              {...register('contact_email')}
            />
            <Input
              id="vendor-phone"
              label="Contact Phone"
              type="tel"
              {...register('contact_phone')}
            />
            <div className="flex items-center space-x-2">
              <input
                id="vendor-is-msme"
                type="checkbox"
                {...register('is_msme')}
                className="rounded border border-line bg-surface text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0 checked:bg-brand checked:border-brand"
              />
              <label htmlFor="vendor-is-msme" className="text-[11px] leading-4 text-primary-text cursor-pointer">
                MSME registered
              </label>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}