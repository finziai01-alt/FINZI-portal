import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
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
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import {
  Banknote,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  Plus,
  Receipt,
  TrendingUp,
} from 'lucide-react';

const KPI_ICONS: Record<string, React.ElementType> = {
  'Total receivables': CreditCard,
  'Total payables': Receipt,
  'Cash and bank balance': Banknote,
  'Total revenue': TrendingUp,
  'Total expenses': FileText,
  'Net profit': TrendingUp,
};

const KPI_SERIES: Record<string, 'revenue' | 'expenses' | 'net'> = {
  'Total receivables': 'revenue',
  'Total payables': 'expenses',
  'Cash and bank balance': 'net',
  'Total revenue': 'revenue',
  'Total expenses': 'expenses',
  'Net profit': 'net',
};

const CURRENT_FY = (() => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
})();

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const data = points.map((value, index) => ({ index, value }));
  return (
    <div className="h-10 w-full mt-space-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey="value" stroke="#006d44" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
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
}

export default function Dashboard() {
  const { state } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartMode, setChartMode] = useState<'revenue' | 'expenses' | 'net'>('revenue');
  const [menuOpen, setMenuOpen] = useState(false);

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

  const brief = useMemo(() => {
    const points: string[] = [];
    if (overdue > 0) points.push(`${overdue} overdue ${overdue === 1 ? 'record needs' : 'records need'} attention.`);
    const topReceivable = receivables[0];
    if (topReceivable) {
      points.push(`Largest receivable is ${topReceivable.customer_name} at ${formatMoneyIN(topReceivable.amount)}.`);
    }
    const lastMonth = monthly[monthly.length - 1];
    if (lastMonth) {
      points.push(`This month: revenue ${formatMoneyIN(lastMonth.revenue)}, expenses ${formatMoneyIN(lastMonth.expenses)}.`);
    }
    if (points.length === 0) points.push('No receivables, payables or activity recorded for this company yet.');
    return points;
  }, [overdue, receivables, monthly]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface mb-6">Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-6 gap-space-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline rounded-lg p-5 h-32 animate-pulse" />
          ))}
        </div>
        <div className="mt-space-md bg-surface-container-lowest border border-outline rounded-lg h-72 animate-pulse" />
      </div>
    );
  }

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

  return (
    <div className="p-6 space-y-space-md">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-sm">
            <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Overview</h1>
            <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded bg-secondary-container/40 text-secondary text-xs font-semibold">
              Live data
            </span>
          </div>
          <p className="text-body-md text-body-md text-on-surface-variant mt-space-2xs">
            Monitor your business finances, automations and statutory compliance.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <span className="inline-flex items-center px-space-sm py-space-xs rounded bg-surface-container-low border border-outline text-label-md text-label-md font-semibold text-on-surface-variant">
            {CURRENT_FY}
          </span>
          <button
            onClick={exportReport}
            className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg border border-outline text-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-on-secondary-container transition-all font-label-md text-label-md font-semibold"
            >
              <Plus size={14} /> New transaction <ChevronDown size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-space-xs w-52 bg-surface-container-lowest border border-outline rounded-lg shadow-lg z-30 overflow-hidden">
                {[
                  { to: '/bills/create', label: 'Purchase bill' },
                  { to: '/invoices/create', label: 'Sales invoice' },
                  { to: '/ledger/create', label: 'Journal entry' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="block px-space-md py-space-sm text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/40 border border-error rounded-lg px-space-md py-space-sm text-sm text-error flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-6 gap-space-sm">
        {kpis.map((kpi, i) => {
          const Icon = KPI_ICONS[kpi.label] || TrendingUp;
          const seriesKey = KPI_SERIES[kpi.label] || 'revenue';
          const points = monthly.map((m) => Number(m[seriesKey] || 0));
          return (
            <div key={i} className="bg-surface-container-lowest border border-outline rounded-lg p-space-md">
              <div className="flex items-start justify-between gap-space-sm">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  {kpi.label}
                </p>
                <Icon size={14} className="text-secondary shrink-0" />
              </div>
              <p className="font-numeric-kpi text-numeric-kpi text-on-surface font-bold mt-space-2xs tnum">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-space-2xs">
                {kpi.change ? (
                  <span className={`text-xs font-semibold ${kpi.trend === 'up' ? 'text-secondary' : 'text-error'}`}>
                    {kpi.change}
                  </span>
                ) : (
                  <span className="text-xs text-on-surface-variant">No prior month to compare</span>
                )}
                {kpi.margin && <span className="text-xs text-on-surface-variant">{kpi.margin} margin</span>}
              </div>
              <Sparkline points={points} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-space-md px-space-md py-space-sm border-b border-outline flex-wrap">
            <div>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                Revenue, expenses and net margin
              </h2>
              <p className="text-xs text-on-surface-variant">Last six months, from recorded invoices and bills</p>
            </div>
            <div className="flex items-center gap-space-2xs">
              {(['revenue', 'expenses', 'net'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-space-sm py-space-2xs rounded text-label-sm text-label-sm font-semibold transition-colors ${
                    chartMode === mode
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {mode === 'net' ? 'Net cash flow' : mode === 'revenue' ? 'Revenue' : 'Expenses'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-space-md">
            {monthly.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-space-xl text-center">No dated records to chart yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#e9edff" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#45474c' }} axisLine={{ stroke: '#c5c6cd' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#45474c' }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip
                      formatter={(value: number) => formatMoneyIN(value)}
                      contentStyle={{ borderRadius: 8, border: '1px solid #c5c6cd', fontSize: 12 }}
                    />
                    <Bar dataKey={chartMode} fill="#006d44" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
          <div className="px-space-md py-space-sm border-b border-outline">
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Financial brief</h2>
            <p className="text-xs text-on-surface-variant">Computed from the records stored for {state.company?.legal_name || 'this company'}</p>
          </div>
          <div className="p-space-md space-y-space-sm">
            {brief.map((line) => (
              <p key={line} className="text-sm text-on-surface flex items-start gap-space-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                {line}
              </p>
            ))}
            <Link
              to="/ai"
              className="inline-flex items-center gap-space-xs mt-space-sm text-label-md text-label-md font-semibold text-secondary hover:underline"
            >
              Ask FINZI AI about this workspace
            </Link>
          </div>
          <div className={`px-space-md py-space-sm border-t border-outline ${overdue > 0 ? 'bg-error-container/30' : 'bg-surface-container-low/50'}`}>
            <p className={`text-sm font-semibold ${overdue > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
              {overdue > 0
                ? `${overdue} overdue ${overdue === 1 ? 'record' : 'records'} need attention`
                : 'Nothing overdue'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline">
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Customer receivables</h2>
            <Link to="/invoices" className="text-label-md text-label-md font-semibold text-secondary hover:underline">View all</Link>
          </div>
          {receivables.length === 0 ? (
            <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">
              No invoice has an outstanding balance.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Invoice</th>
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Customer</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Amount</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Due</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.slice(0, 8).map((item) => (
                    <tr key={item.id} className="border-b border-outline last:border-0">
                      <td className="px-space-md py-space-sm text-on-surface font-code-mono text-code-mono">
                        <Link to={`/invoices/${item.id}`} className="hover:underline">{item.invoice_number}</Link>
                      </td>
                      <td className="px-space-md py-space-sm text-on-surface">{item.customer_name}</td>
                      <td className="px-space-md py-space-sm text-right text-on-surface tnum">{formatMoneyIN(item.amount)}</td>
                      <td className="px-space-md py-space-sm text-right text-on-surface-variant tnum">
                        {item.due_date ? formatDateIN(item.due_date) : '—'}
                      </td>
                      <td className="px-space-md py-space-sm text-right"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline">
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Vendor payables</h2>
            <Link to="/bills" className="text-label-md text-label-md font-semibold text-secondary hover:underline">View all</Link>
          </div>
          {payables.length === 0 ? (
            <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">
              No bill has an outstanding balance.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Bill</th>
                    <th className="text-left px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Vendor</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Amount</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Due</th>
                    <th className="text-right px-space-md py-space-sm text-xs font-semibold text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.slice(0, 8).map((item) => (
                    <tr key={item.id} className="border-b border-outline last:border-0">
                      <td className="px-space-md py-space-sm text-on-surface font-code-mono text-code-mono">
                        <Link to={`/bills/${item.id}`} className="hover:underline">{item.bill_number}</Link>
                      </td>
                      <td className="px-space-md py-space-sm text-on-surface">{item.vendor_name}</td>
                      <td className="px-space-md py-space-sm text-right text-on-surface tnum">{formatMoneyIN(item.amount)}</td>
                      <td className="px-space-md py-space-sm text-right text-on-surface-variant tnum">
                        {item.due_date ? formatDateIN(item.due_date) : '—'}
                      </td>
                      <td className="px-space-md py-space-sm text-right"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline rounded-lg overflow-hidden">
        <div className="px-space-md py-space-sm border-b border-outline">
          <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Recent activity</h2>
          <p className="text-xs text-on-surface-variant">Actions recorded in this workspace</p>
        </div>
        {activity.length === 0 ? (
          <p className="px-space-md py-space-lg text-sm text-on-surface-variant text-center">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-outline">
            {activity.slice(0, 8).map((item) => (
              <li key={item.id} className="px-space-md py-space-sm flex items-start gap-space-sm">
                <span className="w-6 h-6 rounded-full bg-surface-container-low text-secondary text-xs font-bold flex items-center justify-center shrink-0">
                  {(item.actor || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-on-surface">
                    {item.actor || 'System'} {String(item.action || '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-on-surface-variant">{item.time ? formatDateIN(item.time) : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
