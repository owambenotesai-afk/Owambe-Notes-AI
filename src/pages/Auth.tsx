import React, { useState, useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User } from 'lucide-react';

export const Auth = () => {
  const location = useLocation();
  const { user, loading: authLoading, signUpWithEmail, signInWithEmail, signInAsGuest, resendVerificationEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  
  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showResend, setShowResend] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500">Loading...</div>;
  }

  if (user && (user.emailVerified || user.isAnonymous)) {
    return <Navigate to="/" replace />;
  }

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (err: any) {
      setError(err.message || 'Failed to login as guest');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setShowResend(false);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }
        await signUpWithEmail(email, password, username);
        setSuccessMsg('Verification email sent. Please check your email and verify your account before logging in.');
        setIsLogin(true);
        // Clear form
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please ensure you have enabled "Email/Password" (not just "Email link") in the Firebase Console under Authentication > Sign-in method for the project "owambenote-ai".');
      } else if (err.message === 'auth/email-not-verified') {
        setError('Your email is not verified. Please verify your email first.');
        setShowResend(true);
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      setError('');
      await resendVerificationEmail();
      setSuccessMsg('Verification email sent again.');
      setShowResend(false);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 sm:p-6">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h1 className="text-[21px] leading-[22px] font-bold tracking-tight mb-2 text-stone-900 dark:text-stone-100">OwambeNote AI</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Your intelligent workspace for notes, voice, and ideas.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-100 dark:border-red-900/30 flex flex-col gap-2">
            <span>{error}</span>
            {showResend && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="text-red-700 dark:text-red-500 font-medium underline text-left hover:text-red-800 dark:hover:text-red-400 disabled:opacity-50"
              >
                Resend Verification Email
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-sm mb-4 border border-emerald-100 dark:border-emerald-900/30">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 font-medium">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                    placeholder="johndoe"
                  />
                </div>
              </div>
            </>
          )}

          {isLogin ? (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                  placeholder="johndoe or you@example.com"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00BFA5] text-white py-2.5 px-4 rounded-xl hover:bg-[#00A892] transition-colors font-medium disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-stone-900 px-2 text-stone-500">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 py-2.5 px-4 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            Continue as Guest
          </button>
        </form>

        <p className="text-center text-sm text-stone-600 dark:text-stone-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            to={isLogin ? '/signup' : '/login'}
            onClick={() => {
              setError('');
              setSuccessMsg('');
            }}
            className="font-medium text-[#00BFA5] hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </Link>
        </p>
      </div>
    </div>
  );
};
