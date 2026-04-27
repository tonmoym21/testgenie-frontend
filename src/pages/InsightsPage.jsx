import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity, Bug, CheckCircle2, Filter,
  Gauge, Loader2, Pencil, Play, RefreshCw, Save, Users, X,
} from 'lucide-react';
import { api } from '../services/api';
import { setCurrentProjectId } from '../utils/currentProject';
import { useAuth } from '../context/AuthContext';
import { viewsApi } from '../services/viewsApi';
import BackButton from '../components/BackButton';
import ViewsDropdown from '../components/insights/ViewsDropdown';
import FiltersDrawer from '../components/insights/FiltersDrawer';
import LayoutEditor from '../components/insights/LayoutEditor';

const TIME_RANGES = [
  { id: '1d',  label: '1D' },
  { id: '7d',  label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'all', label: 'All Time' },
];

const PRIORITY_TONES = {
  critical: 'bg-red-500',
  high: 'bg-purple-500',
  medium: 'bg-amber-500',
  low: 'bg-surface-400',
};

// Predefined modules supported by the layout editor.
//   id    — stable across versions; persisted in view.layout
//   label — human-readable name shown in the editor
//   span  — number of grid columns it takes (1 or 2 in the lg:3 grid)
const MODULES = [
  { id: 'active-runs',       label: 'Active runs',          span: 1 },
  { id: 'closed-runs',       label: 'Closed runs',          span: 1 },
  { id: 'defects',           label: 'Defects logged',       span: 1 },
  { id: 'results',           label: 'Results from runs',    span: 2 },
  { id: 'type-distribution', label: 'Type of test cases',   span: 1 },
  { id: 'trend',             label: 'Trend of test cases',  span: 2 },
  { id: 'statistics',        label: 'Statistics',           span: 1 },
];
const ALL_MODULE_IDS = MODULES.map((m) => m.id);

