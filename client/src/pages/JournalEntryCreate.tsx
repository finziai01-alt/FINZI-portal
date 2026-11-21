import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { journalEntriesCreate, accountsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { ArrowLeft, Plus, Minus, Save, FileText, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const jeSchema = z.object({
  entry_date: z.string().min(1, 'Entry date is required'),
  voucher_type: z.string().default('JV'),
  reference_number: z.string().optional(),
  narration: z.string().min(1, 'Narration is required'),
  cost_centre: z.string().optional(),
  lines: z.array(
    z.object({
      account_id: z.string().min(1, 'Select an account'),
      account_code: z.string().optional(),
      account_name: z.string().optional(),
      debit_amount: z.coerce.number().min(0),
      credit_amount: z.coerce.number().min(0),
      description: z.string().optional(),
      cost_centre: z.string().optional(),
    }),
  ).min(2, 'Add at least two lines'),
});

type JEForm = z.infer<typeof jeSchema>;

const initialLine = {
  account_id: '', account_code: '', account_name: '', debit_amount: 0, credit_amount: 0,
  description: '', cost_centre: '',
};

export default function JournalEntryCreate() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, watch, setValue, getValues,
    formState: { errors },
  } = useForm<JEForm>({
    resolver: zodResolver(jeSchema),
    defaultValues: {
      entry_date: '', voucher_type: 'JV', reference_number: '', narration: '',
      cost_centre: '', lines: [initialLine],
    },
  });

  const lines = watch('lines');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await accountsList();
      setAccounts(res.data.accounts || []);
    } catch {}
    setLoading(false);
  };

  const addLine = () => {
    setValue('lines', [...getValues('lines'), { ...initialLine }]);
  };

  const removeLine = (index: number) => {
    const current = getValues('lines');
    if (current.length <= 2) return;
    setValue('lines', current.filter((_, i) => i !== index));
  };

  const accountChanged = (index: number, value: string) => {
    const acct = accounts.find((a) => a.code === value || a.id === value);
    const current = getValues('lines');
    const next = [...current];
    next[index] = {
      ...next[index],
      account_id: acct ? acct.id : value,
      account_code: acct?.code || '',
      account_name: acct?.name || '',
    };
    setValue('lines', next);
  };

  const totals = lines.reduce(
    (acc, l) => ({
      debit: acc.debit + Number(l.debit_amount || 0),
      credit: acc.credit + Number(l.credit_amount || 0),
    }),
    { debit: 0, credit: 0 },
  );
  const balanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const onSubmit = async (data: JEForm) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        entry_date: data.entry_date,
        voucher_type: data.voucher_type,
        reference_number: data.reference_number || undefined,
        narration: data.narration,
        cost_centre: data.cost_centre || undefined,
        lines: data.lines.map((l) => ({
          account_id: l.account_id,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
          description: l.description || undefined,
          cost_centre: l.cost_centre || undefined,
        })),
      };
      await journalEntriesCreate(payload);
      navigate('/ledger');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to post journal entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 h-64 flex items-center justify-center animate-pulse">
          <div className="text-on-surface-variant">Loading accounts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/ledger')} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Post Journal Entry</h1>
            <p className="text-on-surface-variant">Double-entry voucher. Total debits must equal total credits.</p>
          </div>
        </div>
        <Button type="submit" form="je-form" variant="green" disabled={saving} className="px-5">
          {saving ? 'Posting...' : <><Save size={16} className="text-on-secondary" /> Post Entry</>}
        </Button>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <div className="mb-space-md p-space-md rounded-lg border border-outline bg-surface-container-low flex items-center justify-between">
        <div>
          <p className="text-xs text-on-surface-variant">Total Debit</p>
          <p className="text-sm font-medium text-error tnum">{formatMoneyIN(totals.debit)}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Total Credit</p>
          <p className="text-sm font-medium text-secondary tnum">{formatMoneyIN(totals.credit)}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Difference</p>
          <p className={`text-xs font-medium ${balanced ? 'text-secondary' : 'text-error'} tnum`}>
            {formatMoneyIN(totals.debit - totals.credit)} {balanced ? '✓ Balanced' : '✗ Not balanced'}
          </p>
        </div>
      </div>

      <form id="je-form" onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2">
              <FileText size={16} /> Voucher Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Entry Date</label>
                <Input type="date" {...register('entry_date')} />
                {errors.entry_date?.message && <p className="text-xs text-error">{errors.entry_date.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Voucher Type</label>
                <Input {...register('voucher_type')} defaultValue="JV" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Reference Number</label>
                <Input {...register('reference_number')} placeholder="e.g. BK-101" />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Narration</label>
                <Input {...register('narration')} placeholder="e.g. Office rent for November" />
                {errors.narration?.message && <p className="text-xs text-error">{errors.narration.message}</p>}
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface">Cost Centre</label>
                <Input {...register('cost_centre')} placeholder="e.g. Head Office" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} className="text-secondary" />
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Debit / Credit Lines</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus size={14} className="text-on-surface-variant mr-1" /> Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-space-sm">
              {lines.map((line, index) => (
                <Card key={index} className="p-3 border border-outline">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Account Code / Name</label>
                      <select
                        {...register(`lines.${index}.account_id`)}
                        onChange={(e) => accountChanged(index, e.target.value)}
                        className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                      {line.account_code && (
                        <p className="text-xs text-on-surface-variant">{line.account_code} — {line.account_name}</p>
                      )}
                      {errors.lines?.[index]?.account_id?.message && (
                        <p className="text-xs text-error">{errors.lines[index].account_id.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Debit (₹)</label>
                      <Input
                        type="number"
                        {...register(`lines.${index}.debit_amount`)}
                        error={errors.lines?.[index]?.debit_amount?.message}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Credit (₹)</label>
                      <Input
                        type="number"
                        {...register(`lines.${index}.credit_amount`)}
                        error={errors.lines?.[index]?.credit_amount?.message}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Description</label>
                      <Input {...register(`lines.${index}.description`)} placeholder="e.g. Rent expense" />
                    </div>
                    <div className="md:col-span-2 space-y-space-sm">
                      <label className="text-xs font-medium text-on-surface-variant">Cost Centre</label>
                      <Input {...register(`lines.${index}.cost_centre`)} />
                    </div>
                    <div className="md:col-span-1 space-y-space-sm">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="w-full py-2.5 border border-error rounded-md text-error text-xs hover:bg-error-container/40"
                      >
                        <Minus size={14} className="text-error" /> Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {!balanced && (
          <div className="p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm text-center">
            Journal entry is not balanced. Total debit ({formatMoneyIN(totals.debit)}) must equal total credit ({formatMoneyIN(totals.credit)}).
          </div>
        )}
      </form>
    </div>
  );
}
