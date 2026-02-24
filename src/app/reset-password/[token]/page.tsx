'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'verifying' | 'ready' | 'loading' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    // Token validation will happen when user submits the form
    setStatus('ready');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setStatus('loading');
    
    try {
      await resetPassword(token, password);
      setStatus('success');
    } catch {
      setError('Failed to reset password. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg p-8 rounded-xl border border-white/20">
        <div>
          <Link href="/" className="block text-center text-white text-3xl font-bold mb-2 cursor-pointer">
            TREKAMAN
          </Link>
          <h2 className="text-center text-2xl font-bold text-white">
            Reset your password
          </h2>
        </div>

        {status === 'success' ? (
          <div className="text-center">
            <div className="bg-green-500/20 border border-green-500/50 text-white p-4 rounded-lg mb-4">
              Your password has been reset successfully
            </div>
            <Link 
              href="/login"
              className="text-blue-300 hover:text-blue-200 cursor-pointer"
            >
              Return to login
            </Link>
          </div>
        ) : status === 'error' && error === 'Invalid or expired reset token' ? (
          <div className="text-center">
            <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg mb-4">
              {error}
            </div>
            <Link 
              href="/forgot-password"
              className="text-blue-300 hover:text-blue-200 cursor-pointer"
            >
              Request new reset link
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-teal-200 pr-10"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/60 hover:text-white/80"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </button>
              </div>

              <div className="relative">
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-teal-200 pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/60 hover:text-white/80"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {showConfirmPassword ? 'Hide password' : 'Show password'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                loading={status === 'loading'}
                disabled={status === 'loading'}
                className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>

            <div className="text-center text-sm">
              <Link 
                href="/login"
                className="text-blue-300 hover:text-blue-200 cursor-pointer"
              >
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 