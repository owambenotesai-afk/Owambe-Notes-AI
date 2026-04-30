import React, { useState, useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export const Auth = () => {
  const location = useLocation();
  const { user, loading: authLoading, signUpWithEmail, signInWithEmail, signInWithGoogle, resendVerificationEmail } = useAuth();
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

  if (user && user.emailVerified) {
    const from = location.state?.from || '/posts';
    return <Navigate to={from} replace />;
  }

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in with Google');
      }
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
        toast.success('Check your email or spam folder to verify your account');
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
    <div className="flex h-[100dvh] items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 sm:p-6 overflow-hidden">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
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
                <label htmlFor="username" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 font-medium">@</span>
                  <input
                    id="username"
                    name="username"
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
              <label htmlFor="login-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
                <input
                  id="login-email"
                  name="login-email"
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
              <label htmlFor="signup-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
                <input
                  id="signup-email"
                  name="signup-email"
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
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
              <input
                id="password"
                name="password"
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
                <label htmlFor="confirm-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
                  <input
                    id="confirm-password"
                    name="confirm-password"
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
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 py-2.5 px-4 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
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
