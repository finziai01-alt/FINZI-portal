import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import api, { authChangePassword, settingsGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/layout/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Card } from '../components/ui/Card';
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

const settingsTabs = [
  { key: 'profile', label: 'Company Profile', icon: Building },
  { key: 'account', label: 'Account Settings', icon: User },
  { key: 'security', label: 'Security & Roles', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Mail },
] as const;

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
      notificationOptions.map((option) => [option.apiKey, String(notificationPreferences[option.key])]),
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
      <div className="px-4 py-5 lg:px-6">
        <PageHeader title="Settings" description="Manage your FINZI AI workspace and preferences." />
        <div className="h-64 shimmer rounded-xl border border-line mx-4 my-4" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 lg:px-6 space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your FINZI AI workspace and preferences."
        actions={
          <Segmented
            options={settingsTabs.map((t) => ({ value: t.key, label: t.label }))}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Settings tab"
          />
        }
      />

      {error && (
        <div className="rounded-xl border border-line bg-neg-soft px-4 py-3 text-sm text-danger-ink flex items-center gap-2">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm text-brand-ink flex items-center gap-2">
          {message}
        </div>
      )}

      {activeTab === 'profile' && (
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Company Profile</h2>
          </div>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="legal-name"
              label="Legal Name"
              value={companyForm.legal_name}
              onChange={(e) => setCompanyForm((c) => ({ ...c, legal_name: e.target.value }))}
              placeholder="Enter company legal name"
            />
            <Input
              id="trade-name"
              label="Trade Name"
              value={companyForm.trade_name}
              onChange={(e) => setCompanyForm((c) => ({ ...c, trade_name: e.target.value }))}
              placeholder="Enter trade name"
            />
            <Input
              id="gstin"
              label="GSTIN"
              value={companyForm.gstin}
              onChange={(e) => setCompanyForm((c) => ({ ...c, gstin: e.target.value }))}
              hint="22AAAAA0000A1Z5"
            />
            <Input
              id="pan"
              label="PAN"
              value={companyForm.pan}
              onChange={(e) => setCompanyForm((c) => ({ ...c, pan: e.target.value }))}
              hint="ABCDE1234F"
            />
            <Input
              id="registered-email"
              label="Registered Email"
              value={state.user?.email || ''}
              disabled
            />
            <Input
              id="contact-phone"
              label="Contact Phone"
              value={companyForm.contact_phone}
              onChange={(e) => setCompanyForm((c) => ({ ...c, contact_phone: e.target.value }))}
              placeholder="+91 98765 43210"
            />
            <div className="md:col-span-2">
              <Button variant="green" onClick={saveCompany} disabled={saving} className="w-auto">
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'account' && (
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Account Settings</h2>
          </div>
          <div className="px-4 pb-4 space-y-4">
            <Input id="full-name" label="Full Name" value={state.user?.full_name || ''} disabled />
            <Input id="account-email" label="Email" type="email" value={state.user?.email || ''} disabled />
            <Input id="account-role" label="Role" value={state.user?.role || 'Accountant'} disabled />
            <p className="text-[10px] leading-4 text-ink-3">
              Identity and role fields are read-only here. Ask a workspace administrator to update access details.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Security &amp; Roles</h2>
          </div>
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-line px-4 py-3">
              <p className="text-[11px] font-medium leading-4 text-primary-text">Two-Factor Authentication</p>
              <p className="mt-0.5 text-[10px] leading-3 text-ink-3">
                Two-factor authentication is not available for this workspace.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-line overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
                <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Change Password</h2>
              </div>
              <div className="px-4 pb-4">
                <form onSubmit={changePassword} className="space-y-3">
                  <Input
                    id="current-password"
                    label="Current Password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((c) => ({ ...c, current_password: e.target.value }))}
                  />
                  <Input
                    id="new-password"
                    label="New Password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((c) => ({ ...c, new_password: e.target.value }))}
                    hint="Use at least 8 characters."
                  />
                  <Input
                    id="confirm-password"
                    label="Confirm New Password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((c) => ({ ...c, confirm_password: e.target.value }))}
                  />
                  {passwordMessage && (
                    <p className="text-[10px] leading-4 text-brand-ink">{passwordMessage}</p>
                  )}
                  <Button type="submit" variant="green" disabled={changingPassword} className="w-auto">
                    {changingPassword ? 'Updating…' : 'Change Password'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card flush>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 border-b border-line">
            <h2 className="text-[12px] font-semibold leading-4 text-primary-text tracking-[-0.01em]">Notification Preferences</h2>
          </div>
          <div className="px-4 pb-4 divide-y divide-line">
            {notificationOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[11px] font-medium leading-4 text-primary-text">{option.label}</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-ink-3">{option.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences[option.key]}
                  onChange={(e) =>
                    setNotificationPreferences((current) => ({ ...current, [option.key]: e.target.checked }))
                  }
                  aria-label={option.label}
                  className="shrink-0 rounded border border-line bg-surface text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0 checked:bg-brand checked:border-brand transition-colors duration-micro"
                />
              </div>
            ))}
            <div className="pt-4">
              <Button variant="green" onClick={saveNotificationPreferences} disabled={saving} className="w-auto">
                {saving ? 'Saving…' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}