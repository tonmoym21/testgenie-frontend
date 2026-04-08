import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Play, Package, Search, Filter, CheckCircle, XCircle, Clock, Trash2, RotateCcw } from 'lucide-react';

const CATEGORY_OPTIONS = [
  'smoke', 'sanity', 'regression', 'e2e', 'critical_path', 'ui', 'api', 'p0', 'p1', 'p2',
];

const STATUS_BADGE = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
};

const RUN_STATUS_BADGE = {
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  queued: 'bg-gray-100 text-gray-600',
};

export default function AutomationPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [catFilter, setCatFilter] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [selected, setSelected] = useState(new Set());
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [runningIds, setRunningIds] = useState(new Set());

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await api.listAutomationAssets(projectId, params);
      setAssets(data.data);
      setPagination(p => ({ ...p, total: data.pagination.total }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, pagination.page, search, catFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === assets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assets.map(a => a.id)));
    }
  };

  const handleRun = async (assetId) => {
    setRunningIds(prev => new Set(prev).add(assetId));
    try {
      await api.runAutomationAsset(projectId, assetId, { browser: 'chromium' });
      setTimeout(load, 2000); // refresh after a bit
    } catch (err) {
      alert('Run failed: ' + err.message);
    } finally {
      setRunningIds(prev => { const n = new Set(prev); n.delete(assetId); return n; });
    }
  };

  const handleBulkRun = async () => {
    if (selected.size === 0) return;
    try {
      await api.bulkRunAutomation(projectId, [...selected], { browser: 'chromium' });
      setSelected(new Set());
      setTimeout(load, 2000);
    } catch (err) {
      alert('Bulk run failed: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Automation Library</h1>
          <p className="text-gray-500 text-sm mt-1">Manage generated Playwright test suites</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBulkRun}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Play size={14} /> Run Selected ({selected.size})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Status</option>
          <option value="ready">Ready</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-600" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No automation assets yet</h3>
          <p className="text-gray-400 text-sm">Generate Playwright tests from a story to create automation assets.</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-gray-500 font-medium uppercase border-b border-gray-200">
            <input type="checkbox" checked={selected.size === assets.length} onChange={toggleAll} className="rounded border-gray-300" />
            <span className="flex-1">Name</span>
            <span className="w-32">Categories</span>
            <span className="w-24">Status</span>
            <span className="w-24">Last Run</span>
            <span className="w-20 text-right">Actions</span>
          </div>

          <div className="divide-y divide-gray-100">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                <input
                  type="checkbox"
                  checked={selected.has(asset.id)}
                  onChange={() => toggleSelect(asset.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/projects/${projectId}/automation/${asset.id}`}
                    className="font-medium text-sm text-gray-900 hover:text-brand-600 truncate block"
                  >
                    {asset.name}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {(asset.generated_files_manifest?.length || 0)} files · {new Date(asset.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="w-32 flex flex-wrap gap-1">
                  {(asset.categories || []).slice(0, 3).map(c => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{c}</span>
                  ))}
                  {(asset.categories || []).length > 3 && (
                    <span className="text-[10px] text-gray-400">+{asset.categories.length - 3}</span>
                  )}
                </div>
                <div className="w-24">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[asset.status] || STATUS_BADGE.draft}`}>
                    {asset.status}
                  </span>
                </div>
                <div className="w-24">
                  {asset.last_run_status ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RUN_STATUS_BADGE[asset.last_run_status] || ''}`}>
                      {asset.last_run_status}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
                <div className="w-20 flex justify-end gap-1">
                  <button
                    onClick={() => handleRun(asset.id)}
                    disabled={runningIds.has(asset.id)}
                    className="p-1.5 rounded hover:bg-brand-50 text-brand-600 disabled:opacity-40"
                    title="Run"
                  >
                    {runningIds.has(asset.id) ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination.total > 20 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page === 1}
                className="btn-secondary text-xs"
              >Previous</button>
              <span className="text-sm text-gray-400 py-2">
                Page {pagination.page} of {Math.ceil(pagination.total / 20)}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= Math.ceil(pagination.total / 20)}
                className="btn-secondary text-xs"
              >Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
