import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { billsList, documentsUpload } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, RowLabel, RowValue } from '../components/ui/DataTable';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Search, Upload, X } from 'lucide-react';

export default function Bills() {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
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
    setError('');
    try {
      const billsRes = await billsList({ search: search || undefined, status: statusFilter || undefined });
      setBills(billsRes.data.bills || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load bills');
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

  const unpaid = bills.filter((b) => b.status === 'unpaid');
  const overdue = bills.filter((b) => b.status === 'overdue');
  const paid = bills.filter((b) => b.status === 'paid');

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Bills & Expenses"
        description="Manage purchase bills, expenses and vendor payments."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="green"
              onClick={handleUploadClick}
              disabled={uploading}
              className="hidden sm:flex"
            >
              <Upload size={16} className="text-on-secondary" /> {uploading ? 'Uploading…' : 'Upload Bill'}
            </Button>
            <Button
              variant="outline"
              onClick={handleUploadClick}
              disabled={uploading}
              className="sm:hidden"
              aria-label="Upload bill"
            >
              <Upload size={16} />
            </Button>
          </>
        }
      />

      {uploadResult && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="dot bg-brand" aria-hidden="true" />
            <span className="text-[12px] leading-4 text-primary-text">{uploadResult.fileName}</span>
            <span className="text-[11.5px] leading-4 text-ink-3">stored with your documents. {uploadResult.note}</span>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Create bill manually
            </Button>
            <button
              type="button"
              onClick={() => setUploadResult(null)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-sub hover:text-primary-text transition-colors duration-micro"
              aria-label="Dismiss upload message"
            >
              <X size={14} />
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bills" note={`${bills.length} bills on record`} metrics={[{ label: 'Bills', value: String(bills.length), caption: 'in this workspace' }]} />
        <StatCard title="Unpaid" readout={{ value: formatMoneyIN(unpaid.reduce((s, b) => s + b.balance_due, 0)), tone: 'negative' }} metrics={[{ label: 'Bills', value: String(unpaid.length) }]} />
        <StatCard title="Overdue" readout={{ value: formatMoneyIN(overdue.reduce((s, b) => s + b.balance_due, 0)), tone: 'negative' }} metrics={[{ label: 'Bills', value: String(overdue.length) }]} />
        <StatCard title="Paid" readout={{ value: formatMoneyIN(paid.reduce((s, b) => s + b.amount_paid, 0)), tone: 'positive' }} metrics={[{ label: 'Bills', value: String(paid.length) }]} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
          aria-label="Filter bills by status"
          className="h-10 w-48 px-3 rounded-lg border border-line bg-surface text-primary-text placeholder:text-ink-3 transition-colors duration-micro hover:border-line-strong focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-ring"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="rejected">Rejected</option>
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
                key: 'bill_number',
                label: 'BILL',
                render: (row) => (
                  <RowLabel
                    title={row.bill_number.replace('BILL-', '')}
                    meta={row.bill_number}
                  />
                ),
              },
              { key: 'vendor_name', label: 'VENDOR', render: (row) => <RowLabel title={row.vendor_name} meta={row.gstin || 'GSTIN pending'} /> },
              { key: 'amount', label: 'AMOUNT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.grand_total)} /> },
              { key: 'balance', label: 'BALANCE', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.balance_due)} /> },
              { key: 'due_date', label: 'DUE', align: 'right', render: (row) => <RowValue value={formatDateIN(row.due_date || '') || '—'} meta={row.status} tone="neutral" /> },
              {
                key: 'status',
                label: 'STATUS',
                align: 'right',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (row) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bills/${row.id}`);
                    }}
                    title={`View ${row.bill_number}`}
                    aria-label={`View ${row.bill_number}`}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:bg-sub hover:text-primary-text transition-colors duration-micro"
                  >
                    <Upload size={14} />
                  </button>
                ),
              },
            ]}
            rows={bills}
            emptyMessage="No bills found"
            footer={
              <div className="border-t border-line px-4 py-3">
                <div className="flex justify-between">
                  <span className="text-[11px] font-medium leading-4 text-ink-2 tnum">{bills.length} bill{bills.length !== 1 ? 's' : ''}</span>
                  <Link to="/bills/create" className="text-[11px] font-medium leading-4 text-brand hover:underline">
                    Add bill
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