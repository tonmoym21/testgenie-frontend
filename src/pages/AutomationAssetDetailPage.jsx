import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Loader2, Play, CheckCircle, XCircle, Clock, Tag, FileCode, Settings2 } from 'lucide-react';

const ALL_CATEGORIES = ['smoke', 'sanity', 'regression', 'e2e', 'critical_path', 'ui', 'api', 'p0', 'p1', 'p2'];

const RUN_STATUS_BADGE = {
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700 animate-pulse',
  queued: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-yellow-100 text-yellow-700',
};

export default function AutomationAssetDetailPage() {
  const { projectId, assetId } = useParams();
  const [asset, setAsset] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [editingCats, setEditingCats] = useState(false);
  const [cats, setCats] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, r] = await Promise.all([
        api.getAutomationAsset(projectId, assetId),
        api.getAutomationRuns(projectId, assetId, { limit: 20 }),
      ]);
      setAsset(a);
      setCats(a.categories || []);
      setRuns(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, assetId]);

  useEffect(() => { load(); }, [load]);

  // Poll for running status
  useEffect(() => {
    if (!runs.some(r => r.status === 'running' || r.status === 'queued')) return;
    const interval = setInterval(async () => {
      try {
        const r = await api.getAutomationRuns(projectId, assetId, { limit: 20 });
        setRuns(r.data);
        // Also refresh asset for last_run_status
        const a = await api.getAutomationAsset(projectId, assetId);
        setAsset(a);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [runs, projectId, assetId]);

  const handleRun = async () => {
    const url = baseUrl.trim() || prompt('Enter the target app URL (e.g. https://myapp.com):');
    if (!url) return;
    setBaseUrl(url);
    setRunLoading(true);
    try {
      await api.runAutomationAsset(projectId, assetId, { browser: 'chromium', baseUrl: url });
      setTimeout(load, 1500);
    } catch (err) {
      alert('Run failed: ' + err.message);
    } finally {
      setRunLoading(false);
    }
  };

  const handleSaveCats = async () => {
    try {
      await api.updateAutomationAsset(projectId, assetId, { categories: cats });
      setEditingCats(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleCat = (c) => {
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 size={24} className="animate-spin text-brand-600" /></div>;
  if (!asset) return <div className="p-8 text-center text-gray-500">Asset not found</div>;

  const manifest = typeof asset.generated_files_manifest === 'string'
    ? JSON.parse(asset.generated_files_manifest) : asset.generated_files_manifest || [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to={`/projects/${projectId}/automation`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Back to Automation Library
      </Link>

      {/* Header Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{asset.name}</h1>
            {asset.description && <p className="text-gray-500 text-sm mt-1">{asset.description}</p>}
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span>{manifest.length} test files</span>
              <span>{asset.framework} / {asset.language}</span>
              <span>Created {new Date(asset.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={runLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {runLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Run Now
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Categories</span>
            <button onClick={() => setEditingCats(!editingCats)} className="text-xs text-brand-600 hover:underline ml-auto">
              {editingCats ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingCats ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {ALL_CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      cats.includes(c)
                        ? 'bg-brand-50 text-brand-700 border-brand-300 ring-1 ring-brand-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >{c}</button>
                ))}
              </div>
              <button onClick={handleSaveCats} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">
                Save Categories
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(asset.categories || []).length > 0
                ? asset.categories.map(c => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c}</span>
                  ))
                : <span className="text-xs text-gray-300">No categories assigned</span>
              }
            </div>
          )}
        </div>

        {/* Files */}
        {manifest.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <FileCode size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Test Files</span>
            </div>
            <div className="space-y-1">
              {manifest.map((f, i) => (
                <div key={i} className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-2 py-1">
                  tests/{f.fileName || f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run History */}
      <h2 className="text-lg font-semibold mb-3">Run History</h2>
      {runs.length === 0 ? (
        <div className="card p-8 text-center">
          <Clock size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No runs yet. Click "Run Now" to execute.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
              className="card p-4 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {run.status === 'passed' ? <CheckCircle size={16} className="text-green-500" /> :
                   run.status === 'failed' ? <XCircle size={16} className="text-red-500" /> :
                   <Clock size={16} className="text-gray-400" />}
                  <div>
                    <span className="text-sm font-medium">Run #{run.id}</span>
                    <span className="text-xs text-gray-400 ml-3">{new Date(run.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {run.duration_ms && <span className="text-xs text-gray-400">{(run.duration_ms / 1000).toFixed(1)}s</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RUN_STATUS_BADGE[run.status] || ''}`}>
                    {run.status}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              {(run.total_tests > 0) && (
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="text-green-600">{run.passed_tests} passed</span>
                  <span className="text-red-600">{run.failed_tests} failed</span>
                  {run.skipped_tests > 0 && <span className="text-yellow-600">{run.skipped_tests} skipped</span>}
                  <span>Total: {run.total_tests}</span>
                </div>
              )}

              {/* Expanded detail */}
              {selectedRun?.id === run.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {run.error_summary && (
                    <div className="mb-3 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">
                      {run.error_summary}
                    </div>
                  )}
                  {run.output_logs && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Output Logs</h4>
                      <pre className="text-[11px] font-mono bg-gray-900 text-gray-100 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
                        {run.output_logs}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
