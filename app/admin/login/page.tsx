"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Lock } from 'lucide-react';

const GENERIC_ERROR = 'Invalid email or password.';

/** Only allow same-origin relative paths; the middleware may double-encode the callback. */
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return '/admin';
  let value = raw;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      return '/admin';
    }
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes(String.fromCharCode(92))) return '/admin';
  if (value.startsWith('/admin/login')) return '/admin';
  return value;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error') ? GENERIC_ERROR : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.ok && !res.error) {
        window.location.assign(callbackUrl);
        return;
      }
      setError(res?.error?.includes('Too many login attempts') ? res.error : GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    }
    setPassword('');
    setLoading(false);
  };

  const inputClass =
    'w-full bg-[#0B0B0C] border border-[#242426] focus:border-[#C8FF35] focus:ring-1 focus:ring-[#C8FF35] outline-none rounded-lg px-4 py-3 text-sm text-[#F3F0E9] placeholder:text-gray-600 transition-colors';

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-[#F3F0E9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-[0.25em]">
            DAXUL <span className="text-[#C8FF35]">LABS</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-[#B9B9B4]">Admin Access</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#151515] border border-[#242426] rounded-2xl p-6 space-y-4 shadow-2xl"
          noValidate
        >
          <div className="flex items-center gap-2 text-[#C8FF35]">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Sign in</span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs uppercase tracking-wider text-[#B9B9B4]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className={inputClass}
              placeholder="you@daxullabs.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs uppercase tracking-wider text-[#B9B9B4]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={inputClass}
              placeholder="••••••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full flex items-center justify-center gap-2 bg-[#C8FF35] text-[#0B0B0C] font-bold uppercase tracking-wider text-sm rounded-lg py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0B0B0C]" />}>
      <LoginForm />
    </Suspense>
  );
}
