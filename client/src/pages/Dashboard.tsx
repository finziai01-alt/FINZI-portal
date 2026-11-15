import React, { useEffect, useState } from 'react';
import { dashboardSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TrendingUp, TrendingDown, Banknote, CreditCard, FileText, Activity, Mail, AlertCircle, Clock } from 'lucide-react';
import { formatMoneyIN } from '../utils/format';

const kpiConfig: Array<{
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  margin?: string;
  icon: React.ElementType;
  color: string;
}> = [
  { label: 'Total Receivables', value: '₹0', change: '+6.4%', trend: 'up', icon: CreditCard, color: 'text-green-600' },
  { label: 'Total Payables', value: '₹0', change: '-4.2%', trend: 'down', icon: Banknote, color: 'text-green-600' },
  { label: 'Cash & Bank Balance', value: '₹0', change: '+12.8%', trend: 'up', icon: Banknote, color: 'text-green-600' },
  { label: 'Total Revenue (YTD)', value: '₹0', change: '+18.5%', trend: 'up', icon: TrendingUp, color: 'text-green-600' },
  { label: 'Total Expenses (YTD)', value: '₹0', change: '+8.1%', trend: 'up', icon: FileText, color: 'text-red-600' },
  { label: 'Net Profit', value: '₹0', change: '+24.2%', trend: 'up', margin: '35.1%', icon: TrendingUp, color: 'text-green-600' },
];

export default function Dashboard() {
  const { state } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardSummary()
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || kpiConfig.map(k => ({ ...k, value: '₹0' }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-secondary-text">Monitor your business finances and accounting activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-border rounded-md text-sm bg-surface">
            <option>FY 2024-25</option>
          </select>
          <button className="bg-navy text-white px-4 py-2 rounded-md text-sm hover:bg-navy/90">
            + New Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardHeader className="flex items-center justify-between pb-2">
              <div>
                <p className="text-xs text-secondary-text">{kpi.label}</p>
                <p className="text-lg font-bold text-primary-text tnum">{kpi.value}</p>
              </div>
              <div className={`w-8 h-8 rounded-full bg-${kpi.color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
                <kpi.icon size={14} className={kpi.color} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 mt-2">
                <span className={`text-xs font-medium ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                </span>
                {kpi.margin && <span className="text-xs text-secondary-text ml-2">• {kpi.margin} margin</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Outstanding Payments</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-text">Party</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-secondary-text">Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-secondary-text">Due</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-secondary-text">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(data?.receivables || []), ...(data?.payables || [])].slice(0, 8).map((item: any) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="px-4 py-3 text-primary-text">{item.customer_name || item.vendor_name}</td>
                        <td className="px-4 py-3 text-right text-primary-text tnum">{formatMoneyIN(item.amount)}</td>
                        <td className="px-4 py-3 text-right text-secondary-text tnum">{item.due_date}</td>
                        <td className="px-4 py-3 text-right">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Recent Activity</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3">
                {(data?.recent_activity || []).slice(0, 6).map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-secondary-text shrink-0">
                      {item.actor?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-primary-text">{item.actor} {item.action}</p>
                      <p className="text-xs text-secondary-text">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Alerts</h2>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertCircle size={16} className="text-warning" />
                  <div>
                    <p className="text-sm text-warning">{data?.overdue_count || 0} overdue items require attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
