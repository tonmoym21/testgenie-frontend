import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  ChevronRight, ChevronDown, Plus, Loader2, X, CheckCircle2, XCircle, Circle,
  MinusCircle, SkipForward, RotateCcw, Trash2, Search, Folder, FolderOpen,
  User, Clock, Edit2,
} from 'lucide-react';

const STATUS_META = {
  untested: { label: 'Untested', color: '#94a3b8', bg: 'bg-surface-100', text: 'text-surface-600', icon: Circle },
  passed:   { label: 'Passed',   color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  failed:   { label: 'Failed',   color: '#ef4444', bg: 'bg-red-50',     text: 'text-red-700',     icon: XCircle },
  blocked:  { label: 'Blocked',  color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',   icon: MinusCircle },
  skipped:  { label: 'Skipped',  color: '#64748b', bg: 'bg-surface-100',text: 'text-surface-600', icon: SkipForward },
  retest:   { label: 'Retest',   color: '#8b5cf6', bg: 'bg-violet-50',  text: 'text-violet-700',  icon: RotateCcw },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.untested;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

/** Parse test case markdown content into structured sections.
 *  Recognized:
 *    ## Description / ## Preconditions (free text)
 *    ## Steps — numbered steps with optional "   → Expected: ..." line
 */
function parseCaseContent(content) {
  if (!content || typeof content !== 'string') return { description: '', preconditions: '', steps: [] };
  const lines = content.split(/\r?\n/);
  let section = null;
  const buckets = { description: [], preconditions: [], steps: [] };
  const stepEntries = [];
  let currentStep = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const h = /^##\s+(.+)/.exec(line);
    if (h) {
      const title = h[1].trim().toLowerCase();
      if (title.startsWith('description')) section = 'description';
      else if (title.startsWith('precondition')) section = 'preconditions';
      else if (title.startsWith('step')) section = 'steps';
      else section = null;
      currentStep = null;
      continue;
    }
    if (!section) continue;
    if (section === 'steps') {
      const stepMatch = /^(\d+)\.\s+(.*)$/.exec(line);
      if (stepMatch) {
        if (currentStep) stepEntries.push(currentStep);
        currentStep = { index: stepEntries.length, step: stepMatch[2], result: '' };
        continue;
      }
      const expMatch = /^\s+(?:→\s*)?Expected:\s*(.*)$/i.exec(line);
      if (expMatch && currentStep) {
        currentStep.result = expMatch[1];
        continue;
      }
      if (currentStep && line.trim()) {
        currentStep.step += '\n' + line.trim();
      }
    } else {
      buckets[section].push(line);
    }
  }
  if (currentStep) stepEntries.push(currentStep);
  return {
    description: buckets.description.join('\n').trim(),
    preconditions: buckets.preconditions.join('\n').trim(),
    steps: stepEntries.length > 0 ? stepEntries : [],
  };
}

function ProgressBar({ progress, byStatus, total }) {
  const segs = ['passed', 'failed', 'blocked', 'skipped', 'retest'].map((k) => ({
    k, count: byStatus?.[k] || 0, color: STATUS_META[k].color,
  })).filter((s) => s.count > 0);
  return (
    <div className="w-full">
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-100">
        {segs.map((s) => (
          <div key={s.k} style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-surface-600">
        <span className="font-medium text-surface-900">{progress}% Completed</span>
        {['passed','failed','blocked','skipped','retest'].map((k) => {
          const c = byStatus?.[k] || 0;
          if (c === 0) return null;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return (
            <span key={k} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_META[k].color }} />
              {STATUS_META[k].label} {c} ({pct}%)
            </span>
          );
        })}
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

  const toggle = (id) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };
  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try { await onAdded(Array.from(selected)); onClose(); }
    finally { setSaving(false); }
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

function FolderTree({ folders, cases, selectedFolderId, onSelect }) {
  // Build tree: map of parent -> children; include counts.
  const byId = new Map(folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots = [];
  for (const f of byId.values()) {
    if (f.parentId && byId.has(f.parentId)) byId.get(f.parentId).children.push(f);
    else roots.push(f);
  }
  const countsByFolder = useMemo(() => {
    const m = new Map();
    for (const c of cases) {
      const k = c.folderId || 0;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [cases]);

  const [expanded, setExpanded] = useState(() => new Set(roots.map((r) => r.id)));
  const toggle = (id) => setExpanded((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  function FolderNode({ node, depth }) {
    const count = countsByFolder.get(node.id) || 0;
    const isOpen = expanded.has(node.id);
    const hasKids = node.children.length > 0;
    const active = selectedFolderId === node.id;
    return (
      <div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm cursor-pointer ${active ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-surface-700'}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => onSelect(node.id)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (hasKids) toggle(node.id); }}
            className={`w-4 h-4 flex items-center justify-center shrink-0 ${hasKids ? 'text-surface-500' : 'invisible'}`}
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {isOpen && hasKids ? <FolderOpen size={14} className="text-amber-500 shrink-0" /> : <Folder size={14} className="text-amber-500 shrink-0" />}
          <span className="truncate flex-1">{node.name}</span>
          <span className="text-xs text-surface-500 tabular-nums shrink-0">{count}</span>
        </div>
        {isOpen && hasKids && (
          <div>
            {node.children.map((c) => <FolderNode key={c.id} node={c} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }

  const allCount = cases.length;
  const uncategorizedCount = countsByFolder.get(0) || 0;

  return (
    <div className="p-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm cursor-pointer ${selectedFolderId === 'all' ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-surface-700'}`}
        onClick={() => onSelect('all')}
      >
        <Folder size={14} className="text-brand-500" />
        <span className="font-medium flex-1">All Test Cases</span>
        <span className="text-xs text-surface-500 tabular-nums">{allCount}</span>
      </div>
      {roots.map((r) => <FolderNode key={r.id} node={r} depth={0} />)}
      {uncategorizedCount > 0 && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm cursor-pointer mt-1 ${selectedFolderId === 'uncategorized' ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-surface-700'}`}
          onClick={() => onSelect('uncategorized')}
        >
          <Folder size={14} className="text-surface-400" />
          <span className="flex-1 italic">Uncategorized</span>
          <span className="text-xs text-surface-500 tabular-nums">{uncategorizedCount}</span>
        </div>
      )}
    </div>
  );
}

function StepActionButtons({ currentStatus, onSet, disabled }) {
  return (
    <div className="inline-flex items-center rounded-md border border-surface-200 overflow-hidden divide-x divide-surface-200">
      {[
        { k: 'passed', label: 'Pass', cls: 'text-emerald-700 hover:bg-emerald-50', activeCls: 'bg-emerald-50 text-emerald-700' },
        { k: 'failed', label: 'Fail', cls: 'text-red-700 hover:bg-red-50', activeCls: 'bg-red-50 text-red-700' },
        { k: 'skipped', label: 'Skip', cls: 'text-amber-700 hover:bg-amber-50', activeCls: 'bg-amber-50 text-amber-700' },
      ].map((b) => {
        const active = currentStatus === b.k;
        const Icon = STATUS_META[b.k].icon;
        return (
          <button
            key={b.k}
            disabled={disabled}
            onClick={() => onSet(b.k)}
            className={`px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1 ${active ? b.activeCls : b.cls} disabled:opacity-50`}
          >
            <Icon size={11} /> {b.label}
          </button>
        );
      })}
    </div>
  );
}

export default function TestRunDetailPage() {
  const { projectId, runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [cases, setCases] = useState([]);
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState({ total: 0, executed: 0, passRate: 0, progress: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [r, c, s, f] = await Promise.all([
        api.getTestRun(projectId, runId),
        api.getTestRunCases(projectId, runId),
        api.getTestRunStats(projectId, runId),
        api.getFolders(projectId).catch(() => ({ data: [] })),
      ]);
      setRun(r);
      setCases(c.data || []);
      setStats(s);
      setFolders((f?.data || f || []).map((x) => ({ ...x, parentId: x.parentId ?? x.parent_id })));
      // default selection
      if (!selectedCaseId && (c.data || []).length > 0) setSelectedCaseId((c.data || [])[0].id);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId, runId, selectedCaseId]);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [projectId, runId]);

  const visibleCases = useMemo(() => {
    if (selectedFolder === 'all') return cases;
    if (selectedFolder === 'uncategorized') return cases.filter((c) => !c.folderId);
    return cases.filter((c) => c.folderId === selectedFolder);
  }, [cases, selectedFolder]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || visibleCases[0] || null,
    [cases, selectedCaseId, visibleCases]
  );

  const parsed = useMemo(() => parseCaseContent(selectedCase?.content), [selectedCase]);

  const setCaseResult = async (caseId, status) => {
    setBusy(true);
    try {
      await api.setTestRunResult(projectId, runId, caseId, { status });
      await reload();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const setStepResult = async (caseId, stepIndex, status) => {
    setBusy(true);
    try {
      await api.setTestRunStepResult(projectId, runId, caseId, stepIndex, { status });
      await reload();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const removeCase = async (caseId) => {
    if (!confirm('Remove this test case from the run?')) return;
    try { await api.removeTestRunCase(projectId, runId, caseId); await reload(); }
    catch (err) { setError(err.message); }
  };

  const handleAdd = async (ids) => {
    await api.addTestRunCases(projectId, runId, ids);
    await reload();
  };

  if (loading) {
    return <div className="p-6 text-surface-500"><Loader2 className="inline animate-spin mr-2" size={14}/>Loading test run…</div>;
  }

  const runStatus = run?.state === 'completed' || run?.state === 'closed' ? 'passed' : 'untested';
  const runStatusLabel = run?.state === 'completed' ? 'Completed'
    : run?.state === 'closed' ? 'Closed'
    : run?.state === 'in_progress' ? 'In Progress' : 'New';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-50">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-surface-200/70 bg-white">
        <nav className="flex items-center gap-1.5 text-sm text-surface-500 mb-2">
          <Link to={`/projects/${projectId}/test-runs`} className="hover:text-brand-600">Test Runs</Link>
          <ChevronRight size={14} />
          <span className="text-surface-900 font-mono text-xs">TR-{run?.id}</span>
        </nav>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-surface-900 truncate">{run?.name}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-surface-600 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                run?.state === 'completed' || run?.state === 'closed' ? 'bg-emerald-50 text-emerald-700'
                : run?.state === 'in_progress' ? 'bg-brand-50 text-brand-700'
                : 'bg-surface-100 text-surface-700'
              }`}>
                <CheckCircle2 size={12} /> {runStatusLabel}
              </span>
              {(run?.assigneeName || run?.assigneeEmail) && (
                <span className="inline-flex items-center gap-1"><User size={13} /> {run.assigneeName || run.assigneeEmail}</span>
              )}
              {run?.createdAt && (
                <span className="inline-flex items-center gap-1"><Clock size={13} /> {new Date(run.createdAt).toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="btn-secondary btn-sm"><Plus size={14} /> Add Cases</button>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar progress={stats.progress} byStatus={stats.byStatus} total={stats.total} />
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-6 mt-3 bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-[240px_minmax(0,1fr)_420px] gap-0 h-[calc(100vh-200px)]">
        {/* Left — folder tree */}
        <aside className="bg-white border-r border-surface-200/70 overflow-y-auto">
          <div className="px-3 py-2 border-b border-surface-200/70 text-xs font-semibold uppercase tracking-wider text-surface-500">All Test Cases</div>
          <FolderTree folders={folders} cases={cases} selectedFolderId={selectedFolder} onSelect={setSelectedFolder} />
        </aside>

        {/* Middle — case list */}
        <section className="bg-white border-r border-surface-200/70 overflow-y-auto">
          <div className="px-4 py-2 border-b border-surface-200/70 flex items-center justify-between">
            <div className="text-sm font-medium text-surface-800">
              {selectedFolder === 'all' ? 'All' : selectedFolder === 'uncategorized' ? 'Uncategorized' : folders.find((f) => f.id === selectedFolder)?.name || 'Folder'}
              <span className="ml-2 text-xs text-surface-500">({visibleCases.length})</span>
            </div>
          </div>
          {visibleCases.length === 0 ? (
            <div className="p-8 text-center text-sm text-surface-500">
              No cases in this folder.
              <div className="mt-3"><button onClick={() => setShowAdd(true)} className="btn-primary btn-sm"><Plus size={14}/> Add Test Cases</button></div>
            </div>
          ) : (
            <ul>
              <li className="px-4 py-2 border-b border-surface-200/70 bg-surface-50 text-[11px] font-semibold uppercase tracking-wider text-surface-500 grid grid-cols-[32px_70px_1fr_80px] gap-2 items-center">
                <div />
                <div>ID</div>
                <div>Title</div>
                <div className="text-right">Status</div>
              </li>
              {visibleCases.map((c) => (
                <li
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`px-4 py-2.5 grid grid-cols-[32px_70px_1fr_80px] gap-2 items-center cursor-pointer border-b border-surface-100 text-sm ${selectedCaseId === c.id ? 'bg-brand-50/60' : 'hover:bg-surface-50'}`}
                >
                  <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                  <span className="font-mono text-xs text-surface-500">TC-{c.id}</span>
                  <span className="truncate text-surface-800">{c.title}</span>
                  <div className="flex justify-end"><StatusPill status={c.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right — details panel */}
        <aside className="bg-white overflow-y-auto">
          {!selectedCase ? (
            <div className="p-8 text-center text-sm text-surface-500">Select a test case to see details.</div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="px-5 py-3 border-b border-surface-200/70 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-surface-500">Test Case Details</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeCase(selectedCase.id)} className="icon-btn hover:text-red-500" title="Remove from run"><Trash2 size={14}/></button>
                  <button onClick={() => navigate(`/projects/${projectId}/test-cases?edit=${selectedCase.id}`)} className="icon-btn" title="Edit case"><Edit2 size={13}/></button>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-surface-500">TC-{selectedCase.id}</div>
                    <h2 className="text-base font-semibold text-surface-900 mt-0.5">{selectedCase.title}</h2>
                  </div>
                  <StatusPill status={selectedCase.status} />
                </div>

                {/* Per-case quick actions */}
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  <span className="text-xs text-surface-500 mr-1">Mark case:</span>
                  {['passed','failed','blocked','skipped','retest'].map((k) => {
                    const meta = STATUS_META[k]; const Icon = meta.icon;
                    const active = selectedCase.status === k;
                    return (
                      <button
                        key={k}
                        disabled={busy}
                        onClick={() => setCaseResult(selectedCase.id, k)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${active ? `${meta.bg} ${meta.text} border-current` : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'} disabled:opacity-50`}
                      >
                        <Icon size={10} /> {meta.label}
                      </button>
                    );
                  })}
                </div>

                {/* Description */}
                {parsed.description && (
                  <div className="mt-5">
                    <div className="text-xs font-semibold text-surface-700 mb-1">Description</div>
                    <p className="text-sm text-surface-700 whitespace-pre-line">{parsed.description}</p>
                  </div>
                )}

                {/* Preconditions */}
                {parsed.preconditions && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-surface-700 mb-1">Preconditions</div>
                    <p className="text-sm text-surface-700 whitespace-pre-line">{parsed.preconditions}</p>
                  </div>
                )}

                {/* Steps & Results */}
                <div className="mt-5">
                  <div className="text-xs font-semibold text-surface-700 mb-2">All Steps & Results:</div>
                  {parsed.steps.length === 0 ? (
                    <div className="text-sm text-surface-500 italic">No structured steps — use case-level actions above.</div>
                  ) : (
                    <ul className="space-y-3">
                      {parsed.steps.map((step, idx) => {
                        const stepRes = Array.isArray(selectedCase.stepResults) ? selectedCase.stepResults[idx] : null;
                        const stepStatus = stepRes?.status || 'untested';
                        return (
                          <li key={idx} className="border border-surface-200 rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-surface-800">Step {String(idx + 1).padStart(2, '0')}</div>
                              <StatusPill status={stepStatus} />
                            </div>
                            <div className="mt-1.5 text-sm text-surface-800 whitespace-pre-line">{step.step}</div>
                            {step.result && (
                              <div className="mt-2 text-sm">
                                <span className="text-xs font-semibold text-surface-700">Result:</span>
                                <div className="text-surface-700 whitespace-pre-line">{step.result}</div>
                              </div>
                            )}
                            <div className="mt-2">
                              <StepActionButtons
                                currentStatus={stepStatus}
                                disabled={busy}
                                onSet={(s) => setStepResult(selectedCase.id, idx, s)}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {selectedCase.jiraIssueKey && (
                  <div className="mt-5 text-xs text-brand-600">🔗 Linked to Jira: {selectedCase.jiraIssueKey}</div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {showAdd && (
        <AddCasesModal
          projectId={projectId}
          existingIds={run?.testCaseIds || []}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdd}
        />
      )}
    </div>
  );
}
