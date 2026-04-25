import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

/**
 * RecentRunsRow: Compact list of recent test executions
 * Shows status, test name, project, duration, and timestamp
 */
export default function RecentRunsRow({ runs = [] }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-8 text-surface-400">
        <Clock size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No recent runs</p>
        <p className="text-xs text-surface-400 mt-1">Execute a test to see it here</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-emerald-50 text-emerald-700';
      case 'failed':
        return 'bg-red-50 text-red-700';
      case 'running':
        return 'bg-brand-50 text-brand-700';
      default:
        return 'bg-surface-50 text-surface-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 size={14} />;
      case 'failed':
        return <XCircle size={14} />;
      case 'running':
        return <Clock size={14} className="animate-spin" />;
      default:
        return <Clock size={14} />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Default: time only
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-2">
      {runs.slice(0, 8).map((run) => (
        <Link
          key={run.id}
          to={`/executions/${run.id}`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors group"
        >
          {/* Status badge */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${getStatusColor(run.status)}`}>
            {getStatusIcon(run.status)}
          </div>

          {/* Run info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate group-hover:text-brand-600">
              {run.testName || 'Unnamed test'}
            </p>
            <p className="text-xs text-surface-500 truncate">
              {run.projectName && `${run.projectName} · `}
              {run.duration ? `${run.duration}ms` : 'pending'}
            </p>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-surface-400 flex-shrink-0 whitespace-nowrap">
            {formatTime(run.timestamp)}
          </div>
        </Link>
      ))}
    </div>
  );
}
