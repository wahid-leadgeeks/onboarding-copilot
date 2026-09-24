'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NovaLogo } from '@/app/components/NovaLogo';
import { IconGoogle, IconAlertTriangle, IconCheckCircle } from '@/app/components/Icons';

function LoginContent() {

  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const error = searchParams.get('error');
  const logout = searchParams.get('logout');
  const redirect = searchParams.get('redirect') || searchParams.get('returnTo') || '/';

  // Map known error codes to friendly, human messages
  const getErrorMessage = (code: string | null) => {
    if (!code) return null;
    switch (code) {
      case 'access_denied':
        return 'Google sign-in was cancelled or access was denied. Please try again.';
      case 'missing_code_or_state':
        return 'Invalid response from Google authentication. Please try signing in again.';
      case 'state_mismatch':
        return 'Security validation failed (CSRF state mismatch). Please try again.';
      case 'token_exchange_failed':
        return 'Could not exchange authorization code with Google. Please verify your Google account and try again.';
      case 'profile_fetch_failed':
        return 'Unable to fetch your Google profile information. Please try again.';
      case 'oauth_unconfigured':
        return 'Google OAuth is not configured on this environment. Please verify your environment variables.';
      case 'unauthorized':
        return 'Please sign in to access your onboarding dashboard and schedule.';
      default:
        return 'An error occurred during authentication. Please try signing in again.';
    }
  };

  const errorMessage = getErrorMessage(error);

  const loginUrl = `/api/auth/login?redirect=${encodeURIComponent(
    redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  )}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafaf7] px-4 py-12 sm:px-6 lg:px-8">
      {/* Background warm radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-amber-100/40 via-yellow-50/30 to-mint-50/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl bg-white p-8 shadow-soft border border-stone-200/60 sm:p-10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50/80 shadow-2xs">
              <NovaLogo className="size-8" />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-[0.16em] text-stone-900">
                NOVA
              </h1>
              <span className="rounded bg-mint-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mint-700">
                v3
              </span>
            </div>

            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
              Newcomer Onboarding Cockpit
            </p>

            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Welcome to your onboarding companion. Sign in with your Google account to track daily activities, write learning reflections, and keep your onboarding sheet in sync.
            </p>
          </div>

          {/* Feedback Notices */}
          {logout === 'success' && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-mint-50/90 p-4 text-xs text-mint-900 border border-mint-200/60 animate-fade-in">
              <IconCheckCircle className="mt-0.5 size-4 shrink-0 text-mint-600" />
              <div>
                <p className="font-semibold">Signed out successfully</p>
                <p className="mt-0.5 text-mint-700">
                  You have been signed out. Have a wonderful day! 👋
                </p>
              </div>
            </div>
          )}


          {errorMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-peach-50/90 p-4 text-xs text-peach-900 border border-peach-200/60 animate-fade-in">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-peach-600" />
              <div>
                <p className="font-semibold">Sign-in Notice</p>
                <p className="mt-0.5 text-peach-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8">
            <a
              href={loginUrl}
              onClick={() => setLoading(true)}
              className={`group flex w-full items-center justify-center gap-3 rounded-2xl bg-stone-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-stone-800 hover:shadow-md active:scale-98 ${
                loading ? 'opacity-80 pointer-events-none' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Redirecting to Google…</span>
                </div>
              ) : (
                <>
                  <IconGoogle className="size-5 shrink-0 transition-transform group-hover:scale-105" />
                  <span>Continue with Google</span>
                </>
              )}
            </a>
          </div>

          {/* Reassurance Footer */}
          <div className="mt-8 border-t border-stone-100 pt-6">
            <div className="flex flex-col gap-2.5 text-[11px] text-stone-500">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-mint-500 shrink-0" />
                <span>Encrypted session with Google Workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-mint-500 shrink-0" />
                <span>Dual-sync with PostgreSQL & Google Sheets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small sub-caption */}
        <p className="mt-4 text-center text-xs text-stone-400">
          NOVA · The Onboarding Cockpit for High-Performing Teams
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#fafaf7]">
          <div className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
