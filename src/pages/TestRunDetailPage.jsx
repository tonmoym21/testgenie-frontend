import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft, Plus, Loader2, X, CheckCircle2, XCircle, Circle,
  MinusCircle, SkipForward, RotateCcw, Trash2, Search,
} from 'lucide-react';

const STATUS_META = {
  untested: { label: 'Untested', color: '#94a3b8', bg: 'bg-surface-100', text: 'text-surface-600', icon: Circle },
  passed:   { label: 'Passed',   color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  failed:   { label: 'Failed',   color: '#ef4444', bg: 'bg-red-50',     text: 'text-red-700',     icon: XCircle },
  blocked:  { label: 'Blocked',  color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',   icon: MinusCircle },
  skipped:  { label: 'Skipped',  color: '#64748b', bg: 'bg-surface-100',text: 'text-surface-600', icon: SkipForward },
  retest:   { label: 'Retest',   color: '#8b5cf6', bg: 'bg-violet-50',  text: 'text-violet-700',  icon: RotateCcw },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.untested;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

// Pure SVG donut — no library
function StatsDonut({ byStatus, total }) {
  const size = 140;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const order = ['passed', 'failed', 'blocked', 'skipped', 'retest', 'untested'];
  let offset = 0;
  const segs = [];
  for (const k of order) {
    const v = byStatus[k] || 0;
    if (v === 0) continue;
    const frac = total > 0 ? v / total : 0;
    const len = frac * circumference;
    segs.push(
      <circle
        key={k}
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={STATUS_META[k].color}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${circumference - len}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    );
    offset += len;
  }
  const executed = (byStatus.passed || 0) + (byStatus.failed || 0) + (byStatus.blocked || 0) + (byStatus.skipped || 0);
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
  return (
    <div className="relative">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-surface-900">{pct}%</div>
        <div className="text-xs text-surface-500">{executed}/{total}</div>
      </div>
    </div>
  );
}

function AddCasesModal({ projectId, existingIds, onClose, onAdded }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTestCases(projectId, { limit: 500 });
        setCases(res.data || []);
      } finally { setLoading(false); }
    })();
  }, [projectId]);

  const existing = useMemo(() => new Set((existingIds || []).map(Number)), [existingIds]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cases.filter((c) => !existing.has(c.id) && (!t || c.title.toLowerCase().includes(t)));
  }, [cases, q, existing]);

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await onAdded(Array.from(selected));
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/70">
          <h2 className="text-lg font-semibold text-surface-900">Add test cases to run</h2>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>
        <div className="px-6 py-3 border-b border-surface-200/70">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search test cases" className="input pl-9 py-1.5 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-surface-500"><Loader2 className="inline animate-spin mr-2" size={14}/>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-surface-500">No test cases available{q ? ' for that search' : ''}.</div>
          ) : (
            <>
              <div className="px-4 py-2 bg-surface-50 border-b border-surface-200/70 flex items-center gap-2 text-xs text-surface-600">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                <span>Select all ({filtered.length})</span>
                <span className="ml-auto">{selected.size} selected</span>
              </div>
              <ul className="divide-y divide-surface-200/70">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-3 px-4 py-2 hover:bg-surface-50 cursor-pointer">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                      <span className="text-xs font-mono text-surface-500 shrink-0">TC-{c.id}</span>
                      <span className="text-sm text-surface-800 truncate flex-1">{c.title}</span>
                      <span className="text-[11px] text-surface-500 capitalize">{c.priority}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-surface-200/70">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleAdd} disabled={selected.size === 0 || saving} className="btn-primary">
            {saving && <Loader2 size={14} className="animate-spin" />} Add {selected.size || ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TestRunDetailPage() {
  const { projectId, runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, executed: 0, passRate: 0, progress: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [commentOpenFor, setCommentOpenFor] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [r, c, s] = await Promise.all([
        api.getTestRun(projectId, runId),
        api.getTestRunCases(projectId, runId),
        api.getTestRunStats(projectId, runId),
      ]);
      setRun(r); setCases(c.data || []); setStats(s);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId, runId]);

  useEffect(() => { reload(); }, [reload]);

  const setResult = async (caseId, status, comment) => {
    setBusyId(caseId);
    try {
      await api.setTestRunResult(projectId, runId, caseId, { status, comment: comment || null });
      await reload();
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  };

  const removeCase = async (caseId) => {
    if (!confirm('Remove this test case from the run?')) return;
    try {
      await api.removeTestRunCase(projectId, runId, caseId);
      await reload();
    } catch (err) { setError(err.message); }
  };

  const handleAdd = async (ids) => {
    await api.addTestRunCases(projectId, runId, ids);
    await reload();
  };

  if (loading) {
    return <div className="p-6 text-surface-500"><Loader2 className="inline animate-spin mr-2" size={14}/>Loading test run…</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="px-6 pt-5 pb-4 border-b border-surface-200/70 bg-white">
        <Link to={`/projects/${projectId}/test-runs`} className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-800 mb-2">
          <ArrowLeft size={12} /> Back to test runs
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-surface-900 truncate">{run?.name}</h1>
            <div className="mt-1 text-sm text-surface-500 flex items-center gap-3">
              <span className="capitalize">State: <span className="font-medium text-surface-800">{String(run?.state || '').replace('_', ' ')}</span></span>
              {run?.assigneeName && <span>Assignee: <span className="font-medium text-surface-800">{run.assigneeName}</span></span>}
              <span>{stats.total} test cases</span>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
            <Plus size={14} /> Add Test Cases
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-6 mt-3 bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Stats / chart */}
      <div className="px-6 py-5 bg-surface-50 border-b border-surface-200/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-surface-200/70 p-4 flex items-center gap-4">
            <StatsDonut byStatus={stats.byStatus} total={stats.total} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2">Execution progress</div>
              <div className="text-sm text-surface-700 space-y-1">
                <div className="flex justify-between"><span>Executed</span><span className="font-medium">{stats.executed} / {stats.total}</span></div>
                <div className="flex justify-between"><span>Pass rate</span><span className="font-medium text-emerald-700">{stats.passRate}%</span></div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 bg-white rounded-lg border border-surface-200/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-3">Results by status</div>
            <div className="space-y-2">
              {['passed','failed','blocked','skipped','retest','untested'].map((k) => {
                const count = stats.byStatus[k] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const meta = STATUS_META[k];
                return (
                  <div key={k} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-surface-600">{meta.label}</div>
                    <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                    </div>
                    <div className="w-12 text-right text-xs font-medium text-surface-700 tabular-nums">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cases */}
      <div className="px-6 py-4">
        {cases.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-surface-300 rounded-lg bg-white">
            <p className="text-surface-700 font-medium mb-1">No test cases in this run yet</p>
            <p className="text-sm text-surface-500 mb-4">Add test cases from your project to start executing.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm"><Plus size={14}/> Add Test Cases</button>
          </div>
        ) : (
          <div className="bg-white border border-surface-200/70 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-100/60 border-b border-surface-200/70 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
              <div className="col-span-1">ID</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-4">Execute</div>
              <div className="col-span-1 text-right">Remove</div>
            </div>
            <ul className="divide-y divide-surface-200/70">
              {cases.map((c) => (
                <li key={c.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm">
                  <div className="col-span-1 text-xs font-mono text-surface-500">TC-{c.id}</div>
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium text-surface-900 truncate">{c.title}</div>
                    {c.jiraIssueKey && <div className="text-[11px] text-brand-600">🔗 {c.jiraIssueKey}</div>}
                    {c.comment && <div className="text-xs text-surface-500 truncate">“{c.comment}”</div>}
                  </div>
                  <div className="col-span-2"><StatusBadge status={c.status} /></div>
                  <div className="col-span-4 flex items-center gap-1 flex-wrap">
                    {['passed','failed','blocked','skipped','retest'].map((k) => {
                      const meta = STATUS_META[k];
                      const Icon = meta.icon;
                      const active = c.status === k;
                      return (
                        <button
                          key={k}
                          onClick={() => setResult(c.id, k)}
                          disabled={busyId === c.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                            active ? `${meta.bg} ${meta.text} border-current` : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                          }`}
                          title={`Mark as ${meta.label}`}
                        >
                          <Icon size={11} /> {meta.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setCommentOpenFor(c.id); setCommentText(c.comment || ''); }}
                      className="text-xs text-brand-600 hover:text-brand-700 px-2 py-1"
                    >
                      {c.comment ? 'Edit note' : 'Add note'}
                    </button>
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => removeCase(c.id)} className="icon-btn hover:text-red-500"><Trash2 size={13}/></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showAdd && (
        <AddCasesModal
          projectId={projectId}
          existingIds={run?.testCaseIds || []}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdd}
        />
      )}

      {commentOpenFor && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCommentOpenFor(null)}>
          <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200/70">
              <h3 className="font-semibold text-surface-900">Execution note</h3>
              <button onClick={() => setCommentOpenFor(null)} className="icon-btn"><X size={16}/></button>
            </div>
            <div className="p-5">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={5}
                className="input text-sm"
                placeholder="Describe the result, attach steps to reproduce, link logs, etc."
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-surface-200/70">
              <button onClick={() => setCommentOpenFor(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={async () => {
                  const c = cases.find((x) => x.id === commentOpenFor);
                  await setResult(commentOpenFor, c?.status || 'untested', commentText);
                  setCommentOpenFor(null);
                }}
                className="btn-primary"
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
