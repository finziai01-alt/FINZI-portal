import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesList, customersList } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { Plus, Search, FileText, CreditCard, Edit2, MoreHorizontal } from 'lucide-react';

export default function Invoices() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        invoicesList({ search }),
        customersList(),
      ]);
      setInvoices(invRes.data.invoices || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sales & Invoices</h1>
          <p className="text-secondary-text">Create and manage sales invoices for your customers.</p>
        </div>
        <Button variant="green" onClick={() => navigate('/invoices/create')}>
          <Plus size={16} /> New Invoice
        </Button>
        <Button variant="outline" onClick={() => navigate('/customers/create')}>
          <Plus size={16} /> Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Total Invoices</div>
          <div className="text-2xl font-bold text-primary-text tnum">{invoices.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Total Outstanding</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {formatMoneyIN(invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').reduce((s, i) => s + i.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Overdue</div>
          <div className="text-2xl font-bold text-danger tnum">
            {formatMoneyIN(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Sent This Month</div>
          <div className="text-2xl font-bold text-green tnum">
            {formatMoneyIN(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_received, 0))}
          </div>
        </Card>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-3 text-secondary-text" />
        <Input
          placeholder="Search by customer or invoice number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Due Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-secondary-text">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-secondary-text">
                        <FileText size={32} opacity={0.5} />
                        <p>No invoices found</p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/invoices/create')}>
                          Create Invoice
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border hover:bg-surface-container-low group">
                      <td className="px-4 py-3 text-xs text-secondary-text">{inv.invoice_number.replace('INV-', '')}</td>
                      <td className="px-4 py-3 text-primary-text">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-primary-text">{inv.customer_name}</td>
                      <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(inv.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(inv.amount_received)}</td>
                      <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(inv.balance_due)}</td>
                      <td className="px-4 py-3 text-right text-secondary-text tnum">{inv.due_date}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 text-secondary-text hover:text-primary-text" title="View">
                            <FileText size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/invoices/create/${inv.id}`); }}
                            className="p-1.5 text-secondary-text hover:text-primary-text"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button className="p-1.5 text-secondary-text hover:text-danger" title="More">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
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



