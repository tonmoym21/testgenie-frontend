import { useState } from 'react';
import { XCircle, AlertTriangle, Info, Terminal, Copy, Check } from 'lucide-react';

/**
 * LogsPanel: Display and filter test execution logs
 * - Color-coded by level (error, warn, info, debug)
 * - Monospace font (JetBrains Mono)
 * - Copy button for log content
 */
export default function LogsPanel({
  logs = [],
  highlightedLineIndex = null,
}) {
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);

  const LOG_STYLES = {
    error: {
      icon: <XCircle size={12} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />,
      text: 'text-red-600 dark:text-red-300',
      bg: 'bg-red-50/30 dark:bg-red-500/5',
    },
    warn: {
      icon: <AlertTriangle size={12} className="text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />,
      text: 'text-amber-600 dark:text-amber-300',
      bg: 'bg-amber-50/30 dark:bg-amber-500/5',
    },
    info: {
      icon: <Info size={12} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />,
      text: 'text-blue-600 dark:text-blue-300',
      bg: 'bg-blue-50/30 dark:bg-blue-500/5',
    },
    debug: {
      icon: <Terminal size={12} className="text-surface-400 dark:text-surface-500 mt-0.5 flex-shrink-0" />,
      text: 'text-surface-600 dark:text-surface-400',
      bg: '',
    },
  };

  const filteredLogs = showDebug ? logs : logs.filter((l) => l.level !== 'debug');

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-surface-800 flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-surface-900 dark:text-surface-100">
          <Terminal size={16} className="text-brand-600 dark:text-lime-400" />
          Logs
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500
                         dark:bg-surface-800 dark:border-surface-600 dark:text-lime-500 dark:focus:ring-lime-500"
            />
            Debug
          </label>
          <button
            onClick={handleCopyLogs}
            className="p-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 rounded transition-colors"
            title="Copy all logs"
          >
            {copied ? (
              <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy size={14} className="text-surface-400 dark:text-surface-500" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-surface-50/50 dark:bg-surface-950/60">
        {filteredLogs.length === 0 ? (
          <p className="text-surface-400 dark:text-surface-500 text-center py-8">No logs</p>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, idx) => {
              const style = LOG_STYLES[log.level] || LOG_STYLES.info;
              const isHighlighted = idx === highlightedLineIndex;

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 px-2 py-1.5 rounded transition-colors ${
                    isHighlighted
                      ? 'bg-brand-100 ring-1 ring-brand-500 dark:bg-lime-500/10 dark:ring-lime-500'
                      : style.bg
                  }`}
                >
                  {style.icon}
                  <span className="text-surface-500 dark:text-surface-500 flex-shrink-0 w-16 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className={`flex-1 ${style.text} break-words`}>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
