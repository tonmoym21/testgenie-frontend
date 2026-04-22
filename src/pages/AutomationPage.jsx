import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Play, Package, Search, CheckCircle, XCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

const CATEGORY_OPTIONS = ['smoke', 'sanity', 'regression', 'e2e', 'critical_path', 'ui', 'api', 'p0', 'p1', 'p2'];

const STATUS_BADGE = { draft: 'bg-surface-100 text-surface-600', ready: 'bg-green-100 text-green-700', archived: 'bg-yellow-100 text-yellow-700' };
const RUN_STATUS_BADGE = { passed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', running: 'bg-blue-100 text-blue-700', queued: 'bg-surface-100 text-surface-600' };
const READINESS_BADGE = { draft: 'bg-surface-100 text-surface-500', needs_selector_mapping: 'bg-yellow-100 text-yellow-700', ready: 'bg-blue-100 text-blue-700', validated: 'bg-green-100 text-green-700' };

export default function AutomationPage() {
  const { projectId: urlProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [catFilter, setCatFilter] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [selected, setSelected] = useState(new Set());
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [runningIds, setRunningIds] = useState(new Set());
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(urlProjectId || '');
  const projectId = urlProjectId || selectedProjectId;

  useEffect(() => {
    if (urlProjectId) return;
    (async () => {
      try {
        const data = await api.getProjects();
        const list = Array.isArray(data) ? data : data.data || data.projects || [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) setSelectedProjectId(String(list[0].id));
      } catch (err) { console.error(err); }
    })();
  }, [urlProjectId]);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await api.listAutomationAssets(projectId, params);
      setAssets(data.data);
      setPagination(p => ({ ...p, total: data.pagination.total }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [projectId, pagination.page, search, catFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setBulkSummary(null);
  };
  const toggleAll = () => {
    setSelected(selected.size === assets.length ? new Set() : new Set(assets.map(a => a.id)));
    setBulkSummary(null);
  };

  const handleBulkVerify = async () => {
    if (selected.size === 0) return;
    setBulkVerifying(true);
    setBulkSummary(null);
    try {
      const result = await api.bulkVerifyReadiness(projectId, [...selected]);
      setBulkSummary(result.summary);
      load(); // refresh assets for updated readiness
    } catch (err) { alert('Bulk verify failed: ' + err.message); }
    finally { setBulkVerifying(false); }
  };

  const handleBulkRun = async () => {
    if (selected.size === 0) return;
    try {
      await api.bulkRunAutomation(projectId, [...selected], { browser: 'chromium', runReadyOnly: true });
      setSelected(new Set());
      setBulkSummary(null);
      setTimeout(load, 2000);
    } catch (err) {
      if (err.code === 'SOME_BLOCKED') {
        alert(`${err.blockedIds?.length || 0} asset(s) blocked. Verify readiness for all assets first, or the system will run only ready ones.`);
      } else if (err.code === 'ALL_BLOCKED') {
        alert('No assets passed readiness. Verify and fix blockers first.');
      } else {
        alert('Bulk run failed: ' + err.message);
      }
    }
  };

  const handleRun = async (assetId) => {
    setRunningIds(prev => new Set(prev).add(assetId));
    try {
      await api.runAutomationAsset(projectId, assetId, { browser: 'chromium' });
      setTimeout(load, 2000);
    } catch (err) {
      if (err.code === 'PREFLIGHT_FAILED') {
        alert('Readiness check failed. Open the asset and verify readiness first.');
      } else {
        alert('Run failed: ' + err.message);
      }
    } finally {
      setRunningIds(prev => { const n = new Set(prev); n.delete(assetId); return n; });
    }
  };

  const readyCount = bulkSummary?.ready || 0;
  const blockedCount = bulkSummary?.blocked || 0;
  const missingCount = bulkSummary?.missing || 0;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Automation Library</h1>
          <p className="text-surface-500 text-sm mt-1">Manage generated Playwright test suites</p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button onClick={handleBulkVerify} disabled={bulkVerifying}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50">
              {bulkVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Verify Selected ({selected.size})
            </button>
            <button onClick={handleBulkRun}
              disabled={!bulkSummary || readyCount === 0}
              title={!bulkSummary ? 'Verify readiness first' : readyCount === 0 ? 'No ready assets' : `Run ${readyCount} ready assets`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <Play size={14} /> Run Ready ({readyCount})
            </button>
          </div>
        )}
      </div>

      {/* Bulk readiness summary */}
      {bulkSummary && selected.size > 0 && (
        <div className="mb-5 p-3 rounded-lg border border-surface-200 bg-surface-50 flex items-center gap-4 text-xs">
          <span className="font-medium text-surface-600">Readiness Summary:</span>
          <span className="flex items-center gap-1 text-green-700"><CheckCircle size={12} />{readyCount} ready</span>
          <span className="flex items-center gap-1 text-red-700"><XCircle size={12} />{blockedCount} blocked</span>
          {missingCount > 0 && <span className="flex items-center gap-1 text-yellow-700"><AlertTriangle size={12} />{missingCount} not verified</span>}
        </div>
      )}

      {!urlProjectId && (
        <div className="mb-5">
          <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Select a project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search assets..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
        </div>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Status</option>
          <option value="ready">Ready</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-medium text-surface-600 mb-1">No automation assets yet</h3>
          <p className="text-surface-400 text-sm">Generate Playwright tests from a story to create automation assets.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-surface-500 font-medium uppercase border-b border-surface-200">
            <input type="checkbox" checked={selected.size === assets.length} onChange={toggleAll} className="rounded border-surface-300" />
            <span className="flex-1">Name</span>
            <span className="w-28">Categories</span>
            <span className="w-20">Status</span>
            <span className="w-24">Readiness</span>
            <span className="w-20">Last Run</span>
            <span className="w-16 text-right">Actions</span>
          </div>

          <div className="divide-y divide-surface-100">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                <input type="checkbox" checked={selected.has(asset.id)} onChange={() => toggleSelect(asset.id)} className="rounded border-surface-300" />
                <div className="flex-1 min-w-0">
                  <Link to={`/projects/${projectId}/automation/${asset.id}`} className="font-medium text-sm text-surface-900 hover:text-brand-600 truncate block">
                    {asset.name}
                  </Link>
                  <div className="text-xs text-surface-400 mt-0.5">
                    {(asset.generated_files_manifest?.length || 0)} files · {new Date(asset.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="w-28 flex flex-wrap gap-1">
                  {(asset.categories || []).slice(0, 2).map(c => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-600">{c}</span>
                  ))}
                  {(asset.categories || []).length > 2 && <span className="text-[10px] text-surface-400">+{asset.categories.length - 2}</span>}
                </div>
                <div className="w-20">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[asset.status] || STATUS_BADGE.draft}`}>{asset.status}</span>
                </div>
                <div className="w-24">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${READINESS_BADGE[asset.execution_readiness] || READINESS_BADGE.draft}`}>
                    {(asset.execution_readiness || 'draft').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="w-20">
                  {asset.last_run_status ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RUN_STATUS_BADGE[asset.last_run_status] || ''}`}>{asset.last_run_status}</span>
                  ) : <span className="text-xs text-surface-300">—</span>}
                </div>
                <div className="w-16 flex justify-end gap-1">
                  <button onClick={() => handleRun(asset.id)} disabled={runningIds.has(asset.id) || asset.execution_readiness !== 'validated'}
                    className="p-1.5 rounded hover:bg-brand-50 text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed" title={asset.execution_readiness !== 'validated' ? 'Verify readiness first' : 'Run'}>
                    {runningIds.has(asset.id) ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination.total > 20 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page === 1} className="btn-secondary text-xs">Previous</button>
              <span className="text-sm text-surface-400 py-2">Page {pagination.page} of {Math.ceil(pagination.total / 20)}</span>
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= Math.ceil(pagination.total / 20)} className="btn-secondary text-xs">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
