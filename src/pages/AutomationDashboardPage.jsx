import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Monitor, Loader2, TrendingUp, TrendingDown, Clock, CheckCircle, 
  XCircle, AlertTriangle, Activity, Camera, BarChart3, ArrowRight,
  RefreshCw, Play, Zap
} from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'brand' }) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-surface-400 mt-1">{subtitle}</p>}
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
      <div className="text-center py-8 text-surface-400">
        <Monitor size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No automation runs yet</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100">
            <th className="text-left py-3 px-4 text-surface-500 font-medium">Test</th>
            <th className="text-left py-3 px-4 text-surface-500 font-medium">Status</th>
            <th className="text-left py-3 px-4 text-surface-500 font-medium">Duration</th>
            <th className="text-left py-3 px-4 text-surface-500 font-medium">Screenshots</th>
            <th className="text-left py-3 px-4 text-surface-500 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-gray-50 hover:bg-surface-50/50">
              <td className="py-3 px-4">
                <Link to={`/executions/${run.id}`} className="font-medium text-surface-700 hover:text-brand-600">
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
              <td className="py-3 px-4 text-surface-500">{(run.durationMs / 1000).toFixed(1)}s</td>
              <td className="py-3 px-4">
                {run.screenshots && run.screenshots.length > 0 ? (
                  <span className="flex items-center gap-1 text-surface-500">
                    <Camera size={14} />
                    {run.screenshots.length}
                  </span>
                ) : (
                  <span className="text-surface-300">-</span>
                )}
              </td>
              <td className="py-3 px-4 text-surface-400 text-xs">
                {run.completedAt ? new Date(run.completedAt).toLocaleString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlakyTestsCard({ tests }) {
  if (!tests || tests.length === 0) {
    return (
      <div className="text-center py-6 text-surface-400">
        <CheckCircle size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No flaky tests detected</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {tests.map((t, i) => {
        const flakyRate = Math.round((t.failed / t.total) * 100);
        return (
          <div key={i} className="p-3 bg-yellow-50/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-surface-700 truncate flex-1">{t.testName}</span>
              <span className="text-xs font-bold text-yellow-600 ml-2">{flakyRate}% flaky</span>
            </div>
            <div className="flex gap-2 text-xs text-surface-500">
              <span className="text-green-600">{t.passed} passed</span>
              <span className="text-red-600">{t.failed} failed</span>
              <span>of {t.total} runs</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssetReadinessChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center py-6 text-surface-400">
        <p className="text-sm">No automation assets</p>
      </div>
    );
  }
  
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = {
    ready: 'bg-green-500',
    partial: 'bg-yellow-500',
    not_ready: 'bg-red-500',
    unknown: 'bg-gray-400',
  };
  
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden mb-3">
        {Object.entries(data).map(([status, count]) => (
          <div 
            key={status}
            className={`${colors[status] || colors.unknown}`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${status}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(data).map(([status, count]) => (
          <span key={status} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${colors[status] || colors.unknown}`} />
            {status}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AutomationDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await api.request('GET', '/dashboard/automation');
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

  const { summary, dailyTrend, recentRuns, flakyTests, assetsByReadiness } = metrics || {};

  return (
    <div className="page max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Monitor className="text-brand-600" />
            Automation Dashboard
          </h1>
          <p className="text-surface-500 text-sm mt-1">Monitor your UI automation test executions</p>
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
          title="Total UI Runs"
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
          title="Avg Duration"
          value={`${((summary?.avgDuration || 0) / 1000).toFixed(1)}s`}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Screenshots"
          value={summary?.screenshotsCaptured || 0}
          subtitle="Total captured"
          icon={Camera}
          color="blue"
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
            <div className="h-48 flex items-center justify-center text-surface-400">
              <p className="text-sm">No data available</p>
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-surface-500">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /> Passed</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /> Failed</span>
          </div>
        </div>

        {/* Flaky Tests */}
        <div className="card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-yellow-500" />
            Flaky Tests (7 days)
          </h3>
          <FlakyTestsCard tests={flakyTests} />
        </div>
      </div>

      {/* Recent Runs & Asset Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Runs */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="font-semibold">Recent Automation Runs</h3>
            <Link to="/executions" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <RecentRunsTable runs={recentRuns} />
        </div>

        {/* Asset Readiness */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap size={18} className="text-purple-500" />
            Asset Readiness
          </h3>
          <AssetReadinessChart data={assetsByReadiness} />
          <Link 
            to="/automation" 
            className="block mt-4 text-center text-sm text-brand-600 hover:text-brand-700"
          >
            Manage Automation Assets →
          </Link>
        </div>
      </div>
    </div>
  );
}
