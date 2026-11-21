import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billsList, documentsUpload } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent } from '../components/ui/Card';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Search, FileText, Upload, X } from 'lucide-react';

export default function Bills() {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ fileName: string; note: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const billsRes = await billsList({ search: search || undefined, status: statusFilter || undefined });
      setBills(billsRes.data.bills || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => navigate('/bills/create');

  const handleUploadClick = () => fileRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    setUploadResult(null);
    try {
      const res = await documentsUpload(file, state.company?.id || '');
      setUploadResult({ fileName: res.data.fileName || file.name, note: res.data.note || '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Check the file type and size, then try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Bills & Expenses</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">Manage purchase bills, expenses and vendor payments.</p>
        </div>
        <div className="flex items-center gap-space-sm">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="green" onClick={handleUploadClick} disabled={uploading} className="hidden sm:flex">
            <Upload size={16} className="text-on-secondary" /> {uploading ? 'Uploading…' : 'Upload Bill'}
          </Button>
          <Button variant="outline" onClick={handleUploadClick} disabled={uploading} className="sm:hidden" aria-label="Upload bill">
            <Upload size={16} />
          </Button>
        </div>
      </div>

      {uploadResult && (
        <div className="mt-space-md p-space-md rounded-md bg-surface-container-low border border-outline text-sm text-on-surface flex flex-col sm:flex-row sm:items-center gap-space-sm">
          <div className="flex-1">
            <span className="font-medium">{uploadResult.fileName}</span> stored with your documents. {uploadResult.note}
          </div>
          <div className="flex items-center gap-space-sm">
            <Button variant="outline" size="sm" onClick={handleCreate}>Create bill manually</Button>
            <button
              onClick={() => setUploadResult(null)}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-md"
              aria-label="Dismiss upload message"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Total Bills</div>
          <div className="text-2xl font-bold text-on-surface tnum">{bills.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Unpaid</div>
          <div className="text-2xl font-bold text-on-surface tnum">
            {formatMoneyIN(bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Overdue</div>
          <div className="text-2xl font-bold text-error tnum">
            {formatMoneyIN(bills.filter(b => b.status === 'overdue').reduce((s, b) => s + b.balance_due, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-on-surface-variant">Paid</div>
          <div className="text-2xl font-bold text-secondary tnum">
            {formatMoneyIN(bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount_paid, 0))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm mb-space-md">
        <div className="flex-1 max-w-md">
          <Input
            icon={<Search size={16} className="text-on-surface-variant" />}
            placeholder="Search by vendor or bill number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          aria-label="Filter bills by status"
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Bill Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant">Due Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">Loading...</td></tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-on-surface-variant">
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
                    <tr
                      key={bill.id}
                      className="border-b border-outline hover:bg-surface-container-low cursor-pointer"
                      onClick={() => navigate(`/bills/${bill.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/bills/${bill.id}`);
                      }}
                      tabIndex={0}
                    >
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{bill.bill_number.replace('BILL-', '')}</td>
                      <td className="px-4 py-3 text-on-surface">{bill.bill_number}</td>
                      <td className="px-4 py-3 text-on-surface">{bill.vendor_name}</td>
                      <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(bill.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(bill.balance_due)}</td>
                      <td className="px-4 py-3 text-right text-on-surface-variant tnum">{formatDateIN(bill.due_date || '') || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={bill.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bills/${bill.id}`);
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface"
                          title="View details"
                          aria-label={`View ${bill.bill_number}`}
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
