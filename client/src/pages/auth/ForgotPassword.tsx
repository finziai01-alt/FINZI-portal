import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authForgotPassword, authResetPassword } from '../../services/api';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await authForgotPassword({ email: email.trim() });
      setToken(res.data?.resetToken || '');
      setStage('reset');
      setMessage(
        res.data?.resetToken
          ? 'Email delivery is not configured on this server, so the reset token is shown here. Use it to set a new password.'
          : res.data?.message || 'If the address exists, a reset token has been issued.'
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not start the password reset');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Use at least 8 characters for the new password');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await authResetPassword({ token, password });
      setMessage('Password updated. Sign in with the new password.');
      setStage('request');
      setPassword('');
      setConfirm('');
      setToken('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update the password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-space-lg">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline shadow-[0_4px_24px_rgba(17,28,46,0.06)] p-space-lg">
        <Link to="/login" className="inline-flex items-center gap-space-2xs text-label-md text-label-md font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        <h1 className="mt-space-md font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          {stage === 'request' ? 'Reset your password' : 'Choose a new password'}
        </h1>
        <p className="mt-space-2xs font-body-md text-body-md text-on-surface-variant">
          {stage === 'request'
            ? 'Enter the work email on your account. We issue a reset token for that address.'
            : 'The reset token below came from the server. Set a new password to finish.'}
        </p>

        {message && (
          <p className="mt-space-md rounded bg-surface-container-low border border-outline px-space-sm py-space-xs text-body-sm text-body-sm text-on-surface">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-space-md rounded bg-error-container/40 border border-error/40 px-space-sm py-space-xs text-body-sm text-body-sm text-error">
            {error}
          </p>
        )}

        {stage === 'request' ? (
          <form onSubmit={requestReset} className="mt-space-lg space-y-space-md">
            <div className="space-y-space-2xs">
              <label htmlFor="reset-email" className="font-label-md text-label-md font-semibold text-on-surface">
                Work email
              </label>
              <div className="relative flex items-center">
                <Mail size={17} className="absolute left-space-md text-on-surface-variant pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ca.sharma@apextech.in"
                  className="input-field pl-10"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md font-bold tracking-wide shadow-sm transition-all disabled:opacity-60"
            >
              {busy ? 'Requesting reset' : 'Request reset token'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-space-lg space-y-space-md">
            <div className="space-y-space-2xs">
              <label htmlFor="reset-token" className="font-label-md text-label-md font-semibold text-on-surface">
                Reset token
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input-field font-code-mono text-code-mono"
              />
            </div>
            <div className="space-y-space-2xs">
              <label htmlFor="new-password" className="font-label-md text-label-md font-semibold text-on-surface">
                New password
              </label>
              <div className="relative flex items-center">
                <KeyRound size={17} className="absolute left-space-md text-on-surface-variant pointer-events-none" />
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div className="space-y-space-2xs">
              <label htmlFor="confirm-password" className="font-label-md text-label-md font-semibold text-on-surface">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md font-bold tracking-wide shadow-sm transition-all disabled:opacity-60"
            >
              {busy ? 'Updating' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
