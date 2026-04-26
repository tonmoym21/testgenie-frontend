import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Loader2, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck,
  Sparkles, Zap
} from 'lucide-react';
import ForgeMark from '../components/ForgeMark';

const HIGHLIGHTS = [
  { icon: Zap,         title: 'Run UI + API tests',       text: 'Author once, execute in Playwright or through our API runner.' },
  { icon: Sparkles,    title: 'AI-assisted coverage',     text: 'Detect gaps, duplicates, and risky edges automatically.' },
  { icon: ShieldCheck, title: 'Trusted by QA teams',      text: 'Role-based access, Jira sync, and environment isolation.' },
];

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        setSuccess('Account created. Signing you in…');
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
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface-950 text-white">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-grid opacity-[0.15] mask-radial" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-surface-900 ring-1 ring-white/10 text-white flex items-center justify-center">
              <ForgeMark size={24} />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">TestForge</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-lime-300/80">Build · Run · Trust</div>
            </div>
          </div>

          <div className="max-w-lg space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-semibold leading-[1.1] tracking-tight text-balance">
                Build tests your team
                <span className="block bg-gradient-to-r from-lime-300 via-lime-200 to-white bg-clip-text text-transparent">
                  actually trusts.
                </span>
              </h1>
              <p className="text-surface-300 text-lg leading-relaxed mt-4 text-balance">
                Manage projects, author UI and API tests, and let AI surface coverage gaps — all in one focused workspace.
              </p>
            </div>

            <div className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
                  <div className="w-9 h-9 rounded-lg bg-lime-500/15 text-lime-300 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-sm text-surface-300">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-surface-400">
            <span>© {new Date().getFullYear()} TestForge</span>
            <span>Built by Tonmoy Malakar</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-surface-900 ring-1 ring-white/10 text-white flex items-center justify-center">
              <ForgeMark size={22} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-surface-900 dark:text-surface-50">TestForge</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[26px] font-semibold tracking-tight text-surface-900 dark:text-surface-50">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-surface-500 dark:text-surface-400 text-sm mt-1.5">
              {isRegister
                ? 'Start shipping tests your team trusts in under a minute.'
                : 'Sign in to continue.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 animate-fade-in
                                          dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-lg border border-emerald-200 flex items-center gap-2 animate-fade-in
                                            dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30">
                <CheckCircle2 size={16} /> {success}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder={isRegister ? 'Min 8 chars, 1 letter, 1 number' : 'Enter your password'}
                  required
                  minLength={isRegister ? 8 : 1}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-800 text-center text-sm text-surface-500 dark:text-surface-400">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
              className="text-brand-600 font-medium hover:text-brand-700 dark:text-lime-400 dark:hover:text-lime-300"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
