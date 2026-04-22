import React, { useState } from 'react';
import api from '../services/api';

export default function PreflightChecklist({ projectId, assetId, onReady, onFailed }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runPreflight = async () => {
    setLoading(true);
    try {
      const data = await api.request(`/projects/${projectId}/playwright/preflight/${assetId}`, { method: 'POST' });
      setResult(data);
      if (data.ready) onReady?.();
      else onFailed?.(data);
    } catch (err) {
      setResult({ ready: false, checks: [], blockers: [{ name: 'request', status: 'fail', detail: err.message }] });
      onFailed?.(result);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status) => {
    if (status === 'pass') return <span className="text-green-400">✓</span>;
    if (status === 'fail') return <span className="text-red-400">✗</span>;
    return <span className="text-yellow-400">⚠</span>;
  };

  return (
    <div className="bg-surface-800 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium">Execution Preflight</h4>
        <button onClick={runPreflight} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm">
          {loading ? 'Checking...' : 'Run Preflight'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className={`text-sm font-medium px-3 py-2 rounded ${result.ready ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-red-900/40 text-red-300 border border-red-700'}`}>
            {result.ready ? '✓ All checks passed — ready to run' : '✗ Blockers found — fix before running'}
          </div>

          {result.checks?.length > 0 && (
            <div className="space-y-1">
              {result.checks.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-surface-300">
                  {statusIcon(c.status)}
                  <span className="text-surface-400 w-40 shrink-0">{c.name.replace(/_/g, ' ')}</span>
                  <span>{c.detail}</span>
                </div>
              ))}
            </div>
          )}

          {result.blockers?.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="text-sm font-medium text-red-400">Blockers:</p>
              {result.blockers.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-red-900/20 px-3 py-2 rounded">
                  {statusIcon(b.status)}
                  <div>
                    <span className="text-red-300 font-medium">{b.name.replace(/_/g, ' ')}</span>
                    <p className="text-red-200/80 mt-0.5">{b.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && (
        <p className="text-sm text-surface-500">Run preflight to verify target URL, auth, selectors, and test file readiness before execution.</p>
      )}
    </div>
  );
}
