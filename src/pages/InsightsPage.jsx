import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity, Bug, CheckCircle2, Filter, GripVertical,
  Gauge, Loader2, Pencil, Play, RefreshCw, Save, Users, X,
} from 'lucide-react';
import { api } from '../services/api';
import { setCurrentProjectId } from '../utils/currentProject';
import { useAuth } from '../context/AuthContext';
import { viewsApi } from '../services/viewsApi';
import BackButton from '../components/BackButton';
import ViewsDropdown from '../components/insights/ViewsDropdown';
import FiltersDrawer from '../components/insights/FiltersDrawer';
import { useReorderable } from '../components/insights/useReorderable';

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

const DEFAULT_LAYOUT = [
  'active-runs', 'closed-runs', 'defects',
  'results', 'type-distribution', 'trend', 'statistics',
];

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

// One draggable shell wrapping each detail widget so layout-edit mode can
// reorder them. The shell adds the grip handle, drop highlight, and grid-span.
function WidgetShell({ id, span, editing, bindReorder, dragging, over, children }) {
  const dragProps = editing ? bindReorder(id) : {};
  return (
    <div
      {...dragProps}
      className={`relative ${span === 2 ? 'lg:col-span-2' : ''}
        ${editing ? 'ring-1 ring-dashed ring-surface-300 dark:ring-surface-600 rounded-xl' : ''}
        ${editing && dragging === id ? 'opacity-40' : ''}
        ${editing && over === id && dragging && dragging !== id ? 'ring-2 ring-brand-500 dark:ring-lime-400' : ''}
      `}
    >
      {editing && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-1 rounded-md bg-surface-900/80 text-white text-[10px] uppercase tracking-wide flex items-center gap-1 cursor-grab active:cursor-grabbing">
          <GripVertical size={11} /> Drag
        </div>
      )}
      {children}
    </div>
  );
}

