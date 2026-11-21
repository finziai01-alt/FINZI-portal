import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountsCreate, accountsGet, accountsUpdate, accountsList } from '../services/api';
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
          <button onClick={() => navigate('/ledger')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{isEdit ? 'Edit Account' : 'Create Account'}</h1>
            <p className="text-on-surface-variant">Add an account to your chart of accounts.</p>
          </div>
        </div>
        <Button type="submit" form="account-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Saving...' : <><Save size={16} className="text-on-secondary" /> {isEdit ? 'Update' : 'Create'} Account</>}
        </Button>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2">
              <PlusCircle size={16} className="text-secondary" />
              Account Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Account Code <span className="text-error">*</span></label>
                <Input {...register('code')} placeholder="e.g. 530100" error={errors.code?.message} />
                {errors.code?.message && <p className="text-xs text-error">{errors.code.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Account Name <span className="text-error">*</span></label>
                <Input {...register('name')} placeholder="e.g. Rent Expense" error={errors.name?.message} />
                {errors.name?.message && <p className="text-xs text-error">{errors.name.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Account Group <span className="text-error">*</span></label>
                <select
                  {...register('account_group')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select group</option>
                  {groups.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                {errors.account_group?.message && <p className="text-xs text-error">{errors.account_group.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Account Type</label>
                <Input {...register('account_type')} placeholder="e.g. Expense" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Parent Account</label>
                <select
                  {...register('parent_id')}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">No parent (top-level)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Opening Balance (₹)</label>
                <Input type="number" {...register('opening_balance')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
      </div>
  );
}
