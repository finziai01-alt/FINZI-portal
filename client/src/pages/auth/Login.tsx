import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, LockOpen, Google, MailOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-navy p-12 text-white flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-green rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">FINZI AI</span>
          </div>
          <h2 className="text-3xl font-semibold mb-4">Intelligent Financial Management</h2>
          <p className="text-gray-300 max-w-md leading-relaxed">
            AI-powered accounting, financial management and auditing platform for Indian businesses.
          </p>
          <div className="mt-8 flex gap-3">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green"></span>
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green"></span>
              ISO 27001 Certified
            </span>
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-sm text-secondary-text">
            FINZI AI © 2025. Built for Chartered Accountants and finance teams in India.
          </p>
        </div>
      </div>
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-green rounded flex items-center justify-center">
              <span className="font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold tracking-tight">FINZI AI</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
          <p className="text-secondary-text mb-6">Sign in to your FINZI AI workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work email or mobile"
              placeholder="name@company.com"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error && 'Invalid credentials'}
            />
            <Input
              label="Password"
              type="password"
              icon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border text-green focus:ring-green" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-green hover:text-green/90">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" variant="green" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-secondary-text text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-green hover:text-green/90 font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


