import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get path to redirect back to, or default to root
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || 'Invalid email or password');
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
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center text-xl text-brand-foreground mx-auto mb-4 shadow-lg shadow-brand/20">
            🚚
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-1">Smart Lorry Marketplace Portal</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/15 border border-destructive/20 p-3.5 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg bg-slate-900/60 border border-border p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-900/60 border border-border p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 hover:opacity-95 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
