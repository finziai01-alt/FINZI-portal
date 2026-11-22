import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsCreate } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Save } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '', trade_name: '', gstin: '', pan: '', address: '', city: '',
      state: '', pincode: '', contact_email: '', contact_phone: '', category: '',
      payment_terms: '',
    },
  });

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...data,
        contact_email: data.contact_email || undefined,
      };
      await clientsCreate(payload);
      navigate('/clients');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Create Customer"
        description="Manage your customer master data with GSTIN and PAN."
        actions={
          <Button type="submit" form="customer-form" variant="green" disabled={saving} className="ml-auto">
            <Save size={16} className="text-on-secondary mr-2" /> {saving ? 'Saving…' : 'Create Customer'}
          </Button>
        }
        breadcrumb={[{ label: 'Clients', to: '/clients' }, { label: 'Create Customer', to: '#' }]}
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card flush>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="customer-name"
              label="Customer Name"
              {...register('name')}
              error={errors.name?.message}
              required
            />
            {errors.name?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.name.message}</p>}
            <Input
              id="customer-trade-name"
              label="Trade Name"
              {...register('trade_name')}
            />
            <Input
              id="customer-gstin"
              label="GSTIN"
              {...register('gstin')}
              hint="22AAAAA0000A1Z5"
            />
            <Input
              id="customer-pan"
              label="PAN"
              {...register('pan')}
              hint="ABCDE1234F"
            />
            <Input
              id="customer-category"
              label="Category"
              {...register('category')}
              placeholder="e.g. Manufacturing"
            />
            <Input
              id="customer-payment-terms"
              label="Payment Terms"
              {...register('payment_terms')}
              placeholder="e.g. Net 30"
            />
            <Input
              id="customer-address"
              label="Address"
              {...register('address')}
            />
            <Input
              id="customer-city"
              label="City"
              {...register('city')}
            />
            <Input
              id="customer-state"
              label="State"
              {...register('state')}
            />
            <Input
              id="customer-pincode"
              label="Pincode"
              {...register('pincode')}
            />
            <Input
              id="customer-email"
              label="Contact Email"
              type="email"
              {...register('contact_email')}
            />
            <Input
              id="customer-phone"
              label="Contact Phone"
              type="tel"
              {...register('contact_phone')}
            />
          </div>
        </Card>
      </form>
    </div>
  );
}