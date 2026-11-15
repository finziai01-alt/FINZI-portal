import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsList, journalEntriesList } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { Plus, Search, FileText, CreditCard, PlusCircle } from 'lucide-react';

export default function Ledger() {
  const { state } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accRes, entryRes] = await Promise.all([
        accountsList(),
        journalEntriesList({ search }),
      ]);
      setAccounts(accRes.data.accounts || []);
      setEntries(entryRes.data.entries || []);
    } catch {}
    setLoading(false);
  };

  const handleCreateEntry = () => {
    navigate('/ledger/create');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ledger & Accounts</h1>
          <p className="text-secondary-text">Chart of accounts and journal entry posting.</p>
        </div>
        <Button variant="green" onClick={handleCreateEntry}>
          <PlusCircle size={16} /> Post Journal Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Total Accounts</div>
          <div className="text-2xl font-bold text-primary-text tnum">{accounts.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Journal Entries</div>
          <div className="text-2xl font-bold text-primary-text tnum">{entries.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Assets</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {formatMoneyIN(accounts.filter(a => a.account_type === 'asset').reduce((s, a) => s + a.current_balance, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Liabilities</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {formatMoneyIN(accounts.filter(a => a.account_type === 'liability').reduce((s, a) => s + a.current_balance, 0))}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search accounts or journal entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Chart of Accounts</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Account Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-secondary-text">Loading...</td></tr>
                    ) : accounts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-secondary-text">No accounts found</td>
                      </tr>
                    ) : (
                      accounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-border hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-mono text-primary-text">{acc.code}</td>
                          <td className="px-4 py-3 text-primary-text">{acc.name}</td>
                          <td className="px-4 py-3 text-xs text-secondary-text">{acc.account_group}</td>
                          <td className="px-4 py-3 text-xs text-secondary-text capitalize">{acc.account_type}</td>
                          <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(acc.current_balance)}</td>
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
              <h2 className="text-sm font-semibold">Recent Journal Entries</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3">
                {loading || entries.length === 0 ? (
                  <div className="px-4 py-8 text-center text-secondary-text">
                    {loading ? 'Loading...' : 'No journal entries yet'}
                  </div>
                ) : (
                  entries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-secondary-text shrink-0">
                        {entry.entry_number.replace('JV-', '')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-primary-text">{entry.entry_number}</p>
                        <p className="text-xs text-secondary-text">{entry.narration}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-medium text-green-600">{formatMoneyIN(entry.total_debit)}</span>
                          <span className="text-xs font-medium text-red-600">{formatMoneyIN(entry.total_credit)}</span>
                        </div>
                      </div>
                      <StatusBadge status={entry.status} className="self-start mt-0.5" />
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
