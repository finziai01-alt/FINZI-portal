import { useEffect, useState } from 'react';
import {
  reportsBalanceSheet,
  reportsCashFlow,
  reportsPayablesAgeing,
  reportsPL,
  reportsReceivablesAgeing,
} from '../services/api';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Segmented } from '../components/ui/Segmented';
import { DataTable, RowValue } from '../components/ui/DataTable';
import { Card } from '../components/ui/Card';
import { formatDateIN, formatMoneyIN } from '../utils/format';
import { FileText } from 'lucide-react';

interface ReportDefinition {
  key: string;
  title: string;
  subtitle: string;
  fetch: () => Promise<any>;
}

const reportCards: ReportDefinition[] = [
  {
    key: 'profit-loss',
    title: 'Profit & Loss',
    subtitle: 'Income and expenses over a period',
    fetch: reportsPL,
  },
  {
    key: 'balance-sheet',
    title: 'Balance Sheet',
    subtitle: 'Assets, liabilities and equity',
    fetch: reportsBalanceSheet,
  },
  {
    key: 'cash-flow',
    title: 'Cash Flow',
    subtitle: 'Cash inflows and outflows',
    fetch: reportsCashFlow,
  },
  {
    key: 'receivables-ageing',
    title: 'Receivables Ageing',
    subtitle: 'Customer outstanding by age bucket',
    fetch: reportsReceivablesAgeing,
  },
  {
    key: 'payables-ageing',
    title: 'Payables Ageing',
    subtitle: 'Vendor outstanding by age bucket',
    fetch: reportsPayablesAgeing,
  },
];

const formatSummaryValue = (key: string, value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '');
  if (key.toLowerCase().includes('margin')) return `${value.toFixed(2)}%`;
  return formatMoneyIN(value);
};

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '');
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const filenamePart = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function Reports() {
  const [selected, setSelected] = useState('profit-loss');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedReport = reportCards.find((report) => report.key === selected);

  const loadReport = async (key: string) => {
    const report = reportCards.find((candidate) => candidate.key === key);
    if (!report) return;
    setLoading(true);
    setError(null);
    setReportData(null);
    try {
      const res = await report.fetch();
      setReportData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load this report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport('profit-loss');
  }, []);

  const exportCsv = () => {
    if (!reportData || !selectedReport) return;
    const rows: string[][] = [['Section', 'Particulars', 'Value']];
    Object.entries(reportData.summary || {}).forEach(([key, value]) => {
      rows.push(['Summary', key.replace(/_/g, ' '), formatSummaryValue(key, value)]);
    });
    (reportData.items || []).forEach((item: any) => {
      rows.push([item.group || 'Items', item.name || '', formatMoneyIN(item.amount || 0)]);
    });
    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const period = reportData.period || `as-of-${formatDateIN(new Date().toISOString())}`;
    link.href = url;
    link.download = `${filenamePart(selectedReport.key)}-${filenamePart(period)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const periodLabel = reportData?.period || (
    selected === 'receivables-ageing' || selected === 'payables-ageing'
      ? 'Current ageing'
      : 'All time'
  );

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Financial reports"
        description="Generate reports from actual stored accounting data."
        actions={
          <>
            <span className="text-[10px] font-semibold uppercase leading-3 tracking-[0.062em] text-ink-4 mr-3 hidden sm:inline-block">
              Period: {periodLabel}
            </span>
            <Button variant="outline" onClick={exportCsv} disabled={!reportData || loading}>
              {loading ? <span>Exporting…</span> : 'Export CSV'}
            </Button>
          </>
        }
        tabs={
          <Segmented
            options={reportCards.map((r) => ({ value: r.key, label: r.title }))}
            value={selected}
            onChange={(key) => {
              setSelected(key);
              loadReport(key);
            }}
            ariaLabel="Financial report"
          />
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}

      <Card flush>
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
          <div>
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">
              {selectedReport?.title || 'Financial Report'}
            </h2>
            {reportData?.generated_at && (
              <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">
                Generated {formatDateIN(reportData.generated_at)}
              </p>
            )}
          </div>
          <div className="text-right hidden sm:block">
            <FileText size={14} className="text-ink-3" aria-hidden="true" />
          </div>
        </div>

        {loading ? (
          <div className="h-64 shimmer rounded-lg border border-line mx-4 my-4" />
        ) : reportData ? (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(reportData.summary || {}).map(([key, value]) => (
                <StatCard
                  key={key}
                  title={key.replace(/_/g, ' ')}
                  metrics={[{ label: 'Amount', value: formatSummaryValue(key, value) }]}
                />
              ))}
            </div>
            <div className="mt-6 overflow-x-auto">
              <DataTable
                columns={[
                  { key: 'group', label: 'GROUP', render: (row) => <span>{row.group || 'Items'}</span> },
                  { key: 'name', label: 'PARTICULARS', render: (row) => <span>{row.name || ''}</span> },
                  { key: 'amount', label: 'AMOUNT', align: 'right', render: (row) => <RowValue value={formatMoneyIN(row.amount || 0)} tone="neutral" /> },
                ]}
                rows={(reportData.items || []) as any[]}
                emptyMessage="No line items in this report."
              />
              {reportData.note && (
                <p className="mt-4 text-[10px] leading-4 text-ink-3">{reportData.note}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-ink-4" aria-hidden="true" />
            <p className="text-[11.5px] leading-4 text-ink-3">Select a report to view</p>
          </div>
        )}
      </Card>
    </div>
  );
}