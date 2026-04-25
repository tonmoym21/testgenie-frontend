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
      icon: <XCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />,
      text: 'text-red-600',
      bg: 'bg-red-50/30',
    },
    warn: {
      icon: <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />,
      text: 'text-amber-600',
      bg: 'bg-amber-50/30',
    },
    info: {
      icon: <Info size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />,
      text: 'text-blue-600',
      bg: 'bg-blue-50/30',
    },
    debug: {
      icon: <Terminal size={12} className="text-surface-400 mt-0.5 flex-shrink-0" />,
      text: 'text-surface-600',
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
    <div className="h-full flex flex-col bg-white rounded-lg border border-surface-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-surface-900">
          <Terminal size={16} className="text-brand-600" />
          Execution Logs
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-surface-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            Show debug
          </label>
          <button
            onClick={handleCopyLogs}
            className="p-1.5 hover:bg-surface-50 rounded transition-colors"
            title="Copy all logs"
          >
            {copied ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Copy size={14} className="text-surface-400" />
            )}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-surface-50/50">
        {filteredLogs.length === 0 ? (
          <p className="text-surface-400 text-center py-8">No logs available</p>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, idx) => {
              const style = LOG_STYLES[log.level] || LOG_STYLES.info;
              const isHighlighted = idx === highlightedLineIndex;

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 px-2 py-1.5 rounded transition-colors ${
                    isHighlighted ? 'bg-brand-100 ring-1 ring-brand-500' : style.bg
                  }`}
                >
                  {style.icon}
                  <span className="text-surface-500 flex-shrink-0 w-12">
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
