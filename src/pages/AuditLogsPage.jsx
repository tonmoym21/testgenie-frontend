import { useState, useEffect, useCallback, useMemo } from 'react';
import { teamApi } from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import { ScrollText, Search, Download, RefreshCw, ShieldAlert, Loader2 } from 'lucide-react';

const PAGE_SIZE = 50;

function fmtTime(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleString(); } catch { return String(s); }
}

function StatusPill({ status }) {
  const s = (status || 'success').toLowerCase();
  const cls = s === 'failure'
    ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {s}
    </span>
  );
}

function DetailsCell({ details }) {
  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
    return <span className="text-surface-400">—</span>;
  }
  const text = typeof details === 'string' ? details : JSON.stringify(details);
  return (
    <span className="font-mono text-[11px] text-surface-600 dark:text-surface-400 break-all line-clamp-2" title={text}>
      {text}
    </span>
  );
}

export default function AuditLogsPage() {
  const { canManageTeam } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce the free-text search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => ({
    action: action || undefined,
    status: status || undefined,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
  }), [action, status, debouncedSearch, dateFrom, dateTo]);

  const load = useCallback(async () => {
    if (!canManageTeam) return;
    setLoading(true);
    setError(null);
    try {
      const res = await teamApi.getAuditLogs({
        ...filters,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [canManageTeam, filters, page]);

  useEffect(() => { setPage(0); }, [filters]);
  useEffect(() => { load(); }, [load]);

  const exportUrl = teamApi.auditLogsCsvUrl(filters);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!canManageTeam) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center">
        <ShieldAlert size={48} className="mx-auto text-surface-400 mb-4" />
        <h1 className="text-xl font-semibold mb-2">Admin access required</h1>
        <p className="text-surface-500">Audit logs are visible to organization owners and admins only.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ScrollText size={22} className="text-brand-500" />
            Audit logs
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Track auth, CRUD, executions, and config changes across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <a href={exportUrl} className="btn-primary btn-sm" download>
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search action, target, actor, details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <input
          type="text"
          placeholder="Action (e.g. auth.login)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="input"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
          <option value="">Any status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" title="From" />
          <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" title="To" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-900/50 text-surface-600 dark:text-surface-400 text-[12px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">When</th>
                <th className="text-left px-4 py-2.5 font-medium">Actor</th>
                <th className="text-left px-4 py-2.5 font-medium">Action</th>
                <th className="text-left px-4 py-2.5 font-medium">Target</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">IP</th>
                <th className="text-left px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/70 dark:divide-surface-800">
              {loading && logs.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-surface-400">
                  <Loader2 size={18} className="animate-spin inline-block mr-2" /> Loading…
                </td></tr>
              )}
              {!loading && logs.length === 0 && !error && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-surface-400">
                  No audit events match these filters.
                </td></tr>
              )}
              {error && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-red-500">{error}</td></tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-surface-50/70 dark:hover:bg-surface-900/40">
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[12px]">{fmtTime(l.created_at)}</td>
                  <td className="px-4 py-2.5">{l.actor_email || <span className="text-surface-400">system</span>}</td>
                  <td className="px-4 py-2.5 font-medium">{l.action}</td>
                  <td className="px-4 py-2.5">
                    {l.target_type ? (
                      <span className="text-surface-600 dark:text-surface-400">
                        {l.target_type}{l.target_id ? <span className="text-surface-400"> #{l.target_id}</span> : null}
                      </span>
                    ) : <span className="text-surface-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5"><StatusPill status={l.status} /></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-surface-500">{l.ip_address || '—'}</td>
                  <td className="px-4 py-2.5 max-w-[420px]"><DetailsCell details={l.details} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-surface-500">
        <div>
          {total === 0
            ? '0 events'
            : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary btn-sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >Previous</button>
          <span className="text-xs">Page {page + 1} / {totalPages}</span>
          <button
            className="btn-secondary btn-sm"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >Next</button>
        </div>
      </div>
    </div>
  );
}
