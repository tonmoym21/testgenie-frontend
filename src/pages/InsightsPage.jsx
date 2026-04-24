import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, Bug, CheckCircle2, ChevronDown, Filter,
  Gauge, LayoutGrid, Loader2, Pencil, Play, Plus, RefreshCw, Users,
} from 'lucide-react';
import { api } from '../services/api';
import { setCurrentProjectId } from '../utils/currentProject';

const TIME_RANGES = [
  { id: '1d',  label: '1D' },
  { id: '7d',  label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'all', label: 'All Time' },
];

const PRIORITY_TONES = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-surface-400',
};

function SummaryCard({ label, value, sublabel, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand:   'from-brand-500/10 to-brand-500/0 text-brand-600 ring-brand-600/10',
    success: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600 ring-emerald-600/10',
    warn:    'from-amber-500/10 to-amber-500/0 text-amber-600 ring-amber-600/10',
    purple:  'from-purple-500/10 to-purple-500/0 text-purple-600 ring-purple-600/10',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-surface-500">{label}</p>
          <p className="text-[28px] font-semibold text-surface-900 tracking-tight mt-1 leading-none">{value}</p>
          {sublabel && <p className="text-xs text-surface-400 mt-2">{sublabel}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tones[tone]} ring-1 ring-inset flex items-center justify-center`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ height = 'h-28' }) {
  return (
    <div className={`card p-5 ${height}`}>
      <div className="skeleton h-3 w-20 mb-3" />
      <div className="skeleton h-7 w-16 mb-2" />
      <div className="skeleton h-3 w-24" />
    </div>
  );
}

function ResultsBar({ results }) {
  const total = Object.values(results || {}).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <div className="text-sm text-surface-400 py-6 text-center">No results from closed runs yet.</div>;
  }
  const items = [
    { key: 'passed',   label: 'Passed',   tone: 'bg-emerald-500' },
    { key: 'failed',   label: 'Failed',   tone: 'bg-red-500' },
    { key: 'blocked',  label: 'Blocked',  tone: 'bg-amber-500' },
    { key: 'skipped',  label: 'Skipped',  tone: 'bg-surface-400' },
    { key: 'retest',   label: 'Retest',   tone: 'bg-purple-500' },
    { key: 'untested', label: 'Untested', tone: 'bg-surface-300' },
  ];
  return (
    <>
      <div className="flex h-3 rounded-full overflow-hidden ring-1 ring-surface-200">
        {items.map((it) => {
          const count = results[it.key] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return <div key={it.key} className={it.tone} style={{ width: `${pct}%` }} title={`${it.label}: ${count}`} />;
        })}
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-xs text-surface-600">
            <span className={`w-2.5 h-2.5 rounded-sm ${it.tone}`} />
            <span className="text-surface-500">{it.label}</span>
            <span className="ml-auto font-semibold text-surface-800">{results[it.key] || 0}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TypeDistribution({ dist }) {
  const total = Object.values(dist || {}).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <div className="text-sm text-surface-400 py-6 text-center">No test cases to categorize.</div>;
  }
  return (
    <ul className="space-y-3">
      {Object.entries(dist).map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <li key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="capitalize text-surface-700 font-medium">{key}</span>
              <span className="text-surface-500">{count} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
              <div className={`h-full ${PRIORITY_TONES[key] || 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TrendChart({ points }) {
  if (!points || points.length === 0) {
    return <div className="text-sm text-surface-400 py-6 text-center">No activity in this range.</div>;
  }
  const width = 640;
  const height = 140;
  const pad = 8;
  const max = Math.max(1, ...points.map((p) => p.created));
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = pad + i * step;
      const y = height - pad - (p.created / max) * (height - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPath = `${path} L ${(pad + (points.length - 1) * step).toFixed(1)} ${height - pad} L ${pad} ${height - pad} Z`;
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="rgb(99 102 241)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center justify-between text-[11px] text-surface-400 mt-1 px-1">
        <span>{points[0]?.date}</span>
        <span>Peak: {max}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function StatisticsCards({ insights }) {
  const { summary, runs, defects } = insights;
  const items = [
    { label: 'Total test cases', value: summary.totalTestCases },
    { label: 'Total runs',       value: runs.total },
    { label: 'Active runs',      value: runs.active },
    { label: 'Closed runs',      value: runs.closed },
    { label: 'Defects linked',   value: defects.total },
    { label: 'Coverage',         value: `${summary.automationCoverage}%` },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-surface-50 ring-1 ring-surface-200/60 px-3 py-2.5">
          <p className="text-[11px] text-surface-500 uppercase tracking-wide">{it.label}</p>
          <p className="text-lg font-semibold text-surface-900 mt-0.5">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function DefectsPanel({ defects, projectId }) {
  if (!defects || defects.total === 0) {
    return (
      <div className="text-center py-6 text-surface-400">
        <Bug size={22} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No defects linked yet</p>
        <p className="text-xs text-surface-400 mt-1">Link a Jira issue to a failing test case to track defects.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600">Open (failing)</span>
        <span className="font-semibold text-red-600">{defects.open}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600">Resolved (passing)</span>
        <span className="font-semibold text-emerald-600">{defects.resolved}</span>
      </div>
      <div className="flex items-center justify-between text-sm pt-2 border-t border-surface-100">
        <span className="text-surface-500">Total linked</span>
        <span className="font-semibold text-surface-900">{defects.total}</span>
      </div>
      <Link
        to={`/projects/${projectId}/test-cases`}
        className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 mt-2"
      >
        View linked test cases →
      </Link>
    </div>
  );
}

function ViewsDropdown({ open, onToggle }) {
  return (
    <div className="relative">
      <button onClick={onToggle} className="btn-secondary btn-sm" aria-haspopup="menu" aria-expanded={open}>
        <LayoutGrid size={14} /> Default view <ChevronDown size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 card p-1 shadow-soft-lg z-30">
          <button className="w-full text-left text-sm px-3 py-2 rounded-md bg-brand-50 text-brand-700 font-medium">
            Default view
          </button>
          <button disabled className="w-full text-left text-sm px-3 py-2 rounded-md text-surface-400 cursor-not-allowed flex items-center gap-2">
            <Plus size={14} /> Create view
            <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
          </button>
          <button disabled className="w-full text-left text-sm px-3 py-2 rounded-md text-surface-400 cursor-not-allowed">
            Duplicate
          </button>
          <button disabled className="w-full text-left text-sm px-3 py-2 rounded-md text-surface-400 cursor-not-allowed">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [insights, setInsights] = useState(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewsOpen, setViewsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (projectId) setCurrentProjectId(projectId);
  }, [projectId]);

  const load = useMemo(() => async (showRefresh = false) => {
    if (!projectId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [proj, ins] = await Promise.all([
        api.getProject(projectId).catch(() => null),
        api.getProjectInsights(projectId, { range }).catch((err) => {
          throw new Error(err?.message || 'Failed to load insights');
        }),
      ]);
      setProject(proj?.data || proj || null);
      setInsights(ins);
    } catch (err) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, range]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId, range]);

  const data = insights;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title flex items-center gap-2">
            <Activity size={22} className="text-brand-600" />
            Project Insights
          </h1>
          <p className="page-subtitle">
            {project?.name ? `Overview for ${project.name}` : 'Overview of project activity and coverage.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range */}
          <div className="inline-flex rounded-lg ring-1 ring-surface-200 bg-white p-0.5" role="tablist" aria-label="Time range">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={range === r.id}
                onClick={() => setRange(r.id)}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                  range === r.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              disabled
              title="Custom date range coming soon"
              className="text-xs px-2.5 py-1.5 rounded-md text-surface-300 cursor-not-allowed"
            >
              Custom
            </button>
          </div>
          <ViewsDropdown open={viewsOpen} onToggle={() => setViewsOpen((v) => !v)} />
          <button
            onClick={() => setFiltersOpen((f) => !f)}
            className="btn-secondary btn-sm"
            aria-expanded={filtersOpen}
          >
            <Filter size={14} /> Filters
          </button>
          <button disabled title="Layout editing coming soon" className="btn-secondary btn-sm opacity-50 cursor-not-allowed">
            <Pencil size={14} /> Edit layout
          </button>
          <button onClick={() => load(true)} disabled={refreshing || loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters drawer (placeholder controls) */}
      {filtersOpen && (
        <div className="card p-4 mb-6 bg-surface-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Users</label>
              <select disabled className="input opacity-60 cursor-not-allowed">
                <option>All users</option>
              </select>
            </div>
            <div>
              <label className="label">Unique test run name</label>
              <input disabled placeholder="All runs" className="input opacity-60 cursor-not-allowed" />
            </div>
            <div className="flex items-end justify-end gap-2">
              <button disabled className="btn-secondary btn-sm opacity-60 cursor-not-allowed">Clear</button>
              <button disabled className="btn-primary btn-sm opacity-60 cursor-not-allowed">Apply</button>
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-3 flex items-center gap-1">
            <AlertTriangle size={12} /> Filters are coming soon — widgets currently reflect the full project scope.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 card p-4 bg-red-50/80 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <SummaryCard
              label="Automation coverage"
              value={`${data?.summary.automationCoverage ?? 0}%`}
              sublabel={`${data?.summary.automatedTestCases ?? 0} of ${data?.summary.totalTestCases ?? 0} automated`}
              icon={Gauge}
              tone="brand"
            />
            <SummaryCard
              label="Automated test cases"
              value={data?.summary.automatedTestCases ?? 0}
              sublabel="Linked to automation assets"
              icon={CheckCircle2}
              tone="success"
            />
            <SummaryCard
              label="Manual test cases"
              value={data?.summary.manualTestCases ?? 0}
              sublabel="Not yet automated"
              icon={Users}
              tone="warn"
            />
            <SummaryCard
              label="Total test cases"
              value={data?.summary.totalTestCases ?? 0}
              sublabel="In this project"
              icon={Activity}
              tone="purple"
            />
          </>
        )}
      </div>

      {/* Detailed widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active runs */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <Play size={16} className="text-emerald-600" /> Active runs
            </h3>
            <Link to={`/projects/${projectId}/test-runs?state=in_progress`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">View →</Link>
          </div>
          {loading ? <div className="skeleton h-10 w-20" /> : (
            <>
              <p className="text-3xl font-semibold text-surface-900">{data?.runs.active ?? 0}</p>
              <p className="text-xs text-surface-500 mt-1">new + in progress</p>
            </>
          )}
        </div>

        {/* Closed runs */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-brand-600" /> Closed runs
            </h3>
            <Link to={`/projects/${projectId}/test-runs?state=closed`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">View →</Link>
          </div>
          {loading ? <div className="skeleton h-10 w-20" /> : (
            <>
              <p className="text-3xl font-semibold text-surface-900">{data?.runs.closed ?? 0}</p>
              <p className="text-xs text-surface-500 mt-1">completed + closed</p>
            </>
          )}
        </div>

        {/* Defects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <Bug size={16} className="text-red-600" /> Defects logged
            </h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <DefectsPanel defects={data?.defects || { total: 0, open: 0, resolved: 0 }} projectId={projectId} />
          )}
        </div>

        {/* Results from closed runs */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">Results from closed runs</h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <ResultsBar results={data?.results || {}} />
          )}
        </div>

        {/* Type distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">Type of test cases</h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <TypeDistribution dist={data?.typeDistribution || {}} />
          )}
        </div>

        {/* Trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">Trend of test cases</h3>
          </div>
          {loading ? <div className="skeleton h-32 w-full" /> : (
            <TrendChart points={data?.trend || []} />
          )}
        </div>

        {/* Statistics summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">Statistics</h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <StatisticsCards insights={data || { summary: {}, runs: {}, defects: {} }} />
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-surface-400 text-sm">
          <Loader2 className="animate-spin mr-2" size={14} /> Loading insights…
        </div>
      )}
    </div>
  );
}
