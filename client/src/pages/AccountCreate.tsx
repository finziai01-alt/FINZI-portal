import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  accountsCreate, accountsGet, accountsUpdate,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { ArrowLeft, Save, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const accountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(1, 'Account name is required'),
  account_group: z.string().min(1, 'Select a group'),
  account_type: z.string().optional(),
  parent_id: z.string().optional(),
  opening_balance: z.coerce.number().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;

const groups = [
  { value: 'assets', label: 'Assets' },
  { value: 'liabilities', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

export default function AccountCreate() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, setValue,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: '', name: '', account_group: '', account_type: '', parent_id: '', opening_balance: 0,
    },
  });

  useEffect(() => {
    loadData();
    if (id) loadAccount(id);
  }, [id]);

  const loadData = async () => {
    try {
      const res = await accountsList();
      setAccounts(res.data.accounts || []);
    } catch {}
    setLoading(false);
  };

  const loadAccount = async (accountId: string) => {
    try {
      const res = await accountsGet(accountId);
      const a = res.data.account || res.data;
      setValue('code', a.code);
      setValue('name', a.name);
      setValue('account_group', a.account_group);
      setValue('account_type', a.account_type || '');
      setValue('parent_id', a.parent_id || '');
      setValue('opening_balance', a.opening_balance || 0);
    } catch {}
  };

  const onSubmit = async (data: AccountForm) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...data,
        account_type: data.account_type || undefined,
        parent_id: data.parent_id || undefined,
        opening_balance: data.opening_balance || 0,
      };
      if (id) {
        await accountsUpdate(id, payload);
      } else {
        await accountsCreate(payload);
      }
      navigate('/ledger');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save account');
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
          <button onClick={() => navigate('/ledger')} className="p-2 text-secondary-text hover:text-primary-text hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Account' : 'Create Account'}</h1>
            <p className="text-secondary-text">Add an account to your chart of accounts.</p>
          </div>
        </div>
        <Button type="submit" form="account-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="mr-2" /> {isEdit ? 'Update' : 'Create'} Account</>}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <PlusCircle size={16} className="text-green-600" />
              Account Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Account Code <span className="text-danger">*</span></label>
                <Input {...register('code')} placeholder="e.g. 530100" error={errors.code?.message} />
                {errors.code?.message && <p className="text-xs text-danger">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Account Name <span className="text-danger">*</span></label>
                <Input {...register('name')} placeholder="e.g. Rent Expense" error={errors.name?.message} />
                {errors.name?.message && <p className="text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Account Group <span className="text-danger">*</span></label>
                <select
                  {...register('account_group')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select group</option>
                  {groups.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                {errors.account_group?.message && <p className="text-xs text-danger">{errors.account_group.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Account Type</label>
                <Input {...register('account_type')} placeholder="e.g. Expense" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Parent Account</label>
                <select
                  {...register('parent_id')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">No parent (top-level)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Opening Balance (₹)</label>
                <Input type="number" {...register('opening_balance')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
