import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Globe, Loader2, TrendingUp, TrendingDown, Clock, CheckCircle, 
  XCircle, AlertTriangle, Activity, Zap, BarChart3, ArrowRight,
  RefreshCw, Play
} from 'lucide-react';

// Simple mini chart component
function MiniTrendChart({ data, color = '#6366f1' }) {
  if (!data || data.length === 0) return <div className="w-24 h-8 bg-gray-100 rounded" />;
  
  const max = Math.max(...data.map(d => d.total || 0), 1);
  const width = 96;
  const height = 32;
  const points = data.slice(-14).map((d, i, arr) => {
    const x = (i / (arr.length - 1)) * width;
    const y = height - ((d.total || 0) / max) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'brand' }) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(trend)}% vs last week</span>
        </div>
      )}
    </div>
  );
}

function RecentRunsTable({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Globe size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No API runs yet</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Test</th>
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Response</th>
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Duration</th>
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="py-3 px-4">
                <Link to={`/executions/${run.id}`} className="font-medium text-gray-700 hover:text-brand-600">
                  {run.testName}
                </Link>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  run.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {run.status === 'passed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {run.status}
                </span>
              </td>
              <td className="py-3 px-4">
                {run.responseStatus && (
                  <span className={`font-mono text-xs px-2 py-1 rounded ${
                    run.responseStatus < 300 ? 'bg-green-50 text-green-700' :
                    run.responseStatus < 400 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {run.responseStatus}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-500">{run.durationMs}ms</td>
              <td className="py-3 px-4 text-gray-400 text-xs">
                {run.completedAt ? new Date(run.completedAt).toLocaleString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopFailuresCard({ failures }) {
  if (!failures || failures.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <CheckCircle size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No failures this week</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {failures.map((f, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg">
          <span className="text-sm font-medium text-gray-700 truncate flex-1">{f.testName}</span>
          <span className="text-sm font-bold text-red-600 ml-2">{f.failures} failures</span>
        </div>
      ))}
    </div>
  );
}

export default function ApiDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await api.request('GET', '/dashboard/api');
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-700">Failed to load dashboard: {error}</p>
          <button onClick={() => loadData()} className="btn-secondary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  const { summary, dailyTrend, recentRuns, topFailures, topCollections, hourlyDistribution } = metrics || {};

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Globe className="text-purple-600" />
            API Testing Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your API test executions and performance</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => loadData(true)} 
            className="btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/run-test" className="btn-primary">
            <Play size={16} /> Run Test
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total API Runs"
          value={summary?.totalRuns || 0}
          icon={Activity}
          color="brand"
        />
        <StatCard
          title="Pass Rate"
          value={`${summary?.passRate || 0}%`}
          subtitle={`${summary?.passed || 0} passed / ${summary?.failed || 0} failed`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Avg Response Time"
          value={`${summary?.avgDuration || 0}ms`}
          subtitle={`Min: ${summary?.minDuration || 0}ms / Max: ${summary?.maxDuration || 0}ms`}
          icon={Zap}
          color="yellow"
        />
        <StatCard
          title="Running Now"
          value={summary?.running || 0}
          icon={Loader2}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trend Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-600" />
              30-Day Trend
            </h3>
            <MiniTrendChart data={dailyTrend} />
          </div>
          {dailyTrend && dailyTrend.length > 0 ? (
            <div className="h-48 flex items-end gap-1">
              {dailyTrend.slice(-30).map((d, i) => {
                const maxTotal = Math.max(...dailyTrend.map(x => x.total || 0), 1);
                const passedHeight = ((d.passed || 0) / maxTotal) * 100;
                const failedHeight = ((d.failed || 0) / maxTotal) * 100;
                
                return (
                  <div key={i} className="flex-1 flex flex-col gap-0.5" title={`${d.date}: ${d.passed} passed, ${d.failed} failed`}>
                    <div className="bg-red-400 rounded-t" style={{ height: `${failedHeight}%`, minHeight: d.failed ? 2 : 0 }} />
                    <div className="bg-green-400 rounded-b" style={{ height: `${passedHeight}%`, minHeight: d.passed ? 2 : 0 }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              <p className="text-sm">No data available</p>
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /> Passed</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /> Failed</span>
          </div>
        </div>

        {/* Top Failures */}
        <div className="card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            Top Failures (7 days)
          </h3>
          <TopFailuresCard failures={topFailures} />
        </div>
      </div>

      {/* Recent Runs & Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Runs */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold">Recent API Runs</h3>
            <Link to="/executions" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <RecentRunsTable runs={recentRuns} />
        </div>

        {/* Top Collections */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Top Collections</h3>
          {topCollections && topCollections.length > 0 ? (
            <div className="space-y-3">
              {topCollections.map((col) => (
                <Link 
                  key={col.id} 
                  to={`/collections/${col.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{col.name}</span>
                    <span className="text-xs text-gray-500">{col.test_count} tests</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm">No collections yet</p>
              <Link to="/collections" className="text-sm text-brand-600 mt-2 inline-block">Create one</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
