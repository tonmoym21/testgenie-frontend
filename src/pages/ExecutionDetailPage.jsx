import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, Image, Terminal, Globe } from 'lucide-react';
import ExecutionTimeline from '../components/execution/ExecutionTimeline';
import LogsPanel from '../components/execution/LogsPanel';
import NetworkPanel from '../components/execution/NetworkPanel';
import AssertionDiff from '../components/execution/AssertionDiff';

export default function ExecutionDetailPage() {
  const { executionId } = useParams();
  const [exec, setExec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');
  const [selectedStepIdx, setSelectedStepIdx] = useState(null);

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
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">This run is gone</h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">It was deleted, or the link is wrong.</p>
          <Link to="/executions" className="btn-secondary mt-4"><ArrowLeft size={14} /> Back to runs</Link>
        </div>
      </div>
    );
  }

  const logs = exec ? (typeof exec.logs === 'string' ? JSON.parse(exec.logs) : exec.logs || []) : [];
  const screenshots = exec ? (typeof exec.screenshots === 'string' ? JSON.parse(exec.screenshots) : exec.screenshots || []) : [];

  return (
    <div className="page">
      <Link to="/executions" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      {loading ? (
        <div className="card p-6 mb-6">
          <div className="skeleton h-6 w-1/2 mb-3" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      ) : (
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {exec.status === 'passed' ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center justify-center"><CheckCircle size={20} /></div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300 flex items-center justify-center"><XCircle size={20} /></div>
                )}
                <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-50 truncate">{exec.testName}</h1>
              </div>
              {exec.error && (
                <div className="mt-3 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg ring-1 ring-inset ring-red-200 font-mono
                                dark:bg-red-500/10 dark:text-red-200 dark:ring-red-400/30">
                  {exec.error}
                </div>
              )}
            </div>
            <span className={`badge ${exec.status === 'passed' ? 'badge-success' : 'badge-danger'}`}>
              {exec.status.toUpperCase()}
            </span>
          </div>

          <div className="flex gap-5 mt-4 text-xs text-surface-500 dark:text-surface-400 flex-wrap font-mono">
            <span className="flex items-center gap-1.5"><Clock size={12} /> <span className="tabular-nums">{exec.durationMs}ms</span></span>
            <span>{exec.testType?.toUpperCase()}</span>
            <span className="tabular-nums">{new Date(exec.completedAt).toLocaleString()}</span>
          </div>
        </div>
      )}

      {!loading && exec && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-250px)]">
          {/* Timeline (left panel) */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="card p-4 h-full overflow-y-auto">
              <h3 className="section-title mb-3">Steps</h3>
              <ExecutionTimeline
                steps={exec.steps || []}
                selectedStepIndex={selectedStepIdx}
                onStepSelect={setSelectedStepIdx}
              />
            </div>
          </div>

          <div className="lg:col-span-3 order-1 lg:order-2 flex flex-col">
            <div className="tabs mb-4">
              <button
                onClick={() => setActiveTab('logs')}
                className={`tab ${activeTab === 'logs' ? 'tab-active' : ''}`}
              >
                <Terminal size={14} className="inline mr-1.5" />
                Logs
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`tab ${activeTab === 'network' ? 'tab-active' : ''}`}
              >
                <Globe size={14} className="inline mr-1.5" />
                Network
              </button>
              <button
                onClick={() => setActiveTab('screenshots')}
                className={`tab ${activeTab === 'screenshots' ? 'tab-active' : ''}`}
              >
                <Image size={14} className="inline mr-1.5" />
                Screens <span className="text-surface-400 dark:text-surface-500 tabular-nums">({screenshots.length})</span>
              </button>
              {exec.assertions && exec.assertions.length > 0 && (
                <button
                  onClick={() => setActiveTab('assertions')}
                  className={`tab ${activeTab === 'assertions' ? 'tab-active' : ''}`}
                >
                  Assertions <span className="text-surface-400 dark:text-surface-500 tabular-nums">({exec.assertions.length})</span>
                </button>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0">
              {activeTab === 'logs' && <LogsPanel logs={logs} highlightedLineIndex={selectedStepIdx} />}
              {activeTab === 'network' && <NetworkPanel requests={exec.requests || []} />}
              {activeTab === 'screenshots' && (
                <div className="card h-full overflow-y-auto">
                  {screenshots.length === 0 ? (
                    <div className="text-center py-8 text-surface-400 dark:text-surface-500">
                      <Image size={20} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No screens captured</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                      {screenshots.map((filename, i) => (
                        <div key={i} className="rounded-lg overflow-hidden ring-1 ring-surface-200 dark:ring-surface-700">
                          <img
                            src={`/api/screenshots/${filename}`}
                            alt={`Screenshot ${i + 1}`}
                            className="w-full h-auto"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="px-3 py-2 bg-surface-50 dark:bg-surface-800 text-xs text-surface-500 dark:text-surface-400 truncate font-mono">
                            {filename}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'assertions' && (
                <div className="card p-4 h-full overflow-y-auto">
                  <AssertionDiff assertions={exec.assertions || []} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
