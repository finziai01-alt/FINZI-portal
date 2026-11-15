import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  journalEntriesCreate, accountsList,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { ArrowLeft, Plus, Minus, Save, FileText } from 'lucide-react';
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
      debit_amount: z.coerce.number().min(0),
      credit_amount: z.coerce.number().min(0),
      description: z.string().optional(),
      cost_centre: z.string().optional(),
    }),
  ).min(2, 'Add at least two lines')
    .refine((lines) => {
      const debit = lines.reduce((s, l) => s + Number(l.debit_amount || 0), 0);
      const credit = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
      return Math.abs(debit - credit) < 0.01;
    }, 'Journal entry must balance (total debit = total credit)')
    .refine((lines) => lines.every((l) => !(l.debit_amount > 0 && l.credit_amount > 0)), 'A line cannot have both debit and credit'),
});

type JEForm = z.infer<typeof jeSchema>;

const initialLine = {
  account_id: '', account_code: '', account_name: '', debit_amount: 0, credit_amount: 0,
  description: '', cost_centre: '',
};

export default function JournalEntryCreate() {
  const { state } = useAuth();
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
    next[index] = { ...next[index], account_id: acct ? acct.id : value };
    if (acct) {
      next[index].account_code = acct.code;
      next[index].account_name = acct.name;
    }
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
        <div className="animate-pulse bg-surface border border-border rounded-lg p-8 h-64 flex items-center justify-center">
          <div className="text-secondary-text">Loading accounts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ledger')} className="p-2 text-secondary-text hover:text-primary-text hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Post Journal Entry</h1>
            <p className="text-secondary-text">Double-entry voucher. Total debits must equal total credits.</p>
          </div>
        </div>
        <Button type="submit" form="je-form" variant="green" disabled={saving || !balanced} className="px-5">
          {saving ? 'Posting...' : <><Save size={16} className="mr-2" /> Post Entry</>}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 p-3 rounded-lg border border-border bg-surface-container-low flex items-center justify-between">
        <div>
          <p className="text-xs text-secondary-text">Total Debit</p>
          <p className="text-sm font-medium text-red-600 tnum">{formatMoneyIN(totals.debit)}</p>
        </div>
        <div>
          <p className="text-xs text-secondary-text">Total Credit</p>
          <p className="text-sm font-medium text-green tnum">{formatMoneyIN(totals.credit)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-secondary-text">Difference</p>
          <p className={`text-sm font-medium ${balanced ? 'text-green' : 'text-danger'} tnum`}>
            {formatMoneyIN(totals.debit - totals.credit)} {balanced ? '✓ Balanced' : '✗ Not balanced'}
          </p>
        </div>
      </div>

      <form id="je-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText size={16} /> Voucher Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Entry Date</label>
                <Input type="date" {...register('entry_date')} />
                {errors.entry_date?.message && <p className="text-xs text-danger">{errors.entry_date.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Voucher Type</label>
                <Input {...register('voucher_type')} defaultValue="JV" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Reference Number</label>
                <Input {...register('reference_number')} placeholder="e.g. BK-101" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Narration</label>
                <Input {...register('narration')} placeholder="e.g. Office rent for November" />
                {errors.narration?.message && <p className="text-xs text-danger">{errors.narration.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Cost Centre</label>
                <Input {...register('cost_centre')} placeholder="e.g. Head Office" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} className="text-green" />
              <h2 className="text-sm font-semibold">Debit / Credit Lines</h2>
            </div>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus size={14} className="mr-1" /> Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <Card key={index} className="p-3 border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Account Code / Name</label>
                      <select
                        {...register(`lines.${index}.account_id`)}
                        onChange={(e) => accountChanged(index, e.target.value)}
                        className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                      {line.account_code && (
                        <p className="text-xs text-secondary-text">{line.account_code} — {line.account_name}</p>
                      )}
                      {errors.lines?.[index]?.account_id?.message && (
                        <p className="text-xs text-danger">{errors.lines[index].account_id.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Debit (₹)</label>
                      <Input
                        type="number"
                        {...register(`lines.${index}.debit_amount`)}
                        error={errors.lines?.[index]?.debit_amount?.message}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Credit (₹)</label>
                      <Input
                        type="number"
                        {...register(`lines.${index}.credit_amount`)}
                        error={errors.lines?.[index]?.credit_amount?.message}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Description</label>
                      <Input {...register(`lines.${index}.description`)} placeholder="e.g. Rent expense" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-secondary-text">Cost Centre</label>
                      <Input {...register(`lines.${index}.cost_centre`)} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
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

        {!balanced && (
          <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm text-center">
            Journal entry is not balanced. Total debit ({formatMoneyIN(totals.debit)}) must equal total credit ({formatMoneyIN(totals.credit)}).
          </div>
        )}
      </form>
    </div>
  );
}



