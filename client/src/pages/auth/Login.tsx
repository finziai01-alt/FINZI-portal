import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

const FEATURES = [
  'CGST and SGST split on every bill',
  'GSTIN captured on vendors and customers',
  'Multi-company workspace with role based access',
  'Double entry ledger that refuses unbalanced postings',
];

const CAPABILITIES = ['Indian accounting', 'GST and TDS workflows', 'Audit evidence trail', 'Rupee reporting'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await login(email.trim(), password, remember);
      navigate('/dashboard');
    } catch (err: any) {
      setError('The login credentials entered are wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const ssoNotice = (provider: string) =>
    setNotice(`${provider} sign-in is not connected to a provider yet. Use your work email and password.`);

  return (
    <div className="min-h-screen flex flex-col bg-background lg:flex-row">
      {/* Left rail: product statement, dark primary container */}
      <aside className="hidden lg:flex lg:w-[46%] bg-primary-container text-on-primary flex-col justify-between px-space-2xl py-space-xl">
        <div>
          <div className="flex items-start justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 bg-secondary rounded-md flex items-center justify-center">
                <span className="text-on-secondary font-bold text-lg">F</span>
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-white">FINZI AI</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-primary-container">Enterprise terminal</p>
              </div>
            </div>
            <span className="font-code-mono text-code-mono text-secondary-fixed border border-secondary-fixed/40 rounded px-space-sm py-space-2xs">
              MODE: IN-01 ONLINE
            </span>
          </div>

          <p className="mt-space-2xl inline-flex items-center gap-space-2xs text-secondary-fixed font-label-sm text-label-sm uppercase tracking-[0.14em]">
            <Sparkles size={14} /> Accounting, tax and audit for India
          </p>
          <h1 className="mt-space-sm text-[34px] leading-[1.15] font-bold tracking-tight text-white max-w-lg">
            Continuous reconciliation for Indian enterprises.
          </h1>
          <p className="mt-space-md text-body-md text-body-md text-on-primary-container max-w-lg leading-relaxed">
            Bills, invoices, the ledger, bank statements and tax filings stay in one workspace, built for
            Chartered Accountants and finance teams that file every month.
          </p>

          <div className="mt-space-xl rounded-xl bg-white/5 border border-white/10 p-space-md max-w-lg">
            <div className="flex items-center justify-between">
              <p className="text-label-md text-label-md font-semibold text-white">Direct Indian tax engine</p>
              <p className="font-code-mono text-code-mono text-on-primary-container">GSTIN 1/3, 2/3</p>
            </div>
            <ul className="mt-space-sm grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-space-2xs text-body-sm text-body-sm text-[#c7d2e6]">
                  <CheckCircle2 size={14} className="text-secondary-fixed mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-space-xl">
          <div className="grid grid-cols-2 2xl:grid-cols-4 gap-space-sm">
            {CAPABILITIES.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 px-space-sm py-space-sm">
                <p className="text-[10px] uppercase tracking-[0.14em] text-on-primary-container">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-space-md font-code-mono text-code-mono text-on-primary-container">
            © 2026 FINZI AI
          </p>
        </div>
      </aside>

      {/* Right side: top bar and the sign-in card */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline bg-surface-container-lowest">
          <Link to="/login" className="text-label-md text-label-md font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
            Back to portal
          </Link>
          <div className="flex items-center gap-space-md">
            <span className="font-code-mono text-code-mono text-outline uppercase hidden sm:inline">English (IN)</span>
            <Link to="/forgot-password" className="text-label-md text-label-md font-semibold text-secondary hover:underline">
              Reset password
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-space-lg">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(17,28,46,0.06)] p-space-lg sm:p-space-xl">
            <div className="flex items-center justify-between gap-space-sm mb-space-xl">
              <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded bg-surface-container text-on-surface-variant">
                <ShieldCheck size={15} className="text-secondary" />
                <span className="font-code-mono text-code-mono tracking-wider uppercase">Secure sign-in</span>
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                New to FINZI?{' '}
                <Link to="/register" className="font-label-md text-label-md text-secondary hover:underline font-semibold ml-1">
                  Create account
                </Link>
              </p>
            </div>

            <div className="mb-space-xl">
              <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Welcome back</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">
                Sign in to reach your financial workspace
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mb-space-lg">
              <button
                type="button"
                onClick={() => ssoNotice('Google Workspace')}
                className="flex items-center justify-center gap-space-sm h-10 px-space-md rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span className="font-medium">Google Workspace</span>
              </button>
              <button
                type="button"
                onClick={() => ssoNotice('Enterprise SSO')}
                className="flex items-center justify-center gap-space-sm h-10 px-space-md rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all active:scale-[0.99]"
              >
                <Building2 size={16} className="text-on-surface-variant" />
                <span className="font-medium">Enterprise SSO</span>
              </button>
            </div>

            {notice && (
              <p className="mb-space-lg rounded bg-warning/10 border border-warning/40 px-space-sm py-space-xs text-body-sm text-body-sm text-on-surface">
                {notice}
              </p>
            )}

            <div className="relative flex items-center justify-center my-space-lg">
              <div className="w-full h-px bg-surface-container-high" />
              <span className="absolute bg-surface-container-lowest px-space-sm font-label-sm text-label-sm text-outline uppercase tracking-wider">
                or continue with work email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-space-md">
              <div className="space-y-space-2xs">
                <label className="flex items-center justify-between font-label-md text-label-md font-semibold text-on-surface" htmlFor="principal-id">
                  <span>Work email or mobile number</span>
                  <span className="font-code-mono text-code-mono text-secondary uppercase font-semibold">GSTIN linked</span>
                </label>
                <div className="relative flex items-center">
                  <UserRound size={17} className="absolute left-space-md text-on-surface-variant pointer-events-none" />
                  <input
                    className="w-full h-11 pl-10 pr-10 rounded bg-surface-container-low focus:bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md transition-all outline-none focus:ring-2 focus:ring-secondary/40 focus:shadow-sm"
                    id="principal-id"
                    placeholder="ca.sharma@apextech.in"
                    required
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {email && <CheckCircle2 size={17} className="absolute right-space-md text-secondary" />}
                </div>
              </div>

              <div className="space-y-space-2xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md font-semibold text-on-surface" htmlFor="secret-key">
                    Password
                  </label>
                  <Link to="/forgot-password" className="font-label-sm text-label-sm text-secondary hover:underline font-semibold">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <Lock size={17} className="absolute left-space-md text-on-surface-variant pointer-events-none" />
                  <input
                    className="w-full h-11 pl-10 pr-11 rounded bg-surface-container-low focus:bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md transition-all outline-none focus:ring-2 focus:ring-secondary/40 focus:shadow-sm"
                    id="secret-key"
                    placeholder="Your password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-space-sm p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-space-2xs">
                <label className="flex items-center gap-space-sm cursor-pointer select-none">
                  <input
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-secondary cursor-pointer"
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface">Keep me signed in on this device (7 days)</span>
                </label>
                <span className="font-code-mono text-code-mono text-outline uppercase hidden sm:inline">JWT session</span>
              </div>

              {error && (
                <p className="rounded bg-error-container/40 border border-error/40 px-space-sm py-space-xs text-body-sm text-body-sm text-error">
                  {error}
                </p>
              )}

              <button
                className="w-full h-11 mt-space-sm rounded bg-secondary hover:bg-on-secondary-container active:scale-[0.99] text-on-secondary font-label-md text-label-md font-bold tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-space-xs"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LogIn size={17} /> Signing in
                  </>
                ) : (
                  <>
                    Sign in to workspace <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-space-lg rounded-xl overflow-hidden bg-primary-container p-space-md text-on-primary relative">
              <div className="flex items-center gap-space-md">
                <div className="w-14 h-14 shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                  <BadgeCheck size={24} className="text-secondary-fixed" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-space-xs">
                    <span className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider font-semibold">
                      GSTN gateway
                    </span>
                    <span className="font-code-mono text-code-mono text-on-primary-container">pending integration</span>
                  </div>
                  <p className="font-headline-sm text-headline-sm font-semibold truncate text-on-primary mt-space-2xs">
                    Direct filing stays off until a GSTN client is configured
                  </p>
                  <p className="font-body-sm text-body-sm text-on-primary-container truncate">
                    Preparation and review of GSTR-3B work today
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-space-lg pt-space-md bg-surface-container-low/40 rounded-lg p-space-sm flex items-start gap-space-sm text-on-surface-variant">
              <Mail size={17} className="text-secondary shrink-0 mt-0.5" />
              <p className="font-body-sm text-body-sm leading-relaxed">
                Sessions are tenant scoped and every entry is attributed to a user. Need access for a colleague?
                Ask your workspace administrator to invite them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
