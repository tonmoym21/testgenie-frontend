import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { getCurrentProjectId } from '../utils/currentProject';
import {
  Plus, Search, Filter, ChevronDown, CheckCircle2, XCircle, Loader2,
  MoreHorizontal, Play, LayoutGrid, User, Sparkles, Trash2, ExternalLink,
} from 'lucide-react';

function RunRowMenu({ onOpen, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Run options"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-md shadow-soft-lg min-w-[160px] py-1 text-sm">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onOpen(); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
            <ExternalLink size={12} /> Open
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2">
            <Trash2 size={12} /> Delete run
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!(ms > 0)) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function RunStatusGlyph({ state, progress }) {
  if (state === 'completed' || state === 'closed') {
    return (
      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <CheckCircle2 size={20} />
      </div>
    );
  }
  const p = Math.max(0, Math.min(100, progress || 0));
  const bg = `conic-gradient(#2563eb ${(p / 100) * 360}deg, #e5e7eb 0deg)`;
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>
      <div className="w-[30px] h-[30px] rounded-full bg-white flex items-center justify-center">
        <span className="text-[10px] font-semibold text-surface-700">{p}%</span>
      </div>
    </div>
  );
}

export default function TestRunsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const projectId = routeProjectId || getCurrentProjectId();

  const initialTab = searchParams.get('tab') === 'closed' ? 'closed' : 'active';
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target)) setCreateMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.listTestRuns(projectId);
      const base = res?.data || [];
      const withStats = await Promise.all(base.map(async (r) => {
        try {
          const s = await api.getTestRunStats(projectId, r.id);
          return { ...r, stats: s };
        } catch { return { ...r, stats: { total: 0, executed: 0, progress: 0, byStatus: {} } }; }
      }));
      setRuns(withStats);
    } catch (err) {
      setError(err.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const byTab = useMemo(() => {
    const active = runs.filter((r) => r.state === 'new' || r.state === 'in_progress');
    const closed = runs.filter((r) => r.state === 'completed' || r.state === 'closed');
    return { active, closed };
  }, [runs]);

  const currentSet = tab === 'active' ? byTab.active : byTab.closed;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currentSet;
    return currentSet.filter((r) => (`${r.name} TR-${r.id} ${r.assigneeName || ''} ${(r.tags || []).join(' ')}`).toLowerCase().includes(q));
  }, [currentSet, query]);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Runs</h1>
          <p className="page-subtitle">Track, assign, and review every run across your projects.</p>
        </div>
        <div className="flex items-center gap-2" ref={createMenuRef}>
          <div className="relative inline-flex">
            <button className="btn-primary rounded-r-none" onClick={() => {
              navigate(projectId ? `/projects/${projectId}/test-runs/new` : '/projects');
            }}>
              <Plus size={16} /> Create Manual Run
            </button>
            <button
              className="btn-primary rounded-l-none border-l border-white/30 px-2"
              onClick={() => setCreateMenuOpen((v) => !v)}
              aria-label="More run options"
            >
              <ChevronDown size={14} />
            </button>
            {createMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-surface-200 rounded-lg shadow-soft-lg z-30 py-1 text-sm">
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    navigate(projectId ? `/projects/${projectId}/test-runs/new` : '/projects');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-start gap-2"
                >
                  <Play size={14} className="mt-0.5 text-surface-500" />
                  <span>
                    <span className="block font-medium text-surface-900">Manual run</span>
                    <span className="block text-xs text-surface-500">Pick test cases and execute now.</span>
                  </span>
                </button>
                <button
                  onClick={() => { setCreateMenuOpen(false); navigate('/schedules'); }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-start gap-2"
                >
                  <Sparkles size={14} className="mt-0.5 text-surface-500" />
                  <span>
                    <span className="block font-medium text-surface-900">Scheduled run</span>
                    <span className="block text-xs text-surface-500">Run automatically on a cron schedule.</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200/70 mb-5">
        <nav className="flex gap-6" aria-label="Run tabs">
          {[
            { id: 'active', label: 'Active Runs', count: byTab.active.length },
            { id: 'closed', label: 'Closed Runs', count: byTab.closed.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 py-3 border-b-2 -mb-px text-sm font-medium transition-colors ${
                tab === t.id ? 'border-brand-500 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <span>{t.label}</span>
              <span className={`inline-flex items-center justify-center min-w-[22px] h-5 rounded-full text-[11px] font-semibold px-1.5 ${
                tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-600'
              }`}>{t.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 cursor-default">
          All Runs <ChevronDown size={14} className="text-surface-400" />
        </div>
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, tag, build #, or CI #"
            className="input pl-9 py-1.5 text-sm"
          />
        </div>
        <button className="icon-btn" title="Filter"><Filter size={15} /></button>
        <button className="icon-btn" title="Group by"><LayoutGrid size={15} /></button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200 mb-4">{error}</div>
      )}

      {!projectId && (
        <div className="empty py-16">
          <p className="text-surface-700 font-medium mb-2">Select a project first</p>
          <Link to="/projects" className="btn-primary btn-sm">Go to Projects</Link>
        </div>
      )}

      {/* Table */}
      {projectId && (
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_90px_100px_220px_160px_40px] gap-3 px-5 py-3 bg-surface-100/60 border-b border-surface-200/70 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
          <div>Runs</div>
          <div>Tests</div>
          <div>Duration</div>
          <div>Tests Status</div>
          <div>Failure Analysis</div>
          <div />
        </div>

        {loading && (
          <div className="divide-y divide-surface-100">
            {[1,2,3,4].map((i) => (
              <div key={i} className="px-5 py-4 grid grid-cols-[minmax(0,1fr)_90px_100px_220px_160px_40px] gap-3 items-center">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/5" /><div className="skeleton h-3 w-2/5" />
                  </div>
                </div>
                <div className="skeleton h-4 w-10" />
                <div className="skeleton h-4 w-10" />
                <div className="skeleton h-6 w-40" />
                <div className="skeleton h-3 w-16" />
                <div />
              </div>
            ))}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="empty py-16">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <Play size={22} />
            </div>
            <h3 className="text-lg font-semibold text-surface-800 mb-1">
              {tab === 'active' ? 'No active runs' : 'No closed runs yet'}
            </h3>
            <p className="text-surface-500 text-sm max-w-xs mb-6">
              {query
                ? `No runs match "${query}".`
                : tab === 'active'
                  ? 'Kick off a run to populate this list.'
                  : 'Once a run finishes, it will show up here.'}
            </p>
            <button
              className="btn-primary btn-sm"
              onClick={() => navigate(`/projects/${projectId}/test-runs/new`)}
            ><Plus size={14} /> Create Manual Run</button>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="divide-y divide-surface-100 bg-white">
            {visible.map((r) => {
              const s = r.stats || { total: 0, byStatus: {}, progress: 0 };
              const by = s.byStatus || {};
              return (
                <Link
                  key={r.id}
                  to={`/projects/${projectId}/test-runs/${r.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_90px_100px_220px_160px_40px] gap-3 px-5 py-4 items-center hover:bg-surface-50 transition-colors group"
                >
                  {/* Runs */}
                  <div className="flex items-center gap-3 min-w-0">
                    <RunStatusGlyph state={r.state} progress={s.progress} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-900 truncate">{r.name}</span>
                        <span className="text-xs font-mono text-surface-400 shrink-0">TR-{r.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-surface-500">
                        <User size={11} /><span className="truncate">Assigned to {r.assigneeName || r.assigneeEmail || '—'}</span>
                        {r.createdAt && <><span>·</span><span>{formatDate(r.createdAt)}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-surface-700">{s.total} Tests</div>
                  <div className="text-sm text-surface-700">{formatDuration(r.startedAt, r.completedAt)}</div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-inset ring-emerald-200/70">{by.passed || 0}</span>
                    <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-red-50 text-red-700 text-xs font-semibold ring-1 ring-inset ring-red-200/70">{by.failed || 0}</span>
                    <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-inset ring-amber-200/70">{by.blocked || 0}</span>
                    <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-surface-50 text-surface-600 text-xs font-semibold ring-1 ring-inset ring-surface-200">{by.untested || 0}</span>
                  </div>

                  <div className="text-sm text-surface-400">—</div>

                  <div className="flex justify-end">
                    <RunRowMenu
                      onOpen={() => navigate(`/projects/${projectId}/test-runs/${r.id}`)}
                      onDelete={async () => {
                        if (!confirm(`Delete run "${r.name}"? This cannot be undone.`)) return;
                        try {
                          await api.deleteTestRun(projectId, r.id);
                          setRuns((prev) => prev.filter((x) => x.id !== r.id));
                        } catch (err) { setError(err.message); }
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
