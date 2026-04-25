import { Globe, ChevronDown } from 'lucide-react';
import { useState } from 'react';

/**
 * NetworkPanel: Show API requests made during test execution
 * Displays method, URL, status, duration, and size
 */
export default function NetworkPanel({ requests = [] }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-emerald-600 dark:text-emerald-400';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
    if (status >= 400 && status < 500) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMethodColor = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
      case 'POST':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
      case 'PUT':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300';
      case 'DELETE':
        return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
      case 'PATCH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
      default:
        return 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 dark:border-surface-800 flex-shrink-0">
        <Globe size={16} className="text-brand-600 dark:text-lime-400" />
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">Network</h3>
        <span className="ml-auto text-xs text-surface-400 dark:text-surface-500 tabular-nums">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-surface-400 dark:text-surface-500">
            <p className="text-xs">No requests</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-800 text-xs">
            {requests.map((req, idx) => {
              const isExpanded = expandedIdx === idx;

              return (
                <div key={idx} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
                  >
                    <ChevronDown
                      size={12}
                      className={`flex-shrink-0 transition-transform text-surface-400 dark:text-surface-500 ${isExpanded ? '' : '-rotate-90'}`}
                    />
                    <span className={`px-2 py-1 rounded font-semibold text-[10px] ${getMethodColor(req.method)}`}>
                      {req.method?.toUpperCase() || 'REQ'}
                    </span>
                    <span className={`flex-1 truncate font-mono tabular-nums ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                    <span className="text-surface-500 dark:text-surface-400 flex-shrink-0 font-mono tabular-nums">
                      {req.duration}ms
                    </span>
                    <span className="text-surface-400 dark:text-surface-500 flex-shrink-0 font-mono tabular-nums">
                      {req.size ? `${(req.size / 1024).toFixed(1)}kb` : '-'}
                    </span>
                  </button>

                  <div className="px-4 py-2 bg-surface-50 dark:bg-surface-950/50 border-t border-surface-100 dark:border-surface-800">
                    <p className="font-mono text-[11px] text-surface-600 dark:text-surface-400 truncate">
                      {req.url}
                    </p>
                  </div>

                  {isExpanded && (
                    <div className="px-4 py-3 bg-surface-50 dark:bg-surface-950/50 border-t border-surface-100 dark:border-surface-800 space-y-2">
                      {req.requestHeaders && (
                        <div>
                          <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Request Headers</p>
                          <pre className="text-[10px] bg-white dark:bg-surface-900 dark:text-surface-200 p-2 rounded border border-surface-200 dark:border-surface-700 overflow-x-auto max-h-24">
                            {JSON.stringify(req.requestHeaders, null, 2)}
                          </pre>
                        </div>
                      )}
                      {req.responseBody && (
                        <div>
                          <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Response</p>
                          <pre className="text-[10px] bg-white dark:bg-surface-900 dark:text-surface-200 p-2 rounded border border-surface-200 dark:border-surface-700 overflow-x-auto max-h-24">
                            {typeof req.responseBody === 'string'
                              ? req.responseBody
                              : JSON.stringify(req.responseBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
