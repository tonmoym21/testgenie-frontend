import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  Loader2, CheckCircle2, XCircle, Play, Clock, Monitor, Globe, Search,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

const STATUS_META = {
  passed: { icon: CheckCircle2, cls: 'text-emerald-500 dark:text-emerald-400', badge: 'badge-success' },
  failed: { icon: XCircle,     cls: 'text-red-500 dark:text-red-400',     badge: 'badge-danger' },
  running:{ icon: Loader2,     cls: 'text-brand-500 dark:text-lime-400 animate-spin', badge: 'badge-info' },
};

const TYPE_ICON = { ui: Monitor, api: Globe };

function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ExecutionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialStatus);
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const data = await api.request('GET', `/executions?${new URLSearchParams(params)}`);
      setExecutions(data.data);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filter === 'all') next.delete('status'); else next.set('status', filter);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return executions;
    return executions.filter((e) =>
      (e.testName + ' ' + (e.error || '') + ' ' + (e.testType || '')).toLowerCase().includes(q)
    );
  }, [executions, query]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / 20));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Runs</h1>
          <p className="page-subtitle">Every execution, newest first</p>
        </div>
        <Link to="/run-test" className="btn-primary btn-sm">
          <Play size={14} /> New run
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runs…"
            className="input pl-9 py-2"
          />
        </div>
        <div className="inline-flex items-center p-1 rounded-lg bg-surface-100 dark:bg-surface-800">
          <Filter size={13} className="text-surface-400 dark:text-surface-500 ml-1.5 mr-1" />
          {['all', 'passed', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPagination((p) => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-white text-surface-900 shadow-soft dark:bg-surface-950 dark:text-surface-50'
                  : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100'
              }`}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-5 h-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-2/5" />
                  <div className="skeleton h-2.5 w-3/5" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 dark:bg-lime-500/10 dark:text-lime-400 flex items-center justify-center mb-4">
            <Play size={22} />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">
            {query ? 'No runs match your search' : 'Nothing has run yet'}
          </h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm max-w-xs mb-6">
            {query ? `Try a different search term.` : 'Open a project and kick off a test run — its history shows up here.'}
          </p>
          <Link to="/projects" className="btn-primary"><Play size={14} /> Pick a project</Link>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
          {filtered.map((exec) => {
            const meta = STATUS_META[exec.status] || STATUS_META.running;
            const StatusIcon = meta.icon;
            const TypeIcon = TYPE_ICON[exec.testType] || Clock;
            return (
              <Link
                key={exec.id}
                to={`/executions/${exec.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
              >
                <StatusIcon size={18} className={meta.cls} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm text-surface-900 dark:text-surface-100 truncate">{exec.testName}</h3>
                    <span className="badge-muted inline-flex items-center gap-1">
                      <TypeIcon size={10} /> {(exec.testType || 'unknown').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                    <span className="font-mono tabular-nums">{exec.durationMs}ms</span>
                    <span>·</span>
                    <span className="tabular-nums">{formatRelative(exec.completedAt)}</span>
                    {exec.error && (
                      <>
                        <span>·</span>
                        <span className="text-red-600 dark:text-red-300 truncate max-w-[40ch] font-mono" title={exec.error}>{exec.error}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={meta.badge}>{exec.status}</span>
                <ChevronRight size={15} className="text-surface-300 dark:text-surface-600 group-hover:text-brand-500 dark:group-hover:text-lime-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 20 && !loading && (
        <div className="flex items-center justify-between mt-5">
          <span className="text-xs text-surface-500 dark:text-surface-400 tabular-nums">
            Page {pagination.page} of {totalPages} · {pagination.total} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page === 1}
              className="btn-secondary btn-sm"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= totalPages}
              className="btn-secondary btn-sm"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
