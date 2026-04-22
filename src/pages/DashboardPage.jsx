import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Activity, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown,
  AlertTriangle, Loader2, Globe, Monitor, Calendar, FolderOpen,
  RefreshCw, Play, ArrowRight, BarChart3, Users, Sparkles, Zap
} from 'lucide-react';

import AlertsBanner from '../components/dashboard/AlertsBanner';
import FailureTrends from '../components/dashboard/FailureTrends';

const EMPTY_METRICS = {
  summary: { totalRuns: 0, passed: 0, failed: 0, running: 0, passRate: 0, avgDuration: 0 },
  byType: {},
  dailyTrend: [],
  recentRuns: [],
  recentFailures: [],
  schedules: { active: 0, total: 0 },
  collections: 0,
};

function StatCard({ title, value, subtitle, icon: Icon, trend, tone = 'brand', to }) {
  const tones = {
    brand:   'from-brand-500/10 to-brand-500/0 text-brand-600 ring-brand-600/10',
    success: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600 ring-emerald-600/10',
    danger:  'from-red-500/10 to-red-500/0 text-red-600 ring-red-600/10',
    warn:    'from-amber-500/10 to-amber-500/0 text-amber-600 ring-amber-600/10',
    purple:  'from-purple-500/10 to-purple-500/0 text-purple-600 ring-purple-600/10',
  };

  const body = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500">{title}</p>
          <p className="text-[28px] font-semibold text-surface-900 tracking-tight mt-1 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-surface-400 mt-2">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tones[tone]} ring-1 ring-inset flex items-center justify-center`}>
          <Icon size={20} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-4 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(trend)}% vs last week</span>
        </div>
      )}
    </>
  );

  if (to) {
    return <Link to={to} className="card-interactive p-5 block">{body}</Link>;
  }
  return <div className="card p-5">{body}</div>;
}

function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-11 w-11 rounded-xl" />
      </div>
    </div>
  );
}

function QuickActionCard({ to, icon: Icon, title, subtitle, tone = 'brand' }) {
  const tones = {
    brand:   'bg-brand-50 text-brand-600 group-hover:bg-brand-100',
    purple:  'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    success: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    warn:    'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  };
  return (
    <Link to={to} className="card-interactive p-4 flex items-center gap-3 group">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-surface-800 truncate">{title}</p>
        <p className="text-xs text-surface-500 truncate">{subtitle}</p>
      </div>
      <ArrowRight size={15} className="ml-auto text-surface-300 group-hover:text-brand-500 transition-colors" />
    </Link>
  );
}

function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-10 text-surface-400">
        <Users size={28} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs text-surface-400 mt-1">Run a test to see activity here</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-100">
      {activities.map((a) => (
        <li key={a.id} className="flex items-start gap-3 py-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-brand text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {a.avatar || (a.user || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-surface-700">
              <span className="font-medium text-surface-900">{a.user}</span>
              <span className="text-surface-500"> {a.action} </span>
              <Link to={`/executions/${a.id}`} className="font-medium text-brand-600 hover:text-brand-700 truncate inline-block max-w-[220px] align-bottom">
                {a.target}
              </Link>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={a.result === 'passed' ? 'badge-success' : a.result === 'failed' ? 'badge-danger' : 'badge-muted'}>
                {a.result}
              </span>
              <span className="text-xs text-surface-400">
                {a.time ? new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function safeGet(path) {
  try { return await api.request('GET', path); }
  catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[dashboard] ${path} failed (${err.status || 'n/a'}): ${err.message}`);
    return null;
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [sessionError, setSessionError] = useState(null);
  const pollRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const [metricsData, alertsData, activityData] = await Promise.all([
      safeGet('/dashboard'),
      safeGet('/dashboard/alerts'),
      safeGet('/dashboard/activity'),
    ]);

    const allFailed = metricsData === null && alertsData === null && activityData === null;
    if (allFailed) {
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= 3 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setSessionError('Dashboard is temporarily unavailable. Please refresh the page or check your connection.');
      }
    } else {
      consecutiveFailuresRef.current = 0;
      setSessionError(null);
    }

    setMetrics(metricsData || EMPTY_METRICS);
    setAlerts(Array.isArray(alertsData?.data) ? alertsData.data : []);
    setActivity(Array.isArray(activityData?.data) ? activityData.data : []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    pollRef.current = setInterval(() => loadData(false), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { summary, byType, dailyTrend, recentFailures, schedules } = metrics || EMPTY_METRICS;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">A live view of your test quality.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            className="btn-secondary btn-sm"
            disabled={refreshing || loading}
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/run-test" className="btn-primary btn-sm">
            <Sparkles size={14} /> Run a test
          </Link>
        </div>
      </div>

      {sessionError && (
        <div role="alert" className="mb-6 card p-4 bg-amber-50/80 border-amber-200">
          <p className="text-sm text-amber-800">{sessionError}</p>
        </div>
      )}

      {alerts.length > 0 && <div className="mb-6"><AlertsBanner alerts={alerts} /></div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total runs"
              value={summary?.totalRuns || 0}
              subtitle={`${summary?.running || 0} running now`}
              icon={Activity}
              tone="brand"
            />
            <StatCard
              title="Pass rate"
              value={`${summary?.passRate || 0}%`}
              subtitle={`${summary?.passed || 0} passed · ${summary?.failed || 0} failed`}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              title="Avg duration"
              value={`${summary?.avgDuration || 0}ms`}
              subtitle="Across completed runs"
              icon={Clock}
              tone="warn"
            />
            <StatCard
              title="Active schedules"
              value={schedules?.active || 0}
              subtitle={`of ${schedules?.total || 0} total`}
              icon={Calendar}
              tone="purple"
              to="/schedules"
            />
          </>
        )}
      </div>

      {/* By-type summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link to="/dashboard/api" className="card-interactive p-5 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Globe size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-surface-900">API tests</h3>
              <p className="text-sm text-surface-500">
                {byType?.api?.count || 0} runs · {byType?.api?.passed || 0} passed
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-surface-300 group-hover:text-brand-500 transition-colors" />
        </Link>
        <Link to="/dashboard/automation" className="card-interactive p-5 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
              <Monitor size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-surface-900">UI / Automation</h3>
              <p className="text-sm text-surface-500">
                {byType?.ui?.count || 0} runs · {byType?.ui?.passed || 0} passed
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-surface-300 group-hover:text-brand-500 transition-colors" />
        </Link>
      </div>

      {/* Trend + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-surface-800">
              <BarChart3 size={16} className="text-brand-600" />
              30-day trend
            </h3>
            <Link to="/executions" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all →
            </Link>
          </div>
          <FailureTrends dailyTrend={dailyTrend || []} />
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 mb-4">Quick actions</h3>
          <div className="space-y-2.5">
            <QuickActionCard to="/run-test"     icon={Zap}        title="Run a test"      subtitle="Execute UI or API right now" tone="brand" />
            <QuickActionCard to="/collections"  icon={FolderOpen} title="Collections"     subtitle="Organize your test suites"   tone="purple" />
            <QuickActionCard to="/schedules"    icon={Calendar}   title="Schedules"       subtitle="Automate recurring runs"     tone="success" />
            <QuickActionCard to="/environments" icon={Globe}      title="Environments"    subtitle="Manage variables & secrets"  tone="warn" />
          </div>
        </div>
      </div>

      {/* Activity + Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="font-semibold flex items-center gap-2 text-surface-800">
              <Users size={16} className="text-surface-500" />
              Recent activity
            </h3>
          </div>
          <div className="px-5 py-2 max-h-80 scroll-area">
            <ActivityFeed activities={activity} />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="font-semibold flex items-center gap-2 text-surface-800">
              <AlertTriangle size={16} className="text-red-500" />
              Recent failures
            </h3>
            <Link to="/executions?status=failed" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="p-4 max-h-80 scroll-area">
            {recentFailures && recentFailures.length > 0 ? (
              <div className="space-y-2">
                {recentFailures.map((f) => (
                  <Link
                    key={f.id}
                    to={`/executions/${f.id}`}
                    className="flex items-start justify-between gap-3 p-3 bg-red-50/60 hover:bg-red-50 rounded-lg transition-colors ring-1 ring-red-600/10"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-surface-800 truncate">{f.testName}</p>
                      <p className="text-xs text-red-700 mt-1 truncate">{f.error}</p>
                    </div>
                    <span className="text-xs text-surface-400 font-mono shrink-0">{f.durationMs}ms</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-surface-400">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500/60" />
                <p className="text-sm text-surface-500 font-medium">All tests green</p>
                <p className="text-xs text-surface-400">No recent failures</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
