import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getCurrentProjectId } from '../utils/currentProject';
import {
  Plus, Search, Filter, ChevronDown, CheckCircle2, XCircle, Loader2,
  MoreHorizontal, Play, LayoutGrid, List as ListIcon, User, Sparkles,
} from 'lucide-react';

function formatDuration(ms) {
  if (!ms && ms !== 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

// Donut/check status glyph — matches the screenshot's green check / percentage circle.
function RunStatusGlyph({ status, percent = 0 }) {
  if (status === 'passed') {
    return (
      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <CheckCircle2 size={20} />
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
        <XCircle size={20} />
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }
  // percentage ring for in-progress with known progress (like 79% in screenshot)
  const p = Math.max(0, Math.min(100, percent));
  const angle = (p / 100) * 360;
  const bg = `conic-gradient(#2563eb ${angle}deg, #e5e7eb 0deg)`;
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>
      <div className="w-[30px] h-[30px] rounded-full bg-white flex items-center justify-center">
        <span className="text-[10px] font-semibold text-surface-700">{p}%</span>
      </div>
    </div>
  );
}

function normalizeExecution(exec, i) {
  // Map a raw execution from /executions to a "run-shaped" row for the UI.
  const id = exec.id;
  const status = exec.status || 'running';
  // Invent a friendly run name and code — use story/name + id.
  const name = exec.testName || exec.name || `Run ${id}`;
  const code = `TR-${id}`;
  const createdBy = exec.createdBy || exec.userEmail || exec.owner || 'You';
  const createdAt = exec.completedAt || exec.createdAt || exec.startedAt;
  const pass = status === 'passed' ? 1 : 0;
  const fail = status === 'failed' ? 1 : 0;
  const untested = status === 'running' ? 1 : 0;
  return {
    id,
    code,
    name,
    status,
    assignee: createdBy,
    createdAt,
    tests: pass + fail + untested || 1,
    passed: pass,
    failed: fail,
    blocked: 0,
    untested,
    durationMs: exec.durationMs ?? exec.duration_ms ?? null,
    percent: status === 'running' ? 0 : status === 'passed' ? 100 : null,
  };
}

export default function TestRunsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
    setLoading(true);
    try {
      const data = await api.request('GET', `/executions?limit=50`);
      const rows = (data?.data || []).map((e, i) => normalizeExecution(e, i));
      setRuns(rows);
    } catch (err) {
      setError(err.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const byTab = useMemo(() => {
    const active = runs.filter((r) => r.status === 'running' || r.status === 'in_progress' || r.status === 'queued');
    const closed = runs.filter((r) => r.status === 'passed' || r.status === 'failed' || r.status === 'complete');
    return { active, closed };
  }, [runs]);

  const currentSet = tab === 'active' ? byTab.active : byTab.closed;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currentSet;
    return currentSet.filter((r) => (r.name + ' ' + r.code + ' ' + r.assignee).toLowerCase().includes(q));
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
              const pid = getCurrentProjectId();
              navigate(pid ? `/projects/${pid}/test-runs/new` : '/projects');
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
                    const pid = getCurrentProjectId();
                    navigate(pid ? `/projects/${pid}/test-runs/new` : '/projects');
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_90px_100px_200px_160px_40px] gap-3 px-5 py-3 bg-surface-100/60 border-b border-surface-200/70 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
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
              <div key={i} className="px-5 py-4 grid grid-cols-[minmax(0,1fr)_90px_100px_200px_160px_40px] gap-3 items-center">
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
              onClick={() => {
                const pid = getCurrentProjectId();
                navigate(pid ? `/projects/${pid}/test-runs/new` : '/projects');
              }}
            ><Plus size={14} /> Create Manual Run</button>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="divide-y divide-surface-100 bg-white">
            {visible.map((r) => (
              <Link
                key={r.id}
                to={`/executions/${r.id}`}
                className="grid grid-cols-[minmax(0,1fr)_90px_100px_200px_160px_40px] gap-3 px-5 py-4 items-center hover:bg-surface-50 transition-colors group"
              >
                {/* Runs column */}
                <div className="flex items-center gap-3 min-w-0">
                  <RunStatusGlyph status={r.status} percent={r.percent ?? 0} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900 truncate">{r.name}</span>
                      <span className="text-xs font-mono text-surface-400 shrink-0">{r.code}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-surface-500">
                      <User size={11} /><span className="truncate">Assigned to {r.assignee}</span>
                      {r.createdAt && <>
                        <span>·</span><span>{formatDate(r.createdAt)}</span>
                      </>}
                    </div>
                  </div>
                </div>

                {/* Tests count */}
                <div className="text-sm text-surface-700">{r.tests} Tests</div>

                {/* Duration */}
                <div className="text-sm text-surface-700">{formatDuration(r.durationMs)}</div>

                {/* Status counts — 4 pills like the screenshot */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-inset ring-emerald-200/70">{r.passed}</span>
                  <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-red-50 text-red-700 text-xs font-semibold ring-1 ring-inset ring-red-200/70">{r.failed}</span>
                  <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-surface-50 text-surface-600 text-xs font-semibold ring-1 ring-inset ring-surface-200">{r.blocked}</span>
                  <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-surface-50 text-surface-600 text-xs font-semibold ring-1 ring-inset ring-surface-200">{r.untested}</span>
                </div>

                {/* Failure analysis placeholder */}
                <div className="text-sm text-surface-400">—</div>

                {/* Overflow */}
                <div className="flex justify-end">
                  <button
                    onClick={(e) => { e.preventDefault(); }}
                    className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Run options"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
