import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { taxDashboard, taxGSTR3B, taxGSTR2BReconciliation } from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatMoneyIN } from '../utils/format';
import { FileText, CreditCard, AlertTriangle, Search, RefreshCw } from 'lucide-react';

export default function Tax() {
  const { state } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [gstr3b, setGSTR3B] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dRes, gRes, rRes] = await Promise.all([
        taxDashboard(),
        taxGSTR3B(),
        taxGSTR2BReconciliation(),
      ]);
      setDashboard(dRes.data);
      setGSTR3B(gRes.data);
      setReconciliation(rRes.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tax & Compliance</h1>
          <p className="text-secondary-text">GST returns, TDS, and compliance management.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw size={16} /> Sync GST Portal
          </Button>
          <Button variant="green" size="sm">File GSTR-3B</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">GST Liability</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {dashboard ? formatMoneyIN(dashboard.gst_liability || 0) : '₹0'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">ITC Available</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {dashboard ? formatMoneyIN(dashboard.itc_available || 0) : '₹0'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">TDS Payable</div>
          <div className="text-2xl font-bold text-primary-text tnum">
            {dashboard ? formatMoneyIN(dashboard.tds_payable || 0) : '₹0'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Returns Filed</div>
          <div className="text-2xl font-bold text-green tnum">
            {dashboard ? dashboard.returns_filed : 0}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">GSTR-3B Summary</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {gstr3b ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border bg-surface-container-low">
                    <p className="text-xs text-secondary-text">Outward Supplies</p>
                    <p className="text-lg font-bold tnum">{formatMoneyIN(gstr3b.outward_supplies || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-container-low">
                    <p className="text-xs text-secondary-text">Inward Supplies (ITC)</p>
                    <p className="text-lg font-bold tnum">{formatMoneyIN(gstr3b.inward_supplies || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-container-low">
                    <p className="text-xs text-secondary-text">Tax Payable</p>
                    <p className="text-lg font-bold text-danger tnum">{formatMoneyIN(gstr3b.tax_payable || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-container-low">
                    <p className="text-xs text-secondary-text">Late Fee</p>
                    <p className="text-lg font-bold tnum">{formatMoneyIN(gstr3b.late_fee || 0)}</p>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-secondary-text animate-pulse">Loading GSTR-3B...</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">GSTR-2B Reconciliation</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {reconciliation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-text">Matched Invoices</span>
                    <span className="text-primary-text font-medium">{reconciliation.matched_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-text">Unmatched Invoices</span>
                    <span className="text-warning font-medium">{reconciliation.unmatched_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-text">ITC Difference</span>
                    <span className="text-primary-text font-medium tnum">{formatMoneyIN(reconciliation.itc_difference || 0)}</span>
                  </div>
                  <Button variant="outline" className="w-full text-xs" onClick={loadData}>
                    <RefreshCw size={14} className="mr-2" /> Reconcile Now
                  </Button>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-secondary-text animate-pulse">Loading...</div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Upcoming Filings</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-primary-text">GSTR-1</p>
                    <p className="text-xs text-secondary-text">Monthly outward supplies</p>
                  </div>
                  <StatusBadge status="pending" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-primary-text">GSTR-3B</p>
                    <p className="text-xs text-secondary-text">Monthly summary return</p>
                  </div>
                  <StatusBadge status="draft" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


