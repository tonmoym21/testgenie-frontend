import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, Image, Terminal, AlertTriangle, Info } from 'lucide-react';

const LOG_ICON = {
  info: <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />,
  warn: <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />,
  error: <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />,
  debug: <Terminal size={12} className="text-surface-400 mt-0.5 shrink-0" />,
};

export default function ExecutionDetailPage() {
  const { executionId } = useParams();
  const [exec, setExec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.request('GET', `/executions/${executionId}`);
        setExec(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [executionId]);

  if (!loading && !exec) {
    return (
      <div className="page">
        <div className="empty">
          <h3 className="text-lg font-semibold text-surface-800 mb-1">Execution not found</h3>
          <Link to="/executions" className="btn-secondary mt-4"><ArrowLeft size={14} /> Back to executions</Link>
        </div>
      </div>
    );
  }

  const logs = exec ? (typeof exec.logs === 'string' ? JSON.parse(exec.logs) : exec.logs || []) : [];
  const screenshots = exec ? (typeof exec.screenshots === 'string' ? JSON.parse(exec.screenshots) : exec.screenshots || []) : [];
  const filteredLogs = showDebug ? logs : logs.filter((l) => l.level !== 'debug');

  return (
    <div className="page">
      <Link to="/executions" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to executions
      </Link>

      {loading ? (
        <div className="card p-6 mb-6">
          <div className="skeleton h-6 w-1/2 mb-3" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      ) : (
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {exec.status === 'passed' ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={20} /></div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><XCircle size={20} /></div>
                )}
                <h1 className="text-xl font-semibold text-surface-900 truncate">{exec.testName}</h1>
              </div>
              {exec.error && (
                <div className="mt-3 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg ring-1 ring-inset ring-red-200">
                  {exec.error}
                </div>
              )}
            </div>
            <span className={`badge ${exec.status === 'passed' ? 'badge-success' : 'badge-danger'}`}>
              {exec.status.toUpperCase()}
            </span>
          </div>

          <div className="flex gap-6 mt-4 text-sm text-surface-500 flex-wrap">
            <span className="flex items-center gap-1.5"><Clock size={14} /> {exec.durationMs}ms</span>
            <span>Type: {exec.testType?.toUpperCase()}</span>
            <span>Completed: {new Date(exec.completedAt).toLocaleString()}</span>
          </div>
        </div>
      )}

      {!loading && exec && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
                <h2 className="font-semibold text-sm flex items-center gap-2 text-surface-900">
                  <Terminal size={16} /> Execution logs
                </h2>
                <label className="flex items-center gap-2 text-xs text-surface-500 cursor-pointer">
                  <input type="checkbox" checked={showDebug} onChange={(e) => setShowDebug(e.target.checked)}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  Show debug
                </label>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <p className="text-sm text-surface-400 text-center py-8">No logs available</p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono">
                        {LOG_ICON[log.level] || LOG_ICON.info}
                        <span className="text-surface-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={log.level === 'error' ? 'text-red-600' : log.level === 'warn' ? 'text-amber-600' : 'text-surface-700'}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-100">
                <h2 className="font-semibold text-sm flex items-center gap-2 text-surface-900">
                  <Image size={16} /> Screenshots ({screenshots.length})
                </h2>
              </div>
              <div className="p-4">
                {screenshots.length === 0 ? (
                  <p className="text-sm text-surface-400 text-center py-8">No screenshots captured</p>
                ) : (
                  <div className="space-y-3">
                    {screenshots.map((filename, i) => (
                      <div key={i} className="rounded-lg ring-1 ring-surface-200/60 overflow-hidden">
                        <img src={`/api/screenshots/${filename}`} alt={`Screenshot ${i + 1}`}
                          className="w-full h-auto" onError={(e) => { e.target.style.display = 'none'; }} />
                        <div className="px-3 py-2 bg-surface-50 text-xs text-surface-500 truncate">{filename}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {exec.testDefinition && (
              <div className="card mt-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-surface-100">
                  <h2 className="font-semibold text-sm text-surface-900">Test definition</h2>
                </div>
                <div className="p-4">
                  <pre className="text-xs font-mono bg-surface-50 rounded-lg p-3 overflow-x-auto max-h-64 text-surface-700">
                    {JSON.stringify(typeof exec.testDefinition === 'string' ? JSON.parse(exec.testDefinition) : exec.testDefinition, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
