import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { Download, Plus } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Segmented } from '../components/ui/Segmented';
import { DataTable, RowLabel, RowValue } from '../components/ui/DataTable';

const CURRENT_FY = (() => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
})();

export const OVERVIEW_TABS = [
  { value: 'overview', label: 'Overview', count: 0 },
  { value: 'cash-flow', label: 'Cash flow', count: 0 },
  { value: 'tax', label: 'Tax', count: 0 },
  { value: 'audit', label: 'Audit', count: 0 },
] as const;

export default function Dashboard() {
  useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartMode, setChartMode] = useState<'revenue' | 'expenses' | 'net'>('revenue');

  const load = () => {
    setLoading(true);
    setError('');
    dashboardSummary()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load the dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const monthly = useMemo(() => (data?.monthly || []) as any[], [data]);

  const kpis = (data?.kpis || []) as any[];
  const receivables = (data?.receivables || []) as any[];
  const payables = (data?.payables || []) as any[];
  const activity = (data?.recent_activity || []) as any[];
  const overdue = data?.overdue_count || 0;

  const exportReport = () => {
    const rows: (string | number)[][] = [['FINZI AI dashboard export', CURRENT_FY]];
    rows.push([]);
    rows.push(['Metric', 'Value']);
    kpis.forEach((k) => rows.push([k.label, k.value]));
    rows.push([]);
    rows.push(['Customer receivables']);
    rows.push(['Invoice', 'Customer', 'Amount', 'Due date', 'Status']);
    receivables.forEach((r) => rows.push([r.invoice_number, r.customer_name, r.amount, r.due_date, r.status]));
    rows.push([]);
    rows.push(['Vendor payables']);
    rows.push(['Bill', 'Vendor', 'Amount', 'Due date', 'Status']);
    payables.forEach((p) => rows.push([p.bill_number, p.vendor_name, p.amount, p.due_date, p.status]));
    downloadCsv(`finzi-dashboard-${CURRENT_FY.replace(/\s+/g, '-')}.csv`, rows);
  };

  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <PageHeader title="Overview" />
        <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-line rounded-xl bg-surface shimmer h-40" />
          ))}
        </div>
        <div className="mt-4 border border-line rounded-xl bg-surface shimmer h-64" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Overview"
        description="Receivables, payables, cash and net profit computed from the records stored for this workspace."
        actions={
          <>
            <button
              type="button"
              onClick={() => {}}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[12px] font-medium text-on-surface transition-colors hover:bg-sub duration-micro"
            >
              {CURRENT_FY}
            </button>
            <button
              type="button"
              onClick={exportReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[12px] font-medium text-on-surface transition-colors duration-micro hover:bg-sub"
            >
              <Download size={14} /> Export
            </button>
            <Button variant="green" size="icon-sm" loading={false}>
              <Plus size={16} className="text-on-secondary" />
            </Button>
          </>
        }
        badge={<span className="ml-2 block hidden sm:inline-block rounded-lg border border-line px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">{CURRENT_FY}</span>}
        tabs={
          <Segmented
            options={OVERVIEW_TABS}
            value="overview"
            onChange={() => {}}
            ariaLabel="Dashboard view"
          />
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink font-medium flex items-center gap-2">
          {error}
          <button onClick={load} className="ml-auto text-underline font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* 4-up KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const points = monthly.map((m) => Number(m[(kpi.label as any) ?? ''] ?? 0));
          const hasSpark = points.length > 1 && points.some((p) => p !== 0);
          return (
            <StatCard
              key={kpi.label}
              title={kpi.label}
              note="Live data"
              readout={{ value: String(kpi.value), tone: 'accent' }}
              metrics={[
                {
                  label: 'Change vs last month',
                  value: kpi.change ?? '—',
                  deltaTone: kpi.trend === 'up' ? ('positive' as const) : kpi.trend === 'down' ? ('negative' as const) : ('neutral' as const),
                  caption: kpi.margin ? `${kpi.margin} margin` : undefined,
                },
              ]}
              footer={hasSpark ? (
                <div className="flex items-end gap-2 h-14">
                  <LineChart data={points.map((value, index) => ({ index, value }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <Line type="monotone" dataKey="value" stroke="#006d44" strokeWidth={2} dot={false} />
                  </LineChart>
                </div>
              ) : undefined}
            />
          );
        })}
      </div>

      {/* Chart card left, "Needs attention" rail right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 border-b border-line">
            <div>
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
                Revenue, expenses and net margin
              </h2>
              <p className="mt-0.5 text-[10px] leading-3 text-ink-3">Last six months, from recorded invoices and bills</p>
            </div>
            <div className="flex items-center gap-2">
              {(['revenue', 'expenses', 'net'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold leading-4 transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${
                    chartMode === mode ? 'bg-brand text-on-secondary' : 'text-ink-3 hover:bg-sub hover:text-primary-text'
                  }`}
                >
                  {mode === 'net' ? 'Net cash flow' : mode === 'revenue' ? 'Revenue' : 'Expenses'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {monthly.length === 0 ? (
              <p className="py-12 text-center text-[11.5px] leading-4 text-ink-3">No dated records to chart yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly} margin={{ top: 6, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e9edff" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#45474c' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#45474c' }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip
                      content={({ active, payload }: { active?: boolean; payload?: any }) => (
                        <RevenueTooltip active={active === true} payload={payload} />
                      )}
                      formatter={(value: number) => formatMoneyIN(value)}
                      contentStyle={{ borderRadius: 8, border: '1px solid #c5c6cd', fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey={chartMode}
                      stroke="#006d44"
                      strokeWidth={2.5}
                      dot={false}
                      strokeOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey={chartMode}
                      stroke="#006d44"
                      strokeWidth={1}
                      dot={false}
                      fill="#006d44"
                      fillOpacity={0.1}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Needs attention rail */}
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Needs attention</h2>
            {overdue > 0 && (
              <StatusBadge status="overdue">{String(overdue)} overdue</StatusBadge>
            )}
          </div>
          <div className="space-y-2 p-4">
            {overdue > 0 ? (
              [
                { title: 'Unpaid vendor bills', value: payables.length, meta: 'Due this week' },
                { title: 'Unmatched bank receipts', value: activity.length, meta: 'Needs review' },
                { title: 'Overdue customer invoices', value: receivables.length, meta: 'Ready to chase' },
              ].map((item) => (
                <StatCard
                  key={item.title}
                  title={item.title}
                  readout={{ value: String(item.value), unit: 'records', tone: 'negative' }}
                  metrics={[{ label: 'Status', value: item.meta }]}
                />
              ))
            ) : (
              <p className="py-2 text-center text-[11.5px] leading-4 text-ink-3">Nothing needs attention.</p>
            )}
          </div>
        </div>
      </div>

      {/* Receivables and payables tables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Customer receivables</h2>
              <Link to="/invoices" className="mt-0.5 block text-[10px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4 hover:underline">
                View all invoices
              </Link>
            </div>
          </div>
          <div className="p-4">
            <DataTable
              columns={[
                { key: 'invoice_number', label: 'INVOICE', render: (row) => <Link to={`/invoices/${row.id}`}>{row.invoice_number}</Link> },
                { key: 'customer_name', label: 'CUSTOMER', render: (row) => <RowLabel title={row.customer_name} meta={row.gstin || 'GSTIN pending'} /> },
                { key: 'amount', label: 'AMOUNT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.amount)} tone="neutral" /> },
                { key: 'due_date', label: 'DUE', align: 'right', render: (row) => <RowValue value={formatDateIN(row.due_date)} meta={row.status} tone="neutral" /> },
              ]}
              rows={receivables.slice(0, 8)}
              emptyMessage="No invoice has an outstanding balance."
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Vendor payables</h2>
              <Link to="/bills" className="mt-0.5 block text-[10px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4 hover:underline">
                View all bills
              </Link>
            </div>
          </div>
          <div className="p-4">
            <DataTable
              columns={[
                { key: 'bill_number', label: 'BILL', render: (row) => <Link to={`/bills/${row.id}`}>{row.bill_number}</Link> },
                { key: 'vendor_name', label: 'VENDOR', render: (row) => <RowLabel title={row.vendor_name} meta={row.gstin || 'GSTIN pending'} /> },
                { key: 'amount', label: 'AMOUNT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.amount)} tone="neutral" /> },
                { key: 'due_date', label: 'DUE', align: 'right', render: (row) => <RowValue value={formatDateIN(row.due_date)} meta={row.status} tone="neutral" /> },
              ]}
              rows={payables.slice(0, 8)}
              emptyMessage="No bill has an outstanding balance."
            />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="overflow-hidden rounded-xl border border-line overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Recent activity</h2>
          <p className="text-[10px] leading-3 text-ink-3">Actions recorded in this workspace</p>
        </div>
        <div className="divide-y divide-line p-4">
          {activity.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] leading-4 text-ink-3">No activity recorded yet.</p>
          ) : (
            activity.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-start gap-2 py-2">
                <span className="mt-1 shrink-0 size-4 rounded-full bg-sub flex items-center justify-center text-[10px] font-bold text-ink-2">
                  {(item.actor || 'S').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] leading-4 text-primary-text">
                    {item.actor || 'System'} {String(item.action || '').replace(/_/g, ' ')}
                  </p>
                  {item.time && <p className="mt-0.5 text-[10px] leading-3 text-ink-3">{formatDateIN(item.time)}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: any }) {
  if (active && payload && payload.length) {
    const [dataPoint] = payload;
    return (
      <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-pop">
        <p className="text-[10px] leading-3 text-ink-3">{dataPoint.name}</p>
        <p className="text-[12px] font-semibold leading-4 text-primary-text tnum">{formatMoneyIN(dataPoint.value)}</p>
      </div>
    );
  }
  return null;
}