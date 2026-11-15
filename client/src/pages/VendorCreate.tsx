import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  vendorsCreate, vendorsGet, vendorsUpdate,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { ArrowLeft, Save, PlusCircle } from 'lucide-react';
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
  const { state } = useAuth();
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
          <button onClick={() => navigate('/bills')} className="p-2 text-secondary-text hover:text-primary-text hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Vendor' : 'Create Vendor'}</h1>
            <p className="text-secondary-text">Manage your supplier master data with GSTIN and PAN.</p>
          </div>
        </div>
        <Button type="submit" form="vendor-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="mr-2" /> {isEdit ? 'Update' : 'Create'} Vendor</>}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <PlusCircle size={16} className="text-green-600" />
              Vendor Information
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Vendor Name <span className="text-danger">*</span></label>
                <Input {...register('name')} error={errors.name?.message} />
                {errors.name?.message && <p className="text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Trade Name</label>
                <Input {...register('trade_name')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">GSTIN</label>
                <Input {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">PAN</label>
                <Input {...register('pan')} placeholder="ABCDE1234F" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Category</label>
                <Input {...register('category')} placeholder="e.g. Raw Material Supplier" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Payment Terms</label>
                <Input {...register('payment_terms')} placeholder="e.g. Net 30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Address</label>
                <Input {...register('address')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">City</label>
                <Input {...register('city')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">State</label>
                <Input {...register('state')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Pincode</label>
                <Input {...register('pincode')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Contact Email</label>
                <Input type="email" {...register('contact_email')} error={errors.contact_email?.message} />
                {errors.contact_email?.message && <p className="text-xs text-danger">{errors.contact_email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Contact Phone</label>
                <Input {...register('contact_phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text flex items-center gap-2">
                  <input type="checkbox" {...register('is_msme')} className="rounded border-border text-green-600 focus:ring-green-500" />
                  MSME Registered
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
