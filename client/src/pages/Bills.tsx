import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billsList, vendorsList } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { Plus, Search, Filter, FileText, Download, Edit2, MoreHorizontal } from 'lucide-react';

export default function Bills() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [billsRes, vendorsRes] = await Promise.all([
        billsList({ search, status: statusFilter || undefined }),
        vendorsList(),
      ]);
      setBills(billsRes.data.bills || []);
      setVendors(vendorsRes.data.vendors || []);
    } catch {}
    setLoading(false);
  };

  const handleCreate = () => navigate('/bills/create');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bills & Expenses</h1>
          <p className="text-secondary-text">Manage purchase bills, expenses and vendor payments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="green" onClick={handleCreate} className="hidden sm:flex">
            <Plus size={16} /> Upload Bill
          </Button>
          <Button variant="outline" onClick={() => navigate('/vendors/create')} className="hidden sm:flex">
            <Plus size={16} /> Add Vendor
          </Button>
          <Button variant="outline" onClick={handleCreate} className="sm:hidden">
            +
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Total Bills</div>
          <div className="text-2xl font-bold text-primary-text tnum">{bills.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Unpaid</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {formatMoneyIN(bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Overdue</div>
          <div className="text-2xl font-bold text-danger tnum">
            {formatMoneyIN(bills.filter(b => b.status === 'overdue').reduce((s, b) => s + b.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Paid This Month</div>
          <div className="text-2xl font-bold text-green-600 tnum">
            {formatMoneyIN(bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount_paid, 0))}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search by vendor or bill number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md text-sm bg-surface"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Bill Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Due Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-secondary-text">Loading...</td></tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-secondary-text">
                        <FileText size={32} opacity={0.5} />
                        <p>No bills found</p>
                        <Button variant="outline" size="sm" onClick={handleCreate}>
                          Add Bill
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="border-b border-border hover:bg-gray-50 group">
                      <td className="px-4 py-3 text-xs text-secondary-text">{bill.bill_number.replace('BILL-', '')}</td>
                      <td className="px-4 py-3 text-primary-text">{bill.bill_number}</td>
                      <td className="px-4 py-3 text-primary-text">{bill.vendor_name}</td>
                      <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(bill.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(bill.balance_due)}</td>
                      <td className="px-4 py-3 text-right text-secondary-text tnum">{bill.due_date}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={bill.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/bills/${bill.id}`)}
                            className="p-1.5 text-secondary-text hover:text-primary-text"
                            title="View details"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/bills/create/${bill.id}`); }}
                            className="p-1.5 text-secondary-text hover:text-primary-text"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="p-1.5 text-secondary-text hover:text-danger"
                            title="More actions"
                          >
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
