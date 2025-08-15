'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setIsEmailSent(true);
      toast.success('Verification code sent to your email!');
      
      // Redirect to OTP verification page after a short delay
      setTimeout(() => {
        router.push(`/verify-otp/${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || 'Failed to send verification code. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                isEmailSent 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}
            >
              {isEmailSent ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Mail className="w-8 h-8 text-white" />
              )}
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isEmailSent ? 'Check Your Email' : 'Forgot Password?'}
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {isEmailSent 
                  ? `We've sent a verification code to ${email}. You'll be redirected to enter the code shortly.`
                  : 'Enter your email address and we\'ll send you a verification code to reset your password.'
                }
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isEmailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    placeholder="Enter your email address"
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading || !email}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Email sent successfully!</p>
                    <p className="text-sm">Redirecting you to enter the verification code...</p>
                  </div>
                </motion.div>
                
                <Button
                  onClick={() => router.push(`/verify-otp/${encodeURIComponent(email)}`)}
                  className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Continue to Verification
                </Button>
              </div>
            )}

            <div className="text-center pt-4">
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
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