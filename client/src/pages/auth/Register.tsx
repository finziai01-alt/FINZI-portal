import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, LockOpen, Phone, User, Check } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', password: '', confirm_password: '', role: 'accountant', terms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
      });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left: Brand & Info Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container-lowest border-r border-outline p-12 text-on-surface flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-on-secondary font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">FINZI AI</span>
          </div>
          <h2 className="text-3xl font-semibold mb-4">Create your workspace</h2>
          <p className="text-on-surface-variant max-w-md leading-relaxed">
            Bookkeeping, GST, TDS, audit working papers and rupee reporting for Indian businesses and CA firms.
          </p>
        </div>
        <div className="mt-auto">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Check size={14} className="text-secondary shrink-0" />
            <span>Passwords hashed, access scoped by role</span>
          </div>
        </div>
      </div>

      {/* Right: Register Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(17,28,46,0.06)] p-space-lg sm:p-space-xl lg:p-space-2xl">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                <span className="text-on-secondary font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold tracking-tight">FINZI AI</span>
            </div>

            {step === 1 ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Create account</h2>
                <p className="text-on-surface-variant mb-6">Get started with your FINZI AI workspace</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Full name"
                    icon={<User size={18} />}
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                  <Input
                    label="Work email"
                    icon={<Mail size={18} />}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Mobile number (+91)"
                    icon={<Phone size={18} />}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="Password"
                    icon={<Lock size={18} />}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Input
                    label="Confirm password"
                    icon={<LockOpen size={18} />}
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  />
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                      className="rounded border-border text-secondary focus:ring-secondary"
                    />
                    <label className="text-sm text-on-surface leading-relaxed">
                      I agree to the <Link to="#" className="text-secondary hover:text-secondary/90">Terms of Service</Link> and{' '}
                      <Link to="#" className="text-secondary hover:text-secondary/90">Privacy Policy</Link>
                    </label>
                  </div>
                  {error && <p className="text-sm text-error">{error}</p>}
                  <Button type="submit" variant="green" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
                <p className="mt-6 text-center text-on-surface-variant text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-secondary hover:text-secondary/90 font-medium">
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-secondary-container/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-secondary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Account created!</h2>
                  <p className="text-on-surface-variant mb-6">
                    Your FINZI AI workspace is ready. Sign in to start recording books, GST and audit work.
                  </p>
                  <Button variant="green" className="w-full" onClick={() => navigate('/login')}>
                    Go to sign in
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}