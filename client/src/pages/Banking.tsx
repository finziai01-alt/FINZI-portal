import { useEffect, useState } from 'react';
import {
  bankAccountsCreate,
  bankAccountsList,
  bankStatementImport,
  bankTransactionMatch,
  bankTransactionsList,
  billsList,
  invoicesList,
} from '../services/api';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { ArrowRight, Plus, Search, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, RowValue } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';

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

  const addAccount = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const importStatement = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const submitMatch = async () => {
    setError('');
    setMessage('');
    if (!matchRecordId || !matchId) {
      setError('Pick the record this transaction settles');
      return;
    }
    try {
      await bankTransactionMatch(matchId, { matched_record_type: matchType, matched_record_id: matchRecordId });
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
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Banking"
        description="Bank accounts, imported statement lines and reconciliation against bills and invoices."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowImportForm((v) => !v)} disabled={busy}>
              <Upload size={16} /> Import statement
            </Button>
            <Button variant="green" onClick={() => setShowAccountForm((v) => !v)} disabled={busy} className="ml-auto">
              <Plus size={16} className="text-on-secondary" /> Add account
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm text-brand-ink flex items-center gap-2">
          {message}
        </div>
      )}

      {showAccountForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Add bank account</h2>
          </div>
          <form onSubmit={addAccount} noValidate className="p-4 pb-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              id="bank-name"
              label="Bank name"
              value={accountForm.bank_name}
              onChange={(e) => setAccountForm((c) => ({ ...c, bank_name: e.target.value }))}
              required
              placeholder="HDFC Bank"
            />
            <Input
              id="account-nickname"
              label="Account nickname"
              value={accountForm.account_nickname}
              onChange={(e) => setAccountForm((c) => ({ ...c, account_nickname: e.target.value }))}
              placeholder="Main current account"
            />
            <Input
              id="account-number-masked"
              label="Masked account number"
              value={accountForm.account_number_masked}
              onChange={(e) => setAccountForm((c) => ({ ...c, account_number_masked: e.target.value }))}
              required
              hint="XXXX XXXX 4321"
            />
            <Select
              id="account-type"
              label="Account type"
              value={accountForm.account_type}
              onChange={(e) => setAccountForm((c) => ({ ...c, account_type: e.target.value }))}
            >
              <option value="current">Current</option>
              <option value="savings">Savings</option>
              <option value="cash">Cash</option>
            </Select>
            <Input
              id="ifsc-code"
              label="IFSC code"
              value={accountForm.ifsc_code}
              onChange={(e) => setAccountForm((c) => ({ ...c, ifsc_code: e.target.value }))}
              hint="HDFC0001234"
            />
            <Input
              id="opening-balance"
              label="Opening balance (₹)"
              type="number"
              step="0.01"
              min="0"
              value={accountForm.opening_balance}
              onChange={(e) => setAccountForm((c) => ({ ...c, opening_balance: e.target.value }))}
            />
            <div className="md:col-span-3 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAccountForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={busy} loading={busy} className="ml-auto">
                <Plus size={16} className="text-on-secondary" /> Add account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {showImportForm && (
        <Card flush className="space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Import statement</h2>
          </div>
          <form onSubmit={importStatement} noValidate className="p-4 pb-2 space-y-3">
            <Select
              id="import-account"
              label="Bank account"
              value={importAccount}
              onChange={(e) => setImportAccount(e.target.value)}
              required
              hint="Select the account the statement belongs to"
            >
              <option value="">Select the account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bank_name} · {a.account_number_masked}</option>
              ))}
            </Select>
            <Textarea
              id="statement-csv"
              label="Statement CSV"
              value={statementText}
              onChange={(e) => setStatementText(e.target.value)}
              rows={5}
              hint="transaction_date,description,debit,credit"
            />
            <p className="text-[10px] leading-4 text-ink-3">
              Expected columns: transaction_date, description, debit, credit. Reference and value_date are used when present.
            </p>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={() => setShowImportForm(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
              <Button type="submit" disabled={busy || accounts.length === 0} loading={busy} className="ml-auto">
                Import transactions
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Bank accounts" note={`${accounts.length} accounts on record`} metrics={[{ label: 'Accounts', value: String(accounts.length) }]} />
        <StatCard title="Book balance" readout={{ value: formatMoneyIN(bookBalance), tone: 'accent' }} metrics={[{ label: 'Accounts', value: String(accounts.length) }]} />
        <StatCard title="Unmatched" readout={{ value: String(unmatched), tone: 'negative' }} metrics={[{ label: 'Transactions', value: 'awaiting match' }]} />
        <StatCard title="Matched" readout={{ value: String(reconciled), tone: 'positive' }} metrics={[{ label: 'Transactions', value: 'reconciled' }]} />
      </div>

      <div className="flex-1 max-w-md">
        <Input
          icon={<Search size={16} className="text-on-surface-variant" />}
          placeholder="Search description, reference or bank"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Bank transactions</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <DataTable
            columns={[
              {
                key: 'date',
                label: 'DATE',
                align: 'right',
                render: (row) => <RowValue value={formatDateIN(row.transaction_date || '')} tone="neutral" />,
              },
              { key: 'description', label: 'DESCRIPTION', render: (row) => <span className="block min-w-0"><span className="block truncate text-[11px] leading-4 text-primary-text">{row.description || '—'}</span>{row.reference && <span className="mt-0.5 block text-[9px] leading-3 font-mono text-ink-3">{row.reference}</span>}</span> },
              { key: 'bank', label: 'ACCOUNT', render: (row) => <span className="text-[11px] leading-4 text-ink-3">{row.bank_name}</span> },
              { key: 'credit', label: 'CREDIT', align: 'right', render: (row) => <RowValue value={Number(row.credit) ? formatMoneyIN(row.credit) : '—'} tone="neutral" /> },
              { key: 'debit', label: 'DEBIT', align: 'right', render: (row) => <RowValue value={Number(row.debit) ? formatMoneyIN(row.debit) : '—'} tone="neutral" /> },
              { key: 'status', label: 'STATUS', align: 'right', render: (row) => <StatusBadge status={row.match_status || 'unmatched'} /> },
              {
                key: 'action',
                label: '',
                align: 'right',
                render: (row) => {
                  if (row.match_status !== 'unmatched') {
                    return <span className="text-[10px] text-ink-3">{row.matched_record_type || 'matched'}</span>;
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setMatchId(matchId === row.id ? null : row.id);
                        setMatchRecordId('');
                        setMatchType(Number(row.credit) ? 'invoice' : 'bill');
                      }}
                      title="Match transaction"
                      className="p-1.5 rounded-lg text-brand hover:bg-brand-soft transition-colors duration-micro"
                    >
                      <ArrowRight size={14} className="text-on-secondary" /> Match
                    </button>
                  );
                },
              },
            ]}
            rows={filtered}
            emptyMessage="No transaction yet. Import a statement to bring the bank lines in."
          />
        </div>
      </Card>

      {matchId && (
        <Card flush className="max-w-sm mx-auto mt-4 space-y-1">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Match this transaction</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); submitMatch(); }} noValidate className="p-4 pb-2 space-y-3">
            <Select
              id="match-record-type"
              label="Record type"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as 'bill' | 'invoice')}
            >
              <option value="bill">Bill</option>
              <option value="invoice">Invoice</option>
            </Select>
            <Select
              id="match-record"
              label="Record"
              value={matchRecordId}
              onChange={(e) => setMatchRecordId(e.target.value)}
              required
              hint="Select the record"
            >
              <option value="">Select the record</option>
              {(matchType === 'bill' ? bills : invoices).map((record: any) => (
                <option key={record.id} value={record.id}>{record.bill_number || record.invoice_number} · {record.vendor_name || record.customer_name}</option>
              ))}
            </Select>
            <div className="flex justify-end">
              <Button type="submit" disabled={!matchRecordId} className="w-auto">
                Confirm match
              </Button>
              <button
                type="button"
                onClick={() => setMatchId(null)}
                className="ml-2 inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-primary-text transition-colors duration-micro hover:bg-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

