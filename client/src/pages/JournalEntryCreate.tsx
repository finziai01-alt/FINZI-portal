import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { journalEntriesCreate, accountsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { FileText, Minus, PlusCircle, Save } from 'lucide-react';
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
      <div className="px-4 py-5 lg:px-6">
        <div className="h-64 shimmer rounded-xl border border-line mx-auto" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Post Journal Entry"
        description="Double-entry voucher. Total debits must equal total credits."
        actions={
          <Button type="submit" form="je-form" variant="green" disabled={saving} className="ml-auto">
            <Save size={16} className="text-on-secondary mr-2" /> {saving ? 'Posting…' : 'Post Entry'}
          </Button>
        }
        breadcrumb={[{ label: 'Ledger', to: '/ledger' }, { label: 'Post Journal Entry', to: '#' }]}
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Total Debit</p>
          <p className="text-[13px] font-semibold leading-6 text-error tnum">{formatMoneyIN(totals.debit)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Total Credit</p>
          <p className="text-[13px] font-semibold leading-6 text-primary-text tnum">{formatMoneyIN(totals.credit)}</p>
        </div>
        <div className="space-y-1 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Difference</p>
          <p className={`text-[13px] font-bold leading-6 ${balanced ? 'text-brand-ink' : 'text-danger-ink'} tnum`}>
            {formatMoneyIN(totals.debit - totals.credit)} {balanced ? '✓ Balanced' : '✗ Not balanced'}
          </p>
        </div>
      </div>

      <form id="je-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Voucher Details</h2>
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="entry-date"
              label="Entry Date"
              type="date"
              {...register('entry_date')}
            />
            <Select
              id="voucher-type"
              label="Voucher Type"
              value={watch('voucher_type')}
              onChange={(e) => setValue('voucher_type', e.target.value)}
            >
              <option value="JV">Journal Voucher</option>
              <option value="PV">Payment Voucher</option>
              <option value="RV">Receipt Voucher</option>
            </Select>
            <Input
              id="reference-number"
              label="Reference Number"
              {...register('reference_number')}
              placeholder="e.g. JV-2026-001"
            />
            <Input
              id="narration"
              label="Narration"
              {...register('narration')}
              required
              placeholder="e.g. Monthly rent payment"
            />
            <Input
              id="cost-centre"
              label="Cost Centre"
              {...register('cost_centre')}
              placeholder="e.g. Head Office"
            />
          </div>
        </Card>

        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Journal Lines</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <PlusCircle size={14} className="text-on-secondary mr-1" /> Add Line
            </Button>
          </div>
          <div className="overflow-x-auto p-4 border-t border-line">
            <div className="min-w-[700px] divide-y divide-line">
              <div className="grid grid-cols-12 border-b border-line px-3 py-2.5">
                <div className="col-span-4 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Account</div>
                <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Debit (₹)</div>
                <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Credit (₹)</div>
                <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4">Description</div>
                <div className="col-span-1 text-[10px] font-semibold uppercase tracking-[0.062em] text-ink-4 text-right">Cost Centre</div>
              </div>
              {lines.map((_, index) => (
                <div key={index} className="grid grid-cols-12 border-b border-line px-3 py-2.5 items-center">
                  <div className="col-span-4">
                    <Select
                      id={`line-account-${index}`}
                      {...register(`lines.${index}.account_id`)}
                      required
                      error={errors.lines?.[index]?.account_id?.message}
                    >
                      <option value="">Select an account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </Select>
                    {errors.lines?.[index]?.account_id?.message && (
                      <p className="mt-0.5 text-[9px] text-danger-ink">{errors.lines[index].account_id.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <Input id={`line-debit-${index}`} type="number" {...register(`lines.${index}.debit_amount`)} />
                  </div>
                  <div className="col-span-2 text-right">
                    <Input id={`line-credit-${index}`} type="number" {...register(`lines.${index}.credit_amount`)} />
                  </div>
                  <div className="col-span-2">
                    <Input id={`line-description-${index}`} {...register(`lines.${index}.description`)} placeholder="e.g. Rent paid for October" />
                  </div>
                  <div className="col-span-1 text-right">
                    <Input id={`line-cost-centre-${index}`} {...register(`lines.${index}.cost_centre`)} placeholder="e.g. HO" />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 2}
                      className="w-8 h-8 rounded border border-line flex items-center justify-center text-error hover:bg-neg-soft disabled:opacity-40 disabled:pointer-events-none transition-colors duration-micro"
                      title={lines.length <= 2 ? 'A journal needs at least two lines' : 'Remove line'}
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}