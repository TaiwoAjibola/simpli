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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[#787774] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px]">
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-8">
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#37352F] mb-2">
              Simpli
            </h1>
            <p className="text-sm text-[#787774]">Sign in to manage your applications</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-[#F7F7F5] border border-[#E9E9E7] flex items-start gap-3 rounded-[6px]">
              <AlertCircle className="w-4 h-4 text-[#EB5757] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#37352F]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787774]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787774]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#37352F] transition duration-150 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#2383E2] text-white py-2.5 font-medium rounded-[6px] hover:bg-[#1A6FC0] transition duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9B9A97] mt-6">
          Frontend prototype - data resets on refresh
        </p>
      </div>
    </div>
  );
}
