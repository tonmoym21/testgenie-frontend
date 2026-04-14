import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Beaker, FolderOpen, LogOut, Play, BarChart3, Zap, Library, Settings, Clock, BookOpen, Bot, Users } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout, canManageTeam } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/automation', label: 'Automation', icon: Bot },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/projects', label: 'Projects', icon: FolderOpen },
    { path: '/run-test', label: 'Run Test', icon: Zap },
    { path: '/collections', label: 'Collections', icon: Library },
    { path: '/schedules', label: 'Schedules', icon: Clock },
    { path: '/executions', label: 'Executions', icon: Play },
    { path: '/stories', label: 'Stories', icon: BookOpen },
    { path: '/environments', label: 'Environments', icon: Settings },
  ];

  // Add Team nav for admins/owners only
  if (canManageTeam) {
    navItems.push({ path: '/team', label: 'Team', icon: Users });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-950 text-white flex flex-col fixed h-full">
        <div className="p-5 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Beaker size={18} />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight">TestForge</span>
              <span className="block text-[10px] text-brand-300 uppercase tracking-widest">BUILD. RUN. TRUST.</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
            return (
              <Link key={path} to={path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-brand-600 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={18} />{label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-brand-300 truncate">{user?.email}</div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-200 hover:bg-white/10 hover:text-white w-full transition-colors">
            <LogOut size={18} />Sign Out
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1 min-h-screen">{children}</main>
    </div>
  );
}
