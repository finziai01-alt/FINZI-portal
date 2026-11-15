import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  reportsPL,
  reportsBalanceSheet,
  reportsCashFlow,
  reportsReceivablesAgeing,
  reportsPayablesAgeing,
} from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN } from '../utils/format';
import { BarChart3, FileText, Activity, TrendingUp, PieChart } from 'lucide-react';

const reportCards: Array<{
  title: string;
  subtitle: string;
  icon: React.ElementType;
  fetch: () => Promise<any>;
}> = [
  {
    title: 'Profit & Loss',
    subtitle: 'Income and expenses over a period',
    icon: BarChart3,
    fetch: reportsPL,
  },
  {
    title: 'Balance Sheet',
    subtitle: 'Assets, liabilities and equity',
    icon: FileText,
    fetch: reportsBalanceSheet,
  },
  {
    title: 'Cash Flow',
    subtitle: 'Cash inflows and outflows',
    icon: Activity,
    fetch: reportsCashFlow,
  },
  {
    title: 'Receivables Ageing',
    subtitle: 'Customer outstanding by age bucket',
    icon: TrendingUp,
    fetch: reportsReceivablesAgeing,
  },
  {
    title: 'Payables Ageing',
    subtitle: 'Vendor outstanding by age bucket',
    icon: PieChart,
    fetch: reportsPayablesAgeing,
  },
];

export default function Reports() {
  const { state } = useAuth();
  const [selected, setSelected] = useState<string>('profit-loss');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (key: string) => {
    setLoading(true);
    try {
      const report = reportCards.find(r => r.title.toLowerCase().replace(' ', '-') === key);
      if (report) {
        const res = await report.fetch();
        setReportData(res.data);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-secondary-text">Generate reports from actual stored accounting data.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-border rounded-md text-sm bg-surface">
            <option>FY 2024-25</option>
          </select>
          <Button variant="outline" size="sm">Export PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {reportCards.map((report) => {
          const key = report.title.toLowerCase().replace(' ', '-');
          return (
            <Card key={key} className={`cursor-pointer p-4 hover:bg-surface-container-low transition-colors border ${
              selected === key ? 'border-green-500 bg-green/10' : 'border-border'
            }`} onClick={() => { setSelected(key); loadReport(key); }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-text">{report.title}</p>
                  <p className="text-xs text-secondary-text">{report.subtitle}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary-text">
                  <report.icon size={16} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">{reportCards.find(r => r.title.toLowerCase().replace(' ', '-') === selected)?.title || 'Profit & Loss'}</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-secondary-text animate-pulse">Loading report...</div>
          ) : reportData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {Object.entries(reportData.summary || {}).map(([k, v]: any) => (
                  <div key={k} className="p-3 rounded-lg border border-border bg-surface-container-low">
                    <p className="text-xs text-secondary-text">{k.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold tnum">{formatMoneyIN(v)}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Particulars</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.items || []).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-3 text-primary-text">{item.name}</td>
                        <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-secondary-text">
              <FileText size={32} opacity={0.4} className="mb-2" />
              <p>Select a report to view</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



