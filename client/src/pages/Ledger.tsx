import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { journalEntriesList, trialBalance } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Search, PlusCircle } from 'lucide-react';

export default function Ledger() {
  const navigate = useNavigate();
  const [trialRows, setTrialRows] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Ledger & Accounts</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">Chart of accounts and journal entry posting.</p>
        </div>
        <Button variant="green" onClick={handleCreateEntry}>
          <PlusCircle size={16} className="text-on-secondary" /> Post Journal Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Accounts</div>
          <div className="text-2xl font-bold text-on-surface tnum">{trialRows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Journal Entries</div>
          <div className="text-2xl font-bold text-on-surface tnum">{entries.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Debit</div>
          <div className="text-2xl font-bold text-on-surface tnum">{formatMoneyIN(totals.debit)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Credit</div>
          <div className="text-2xl font-bold text-on-surface tnum">{formatMoneyIN(totals.credit)}</div>
        </Card>
      </div>

      <div className="flex items-center gap-space-sm mb-space-md">
        <div className="flex-1 max-w-md">
          <Input
            icon={<Search size={16} className="text-on-surface-variant" />}
            placeholder="Search trial balance or journal entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Trial Balance</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Account Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Group</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">Loading...</td></tr>
                    ) : filteredTrialRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No trial balance rows found</td>
                      </tr>
                    ) : (
                      filteredTrialRows.map((row) => (
                        <tr key={row.code} className="border-b border-outline hover:bg-surface-container-low">
                          <td className="px-4 py-3 text-xs font-mono text-on-surface">{row.code}</td>
                          <td className="px-4 py-3 text-on-surface">{row.name}</td>
                          <td className="px-4 py-3 text-xs text-on-surface-variant capitalize">{row.group}</td>
                          <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(row.debit)}</td>
                          <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(row.credit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Recent Journal Entries</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3">
                {loading || filteredEntries.length === 0 ? (
                  <div className="px-4 py-8 text-center text-on-surface-variant">
                    {loading ? 'Loading...' : 'No journal entries found'}
                  </div>
                ) : (
                  filteredEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 border-b border-outline last:border-0">
                      <div className="w-6 h-6 rounded-full bg-surface-container-low flex items-center justify-center text-xs text-secondary-text shrink-0">
                        {entry.entry_number.replace('JV-', '')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-on-surface">{entry.entry_number}</p>
                        <p className="text-xs text-on-surface-variant">{entry.narration}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{formatDateIN(entry.entry_date || '')}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-medium text-secondary">{formatMoneyIN(entry.total_debit)}</span>
                          <span className="text-xs font-medium text-error">{formatMoneyIN(entry.total_credit)}</span>
                        </div>
                      </div>
                      <StatusBadge status={entry.status} className="self-start mt-0" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
