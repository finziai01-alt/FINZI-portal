import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsCreate, accountsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
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
  const [accounts, setAccounts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: '', name: '', account_group: '', account_type: '', parent_id: '', opening_balance: 0,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await accountsList();
      setAccounts(res.data.accounts || []);
    } catch {}
  };

  const onSubmit = async (data: AccountForm) => {
    setSaving(true);
    setError('');
    try {
      await accountsCreate({
        ...data,
        opening_balance: data.opening_balance || 0,
      });
      navigate('/ledger');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Create Account"
        description="Add an account to the chart of accounts."
        actions={
          <Button type="submit" form="account-form" variant="green" disabled={saving} className="ml-auto">
            <Save size={16} className="text-on-secondary mr-2" /> {saving ? 'Saving…' : 'Create Account'}
          </Button>
        }
        breadcrumb={[{ label: 'Ledger', to: '/ledger' }, { label: 'Create Account', to: '#' }]}
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card flush>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="account-code"
              label="Account Code"
              {...register('code')}
              error={errors.code?.message}
              required
              placeholder="e.g. 110100"
            />
            {errors.code?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.code.message}</p>}
            <Input
              id="account-name"
              label="Account Name"
              {...register('name')}
              error={errors.name?.message}
              required
              placeholder="e.g. Cash on Hand"
            />
            {errors.name?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.name.message}</p>}
            <Select
              id="account-group"
              label="Account Group"
              value={watch('account_group')}
              onChange={(e) => setValue('account_group', e.target.value)}
              required
              hint="Select the account group"
            >
              <option value="">Select a group</option>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
            {errors.account_group?.message && <p className="md:col-span-3 text-[10px] text-danger-ink">{errors.account_group.message}</p>}
            <Input
              id="account-type"
              label="Account Type"
              {...register('account_type')}
              placeholder="e.g. Bank"
            />
            <Select
              id="parent-account"
              label="Parent Account"
              value={watch('parent_id')}
              onChange={(e) => setValue('parent_id', e.target.value)}
              hint="Optional parent account for grouping"
            >
              <option value="">No parent account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </Select>
            <Input
              id="opening-balance"
              label="Opening Balance (₹)"
              type="number"
              step="0.01"
              min="0"
              {...register('opening_balance')}
            />
          </div>
        </Card>
      </form>
    </div>
  );
}