export default function InsightsPage() {
  const { projectId } = useParams();
  const { canManageTeam: isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // View + filter state.
  const [views, setViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  const [range, setRange] = useState('30d');
  const [filters, setFilters] = useState(viewsApi.defaultFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Layout-edit state. `layout` is the per-user order of detail widgets.
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [savedHint, setSavedHint] = useState('');

  // Bootstrap views + layout on project change.
  useEffect(() => {
    if (!projectId) return;
    setCurrentProjectId(projectId);

    let cancelled = false;
    (async () => {
      const list = await viewsApi.list(projectId).catch(() => []);
      if (cancelled) return;
      setViews(list);

      const activeId = viewsApi.getActiveViewId(projectId);
      if (activeId) {
        const v = list.find((x) => x.id === activeId);
        if (v) applyView(v);
      }

      const userLayout = viewsApi.getUserLayout(projectId)
        || viewsApi.getOrgDefaultLayout(projectId);
      if (userLayout && Array.isArray(userLayout) && userLayout.length === DEFAULT_LAYOUT.length) {
        setLayout(userLayout);
      } else {
        setLayout(DEFAULT_LAYOUT);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function applyView(v) {
    setActiveViewId(v.id);
    if (v.config?.range) setRange(v.config.range);
    if (v.config?.filters) setFilters({ ...viewsApi.defaultFilters(), ...v.config.filters });
  }

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) || null,
    [views, activeViewId],
  );

  // Detect when current state has drifted from the active view.
  const isDirty = useMemo(() => {
    if (!activeView) return false;
    const cfg = activeView.config || {};
    if ((cfg.range || '30d') !== range) return true;
    return JSON.stringify(cfg.filters || {}) !== JSON.stringify(filters);
  }, [activeView, range, filters]);

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

  // ----- View handlers -----
  const handleSelectView = (id) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    applyView(v);
    viewsApi.setActiveViewId(projectId, id);
  };

  const handleCreateView = async () => {
    const name = prompt('Name this view:', activeView ? `${activeView.name} (variant)` : 'My view');
    if (!name) return;
    const v = await viewsApi.create(projectId, {
      name,
      scope: 'personal',
      config: { range, filters, sort: 'recent', layout },
    });
    setViews((prev) => [...prev, v]);
    setActiveViewId(v.id);
    viewsApi.setActiveViewId(projectId, v.id);
  };

  const handleRenameView = async (v) => {
    const name = prompt('Rename view:', v.name);
    if (!name || name === v.name) return;
    const updated = await viewsApi.update(v.id, { name });
    setViews((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
  };

  const handleDuplicateView = async (v) => {
    const copy = await viewsApi.duplicate(v.id);
    setViews((prev) => [...prev, copy]);
  };

  const handleDeleteView = async (v) => {
    if (!confirm(`Delete "${v.name}"?`)) return;
    await viewsApi.remove(v.id);
    setViews((prev) => prev.filter((x) => x.id !== v.id));
    if (activeViewId === v.id) {
      setActiveViewId(null);
      viewsApi.setActiveViewId(projectId, null);
    }
  };

  const handleShareToggle = async (v) => {
    const nextScope = v.scope === 'org' ? 'personal' : 'org';
    const updated = await viewsApi.update(v.id, { scope: nextScope });
    setViews((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
  };

  const handleSaveDirty = async () => {
    if (!activeView) return;
    const updated = await viewsApi.update(activeView.id, {
      config: { ...activeView.config, range, filters },
    });
    setViews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setSavedHint('View updated');
    setTimeout(() => setSavedHint(''), 1800);
  };

  // ----- Filter handlers -----
  const filterCount =
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0) +
    (filters.owners?.length || 0) + (filters.statuses?.length || 0) +
    (filters.priorities?.length || 0) + (filters.teams?.length || 0) +
    (filters.tags?.length || 0);

  const handleClearFilters = () => setFilters(viewsApi.defaultFilters());

  // ----- Layout handlers -----
  const { bind: bindReorder, dragging, over } = useReorderable({
    order: layout,
    enabled: layoutEditing,
    onReorder: (next) => { setLayout(next); setLayoutDirty(true); },
  });

  const enterLayoutEdit = () => { setLayoutEditing(true); setLayoutDirty(false); };
  const cancelLayoutEdit = () => {
    const saved = viewsApi.getUserLayout(projectId)
      || viewsApi.getOrgDefaultLayout(projectId)
      || DEFAULT_LAYOUT;
    setLayout(saved);
    setLayoutEditing(false);
    setLayoutDirty(false);
  };
  const saveLayout = () => {
    viewsApi.setUserLayout(projectId, layout);
    setLayoutEditing(false);
    setLayoutDirty(false);
    setSavedHint('Layout saved');
    setTimeout(() => setSavedHint(''), 1800);
  };
  const saveLayoutAsOrgDefault = () => {
    viewsApi.setOrgDefaultLayout(projectId, layout);
    viewsApi.setUserLayout(projectId, layout);
    setLayoutEditing(false);
    setLayoutDirty(false);
    setSavedHint('Saved as org default');
    setTimeout(() => setSavedHint(''), 1800);
  };

  const data = insights;

  // Render the detail widgets in current layout order. Each entry is a
  // self-contained card so reordering is just shuffling the wrappers.
  const detailWidgets = {
    'active-runs': (
      <WidgetShell id="active-runs" editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
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
      </WidgetShell>
    ),
    'closed-runs': (
      <WidgetShell id="closed-runs" editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
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
      </WidgetShell>
    ),
    'defects': (
      <WidgetShell id="defects" editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
              <Bug size={16} className="text-red-600 dark:text-red-400" /> Defects logged
            </h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <DefectsPanel defects={data?.defects || { total: 0, open: 0, resolved: 0 }} projectId={projectId} />
          )}
        </div>
      </WidgetShell>
    ),
    'results': (
      <WidgetShell id="results" span={2} editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 dark:text-surface-100">Results from closed runs</h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <ResultsBar results={data?.results || {}} />
          )}
        </div>
      </WidgetShell>
    ),
    'type-distribution': (
      <WidgetShell id="type-distribution" editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 dark:text-surface-100">Type of test cases</h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <TypeDistribution dist={data?.typeDistribution || {}} />
          )}
        </div>
      </WidgetShell>
    ),
    'trend': (
      <WidgetShell id="trend" span={2} editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 dark:text-surface-100">Trend of test cases</h3>
          </div>
          {loading ? <div className="skeleton h-32 w-full" /> : (
            <TrendChart points={data?.trend || []} />
          )}
        </div>
      </WidgetShell>
    ),
    'statistics': (
      <WidgetShell id="statistics" editing={layoutEditing} bindReorder={bindReorder} dragging={dragging} over={over}>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 dark:text-surface-100">Statistics</h3>
          </div>
          {loading ? <div className="skeleton h-24 w-full" /> : (
            <StatisticsCards insights={data || { summary: {}, runs: {}, defects: {} }} />
          )}
        </div>
      </WidgetShell>
    ),
  };

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
            isAdmin={isAdmin}
            onSelect={handleSelectView}
            onCreate={handleCreateView}
            onRename={handleRenameView}
            onDuplicate={handleDuplicateView}
            onDelete={handleDeleteView}
            onShareToggle={handleShareToggle}
          />

          {isDirty && (
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
            <button onClick={enterLayoutEdit} className="btn-secondary btn-sm" title="Drag-reorder widgets">
              <Pencil size={14} /> Edit layout
            </button>
          ) : (
            <>
              <button onClick={saveLayout} disabled={!layoutDirty} className="btn-primary btn-sm">
                <Save size={14} /> Save layout
              </button>
              {isAdmin && (
                <button onClick={saveLayoutAsOrgDefault} disabled={!layoutDirty} className="btn-secondary btn-sm" title="Make this the default layout for everyone in the org">
                  <Users size={14} /> Save as org default
                </button>
              )}
              <button onClick={cancelLayoutEdit} className="btn-ghost btn-sm">
                <X size={14} /> Cancel
              </button>
            </>
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
          projectName={project?.name}
          onChange={setFilters}
          onClear={handleClearFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {error && (
        <div role="alert" className="mb-6 card p-4 bg-red-50/80 border border-red-200 dark:bg-red-500/10 dark:border-red-400/30">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Summary cards (fixed; not part of drag-reorder per spec — drag-reorder only) */}
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

      {/* Reorderable detail widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {layout.map((id) => detailWidgets[id]).filter(Boolean)}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-surface-400 dark:text-surface-500 text-sm">
          <Loader2 className="animate-spin mr-2" size={14} /> Loading insights…
        </div>
      )}
    </div>
  );
}
