import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoicesList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, RowLabel, RowValue } from '../components/ui/DataTable';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Plus, Search } from 'lucide-react';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    setError('');
    try {
      const invoicesRes = await invoicesList({ search: search || undefined, status: statusFilter || undefined });
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load invoices');
    }
  };

  const handleCreate = () => navigate('/invoices/create');

  const outstanding = invoices.filter((i) => i.status === 'unpaid' || i.status === 'partially_paid');
  const overdue = invoices.filter((i) => i.status === 'overdue');
  const paid = invoices.filter((i) => i.status === 'paid');

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Sales & Invoices"
        description="Create and manage sales invoices for your customers."
        actions={
          <Button variant="green" onClick={handleCreate}>
            <Plus size={16} className="text-on-secondary" /> New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" note={`${invoices.length} invoices on record`} metrics={[{ label: 'Invoices', value: String(invoices.length) }]} />
        <StatCard title="Total Outstanding" readout={{ value: formatMoneyIN(outstanding.reduce((s, i) => s + i.balance_due, 0)), tone: 'negative' }} metrics={[{ label: 'Invoices', value: String(outstanding.length) }]} />
        <StatCard title="Overdue" readout={{ value: formatMoneyIN(overdue.reduce((s, i) => s + i.balance_due, 0)), tone: 'negative' }} metrics={[{ label: 'Invoices', value: String(overdue.length) }]} />
        <StatCard title="Paid" readout={{ value: formatMoneyIN(paid.reduce((s, i) => s + i.amount_received, 0)), tone: 'positive' }} metrics={[{ label: 'Invoices', value: String(paid.length) }]} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 max-w-md">
          <Input
            icon={<Search size={16} className="text-on-surface-variant" />}
            placeholder="Search by customer or invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter invoices by status"
          className="h-10 w-48 px-3 rounded-lg border border-line bg-surface text-primary-text placeholder:text-ink-3 transition-colors duration-micro hover:border-line-strong focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-ring"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <Card flush>
        <div className="overflow-x-auto">
          <DataTable
            columns={[
              {
                key: 'invoice_number',
                label: 'INVOICE',
                render: (row) => <RowLabel title={row.invoice_number.replace('INV-', '')} meta={row.invoice_number} />,
              },
              { key: 'customer_name', label: 'CUSTOMER', render: (row) => <RowLabel title={row.customer_name} meta={row.gstin || 'GSTIN pending'} /> },
              { key: 'amount', label: 'AMOUNT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.grand_total)} /> },
              { key: 'balance', label: 'BALANCE', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.balance_due)} /> },
              { key: 'due_date', label: 'DUE', align: 'right', render: (row) => <RowValue value={formatDateIN(row.due_date || '') || '—'} meta={row.status} tone="neutral" /> },
              {
                key: 'status',
                label: 'STATUS',
                align: 'right',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            rows={invoices}
            emptyMessage="No invoices found"
            footer={
              <div className="border-t border-line px-4 py-3">
                <div className="flex justify-between">
                  <span className="text-[11px] font-medium leading-4 text-ink-2 tnum">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
                  <Link to="/invoices/create" className="text-[11px] font-medium leading-4 text-brand hover:underline">
                    Add invoice
                  </Link>
                </div>
              </div>
            }
          />
        </div>
      </Card>
    </div>
  );
}