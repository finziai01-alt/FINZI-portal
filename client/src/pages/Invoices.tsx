import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent } from '../components/ui/Card';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Plus, Search, FileText } from 'lucide-react';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const invoicesRes = await invoicesList({ search: search || undefined, status: statusFilter || undefined });
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => navigate('/invoices/create');

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Sales & Invoices</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">Create and manage sales invoices for your customers.</p>
        </div>
        <Button variant="green" onClick={handleCreate}>
          <Plus size={16} className="text-on-secondary" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Invoices</div>
          <div className="text-2xl font-bold text-on-surface tnum">{invoices.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Outstanding</div>
          <div className="text-2xl font-bold text-on-surface tnum">
            {formatMoneyIN(invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').reduce((s, i) => s + i.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Overdue</div>
          <div className="text-2xl font-bold text-error tnum">
            {formatMoneyIN(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Paid</div>
          <div className="text-2xl font-bold text-secondary tnum">
            {formatMoneyIN(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_received, 0))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm mb-space-md">
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
          className="px-3 py-2 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          aria-label="Filter invoices by status"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant">Due Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                        <FileText size={32} opacity={0.5} />
                        <p>No invoices found</p>
                        <Button variant="outline" size="sm" onClick={handleCreate}>
                          Create Invoice
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-outline hover:bg-surface-container-low cursor-pointer"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/invoices/${invoice.id}`);
                      }}
                      tabIndex={0}
                    >
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{invoice.invoice_number.replace('INV-', '')}</td>
                      <td className="px-4 py-3 text-on-surface">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-on-surface">{invoice.customer_name}</td>
                      <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(invoice.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(invoice.amount_received)}</td>
                      <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(invoice.balance_due)}</td>
                      <td className="px-4 py-3 text-right text-on-surface-variant tnum">{formatDateIN(invoice.due_date || '') || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${invoice.id}`);
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface"
                          title="View details"
                          aria-label={`View ${invoice.invoice_number}`}
                        >
                          <FileText size={14} />
                        </button>
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
