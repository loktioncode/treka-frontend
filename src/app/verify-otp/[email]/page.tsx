'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, AlertCircle, ArrowLeft, Mail, Key } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function VerifyOTP() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const params = useParams();
  const email = decodeURIComponent(params.email as string);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authAPI.verifyResetCode(email, code);
      setIsVerified(true);
      toast.success('Code verified successfully!');
    } catch (err: unknown) {
      let errorMessage = 'Invalid verification code. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        errorMessage = axiosError.response?.data?.detail || errorMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      // First verify the code again, then reset password
      const verifyResponse = await authAPI.verifyResetCode(email, code);
      await authAPI.resetPassword(verifyResponse.reset_token, password);
      
      toast.success('Password reset successfully!');
      router.push('/login?reset=success');
    } catch (err: unknown) {
      let errorMessage = 'Failed to reset password. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        errorMessage = axiosError.response?.data?.detail || errorMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('Verification code sent again!');
      setError('');
    } catch (err: unknown) {
      let errorMessage = 'Failed to resend code. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        errorMessage = axiosError.response?.data?.detail || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center shadow-lg"
            >
              {isVerified ? <Key className="w-8 h-8 text-white" /> : <Mail className="w-8 h-8 text-white" />}
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isVerified ? 'Set New Password' : 'Enter Verification Code'}
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {isVerified 
                  ? 'Create a new secure password for your account'
                  : `We've sent a 6-digit verification code to ${email}`
                }
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isVerified ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label htmlFor="code" className="text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit code"
                    className="h-12 text-center text-lg tracking-widest font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading || code.length !== 6}
                  className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    Didn&apos;t receive the code?
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendCode}
                    loading={isResending}
                    disabled={isResending}
                    className="text-teal-600 hover:text-teal-700"
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Enter new password"
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Confirm new password"
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>At least 8 characters long</li>
                    <li>Should contain letters and numbers</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading || password.length < 8}
                  className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            )}

            <div className="text-center pt-4">
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}