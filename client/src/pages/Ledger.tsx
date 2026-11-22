import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { journalEntriesList, trialBalance } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, RowLabel, RowValue } from '../components/ui/DataTable';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { PlusCircle, Search } from 'lucide-react';

export default function Ledger() {
  const navigate = useNavigate();
  const [trialRows, setTrialRows] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError('');
    try {
      const [entryRes, balanceRes] = await Promise.all([
        journalEntriesList(),
        trialBalance(),
      ]);
      setEntries(entryRes.data.journal_entries || []);
      setTrialRows(balanceRes.data.trial_balance || []);
      setTotals({
        debit: Number(balanceRes.data.total_debit || 0),
        credit: Number(balanceRes.data.total_credit || 0),
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load ledger data');
    }
  };

  const handleCreateEntry = () => navigate('/ledger/create');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredTrialRows = trialRows.filter((row) =>
    [row.code, row.name, row.group].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
  );
  const filteredEntries = entries.filter((entry) =>
    [entry.entry_number, entry.narration].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
  );
  const balanced = Math.abs(totals.debit - totals.credit) < 0.005;

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Ledger & Accounts"
        description="Chart of accounts and journal entry posting. Every posting must balance — debits equal credits."
        actions={
          <Button variant="green" onClick={handleCreateEntry}>
            <PlusCircle size={16} className="text-on-secondary" /> Post Journal Entry
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Accounts" note={`${trialRows.length} accounts in the chart of accounts`} metrics={[{ label: 'Accounts', value: String(trialRows.length) }]} />
        <StatCard title="Total Debits" readout={{ value: formatMoneyIN(totals.debit), tone: 'accent' }} metrics={[{ label: 'Posted', value: String(entries.length) }]} />
        <StatCard title="Total Credits" readout={{ value: formatMoneyIN(totals.credit), tone: 'accent' }} metrics={[{ label: 'Posted', value: String(entries.length) }]} />
        <StatCard title="Balance" note={balanced ? 'Debits equal credits' : 'Books do not balance'} readout={{ value: formatMoneyIN(Math.abs(totals.debit - totals.credit)), tone: balanced ? 'positive' : 'negative' }} metrics={[{ label: 'Status', value: balanced ? 'Balanced' : 'Out of balance' }]} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 max-w-md">
          <Input
            icon={<Search size={16} className="text-on-surface-variant" />}
            placeholder="Search accounts or journal entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Chart of accounts</h2>
              <p className="mt-0.5 text-[10px] leading-3 text-ink-3">Opening balances as per the trial balance</p>
            </div>
          </div>
          <div className="p-4">
            <DataTable
              columns={[
                {
                  key: 'code',
                  label: 'CODE',
                  render: (row) => <RowValue value={row.code} tone="neutral" />,
                },
                { key: 'name', label: 'ACCOUNT', render: (row) => <RowLabel title={row.name} meta={row.group} /> },
                { key: 'group', label: 'GROUP', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.group}</span> },
                { key: 'debit', label: 'DEBIT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.debit || 0)} tone="neutral" /> },
                { key: 'credit', label: 'CREDIT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.credit || 0)} tone="neutral" /> },
              ]}
              rows={filteredTrialRows}
              emptyMessage="No accounts found"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Journal entries</h2>
              <p className="mt-0.5 text-[10px] leading-3 text-ink-3">Posted double-entry postings</p>
            </div>
          </div>
          <div className="p-4">
            <DataTable
              columns={[
                { key: 'entry_number', label: 'VOUCHER', render: (row) => <Link to={`/ledger/${row.id}`}>{row.entry_number}</Link> },
                { key: 'entry_date', label: 'DATE', align: 'right', render: (row) => <RowValue value={formatDateIN(row.entry_date)} tone="neutral" /> },
                { key: 'narration', label: 'NARRATION', render: (row) => <RowLabel title={row.narration || '—'} /> },
                { key: 'debit', label: 'DEBIT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.total_debit || 0)} tone="neutral" /> },
                { key: 'credit', label: 'CREDIT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.total_credit || 0)} tone="neutral" /> },
                {
                  key: 'status',
                  label: 'STATUS',
                  align: 'right',
                  render: (row) => <StatusBadge status={row.status} />,
                },
              ]}
              rows={filteredEntries}
              emptyMessage="No journal entries posted yet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}