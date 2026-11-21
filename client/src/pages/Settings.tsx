import { useEffect, useState } from 'react';
import type { ElementType, FormEvent } from 'react';
import api, { authChangePassword, settingsGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Building, Mail, Shield, User } from 'lucide-react';

interface CompanyForm {
  legal_name: string;
  trade_name: string;
  gstin: string;
  pan: string;
  contact_phone: string;
}

type NotificationKey = 'email' | 'sms' | 'push' | 'gst' | 'tds';

type NotificationPreferences = Record<NotificationKey, boolean>;

interface NotificationOption {
  key: NotificationKey;
  apiKey: string;
  label: string;
  description: string;
}

const settingsTabs: Array<{ key: string; label: string; icon: ElementType }> = [
  { key: 'profile', label: 'Company Profile', icon: Building },
  { key: 'account', label: 'Account Settings', icon: User },
  { key: 'security', label: 'Security & Roles', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Mail },
];

const notificationOptions: NotificationOption[] = [
  {
    key: 'email',
    apiKey: 'notifications_email',
    label: 'Email Notifications',
    description: 'Saved preference for email notifications',
  },
  {
    key: 'sms',
    apiKey: 'notifications_sms',
    label: 'SMS Alerts',
    description: 'Saved preference for SMS alerts',
  },
  {
    key: 'push',
    apiKey: 'notifications_push',
    label: 'Push Notifications',
    description: 'Saved preference for browser notifications',
  },
  {
    key: 'gst',
    apiKey: 'notifications_gst_reminders',
    label: 'GST Filing Reminders',
    description: 'Saved preference for GST return reminders',
  },
  {
    key: 'tds',
    apiKey: 'notifications_tds_alerts',
    label: 'TDS Payment Alerts',
    description: 'Saved preference for TDS deposit alerts',
  },
];

const emptyCompanyForm: CompanyForm = {
  legal_name: '',
  trade_name: '',
  gstin: '',
  pan: '',
  contact_phone: '',
};

const emptyPasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
};

