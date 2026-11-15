import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bankAccountsList, bankTransactionsList, bankStatementImport } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { Plus, Search, Banknote, CreditCard, Upload, ArrowRight } from 'lucide-react';

export default function Banking() {
  const { state } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        bankAccountsList(),
        bankTransactionsList({ search }),
      ]);
      setAccounts(accRes.data.accounts || []);
      setTransactions(txRes.data.transactions || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Banking</h1>
          <p className="text-secondary-text">Manage bank accounts, transactions and reconciliation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="green">
            <Plus size={16} /> Add Account
          </Button>
          <Button variant="outline">
            <Upload size={16} /> Import Statement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Bank Accounts</div>
          <div className="text-2xl font-bold text-primary-text tnum">{accounts.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Book Balance</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {formatMoneyIN(accounts.reduce((s, a) => s + a.book_balance, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Unmatched</div>
          <div className="text-2xl font-bold text-warning tnum">
            {transactions.filter(t => t.status === 'unmatched').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Reconciled</div>
          <div className="text-2xl font-bold text-green-600 tnum">
            {transactions.filter(t => t.status === 'reconciled').length}
          </div>
        </Card>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Bank Transactions</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-secondary-text">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-secondary-text">No transactions found</td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-secondary-text">{tx.transaction_date}</td>
                      <td className="px-4 py-3 text-primary-text">{tx.description}</td>
                      <td className="px-4 py-3 text-right text-primary-text tnum">
                        {tx.amount < 0 ? '-' : '+'}{formatMoneyIN(Math.abs(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-right text-secondary-text tnum">{formatMoneyIN(tx.balance_after || 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs">
                          Match <ArrowRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
