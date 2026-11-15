import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billsGet, billsRecordPayment } from '../services/api';
import { vendorsList } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { formatMoneyIN, formatDateIN } from '../utils/format';
import { ArrowLeft, FileText, CreditCard, Banknote, Clock, Mail, AlertCircle } from 'lucide-react';

export default function BillDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentError, setPaymentError] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    loadBill();
  }, [id]);

  const loadBill = async () => {
    try {
      const res = await billsGet(id!);
      setBill(res.data.bill);
    } catch {}
    setLoading(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    setPayLoading(true);
    try {
      await billsRecordPayment(id!, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: `REF-${Date.now()}`,
      });
      loadBill();
      setPaymentAmount('');
    } catch (err: any) {
      setPaymentError(err.response?.data?.error || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading || !bill) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Bill Details</h1>
        <div className="animate-pulse bg-surface border border-border rounded-lg p-8 h-64 flex items-center justify-center">
          <div className="text-secondary-text">Loading bill...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/bills')} className="p-2 text-secondary-text hover:text-primary-text hover:bg-surface-container-low rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Bill Details</h1>
            <p className="text-secondary-text">{bill.bill_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Download PDF</Button>
          <Button variant="outline" size="sm">Duplicate</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Bill Summary</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-secondary-text">Vendor</p>
                  <p className="text-primary-text font-medium">{bill.vendor_name}</p>
                  <p className="text-xs text-secondary-text">{bill.vendor_gstin || 'No GSTIN'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Bill Number</p>
                  <p className="text-primary-text font-medium">{bill.bill_number}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Invoice Number</p>
                  <p className="text-primary-text font-medium">{bill.invoice_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Invoice Date</p>
                  <p className="text-primary-text font-medium">{bill.invoice_date ? formatDateIN(bill.invoice_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Due Date</p>
                  <p className="text-primary-text font-medium">{bill.due_date}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Grand Total</p>
                  <p className="text-primary-text font-bold tnum">{formatMoneyIN(bill.grand_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Amount Paid</p>
                  <p className="text-primary-text font-medium tnum">{formatMoneyIN(bill.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary-text">Balance Due</p>
                  <p className="text-primary-text font-bold tnum">{formatMoneyIN(bill.balance_due)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-xs text-secondary-text">Status</div>
                <StatusBadge status={bill.status} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Record Payment</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <Input
                  label="Amount (₹)"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  error={paymentError ? 'Invalid amount' : undefined}
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text focus:outline-none focus:ring-2 focus:ring-green"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="rtgs">RTGS</option>
                  <option value="neft">NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
                <Input
                  label="Reference / UTR Number"
                  placeholder="e.g. UTR123456"
                  value=""
                />
                <Button type="submit" variant="green" className="w-full" disabled={payLoading}>
                  {payLoading ? 'Recording...' : 'Record Payment'}
                </Button>
              </form>
              {paymentError && (
                <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  <AlertCircle size={16} className="mr-2" />
                  {paymentError}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Payment Options</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-container-low">
                  <CreditCard size={20} className="text-secondary-text" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-text">Pay via Bank</p>
                    <p className="text-xs text-secondary-text">Direct bank transfer from your registered account</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-container-low">
                  <Mail size={20} className="text-secondary-text" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-text">Generate Payment Advice</p>
                    <p className="text-xs text-secondary-text">Send payment intimation to vendor via email</p>
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



