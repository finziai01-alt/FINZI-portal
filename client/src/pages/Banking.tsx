import React, { useEffect, useState } from 'react';
import {
  bankAccountsCreate,
  bankAccountsList,
  bankStatementImport,
  bankTransactionMatch,
  bankTransactionsList,
  billsList,
  invoicesList,
} from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { ArrowRight, Plus, Search, Upload } from 'lucide-react';

type CsvRow = { transaction_date: string; value_date: string; description: string; reference: string; debit: string; credit: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const pick = (row: string[], names: string[]) => {
    const index = header.findIndex((h) => names.includes(h));
    return index >= 0 ? (row[index] || '').trim() : '';
  };
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      transaction_date: pick(cells, ['transaction_date', 'date', 'txn date']),
      value_date: pick(cells, ['value_date', 'value date']),
      description: pick(cells, ['description', 'particulars', 'details', 'narration']),
      reference: pick(cells, ['reference', 'ref', 'cheque', 'upi id']),
      debit: pick(cells, ['debit', 'withdrawal', 'dr']),
      credit: pick(cells, ['credit', 'deposit', 'cr']),
    };
  });
}

export default function Banking() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<'bill' | 'invoice'>('bill');
  const [matchRecordId, setMatchRecordId] = useState('');
  const [accountForm, setAccountForm] = useState({
    bank_name: '',
    account_nickname: '',
    account_number_masked: '',
    account_type: 'current',
    ifsc_code: '',
    opening_balance: '',
  });
  const [importAccount, setImportAccount] = useState('');
  const [statementText, setStatementText] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [accRes, txRes, billRes, invRes] = await Promise.all([
        bankAccountsList(),
        bankTransactionsList({ limit: 100 }),
        billsList({ limit: 100 }),
        invoicesList({ limit: 100 }),
      ]);
      setAccounts(accRes.data?.bank_accounts || []);
      setTransactions(txRes.data?.bank_transactions || []);
      setBills(billRes.data?.bills || []);
      setInvoices(invRes.data?.invoices || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load banking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = transactions.filter((tx) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [tx.description, tx.reference, tx.bank_name]
      .some((value: string) => String(value || '').toLowerCase().includes(term));
  });

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await bankAccountsCreate(accountForm);
      setMessage('Bank account added.');
      setShowAccountForm(false);
      setAccountForm({ bank_name: '', account_nickname: '', account_number_masked: '', account_type: 'current', ifsc_code: '', opening_balance: '' });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not add the bank account');
    } finally {
      setBusy(false);
    }
  };

  const importStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const rows = parseCsv(statementText);
    if (!importAccount) {
      setError('Choose the bank account the statement belongs to');
      setBusy(false);
      return;
    }
    if (rows.length === 0) {
      setError('No rows found. Use a CSV header row with date, description, debit and credit columns.');
      setBusy(false);
      return;
    }
    try {
      const res = await bankStatementImport({ bank_account_id: importAccount, transactions: rows });
      setMessage(`Statement imported: ${res.data?.imported ?? rows.length} transactions.`);
      setShowImportForm(false);
      setStatementText('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not import the statement');
    } finally {
      setBusy(false);
    }
  };

  const submitMatch = async (txId: string) => {
    setError('');
    setMessage('');
    if (!matchRecordId) {
      setError('Pick the record this transaction settles');
      return;
    }
    try {
      await bankTransactionMatch(txId, { matched_record_type: matchType, matched_record_id: matchRecordId });
      setMessage('Transaction matched.');
      setMatchId(null);
      setMatchRecordId('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not match the transaction');
    }
  };

  const bookBalance = accounts.reduce((s, a) => s + Number(a.book_balance || 0), 0);
  const unmatched = transactions.filter((t) => t.match_status === 'unmatched').length;
  const reconciled = transactions.filter((t) => t.match_status === 'matched' || t.match_status === 'reconciled').length;

  return (
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Banking</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">
            Bank accounts, imported statement lines and reconciliation against bills and invoices.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setShowImportForm((v) => !v)}
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg border border-outline text-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <Upload size={14} /> Import statement
          </button>
          <button
            onClick={() => setShowAccountForm((v) => !v)}
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-on-secondary-container transition-all font-label-md text-label-md font-semibold"
          >
            <Plus size={14} /> Add account
          </button>
        </div>
      </div>

      {error && <p className="rounded bg-error-container/40 border border-error/40 px-space-md py-space-sm text-sm text-error">{error}</p>}
      {message && <p className="rounded bg-secondary-container/40 border border-secondary/40 px-space-md py-space-sm text-sm text-on-secondary-container">{message}</p>}

      {showAccountForm && (
        <form onSubmit={addAccount} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          <label className="text-xs font-semibold text-on-surface-variant">
            Bank name
            <input required value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })} className="input-field mt-1" placeholder="HDFC Bank" />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Account nickname
            <input value={accountForm.account_nickname} onChange={(e) => setAccountForm({ ...accountForm, account_nickname: e.target.value })} className="input-field mt-1" placeholder="Main current account" />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Masked account number
            <input required value={accountForm.account_number_masked} onChange={(e) => setAccountForm({ ...accountForm, account_number_masked: e.target.value })} className="input-field mt-1 font-code-mono text-code-mono" placeholder="XXXX XXXX 4321" />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Account type
            <select value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })} className="select-field mt-1">
              <option value="current">Current</option>
              <option value="savings">Savings</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            IFSC code
            <input value={accountForm.ifsc_code} onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value })} className="input-field mt-1 font-code-mono text-code-mono" placeholder="HDFC0001234" />
          </label>
          <label className="text-xs font-semibold text-on-surface-variant">
            Opening balance (₹)
            <input type="number" step="0.01" min="0" value={accountForm.opening_balance} onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })} className="input-field mt-1 tnum" />
          </label>
          <div className="md:col-span-3 flex items-center gap-space-sm">
            <button type="submit" disabled={busy} className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold disabled:opacity-60">
              {busy ? 'Saving' : 'Add account'}
            </button>
            <button type="button" onClick={() => setShowAccountForm(false)} className="px-space-md py-space-xs rounded border border-outline text-label-md font-semibold text-on-surface">
              Cancel
            </button>
          </div>
        </form>
      )}

      {showImportForm && (
        <form onSubmit={importStatement} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md space-y-space-sm">
          <label className="block text-xs font-semibold text-on-surface-variant">
            Bank account
            <select required value={importAccount} onChange={(e) => setImportAccount(e.target.value)} className="select-field mt-1">
              <option value="">Select the account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bank_name} · {a.account_number_masked}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-on-surface-variant">
            Statement CSV
            <textarea
              rows={5}
              value={statementText}
              onChange={(e) => setStatementText(e.target.value)}
              placeholder={'transaction_date,description,debit,credit\n2026-04-02,NEFT from client, ,25000'}
              className="input-field mt-1 font-code-mono text-code-mono"
            />
          </label>
          <div className="flex items-center gap-space-sm">
            <button type="submit" disabled={busy || accounts.length === 0} className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold disabled:opacity-60">
              {busy ? 'Importing' : 'Import transactions'}
            </button>
            <button type="button" onClick={() => setShowImportForm(false)} className="px-space-md py-space-xs rounded border border-outline text-label-md font-semibold text-on-surface">
              Cancel
            </button>
            <span className="text-xs text-on-surface-variant">
              Expected columns: transaction_date, description, debit, credit. Reference and value_date are used when present.
            </span>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
        {[
          { label: 'Bank accounts', value: accounts.length, tone: 'text-on-surface' },
          { label: 'Book balance', value: formatMoneyIN(bookBalance), tone: 'text-on-surface' },
          { label: 'Unmatched', value: unmatched, tone: 'text-warning' },
          { label: 'Matched', value: reconciled, tone: 'text-secondary' },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{item.label}</p>
            <p className={`font-numeric-kpi text-numeric-kpi font-bold tnum mt-space-2xs ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          placeholder="Search description, reference or bank"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
        <div className="px-space-md py-space-sm border-b border-outline">
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Bank transactions</h2>
        </div>
        {loading ? (
          <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">Loading transactions...</p>
        ) : filtered.length === 0 ? (
          <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">
            No transaction yet. Import a statement to bring the bank lines in.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline">
                  <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Date</th>
                  <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Description</th>
                  <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Account</th>
                  <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Credit</th>
                  <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Debit</th>
                  <th className="text-center px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Status</th>
                  <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-outline last:border-0">
                    <td className="px-space-md py-space-sm text-on-surface-variant tnum">{formatDateIN(tx.transaction_date)}</td>
                    <td className="px-space-md py-space-sm text-on-surface">
                      {tx.description || '—'}
                      {tx.reference && <span className="block font-code-mono text-code-mono text-xs text-outline">{tx.reference}</span>}
                    </td>
                    <td className="px-space-md py-space-sm text-on-surface-variant">{tx.bank_name}</td>
                    <td className="px-space-md py-space-sm text-right text-on-surface tnum">{Number(tx.credit) ? formatMoneyIN(tx.credit) : '—'}</td>
                    <td className="px-space-md py-space-sm text-right text-on-surface tnum">{Number(tx.debit) ? formatMoneyIN(tx.debit) : '—'}</td>
                    <td className="px-space-md py-space-sm text-center"><StatusBadge status={tx.match_status || 'unmatched'} /></td>
                    <td className="px-space-md py-space-sm text-right">
                      {tx.match_status === 'unmatched' ? (
                        <button
                          onClick={() => {
                            setMatchId(matchId === tx.id ? null : tx.id);
                            setMatchRecordId('');
                            setMatchType(Number(tx.credit) ? 'invoice' : 'bill');
                          }}
                          className="inline-flex items-center gap-space-2xs text-xs font-semibold text-secondary hover:underline"
                        >
                          Match <ArrowRight size={13} />
                        </button>
                      ) : (
                        <span className="text-xs text-on-surface-variant">{tx.matched_record_type || 'matched'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {matchId && (
        <div className="bg-surface-container-lowest border border-secondary rounded-lg p-space-md space-y-space-sm">
          <p className="text-sm font-semibold text-on-surface">Match this transaction</p>
          <div className="flex flex-col md:flex-row md:items-end gap-space-sm">
            <label className="text-xs font-semibold text-on-surface-variant">
              Record type
              <select value={matchType} onChange={(e) => setMatchType(e.target.value as 'bill' | 'invoice')} className="select-field mt-1">
                <option value="bill">Bill</option>
                <option value="invoice">Invoice</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-on-surface-variant flex-1">
              Record
              <select value={matchRecordId} onChange={(e) => setMatchRecordId(e.target.value)} className="select-field mt-1">
                <option value="">Select the record</option>
                {(matchType === 'bill' ? bills : invoices).map((record: any) => (
                  <option key={record.id} value={record.id}>
                    {record.bill_number || record.invoice_number} · {record.vendor_name || record.customer_name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => submitMatch(matchId)} className="px-space-md py-space-xs rounded bg-secondary text-on-secondary text-label-md font-semibold">
              Confirm match
            </button>
            <button onClick={() => setMatchId(null)} className="px-space-md py-space-xs rounded border border-outline text-label-md font-semibold text-on-surface">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
