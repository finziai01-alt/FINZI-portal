import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsGet } from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Mail, Phone, Building, Shield, User, CreditCard } from 'lucide-react';

const settingsTabs: Array<{ key: string; label: string; icon: React.ElementType }> = [
  { key: 'profile', label: 'Company Profile', icon: Building },
  { key: 'account', label: 'Account Settings', icon: User },
  { key: 'security', label: 'Security & Roles', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Mail },
  { key: 'billing', label: 'Billing & Plan', icon: CreditCard },
];

export default function Settings() {
  const { state, switchCompany } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsGet();
      setSettings(res.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-secondary-text">Manage your FINZI AI workspace and preferences.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {settingsTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === tab.key
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-secondary-text hover:text-primary-text'
            } transition-colors`}
          >
            <tab.icon size={16} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Company Profile</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Legal Name</label>
                <Input
                  value={settings?.legal_name || state.company?.legal_name || ''}
                  placeholder="Enter company legal name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Trade Name</label>
                <Input value={settings?.trade_name || ''} placeholder="Enter trade name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">GSTIN</label>
                <Input value={settings?.gstin || state.company?.gstin || ''} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">PAN</label>
                <Input value={settings?.pan || ''} placeholder="ABCDE1234F" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Registered Email</label>
                <Input value={state.user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-text">Phone</label>
                <Input value={settings?.phone || ''} placeholder="+91 98765 43210" />
              </div>
            </div>
            <Button variant="green" className="w-full">Save Changes</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'account' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Account Settings</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary-text">Full Name</label>
              <Input value={state.user?.full_name || ''} placeholder="Enter your full name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary-text">Email</label>
              <Input value={state.user?.email || ''} type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary-text">Role</label>
              <Input value={state.user?.role || 'Accountant'} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary-text">Timezone</label>
              <select className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text">
                <option>Asia/Kolkata (IST)</option>
                <option>Asia/Mumbai (IST)</option>
                <option>Asia/Delhi (IST)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary-text">Date Format</label>
              <select className="block w-full px-3 py-2.5 border border-border rounded-md bg-surface text-primary-text">
                <option>DD/MM/YYYY</option>
                <option>DD-MM-YYYY</option>
              </select>
            </div>
            <Button variant="green" className="w-full">Save Changes</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Security & Roles</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-gray-50">
              <div>
                <p className="text-sm font-medium text-primary-text">Two-Factor Authentication</p>
                <p className="text-xs text-secondary-text">Add extra security to your account</p>
              </div>
              <Button variant="outline" size="sm">Enable 2FA</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-gray-50">
              <div>
                <p className="text-sm font-medium text-primary-text">Password Change</p>
                <p className="text-xs text-secondary-text">Update your account password</p>
              </div>
              <Button variant="outline" size="sm">Change Password</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-gray-50">
              <div>
                <p className="text-sm font-medium text-primary-text">Session Timeout</p>
                <p className="text-xs text-secondary-text">Automatic logout after inactivity</p>
              </div>
              <select className="px-3 py-2 border border-border rounded-md text-sm bg-surface">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Notification Preferences</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: 'Email Notifications', desc: 'Receive email alerts for important events', key: 'email' },
              { label: 'SMS Alerts', desc: 'Receive SMS for critical compliance dates', key: 'sms' },
              { label: 'Push Notifications', desc: 'Browser push notifications', key: 'push' },
              { label: 'GST Filing Reminders', desc: 'Reminders before GST return due dates', key: 'gst' },
              { label: 'TDS Payment Alerts', desc: 'Alerts for TDS deposit due dates', key: 'tds' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-primary-text">{item.label}</p>
                  <p className="text-xs text-secondary-text">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border text-green-600 focus:ring-green-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 'billing' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Billing & Subscription</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-lg border border-border bg-gray-50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-text">FINZI AI Professional</p>
                  <p className="text-xs text-secondary-text">₹1,499/month • Billed annually</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-text">Unlimited companies</span>
                  <span className="text-primary-text">✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">AI assistant access</span>
                  <span className="text-primary-text">✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">GST filing automation</span>
                  <span className="text-primary-text">✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">Audit workspace</span>
                  <span className="text-primary-text">✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">Priority support</span>
                  <span className="text-primary-text">✓</span>
                </div>
              </div>
              <Button variant="green" className="w-full mt-4">Manage Subscription</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
