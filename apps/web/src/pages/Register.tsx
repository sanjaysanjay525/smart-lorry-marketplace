import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '@slm/shared';
import { useAuth } from '../lib/auth';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.customer);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ name, email, phone, password, role });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.error?.details?.[0]?.message ||
        'Registration failed. Please check inputs.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand/10 blur-[80px]"></div>
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-[80px]"></div>

      {/* Glass Panel */}
      <div className="glass-panel w-full max-w-lg rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center text-xl text-brand-foreground mx-auto mb-4 shadow-lg shadow-brand/20">
            🚚
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create an Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join the Smart Lorry Marketplace</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-destructive/15 border border-destructive/20 p-3.5 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg bg-slate-900/60 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full rounded-lg bg-slate-900/60 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-lg bg-slate-900/60 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-900/60 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole(UserRole.customer)}
                className={`rounded-lg border p-3.5 text-center transition-all duration-200 ${
                  role === UserRole.customer
                    ? 'border-brand bg-brand/10 text-white font-semibold'
                    : 'border-border bg-slate-900/40 text-muted-foreground hover:bg-slate-900/60 hover:text-foreground'
                }`}
              >
                <span className="block text-lg mb-1">📦</span>
                <span className="text-xs block">Customer</span>
                <span className="text-[10px] opacity-60 font-normal">I need to ship cargo</span>
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.owner)}
                className={`rounded-lg border p-3.5 text-center transition-all duration-200 ${
                  role === UserRole.owner
                    ? 'border-brand bg-brand/10 text-white font-semibold'
                    : 'border-border bg-slate-900/40 text-muted-foreground hover:bg-slate-900/60 hover:text-foreground'
                }`}
              >
                <span className="block text-lg mb-1">💼</span>
                <span className="text-xs block">Lorry Owner</span>
                <span className="text-[10px] opacity-60 font-normal">I own trucks/hire drivers</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 hover:opacity-95 active:scale-[0.98] transition-all mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
