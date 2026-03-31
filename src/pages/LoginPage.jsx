import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Beaker, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
        setSuccess('Account created! Logging you in...');
        await login(email, password);
        navigate('/projects');
      } else {
        await login(email, password);
        navigate('/projects');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-950 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <Beaker size={22} />
          </div>
          <span className="text-xl font-semibold tracking-tight">TestGenie</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight mb-4">
            AI-powered test case analysis for modern QA teams
          </h1>
          <p className="text-brand-300 text-lg leading-relaxed">
            Create projects, manage test cases, and leverage AI to find coverage gaps,
            detect duplicates, and assess quality automatically.
          </p>
        </div>

        <div className="text-brand-400 text-sm">
          Built by Tonmoy Malakar
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Beaker size={22} className="text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">TestGenie</span>
          </div>

          <h2 className="text-2xl font-semibold mb-1">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-gray-500 mb-8 text-sm">
            {isRegister
              ? 'Get started with TestGenie in seconds'
              : 'Sign in to continue to TestGenie'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder={isRegister ? 'Min 8 chars, 1 letter, 1 number' : 'Enter your password'}
                required
                minLength={isRegister ? 8 : 1}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
              className="text-brand-600 font-medium hover:text-brand-700"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