export default function Settings() {
  const { state } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    email: false,
    sms: false,
    push: false,
    gst: false,
    tds: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await settingsGet();
      const payload = res.data?.settings || {};
      const company = payload.company || {};
      const preferences = payload.preferences || {};

      setCompanyForm({
        legal_name: company.legal_name || state.company?.legal_name || '',
        trade_name: company.trade_name || state.company?.trade_name || '',
        gstin: company.gstin || state.company?.gstin || '',
        pan: company.pan || state.company?.pan || '',
        contact_phone: company.contact_phone || '',
      });

      setNotificationPreferences({
        email: preferences.notifications_email === 'true',
        sms: preferences.notifications_sms === 'true',
        push: preferences.notifications_push === 'true',
        gst: preferences.notifications_gst_reminders === 'true',
        tds: preferences.notifications_tds_alerts === 'true',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveCompany = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await api.put('/settings', { company: companyForm });
      setMessage(res.data?.message || 'Settings saved.');
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationPreferences = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const preferences = Object.fromEntries(
      notificationOptions.map((option) => [
        option.apiKey,
        String(notificationPreferences[option.key]),
      ]),
    );

    try {
      const res = await api.put('/settings', { preferences });
      setMessage(res.data?.message || 'Notification preferences saved.');
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPasswordMessage(null);

    if (!passwordForm.current_password || !passwordForm.new_password) {
      setError('Enter your current password and a new password.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('The new password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await authChangePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordMessage(res.data?.message || 'Password updated.');
      setPasswordForm(emptyPasswordForm);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update the password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 h-64 flex items-center justify-center animate-pulse">
          <div className="text-on-surface-variant">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Settings</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">Manage your FINZI AI workspace and preferences.</p>
        </div>
      </div>

      {error && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-space-md p-space-md rounded-md bg-green/10 border border-green text-on-surface text-sm">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-space-sm mb-space-md border-b border-outline">
        {settingsTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            <tab.icon size={16} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Company Profile</h2>
          </CardHeader>
          <CardContent className="space-y-space-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface" htmlFor="legal-name">Legal Name</label>
                <Input
                  id="legal-name"
                  value={companyForm.legal_name}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, legal_name: event.target.value }))}
                  placeholder="Enter company legal name"
                />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface" htmlFor="trade-name">Trade Name</label>
                <Input
                  id="trade-name"
                  value={companyForm.trade_name}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, trade_name: event.target.value }))}
                  placeholder="Enter trade name"
                />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface" htmlFor="gstin">GSTIN</label>
                <Input
                  id="gstin"
                  value={companyForm.gstin}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, gstin: event.target.value }))}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface" htmlFor="pan">PAN</label>
                <Input
                  id="pan"
                  value={companyForm.pan}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, pan: event.target.value }))}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface" htmlFor="registered-email">Registered Email</label>
                <Input id="registered-email" value={state.user?.email || ''} disabled />
              </div>
              <div className="space-y-space-sm">
                <label className="text-sm font-medium text-on-surface" htmlFor="contact-phone">Contact Phone</label>
                <Input
                  id="contact-phone"
                  value={companyForm.contact_phone}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, contact_phone: event.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <Button variant="green" className="w-full" onClick={saveCompany} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'account' && (
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Account Settings</h2>
          </CardHeader>
          <CardContent className="space-y-space-md">
            <div className="space-y-space-sm">
              <label className="text-sm font-medium text-on-surface" htmlFor="full-name">Full Name</label>
              <Input id="full-name" value={state.user?.full_name || ''} disabled />
            </div>
            <div className="space-y-space-sm">
              <label className="text-sm font-medium text-on-surface" htmlFor="account-email">Email</label>
              <Input id="account-email" value={state.user?.email || ''} type="email" disabled />
            </div>
            <div className="space-y-space-sm">
              <label className="text-sm font-medium text-on-surface" htmlFor="account-role">Role</label>
              <Input id="account-role" value={state.user?.role || 'Accountant'} disabled />
            </div>
            <p className="text-xs text-on-surface-variant">
              Identity and role fields are read-only here. Ask a workspace administrator to update access details.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'security' && (
        <div className="space-y-space-md">
          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Security & Roles</h2>
            </CardHeader>
            <CardContent className="space-y-space-md">
              <div className="p-space-md rounded-lg border border-outline bg-surface-container-low">
                <p className="text-sm font-medium text-on-surface">Two-Factor Authentication</p>
                <p className="text-xs text-on-surface-variant mt-space-xs">
                  Two-factor authentication is not available for this workspace.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Change Password</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-space-md">
                <div className="space-y-space-sm">
                  <label className="text-sm font-medium text-on-surface" htmlFor="current-password">Current Password</label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                  />
                </div>
                <div className="space-y-space-sm">
                  <label className="text-sm font-medium text-on-surface" htmlFor="new-password">New Password</label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                    helperText="Use at least 8 characters."
                  />
                </div>
                <div className="space-y-space-sm">
                  <label className="text-sm font-medium text-on-surface" htmlFor="confirm-password">Confirm New Password</label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                  />
                </div>
                {passwordMessage && (
                  <p className="text-sm text-green">{passwordMessage}</p>
                )}
                <Button type="submit" variant="green" disabled={changingPassword}>
                  {changingPassword ? 'Updating...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Notification Preferences</h2>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {notificationOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between p-space-md rounded-lg border border-outline bg-surface-container-low">
                <div>
                  <p className="text-sm font-medium text-on-surface">{option.label}</p>
                  <p className="text-xs text-on-surface-variant">{option.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences[option.key]}
                  onChange={(event) => setNotificationPreferences((current) => ({
                    ...current,
                    [option.key]: event.target.checked,
                  }))}
                  className="rounded border-border text-secondary focus:ring-secondary"
                  aria-label={option.label}
                />
              </div>
            ))}
            <Button variant="green" className="w-full" onClick={saveNotificationPreferences} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
