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
        <div className="text-[#F8FAFC]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="aurora-bg">
        <span className="aurora-orb aurora-orb-1" />
        <span className="aurora-orb aurora-orb-2" />
        <span className="aurora-orb aurora-orb-3" />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="glass-strong p-8 rounded-2xl shimmer-border stagger-in">
          <div className="flex items-center justify-center mb-8">
            <div className="brand-orb">
              <span className="brand-orb-core" />
              <span className="brand-orb-ring" />
              <span className="brand-orb-sat" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 tracking-wide">
              <span className="text-gradient">Simpli</span>
            </h1>
            <p className="text-[#94A3B8]">Sign in to manage your applications</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] flex items-start gap-3 rounded-lg">
              <AlertCircle className="w-5 h-5 text-[#ff3b5c] mt-0.5" />
              <p className="text-sm text-[#ff3b5c]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#1E293B]/70 border border-[rgba(34,197,94,0.12)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none transition rounded-lg"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-[#1E293B]/70 border border-[rgba(34,197,94,0.12)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none transition rounded-lg"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC] transition"
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

        <p className="text-center text-sm text-[#94A3B8] mt-6">
          Frontend prototype - data resets on refresh
        </p>
      </div>
    </div>
  );
}