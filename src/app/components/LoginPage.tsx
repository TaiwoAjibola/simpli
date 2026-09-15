import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setSubmitting(false);
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Invalid email or password');
    }
    setSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">

      <div className="w-full max-w-md px-6 relative z-10">
<div className="glass-strong p-8 rounded-2xl stagger-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 tracking-wide">
              <span className="text-foreground">Simpli</span>
            </h1>
            <p className="text-muted-foreground">Sign in to manage your applications</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[rgba(124,58,237,0.1)] border border-[rgba(255,59,92,0.2)] flex items-start gap-3 rounded-lg">
              <AlertCircle className="w-5 h-5 text-[#7C3AED] mt-0.5" />
              <p className="text-sm text-[#7C3AED]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/70 border border-[rgba(124,58,237,0.12)] text-foreground focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition rounded-lg"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-white/70 border border-[rgba(124,58,237,0.12)] text-foreground focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition rounded-lg"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary-glow text-[#020617] py-3 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Frontend prototype - data resets on refresh
        </p>
      </div>
    </div>
  );
}