// Map a `range` tab id to a backend-acceptable {startDate,endDate} pair, so
// the backend never has to know about UI-side "1D / 7D / 30D" presets.
function rangeToDates(range) {
  if (range === 'all') return { startDate: '', endDate: '' };
  const days = range === '1d' ? 1 : range === '7d' ? 7 : 30;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function SummaryCard({ label, value, sublabel, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand:   'from-brand-500/10 to-brand-500/0 text-brand-600 ring-brand-600/10 dark:from-brand-500/15 dark:text-brand-300 dark:ring-brand-400/20',
    success: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600 ring-emerald-600/10 dark:from-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
    warn:    'from-amber-500/10 to-amber-500/0 text-amber-600 ring-amber-600/10 dark:from-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
    purple:  'from-purple-500/10 to-purple-500/0 text-purple-600 ring-purple-600/10 dark:from-purple-500/15 dark:text-purple-300 dark:ring-purple-400/20',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
          <p className="text-[28px] font-semibold text-surface-900 dark:text-surface-50 tracking-tight mt-1 leading-none tabular-nums">{value}</p>
          {sublabel && <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">{sublabel}</p>}
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
  if (total === 0) return <div className="text-sm text-surface-400 dark:text-surface-500 py-6 text-center">No results from closed runs yet.</div>;
  const items = [
    { key: 'passed',   label: 'Passed',   tone: 'bg-emerald-500' },
    { key: 'failed',   label: 'Failed',   tone: 'bg-red-500' },
    { key: 'blocked',  label: 'Blocked',  tone: 'bg-amber-500' },
    { key: 'skipped',  label: 'Skipped',  tone: 'bg-surface-400' },
    { key: 'retest',   label: 'Retest',   tone: 'bg-purple-500' },
    { key: 'untested', label: 'Untested', tone: 'bg-surface-300 dark:bg-surface-600' },
  ];
  return (
    <>
      <div className="flex h-3 rounded-full overflow-hidden ring-1 ring-surface-200 dark:ring-surface-700">
        {items.map((it) => {
          const count = results[it.key] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return <div key={it.key} className={it.tone} style={{ width: `${pct}%` }} title={`${it.label}: ${count}`} />;
        })}
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-sm ${it.tone}`} />
            <span className="text-surface-500 dark:text-surface-400">{it.label}</span>
            <span className="ml-auto font-semibold text-surface-800 dark:text-surface-100 tabular-nums">{results[it.key] || 0}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TypeDistribution({ dist }) {
  const total = Object.values(dist || {}).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="text-sm text-surface-400 dark:text-surface-500 py-6 text-center">No test cases to categorize.</div>;
  return (
    <ul className="space-y-3">
      {Object.entries(dist).map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <li key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="capitalize text-surface-700 dark:text-surface-200 font-medium">{key}</span>
              <span className="text-surface-500 dark:text-surface-400 tabular-nums">{count} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
              <div className={`h-full ${PRIORITY_TONES[key] || 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TrendChart({ points }) {
  if (!points || points.length === 0) return <div className="text-sm text-surface-400 dark:text-surface-500 py-6 text-center">No activity in this range.</div>;
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
      <div className="flex items-center justify-between text-[11px] text-surface-400 dark:text-surface-500 mt-1 px-1 tabular-nums">
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
        <div key={it.label} className="rounded-lg bg-surface-50 ring-1 ring-surface-200/60 px-3 py-2.5 dark:bg-surface-800/50 dark:ring-surface-700">
          <p className="text-[11px] text-surface-500 dark:text-surface-400 uppercase tracking-wide">{it.label}</p>
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-0.5 tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function DefectsPanel({ defects, projectId }) {
  if (!defects || defects.total === 0) {
    return (
      <div className="text-center py-6 text-surface-400 dark:text-surface-500">
        <Bug size={22} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No defects linked yet</p>
        <p className="text-xs mt-1">Link a Jira issue to a failing test case to track defects.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600 dark:text-surface-300">Open (failing)</span>
        <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">{defects.open}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600 dark:text-surface-300">Resolved (passing)</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{defects.resolved}</span>
      </div>
      <div className="flex items-center justify-between text-sm pt-2 border-t border-surface-100 dark:border-surface-800">
        <span className="text-surface-500 dark:text-surface-400">Total linked</span>
        <span className="font-semibold text-surface-900 dark:text-surface-50 tabular-nums">{defects.total}</span>
      </div>
      <Link
        to={`/projects/${projectId}/test-cases`}
        className="text-xs text-brand-600 hover:text-brand-700 dark:text-lime-400 dark:hover:text-lime-300 font-medium inline-flex items-center gap-1 mt-2"
      >
        View linked test cases →
      </Link>
    </div>
  );
}

export default function InsightsPage() {
  const { projectId } = useParams();
  const { user, canManageTeam: isAdmin } = useAuth();
  const userId = user?.userId || null;

  const [project, setProject] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Views + applied state
  const [views, setViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const [range, setRange] = useState('30d');
  const [filters, setFilters] = useState(viewsApi.defaultFilters());
  const [sort, setSort] = useState(viewsApi.defaultSort());
  const [layout, setLayout] = useState(viewsApi.defaultLayout(ALL_MODULE_IDS));

  // UI panels
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [savedHint, setSavedHint] = useState('');

  // Bootstrap views on project change. Picks: active session view, else
  // user default, else org default, else raw default.
  useEffect(() => {
    if (!projectId) return;
    setCurrentProjectId(projectId);

    let cancelled = false;
    setBootstrapped(false);
    (async () => {
      const list = await viewsApi.list(projectId).catch(() => []);
      if (cancelled) return;
      setViews(list);

      const activeId = viewsApi.getActiveViewId(projectId);
      let toApply = list.find((v) => v.id === activeId);
      if (!toApply) toApply = await viewsApi.getDefaultView(projectId, userId);

      if (toApply) applyView(toApply);
      setBootstrapped(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, userId]);

  function applyView(v) {
    setActiveViewId(v.id);
    if (v.filters) setFilters({ ...viewsApi.defaultFilters(), ...v.filters });
    if (v.sort) setSort({ ...viewsApi.defaultSort(), ...v.sort });
    if (v.layout) {
      setLayout({
        visibleModules: v.layout.visibleModules?.length ? v.layout.visibleModules : ALL_MODULE_IDS,
        moduleOrder: v.layout.moduleOrder?.length ? v.layout.moduleOrder : ALL_MODULE_IDS,
      });
    }
  }

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) || null,
    [views, activeViewId],
  );

  // Detect drift between current state and active view config.
  const isDirty = useMemo(() => {
    if (!activeView) return false;
    if (JSON.stringify(activeView.filters || {}) !== JSON.stringify(filters)) return true;
    if (JSON.stringify(activeView.sort || {}) !== JSON.stringify(sort)) return true;
    if (JSON.stringify(activeView.layout || {}) !== JSON.stringify(layout)) return true;
    return false;
  }, [activeView, filters, sort, layout]);

  // Compose the query that would go to the backend if it were live. The
  // current /insights endpoint only accepts `range` — we still pass it so
  // existing data still loads. The full filter object is here so swapping
  // to the contract endpoint later is one line.
  const insightsQuery = useMemo(() => {
    const base = filters.startDate || filters.endDate
      ? { startDate: filters.startDate, endDate: filters.endDate }
      : rangeToDates(range);
    return {
      ...base,
      ownerIds: filters.ownerIds || [],
      teamIds: filters.teamIds || [],
      tags: filters.tags || [],
      statuses: filters.statuses || [],
      priorities: filters.priorities || [],
    };
  }, [range, filters]);

  const load = useMemo(() => async (showRefresh = false) => {
    if (!projectId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [proj, ins] = await Promise.all([
        api.getProject(projectId).catch(() => null),
        // STUB-LIMIT: backend currently only honors `range`. When the contract
        // endpoint lands, replace this call with one that passes
        // `insightsQuery` directly (start/end + the 5 filter dimension keys).
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

  // ----- View handlers -----
  const handleSelectView = (id) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    applyView(v);
    viewsApi.setActiveViewId(projectId, id);
  };

  const handleCreate = async (scope = 'personal') => {
    if (scope === 'org' && !isAdmin) return;
    const name = prompt(`Name this ${scope === 'org' ? 'org' : 'personal'} view:`,
      activeView ? `${activeView.name} (variant)` : 'My view');
    if (!name) return;
    const v = await viewsApi.create(projectId, { name, scope, filters, layout, sort, isDefault: false });
    setViews((prev) => [...prev, v]);
    setActiveViewId(v.id);
    viewsApi.setActiveViewId(projectId, v.id);
  };

  const handleRename = async (v) => {
    const name = prompt('Rename view:', v.name);
    if (!name || name === v.name) return;
    const updated = await viewsApi.update(v.id, { name });
    setViews((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
  };

  const handleDuplicate = async (v) => {
    const copy = await viewsApi.duplicate(v.id);
    setViews((prev) => [...prev, copy]);
  };

  const handleDelete = async (v) => {
    if (!confirm(`Delete "${v.name}"?`)) return;
    await viewsApi.remove(v.id);
    setViews((prev) => prev.filter((x) => x.id !== v.id));
    if (activeViewId === v.id) {
      setActiveViewId(null);
      viewsApi.setActiveViewId(projectId, null);
    }
  };

  const handleShareToOrg = async (v) => {
    if (!isAdmin) return;
    const updated = await viewsApi.update(v.id, { scope: 'org' });
    setViews((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
  };

  const handleMakePersonal = async (v) => {
    if (!isAdmin) return;
    const updated = await viewsApi.update(v.id, { scope: 'personal', isDefault: false });
    setViews((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
  };

  const handleSetDefault = async (v) => {
    const updated = await viewsApi.update(v.id, { isDefault: true });
    // Server enforces one-default-per-scope; reload list to reflect that.
    const list = await viewsApi.list(projectId);
    setViews(list);
    if (updated) setSavedHint(`Set "${updated.name}" as default`);
    setTimeout(() => setSavedHint(''), 1800);
  };

  const handleClearDefault = async (v) => {
    await viewsApi.update(v.id, { isDefault: false });
    const list = await viewsApi.list(projectId);
    setViews(list);
  };

  const handleSaveDirty = async () => {
    if (!activeView) return;
    const updated = await viewsApi.update(activeView.id, { filters, layout, sort });
    setViews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setSavedHint('View updated');
    setTimeout(() => setSavedHint(''), 1800);
  };

  // ----- Filter helpers -----
  const filterCount =
    (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0) +
    (filters.ownerIds?.length || 0) + (filters.teamIds?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.statuses?.length || 0) + (filters.priorities?.length || 0);

  const handleClearFilters = () => setFilters(viewsApi.defaultFilters());

  // ----- Layout helpers -----
  const handleLayoutChange = ({ visibleModules, moduleOrder }) => {
    setLayout({
      visibleModules: visibleModules ?? layout.visibleModules,
      moduleOrder: moduleOrder ?? layout.moduleOrder,
    });
  };
  const handleLayoutReset = () => setLayout(viewsApi.defaultLayout(ALL_MODULE_IDS));

  const data = insights;

  // Build the rendered widget list from layout: order then filter to visible.
  const widgetMap = {
    'active-runs': (
      <div className="card p-5" key="active-runs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <Play size={16} className="text-emerald-600 dark:text-emerald-400" /> Active runs
          </h3>
          <Link to={`/projects/${projectId}/test-runs?state=in_progress`} className="text-xs text-brand-600 hover:text-brand-700 dark:text-lime-400 dark:hover:text-lime-300 font-medium">View →</Link>
        </div>
        {loading ? <div className="skeleton h-10 w-20" /> : (
          <>
            <p className="text-3xl font-semibold text-surface-900 dark:text-surface-50 tabular-nums">{data?.runs.active ?? 0}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">new + in progress</p>
          </>
        )}
      </div>
    ),
    'closed-runs': (
      <div className="card p-5" key="closed-runs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand-600 dark:text-lime-400" /> Closed runs
          </h3>
          <Link to={`/projects/${projectId}/test-runs?state=closed`} className="text-xs text-brand-600 hover:text-brand-700 dark:text-lime-400 dark:hover:text-lime-300 font-medium">View →</Link>
        </div>
        {loading ? <div className="skeleton h-10 w-20" /> : (
          <>
            <p className="text-3xl font-semibold text-surface-900 dark:text-surface-50 tabular-nums">{data?.runs.closed ?? 0}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">completed + closed</p>
          </>
        )}
      </div>
    ),
    'defects': (
      <div className="card p-5" key="defects">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <Bug size={16} className="text-red-600 dark:text-red-400" /> Defects logged
          </h3>
        </div>
        {loading ? <div className="skeleton h-24 w-full" /> : (
          <DefectsPanel defects={data?.defects || { total: 0, open: 0, resolved: 0 }} projectId={projectId} />
        )}
      </div>
    ),
    'results': (
      <div className="card p-5 lg:col-span-2" key="results">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100">Results from closed runs</h3>
        </div>
        {loading ? <div className="skeleton h-24 w-full" /> : (
          <ResultsBar results={data?.results || {}} />
        )}
      </div>
    ),
    'type-distribution': (
      <div className="card p-5" key="type-distribution">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100">Type of test cases</h3>
        </div>
        {loading ? <div className="skeleton h-24 w-full" /> : (
          <TypeDistribution dist={data?.typeDistribution || {}} />
        )}
      </div>
    ),
    'trend': (
      <div className="card p-5 lg:col-span-2" key="trend">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100">Trend of test cases</h3>
        </div>
        {loading ? <div className="skeleton h-32 w-full" /> : (
          <TrendChart points={data?.trend || []} />
        )}
      </div>
    ),
    'statistics': (
      <div className="card p-5" key="statistics">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-800 dark:text-surface-100">Statistics</h3>
        </div>
        {loading ? <div className="skeleton h-24 w-full" /> : (
          <StatisticsCards insights={data || { summary: {}, runs: {}, defects: {} }} />
        )}
      </div>
    ),
  };

  const renderedWidgets = layout.moduleOrder
    .filter((id) => layout.visibleModules.includes(id) && widgetMap[id])
    .map((id) => widgetMap[id]);

  // Only render the page once views/defaults are bootstrapped, otherwise
  // a flash-of-default could overwrite the saved active view.
  if (!bootstrapped) {
    return (
      <div className="page">
        <BackButton to="/projects" label="Back to projects" />
        <div className="flex items-center justify-center py-16 text-surface-400 dark:text-surface-500 text-sm">
          <Loader2 className="animate-spin mr-2" size={14} /> Preparing your view…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <BackButton to="/projects" label="Back to projects" />

      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title flex items-center gap-2">
            <Activity size={22} className="text-brand-600 dark:text-lime-400" />
            Project Insights
          </h1>
          <p className="page-subtitle">
            {project?.name ? `Overview for ${project.name}` : 'Project activity and coverage'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg ring-1 ring-surface-200 bg-white p-0.5 dark:bg-surface-900 dark:ring-surface-700" role="tablist" aria-label="Time range">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={range === r.id}
                onClick={() => setRange(r.id)}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                  range === r.id
                    ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-lime-500/15 dark:text-lime-300'
                    : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <ViewsDropdown
            views={views}
            activeView={activeView}
            userId={userId}
            isAdmin={isAdmin}
            onSelect={handleSelectView}
            onCreate={handleCreate}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onShareToOrg={handleShareToOrg}
            onMakePersonal={handleMakePersonal}
            onSetDefault={handleSetDefault}
            onClearDefault={handleClearDefault}
          />

          {isDirty && activeView && (
            <button onClick={handleSaveDirty} className="btn-secondary btn-sm" title="Save changes to active view">
              <Save size={14} /> Save view
            </button>
          )}

          <button
            onClick={() => setFiltersOpen((f) => !f)}
            className="btn-secondary btn-sm"
            aria-expanded={filtersOpen}
          >
            <Filter size={14} />
            Filters
            {filterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-brand-600 text-white dark:bg-lime-500 dark:text-surface-950">
                {filterCount}
              </span>
            )}
          </button>

          {!layoutEditing ? (
            <button onClick={() => setLayoutEditing(true)} className="btn-secondary btn-sm" title="Show/hide and reorder modules">
              <Pencil size={14} /> Edit layout
            </button>
          ) : (
            <button onClick={() => setLayoutEditing(false)} className="btn-secondary btn-sm">
              <X size={14} /> Done editing
            </button>
          )}

          <button onClick={() => load(true)} disabled={refreshing || loading} className="btn-secondary btn-sm">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {savedHint && (
        <div role="status" className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 text-xs dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 size={12} /> {savedHint}
        </div>
      )}

      {filtersOpen && (
        <FiltersDrawer
          open={filtersOpen}
          filters={filters}
          projectId={projectId}
          projectName={project?.name}
          onChange={setFilters}
          onClear={handleClearFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {layoutEditing && (
        <LayoutEditor
          modules={MODULES}
          visible={layout.visibleModules}
          order={layout.moduleOrder}
          onChange={handleLayoutChange}
          onReset={handleLayoutReset}
        />
      )}

      {error && (
        <div role="alert" className="mb-6 card p-4 bg-red-50/80 border border-red-200 dark:bg-red-500/10 dark:border-red-400/30">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Summary cards (always visible — not part of the show/hide layout) */}
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

      {/* Detail widgets driven by layout.visibleModules + moduleOrder */}
      {renderedWidgets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {renderedWidgets}
        </div>
      ) : (
        <div className="card p-6 mb-6 text-center text-sm text-surface-500 dark:text-surface-400">
          All modules are hidden. Open <button onClick={() => setLayoutEditing(true)} className="underline">Edit layout</button> to bring them back.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 text-surface-400 dark:text-surface-500 text-sm">
          <Loader2 className="animate-spin mr-2" size={14} /> Loading insights…
        </div>
      )}
    </div>
  );
}
