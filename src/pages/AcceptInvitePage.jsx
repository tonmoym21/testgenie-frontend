import { useState, useEffect } from 'react';
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

  // Fetch invite info on mount
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
          setError(info.isExpired ? 'This invite has expired' : 'This invite is no longer valid');
          setMode('error');
        } else if (isAuthenticated) {
          // User is logged in, check if email matches
          if (user.email.toLowerCase() === info.email.toLowerCase()) {
            // Auto-accept
            handleAcceptInvite();
          } else {
            setError(`This invite was sent to ${info.email}. You are logged in as ${user.email}. Please log out and try again.`);
            setMode('error');
          }
        } else {
          // User not logged in - show register/login options
          setMode('register');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load invite');
        setMode('error');
      })
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, user]);

  const handleAcceptInvite = async () => {
    setMode('accepting');
    try {
      await teamApi.acceptInvite(token);
      setMode('success');
      // Redirect to dashboard after 2 seconds
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
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
      await registerWithInvite(email, password, token);
      // After registration, log them in
      await login(email, password);
      setMode('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setFormError(err.message);
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
      // After login, accept the invite
      await teamApi.acceptInvite(token);
      setMode('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading || mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Accepting state
  if (mode === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Joining organization...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (mode === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
            <p className="text-gray-600 mb-4">
              You've successfully joined <span className="font-medium">{inviteInfo?.organizationName}</span>
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (mode === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Join</h1>
            <p className="text-gray-600 mb-6">{error}</p>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Join {inviteInfo?.organizationName}</h1>
            <p className="text-gray-500 mt-2">
              You've been invited as <span className="font-medium capitalize">{inviteInfo?.role}</span>
            </p>
          </div>

          {/* Email badge */}
          <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-gray-50 rounded-lg">
            <Mail size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">{inviteInfo?.email}</span>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'register' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
