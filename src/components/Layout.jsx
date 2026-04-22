import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Beaker, FolderOpen, LogOut, Play, BarChart3, Zap, Library, Settings,
  Clock, Bot, Users, Search, ChevronsLeft, ChevronsRight, ChevronDown,
  Sparkles, HelpCircle, FileText, ClipboardList, Puzzle, BookOpen,
} from 'lucide-react';

// BrowserStack-style IA — single flat list like the reference screenshot.
// `match` extends active highlighting to project-scoped sub-paths.
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { path: '/dashboard', label: 'Dashboards', icon: BarChart3, match: ['/dashboard'] },
      { path: '/reports', label: 'Reports', icon: FileText, match: ['/reports'] },
      { path: '/projects', label: 'Projects', icon: FolderOpen, match: ['/projects'] },
      { path: '/test-cases', label: 'Test Cases', icon: ClipboardList, match: ['/test-cases', '/projects/:id/test-cases'] },
      { path: '/test-runs', label: 'Test Runs', icon: Play, match: ['/test-runs', '/executions'] },
      { path: '/test-plans', label: 'Test Plans', icon: BookOpen, match: ['/test-plans'] },
      { path: '/integrations', label: 'Integrations', icon: Puzzle, match: ['/integrations', '/jira'] },
      { path: '/settings', label: 'Settings', icon: Settings, match: ['/settings', '/team', '/environments', '/globals'] },
    ],
  },
];

function NavItem({ to, label, icon: Icon, active, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${active
          ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10'
          : 'text-surface-300 hover:bg-white/5 hover:text-white'}`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-brand-400 to-brand-600" />}
      <Icon size={18} className={`shrink-0 ${active ? 'text-brand-300' : 'text-surface-400 group-hover:text-white'}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function Layout({ children }) {
  const { user, logout, canManageTeam } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tf:nav-collapsed') === '1';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('tf:nav-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Global shortcut: "/" focuses search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const pathname = location.pathname;
  const isActive = (item) => {
    const patterns = item.match || [item.path];
    for (const p of patterns) {
      // Treat ":id" as a wildcard segment
      const re = new RegExp('^' + p.replace(/:[^/]+/g, '[^/]+') + '(/|$)');
      if (re.test(pathname)) return true;
    }
    return false;
  };

  const groups = useMemo(() => NAV_GROUPS, []);

  const initial = (user?.email || '?').charAt(0).toUpperCase();
  const sidebarW = collapsed ? 'w-[72px]' : 'w-64';

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* ------- Sidebar ------- */}
      <aside
        className={`${sidebarW} bg-surface-950 text-white flex flex-col fixed h-full z-40 transition-[width] duration-200 ease-out border-r border-white/5`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow shrink-0">
              <Beaker size={18} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block font-semibold text-[15px] tracking-tight leading-none">TestForge</span>
                <span className="block text-[10px] text-brand-300/70 uppercase tracking-[0.18em] mt-1">Build · Run · Trust</span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scroll-area" aria-label="Primary">
          {groups.map((group, gi) => (
            <div key={group.label || `g${gi}`}>
              {!collapsed && group.label && (
                <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-surface-400/80">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.path}
                    to={item.path}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / user */}
        <div className="p-3 border-t border-white/5 relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-brand text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">{user?.email}</div>
                <div className="text-[11px] text-surface-400">Signed in</div>
              </div>
            )}
            {!collapsed && <ChevronDown size={14} className="text-surface-400" />}
          </button>

          {menuOpen && (
            <div className="absolute bottom-[calc(100%+4px)] left-3 right-3 bg-surface-900 border border-white/10 rounded-xl shadow-soft-lg overflow-hidden animate-slide-up">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-200 hover:bg-white/5 transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-surface-900 border border-white/10 flex items-center justify-center text-surface-300 hover:text-white hover:bg-surface-800 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>
      </aside>

      {/* ------- Main area ------- */}
      <div className={`flex-1 min-h-screen ${collapsed ? 'ml-[72px]' : 'ml-64'} transition-[margin] duration-200`}>
        {/* Top bar */}
        <header className="h-16 sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-surface-200/70 flex items-center px-6 gap-4">
          <div className="flex-1 max-w-xl relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input
              id="global-search"
              type="search"
              placeholder="Search projects, tests, executions…"
              className="w-full pl-9 pr-16 py-2 text-sm rounded-lg bg-surface-100/70 border border-transparent placeholder:text-surface-400
                         hover:bg-surface-100 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none
                         transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex kbd">/</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/run-test" className="btn-primary btn-sm">
              <Sparkles size={14} /> New Test
            </Link>
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noreferrer"
              className="icon-btn"
              title="Help"
              aria-label="Help"
            >
              <HelpCircle size={16} />
            </a>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
