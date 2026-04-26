import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamApi } from '../services/teamService';
import { CheckCircle, AlertCircle, Loader2, Mail, Building2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, registerWithInvite, login } = useAuth();

  const token = searchParams.get('token');

  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('loading'); // loading, login, register, accepting, success, error

  // Registration form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Track whether we've already tried auto-accept to avoid loops
  const autoAcceptAttempted = useRef(false);

  // Fetch invite info on mount (public endpoint — no auth required)
  useEffect(() => {
    if (!token) {
      setError('No invite token provided');
      setMode('error');
      setLoading(false);
      return;
    }

    teamApi.getInviteInfo(token)
      .then((info) => {
        setInviteInfo(info);
        setEmail(info.email);

        if (!info.isValid) {
          if (info.status === 'accepted') {
            setError('This invite has already been accepted. Please sign in to continue.');
            setMode('login');
          } else if (info.status === 'revoked') {
            setError('This invite was revoked. Please contact your admin for a new one.');
            setMode('error');
          } else if (info.isExpired) {
            setError('This invite has expired. Please ask your admin to resend it.');
            setMode('error');
          } else {
            setError('This invite is no longer valid.');
            setMode('error');
          }
        } else if (isAuthenticated && !autoAcceptAttempted.current) {
          // User is logged in, check if email matches
          if (user && user.email && user.email.toLowerCase() === info.email.toLowerCase()) {
            autoAcceptAttempted.current = true;
            tryAcceptInvite();
          } else {
            setMode('login');
            setFormError(
              `This invite was sent to ${info.email}. You are logged in as ${user?.email || 'someone else'}. ` +
              `Please sign in with the correct account.`
            );
          }
        } else {
          setMode('register');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load invite');
        setMode('error');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Try accepting the invite. If it fails with an auth-required error, show the
   * login form instead of dead-ending. For other errors, show a clear message.
   */
  const tryAcceptInvite = async () => {
    setMode('accepting');
    try {
      await teamApi.acceptInvite(token);
      setMode('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const code = err.code;

      // Backend explicitly tells us to log in or register
      if (code === 'AUTH_REQUIRED_FOR_INVITE' || code === 'SESSION_EXPIRED' || err.status === 401) {
        setMode('login');
        setFormError('Please sign in to accept this invite.');
        return;
      }

      // Already a member — treat as success
      if (code === 'ALREADY_MEMBER' || (err.message || '').toLowerCase().includes('already a member')) {
        setMode('success');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      // Wrong account — show login to switch
      if (code === 'WRONG_ACCOUNT' || err.status === 403) {
        setMode('login');
        setFormError(err.message || 'This invite belongs to a different account.');
        return;
      }

      // Invalid / expired
      if (code === 'INVITE_INVALID' || code === 'INVITE_NOT_FOUND') {
        setError(err.message || 'This invite is no longer valid.');
        setMode('error');
        return;
      }

      // Fallback
      setError(err.message || 'Could not accept invite');
      setMode('error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Backend's register-with-invite creates user AND accepts invite atomically.
      await registerWithInvite(email, password, token);
      // Log them in so they have tokens
      await login(email, password);
      setMode('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      // If they already have an account, nudge them to sign in instead
      if ((err.message || '').toLowerCase().includes('already registered')) {
        setFormError('You already have an account. Please switch to Sign In.');
        setMode('login');
      } else {
        setFormError(err.message || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await login(email, password);
      // After login, accept the invite — api singleton now has valid tokens
      try {
        await teamApi.acceptInvite(token);
        setMode('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (acceptErr) {
        const code = acceptErr.code;
        if (code === 'ALREADY_MEMBER' || (acceptErr.message || '').toLowerCase().includes('already a member')) {
          setMode('success');
          setTimeout(() => navigate('/dashboard'), 2000);
        } else if (code === 'WRONG_ACCOUNT') {
          setFormError(acceptErr.message || 'This invite was sent to a different email address.');
        } else {
          setFormError(acceptErr.message || 'Failed to accept invite after login');
        }
      }
    } catch (err) {
      setFormError(err.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading || mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-surface-600 dark:text-surface-300">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Accepting state
  if (mode === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-surface-600 dark:text-surface-300">Joining organization...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (mode === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-surface-900 dark:ring-1 dark:ring-white/5 rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">Welcome!</h1>
            <p className="text-surface-600 dark:text-surface-300 mb-4">
              You've successfully joined <span className="font-medium">{inviteInfo?.organizationName}</span>
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (only for non-recoverable errors like invalid/expired invite)
  if (mode === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-surface-900 dark:ring-1 dark:ring-white/5 rounded-xl shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">Unable to Join</h1>
            <p className="text-surface-600 dark:text-surface-300 mb-6">{error}</p>
            <div className="flex justify-center gap-4">
              <Link
                to="/login"
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Register/Login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-surface-900 dark:ring-1 dark:ring-white/5 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Join {inviteInfo?.organizationName}</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-2">
              You've been invited as <span className="font-medium capitalize">{inviteInfo?.role}</span>
            </p>
          </div>

          {/* Email badge */}
          <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-surface-50 dark:bg-surface-950 rounded-lg">
            <Mail size={16} className="text-surface-400" />
            <span className="text-sm text-surface-600 dark:text-surface-300">{inviteInfo?.email}</span>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('register'); setFormError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'register' ? 'bg-brand-100 text-brand-700' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => { setMode('login'); setFormError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login' ? 'bg-brand-100 text-brand-700' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Form error */}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg bg-surface-50 dark:bg-surface-950 text-surface-500 dark:text-surface-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account & Join'
                )}
              </button>
            </form>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In & Join'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
