import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import {
  reportsBalanceSheet,
  reportsCashFlow,
  reportsPayablesAgeing,
  reportsPL,
  reportsReceivablesAgeing,
} from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDateIN, formatMoneyIN } from '../utils/format';
import { Activity, BarChart3, FileText, PieChart, TrendingUp } from 'lucide-react';

interface ReportDefinition {
  key: string;
  title: string;
  subtitle: string;
  icon: ElementType;
  fetch: () => Promise<any>;
}

const reportCards: ReportDefinition[] = [
  {
    key: 'profit-loss',
    title: 'Profit & Loss',
    subtitle: 'Income and expenses over a period',
    icon: BarChart3,
    fetch: reportsPL,
  },
  {
    key: 'balance-sheet',
    title: 'Balance Sheet',
    subtitle: 'Assets, liabilities and equity',
    icon: FileText,
    fetch: reportsBalanceSheet,
  },
  {
    key: 'cash-flow',
    title: 'Cash Flow',
    subtitle: 'Cash inflows and outflows',
    icon: Activity,
    fetch: reportsCashFlow,
  },
  {
    key: 'receivables-ageing',
    title: 'Receivables Ageing',
    subtitle: 'Customer outstanding by age bucket',
    icon: TrendingUp,
    fetch: reportsReceivablesAgeing,
  },
  {
    key: 'payables-ageing',
    title: 'Payables Ageing',
    subtitle: 'Vendor outstanding by age bucket',
    icon: PieChart,
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
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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
      rows.push([
        item.group || 'Items',
        item.name || '',
        formatMoneyIN(item.amount || 0),
      ]);
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
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Financial Reports</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">Generate reports from actual stored accounting data.</p>
        </div>
        <div className="flex items-center gap-space-sm">
          {reportData && (
            <span className="text-xs text-on-surface-variant">Period: {periodLabel}</span>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!reportData || loading}>
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-xl">
        {reportCards.map((report) => (
          <Card
            key={report.key}
            className={`cursor-pointer p-space-md hover:bg-surface-container-low transition-colors border ${selected === report.key ? 'border-secondary' : 'border-outline'}`}
            onClick={() => {
              setSelected(report.key);
              loadReport(report.key);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">{report.title}</p>
                <p className="text-xs text-on-surface-variant">{report.subtitle}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                <report.icon size={16} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
              {selectedReport?.title || 'Financial Report'}
            </h2>
            {reportData?.generated_at && (
              <span className="text-xs text-on-surface-variant">Generated {formatDateIN(reportData.generated_at)}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-on-surface-variant animate-pulse">Loading report...</div>
          ) : reportData ? (
            <div className="space-y-space-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-md">
                {Object.entries(reportData.summary || {}).map(([key, value]: [string, unknown]) => (
                  <div key={key} className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                    <p className="text-xs text-on-surface-variant">{key.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold text-on-surface tnum">{formatSummaryValue(key, value)}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low border-b border-outline">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Particulars</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.items || []).map((item: any, index: number) => (
                      <tr key={`${item.name}-${index}`} className="border-b border-outline">
                        <td className="px-4 py-3 text-on-surface-variant">{item.group || 'Items'}</td>
                        <td className="px-4 py-3 text-on-surface">{item.name}</td>
                        <td className="px-4 py-3 text-right text-on-surface tnum">{formatMoneyIN(item.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportData.note && (
                <p className="text-xs text-on-surface-variant">{reportData.note}</p>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant">
              <FileText size={32} opacity={0.4} className="mb-2" />
              <p>Select a report to view</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
