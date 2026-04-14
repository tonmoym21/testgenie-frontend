import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Activity, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown,
  AlertTriangle, Loader2, Globe, Monitor, Calendar, FolderOpen,
  RefreshCw, Play, ArrowRight, BarChart3, Users
} from 'lucide-react';

// Components
import AlertsBanner from '../components/dashboard/AlertsBanner';
import FailureTrends from '../components/dashboard/FailureTrends';

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'brand', to }) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  
  const content = (
    <>
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
    </>
  );
  
  if (to) {
    return (
      <Link to={to} className="card p-5 hover:shadow-md transition-shadow">
        {content}
      </Link>
    );
  }
  
  return <div className="card p-5">{content}</div>;
}

function TeamActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Users size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-medium">
            {activity.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium text-gray-700">{activity.user}</span>
              <span className="text-gray-500"> {activity.action} </span>
              <Link to={`/executions/${activity.id}`} className="font-medium text-brand-600 hover:text-brand-700 truncate inline-block max-w-[200px] align-bottom">
                {activity.target}
              </Link>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activity.result === 'passed' ? 'bg-green-100 text-green-700' : 
                activity.result === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {activity.result}
              </span>
              <span className="text-xs text-gray-400">
                {activity.time ? new Date(activity.time).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link to="/run-test" className="card p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition-colors">
            <Play size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-700">Run Test</p>
            <p className="text-xs text-gray-400">Execute a test now</p>
          </div>
        </div>
      </Link>
      <Link to="/collections" className="card p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
            <FolderOpen size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-700">Collections</p>
            <p className="text-xs text-gray-400">Organize tests</p>
          </div>
        </div>
      </Link>
      <Link to="/schedules" className="card p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
            <Calendar size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-700">Schedules</p>
            <p className="text-xs text-gray-400">Automate runs</p>
          </div>
        </div>
      </Link>
      <Link to="/environments" className="card p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100 transition-colors">
            <Globe size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-700">Environments</p>
            <p className="text-xs text-gray-400">Manage variables</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [metricsData, alertsData, activityData] = await Promise.all([
        api.request('GET', '/dashboard'),
        api.request('GET', '/dashboard/alerts'),
        api.request('GET', '/dashboard/activity'),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData.data || []);
      setActivity(activityData.data || []);
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

  const { summary, byType, dailyTrend, recentRuns, recentFailures, schedules, collections } = metrics || {};

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your test execution metrics</p>
        </div>
        <button 
          onClick={() => loadData(true)} 
          className="btn-secondary"
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <AlertsBanner alerts={alerts} />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Runs"
          value={summary?.totalRuns || 0}
          subtitle={`${summary?.running || 0} running now`}
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
          value={`${summary?.avgDuration || 0}ms`}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Active Schedules"
          value={schedules?.active || 0}
          subtitle={`of ${schedules?.total || 0} total`}
          icon={Calendar}
          color="purple"
          to="/schedules"
        />
      </div>

      {/* Dashboard Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Link to="/dashboard/api" className="card p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">API Dashboard</h3>
                <p className="text-sm text-gray-500">
                  {byType?.api?.count || 0} runs • {byType?.api?.passed || 0} passed
                </p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
          </div>
        </Link>
        <Link to="/dashboard/automation" className="card p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition-colors">
                <Monitor size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Automation Dashboard</h3>
                <p className="text-sm text-gray-500">
                  {byType?.ui?.count || 0} runs • {byType?.ui?.passed || 0} passed
                </p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-600" />
              30-Day Trend
            </h3>
            <Link to="/executions" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
          </div>
          <FailureTrends dailyTrend={dailyTrend} />
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <QuickActions />
        </div>
      </div>

      {/* Activity & Recent Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Team Activity */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              Recent Activity
            </h3>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            <TeamActivityFeed activities={activity} />
          </div>
        </div>

        {/* Recent Failures */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Recent Failures
            </h3>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {recentFailures && recentFailures.length > 0 ? (
              <div className="space-y-3">
                {recentFailures.map((failure) => (
                  <Link 
                    key={failure.id} 
                    to={`/executions/${failure.id}`}
                    className="block p-3 bg-red-50/50 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-700">{failure.testName}</p>
                        <p className="text-xs text-red-600 mt-1 truncate max-w-[300px]">{failure.error}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {failure.durationMs}ms
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent failures!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
