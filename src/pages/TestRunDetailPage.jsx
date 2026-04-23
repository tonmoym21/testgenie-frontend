import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  ChevronRight, ChevronDown, Plus, Loader2, X, CheckCircle2, XCircle, Circle,
  MinusCircle, SkipForward, RotateCcw, Trash2, Search, Folder, FolderOpen,
  User, Clock, Edit2, MoreVertical, MessageSquarePlus, ChevronLeft,
  ArrowUpDown, FileText, ExternalLink, Copy,
} from 'lucide-react';

const STATUS_META = {
  untested: { label: 'Untested', color: '#94a3b8', bg: 'bg-surface-100', text: 'text-surface-600', icon: Circle },
  passed:   { label: 'Passed',   color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  failed:   { label: 'Failed',   color: '#ef4444', bg: 'bg-red-50',     text: 'text-red-700',     icon: XCircle },
  blocked:  { label: 'Blocked',  color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',   icon: MinusCircle },
  skipped:  { label: 'Skipped',  color: '#64748b', bg: 'bg-surface-100',text: 'text-surface-600', icon: SkipForward },
  retest:   { label: 'Retest',   color: '#8b5cf6', bg: 'bg-violet-50',  text: 'text-violet-700',  icon: RotateCcw },
};

const EXECUTED_STATUSES = new Set(['passed', 'failed', 'blocked', 'skipped', 'retest']);

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.untested;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

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

function useClickOutside(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
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

function EditRunModal({ run, onClose, onSave }) {
  const [name, setName] = useState(run?.name || '');
  const [description, setDescription] = useState(run?.description || '');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ name, description }); onClose(); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/70">
          <h2 className="text-lg font-semibold text-surface-900">Edit test run</h2>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Description</label>
            <textarea value={description || ''} onChange={(e) => setDescription(e.target.value)} rows={4} className="input text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-surface-200/70">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ExecutionLogModal({ projectId, runId, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTestRunExecutionLog(projectId, runId);
        setEntries(res.data || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, [projectId, runId]);
  return (
    <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/70">
          <h2 className="text-lg font-semibold text-surface-900">Execution log</h2>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-surface-500"><Loader2 className="inline animate-spin mr-2" size={14}/>Loading…</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-surface-500">No step executions recorded yet.</div>
          ) : (
            <ul className="divide-y divide-surface-200/70">
              {entries.map((e, i) => (
                <li key={i} className="px-6 py-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-surface-500">TC-{e.caseId}</span>
                    <span className="text-surface-800 truncate">{e.caseTitle}</span>
                    <span className="text-xs text-surface-500">Step {e.stepIndex + 1}</span>
                    <StatusPill status={e.status} />
                    {e.updatedAt && <span className="ml-auto text-xs text-surface-500">{new Date(e.updatedAt).toLocaleString()}</span>}
                  </div>
                  {e.note && <div className="mt-1 text-xs text-surface-600 italic">"{e.note}"</div>}
                  {e.updatedBy && <div className="mt-0.5 text-[11px] text-surface-500">by {e.updatedBy}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderTree({ folders, cases, selectedFolderId, onSelect }) {
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
      const entry = m.get(k) || { total: 0, executed: 0 };
      entry.total += 1;
      if (EXECUTED_STATUSES.has(c.status)) entry.executed += 1;
      m.set(k, entry);
    }
    return m;
  }, [cases]);

  const [expanded, setExpanded] = useState(() => new Set(roots.map((r) => r.id)));
  const toggle = (id) => setExpanded((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  function CountLabel({ id }) {
    const entry = countsByFolder.get(id) || { total: 0, executed: 0 };
    return <span className="text-xs text-surface-500 tabular-nums shrink-0">{entry.executed}({entry.total})</span>;
  }

  function FolderNode({ node, depth }) {
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
          <CountLabel id={node.id} />
        </div>
        {isOpen && hasKids && (
          <div>
            {node.children.map((c) => <FolderNode key={c.id} node={c} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }

  const allTotal = cases.length;
  const allExecuted = cases.filter((c) => EXECUTED_STATUSES.has(c.status)).length;
  const uncat = countsByFolder.get(0);

  return (
    <div className="p-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm cursor-pointer ${selectedFolderId === 'all' ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-surface-700'}`}
        onClick={() => onSelect('all')}
      >
        <Folder size={14} className="text-brand-500" />
        <span className="font-medium flex-1">All Test Cases</span>
        <span className="text-xs text-surface-500 tabular-nums">{allExecuted}({allTotal})</span>
      </div>
      {roots.map((r) => <FolderNode key={r.id} node={r} depth={0} />)}
      {uncat && uncat.total > 0 && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm cursor-pointer mt-1 ${selectedFolderId === 'uncategorized' ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-surface-700'}`}
          onClick={() => onSelect('uncategorized')}
        >
          <Folder size={14} className="text-surface-400" />
          <span className="flex-1 italic">Uncategorized</span>
          <span className="text-xs text-surface-500 tabular-nums">{uncat.executed}({uncat.total})</span>
        </div>
      )}
    </div>
  );
}

function StepActionButtons({ currentStatus, onSet, disabled, onAddNote }) {
  return (
    <div className="inline-flex items-center gap-1">
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
      <button
        onClick={onAddNote}
        className="px-2 py-1 text-xs font-medium inline-flex items-center gap-1 rounded-md border border-surface-200 text-surface-600 hover:bg-surface-50"
      >
        <MessageSquarePlus size={11} /> Add notes
      </button>
    </div>
  );
}

function CaseRowMenu({ caseItem, onMark, onReset, onEdit, onRemove, onCopyId }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="icon-btn p-1"
        title="More"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-md shadow-soft-lg min-w-[180px] py-1 text-sm">
          {['passed','failed','blocked','skipped','retest'].map((k) => (
            <button
              key={k}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onMark(k); }}
              className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2"
            >
              {(() => { const I = STATUS_META[k].icon; return <I size={12} style={{ color: STATUS_META[k].color }} />; })()}
              Mark as {STATUS_META[k].label}
            </button>
          ))}
          <div className="my-1 border-t border-surface-200/70" />
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onReset(); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
            <RotateCcw size={12} /> Reset to Untested
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
            <Edit2 size={12} /> Edit test case
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onCopyId(); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
            <Copy size={12} /> Copy case ID
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onRemove(); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2">
            <Trash2 size={12} /> Remove from run
          </button>
        </div>
      )}
    </div>
  );
}

function RunHeaderMenu({ onEditRun, onSetState, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="icon-btn" title="More actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-md shadow-soft-lg min-w-[200px] py-1 text-sm">
          <button onClick={() => { setOpen(false); onEditRun(); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
            <Edit2 size={12} /> Edit run
          </button>
          <div className="my-1 border-t border-surface-200/70" />
          <button onClick={() => { setOpen(false); onSetState('in_progress'); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50">Mark run as In Progress</button>
          <button onClick={() => { setOpen(false); onSetState('completed'); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50">Mark run as Completed</button>
          <button onClick={() => { setOpen(false); onSetState('closed'); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-50">Mark run as Closed</button>
          <div className="my-1 border-t border-surface-200/70" />
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2">
            <Trash2 size={12} /> Delete run
          </button>
        </div>
      )}
    </div>
  );
}

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const options = [
    { k: 'custom', label: 'Custom' },
    { k: 'name_asc', label: 'Name (A-Z)' },
    { k: 'name_desc', label: 'Name (Z-A)' },
    { k: 'id_asc', label: 'ID ascending' },
    { k: 'id_desc', label: 'ID descending' },
  ];
  const current = options.find((o) => o.k === value) || options[0];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs text-surface-600 hover:text-surface-900 px-2 py-1 rounded-md hover:bg-surface-50">
        <ArrowUpDown size={12} /> Sort by: {current.label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-md shadow-soft-lg min-w-[160px] py-1 text-sm">
          {options.map((o) => (
            <button
              key={o.k}
              onClick={() => { onChange(o.k); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-surface-50 ${value === o.k ? 'text-brand-700 font-medium' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
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
  const [showEditRun, setShowEditRun] = useState(false);
  const [showExecLog, setShowExecLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [sortBy, setSortBy] = useState('custom');
  const [openNotes, setOpenNotes] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});
  const [selectedCaseIds, setSelectedCaseIds] = useState(() => new Set());
  const [members, setMembers] = useState([]);
  const [bulkMenu, setBulkMenu] = useState(null); // 'status' | 'assign' | null
  const bulkMenuRef = useRef(null);

  useEffect(() => {
    api.listAssignableMembers().then((r) => setMembers(r?.members || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target)) setBulkMenu(null); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
      if (!selectedCaseId && (c.data || []).length > 0) setSelectedCaseId((c.data || [])[0].id);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId, runId, selectedCaseId]);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [projectId, runId]);

  const folderFiltered = useMemo(() => {
    if (selectedFolder === 'all') return cases;
    if (selectedFolder === 'uncategorized') return cases.filter((c) => !c.folderId);
    return cases.filter((c) => c.folderId === selectedFolder);
  }, [cases, selectedFolder]);

  const visibleCases = useMemo(() => {
    const arr = [...folderFiltered];
    switch (sortBy) {
      case 'name_asc': arr.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'name_desc': arr.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
      case 'id_asc': arr.sort((a, b) => a.id - b.id); break;
      case 'id_desc': arr.sort((a, b) => b.id - a.id); break;
      default: break;
    }
    return arr;
  }, [folderFiltered, sortBy]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || visibleCases[0] || null,
    [cases, selectedCaseId, visibleCases]
  );

  const parsed = useMemo(() => parseCaseContent(selectedCase?.content), [selectedCase]);

  const currentVisibleIndex = useMemo(() => {
    if (!selectedCase) return -1;
    return visibleCases.findIndex((c) => c.id === selectedCase.id);
  }, [visibleCases, selectedCase]);

  const setCaseResult = async (caseId, status) => {
    setBusy(true);
    try {
      await api.setTestRunResult(projectId, runId, caseId, { status });
      await reload();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const resetCase = async (caseId) => {
    setBusy(true);
    try { await api.resetTestRunCase(projectId, runId, caseId); await reload(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const setStepResult = async (caseId, stepIndex, status) => {
    setBusy(true);
    try {
      await api.setTestRunStepResult(projectId, runId, caseId, stepIndex, { status });
      await reload();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[TestRunDetail] setStepResult failed', { caseId, stepIndex, status, err });
      setError(`Failed to update step ${stepIndex + 1}: ${err.message}`);
    }
    finally { setBusy(false); }
  };

  const saveStepNote = async (caseId, stepIndex, note) => {
    setBusy(true);
    try {
      await api.setTestRunStepNote(projectId, runId, caseId, stepIndex, { note });
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

  const copyCaseId = (caseId) => {
    try {
      navigator.clipboard?.writeText(`TC-${caseId}`);
    } catch { /* ignore */ }
  };

  const handleUpdateRun = async (patch) => {
    const updated = await api.updateTestRun(projectId, runId, patch);
    setRun(updated);
  };

  const handleSetRunState = async (state) => {
    try { await handleUpdateRun({ state }); await reload(); }
    catch (err) { setError(err.message); }
  };

  const handleDeleteRun = async () => {
    if (!confirm('Delete this test run? This cannot be undone.')) return;
    try {
      await api.deleteTestRun(projectId, runId);
      navigate(`/projects/${projectId}/test-runs`);
    } catch (err) { setError(err.message); }
  };

  const toggleSelectCase = (id) => {
    setSelectedCaseIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedCaseIds((prev) => {
      const ids = visibleCases.map((c) => c.id);
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      const n = new Set(prev);
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };
  const clearBulkSelection = () => setSelectedCaseIds(new Set());

  const bulkSetStatus = async (status) => {
    setBusy(true);
    try {
      for (const id of selectedCaseIds) {
        await api.setTestRunResult(projectId, runId, id, { status });
      }
      await reload();
      clearBulkSelection();
      setBulkMenu(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const bulkAssign = async (userId) => {
    setBusy(true);
    try {
      for (const id of selectedCaseIds) {
        await api.setTestRunCaseAssignee(projectId, runId, id, userId);
      }
      await reload();
      clearBulkSelection();
      setBulkMenu(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const bulkRemove = async () => {
    if (!confirm(`Remove ${selectedCaseIds.size} case(s) from run?`)) return;
    setBusy(true);
    try {
      for (const id of selectedCaseIds) {
        await api.removeTestRunCase(projectId, runId, id);
      }
      await reload();
      clearBulkSelection();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const goToAdjacent = (delta) => {
    const nextIdx = currentVisibleIndex + delta;
    if (nextIdx < 0 || nextIdx >= visibleCases.length) return;
    setSelectedCaseId(visibleCases[nextIdx].id);
  };

  if (loading) {
    return <div className="p-6 text-surface-500"><Loader2 className="inline animate-spin mr-2" size={14}/>Loading test run…</div>;
  }

  const runStatusLabel = run?.state === 'completed' ? 'Completed'
    : run?.state === 'closed' ? 'Closed'
    : run?.state === 'in_progress' ? 'In Progress' : 'New';

  const jiraUrl = selectedCase?.jiraIssueUrl || (selectedCase?.jiraIssueKey && run?.jiraBaseUrl
    ? `${run.jiraBaseUrl.replace(/\/+$/, '')}/browse/${selectedCase.jiraIssueKey}`
    : null);

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
            {run?.description && (
              <p className="mt-1 text-sm text-surface-600 whitespace-pre-line">{run.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-surface-600 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                run?.state === 'completed' || run?.state === 'closed' ? 'bg-emerald-50 text-emerald-700'
                : run?.state === 'in_progress' ? 'bg-brand-50 text-brand-700'
                : 'bg-surface-100 text-surface-700'
              }`}>
                <CheckCircle2 size={12} /> {runStatusLabel}
              </span>
              {(run?.assigneeName || run?.assigneeEmail) && (
                <span className="inline-flex items-center gap-1" title={run.assigneeEmail || ''}><User size={13} /> {run.assigneeName || run.assigneeEmail}</span>
              )}
              {run?.createdAt && (
                <span className="inline-flex items-center gap-1"><Clock size={13} /> {new Date(run.createdAt).toLocaleString()}</span>
              )}
              <button onClick={() => setShowExecLog(true)} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline">
                <FileText size={13} /> View execution log
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="btn-secondary btn-sm"><Plus size={14} /> Add Cases</button>
            <RunHeaderMenu
              onEditRun={() => setShowEditRun(true)}
              onSetState={handleSetRunState}
              onDelete={handleDeleteRun}
            />
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
      <div className="grid grid-cols-[240px_minmax(0,1fr)_440px] gap-0 h-[calc(100vh-200px)]">
        {/* Left — folder tree */}
        <aside className="bg-white border-r border-surface-200/70 overflow-y-auto flex flex-col">
          <div className="px-3 py-2 border-b border-surface-200/70 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-surface-500">All Test Cases</div>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
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
          {selectedCaseIds.size > 0 && (
            <div className="sticky top-0 z-10 bg-brand-50 border-b border-brand-200 px-4 py-2 flex items-center gap-2 flex-wrap" ref={bulkMenuRef}>
              <span className="text-sm font-medium text-brand-800">{selectedCaseIds.size} selected</span>
              <div className="relative">
                <button className="btn-secondary btn-sm" onClick={() => setBulkMenu((m) => m === 'status' ? null : 'status')}>
                  Add Result <ChevronDown size={12} />
                </button>
                {bulkMenu === 'status' && (
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-md shadow-soft-lg min-w-[160px] py-1 text-sm">
                    {['passed','failed','blocked','skipped','retest'].map((k) => (
                      <button key={k} onClick={() => bulkSetStatus(k)} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
                        {(() => { const I = STATUS_META[k].icon; return <I size={12} style={{ color: STATUS_META[k].color }} />; })()}
                        {STATUS_META[k].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button className="btn-secondary btn-sm" onClick={() => setBulkMenu((m) => m === 'assign' ? null : 'assign')}>
                  Assign to <ChevronDown size={12} />
                </button>
                {bulkMenu === 'assign' && (
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-md shadow-soft-lg min-w-[220px] max-h-[260px] overflow-y-auto py-1 text-sm">
                    <button onClick={() => bulkAssign(null)} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 text-surface-500 italic">Unassign</button>
                    {members.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-surface-500">No team members</div>
                    ) : members.map((m) => (
                      <button key={m.id} onClick={() => bulkAssign(m.id)} className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2">
                        <User size={11} /> {m.displayName || m.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={bulkRemove} className="btn-secondary btn-sm text-red-600 hover:bg-red-50 border-red-200">
                <Trash2 size={12} /> Remove from Run
              </button>
              <button onClick={clearBulkSelection} className="text-xs text-surface-600 hover:text-surface-900 ml-auto">Clear</button>
            </div>
          )}
          {visibleCases.length === 0 ? (
            <div className="p-8 text-center text-sm text-surface-500">
              No cases in this folder.
              <div className="mt-3"><button onClick={() => setShowAdd(true)} className="btn-primary btn-sm"><Plus size={14}/> Add Test Cases</button></div>
            </div>
          ) : (
            <ul>
              <li className="px-4 py-2 border-b border-surface-200/70 bg-surface-50 text-[11px] font-semibold uppercase tracking-wider text-surface-500 grid grid-cols-[32px_70px_1fr_90px_32px] gap-2 items-center">
                <input
                  type="checkbox"
                  checked={visibleCases.length > 0 && visibleCases.every((c) => selectedCaseIds.has(c.id))}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible"
                />
                <div>ID</div>
                <div>Title</div>
                <div className="text-right">Status</div>
                <div />
              </li>
              {visibleCases.map((c) => (
                <li
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`px-4 py-2.5 grid grid-cols-[32px_70px_1fr_90px_32px] gap-2 items-center cursor-pointer border-b border-surface-100 text-sm ${selectedCaseId === c.id ? 'bg-brand-50/60' : 'hover:bg-surface-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCaseIds.has(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelectCase(c.id)}
                    aria-label={`Select ${c.title}`}
                  />
                  <span className="font-mono text-xs text-surface-500">TC-{c.id}</span>
                  <span className="truncate text-surface-800">{c.title}</span>
                  <div className="flex justify-end"><StatusPill status={c.status} /></div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <CaseRowMenu
                      caseItem={c}
                      onMark={(status) => setCaseResult(c.id, status)}
                      onReset={() => resetCase(c.id)}
                      onEdit={() => navigate(`/projects/${projectId}/test-cases?edit=${c.id}`)}
                      onRemove={() => removeCase(c.id)}
                      onCopyId={() => copyCaseId(c.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right — details panel */}
        <aside className="bg-white overflow-y-auto flex flex-col">
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

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-surface-500">TC-{selectedCase.id}</div>
                    <h2 className="text-base font-semibold text-surface-900 mt-0.5">{selectedCase.title}</h2>
                  </div>
                  <StatusPill status={selectedCase.status} />
                </div>

                {/* Meta: assignee, created, priority */}
                <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-surface-500">
                  {selectedCase.executedByName || selectedCase.executedByEmail ? (
                    <span
                      className="inline-flex items-center gap-1"
                      title={`Executed by ${selectedCase.executedByName || ''} ${selectedCase.executedByEmail ? `(${selectedCase.executedByEmail})` : ''}`.trim()}
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-semibold">
                        {((selectedCase.executedByName || selectedCase.executedByEmail || '?').trim().charAt(0) || '?').toUpperCase()}
                      </span>
                      {selectedCase.executedByName || selectedCase.executedByEmail}
                    </span>
                  ) : null}
                  {selectedCase.executedAt && (
                    <span className="inline-flex items-center gap-1"><Clock size={11}/> {new Date(selectedCase.executedAt).toLocaleString()}</span>
                  )}
                  {selectedCase.priority && (
                    <span className="capitalize px-1.5 py-0.5 rounded bg-surface-100">{selectedCase.priority}</span>
                  )}
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
                  <button
                    disabled={busy}
                    onClick={() => resetCase(selectedCase.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border bg-white text-surface-600 border-surface-200 hover:bg-surface-50 disabled:opacity-50"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>

                {parsed.description && (
                  <div className="mt-5">
                    <div className="text-xs font-semibold text-surface-700 mb-1">Description</div>
                    <p className="text-sm text-surface-700 whitespace-pre-line">{parsed.description}</p>
                  </div>
                )}

                {parsed.preconditions && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-surface-700 mb-1">Preconditions</div>
                    <p className="text-sm text-surface-700 whitespace-pre-line">{parsed.preconditions}</p>
                  </div>
                )}

                <div className="mt-5">
                  <div className="text-xs font-semibold text-surface-700 mb-2">All Steps & Results:</div>
                  {parsed.steps.length === 0 ? (
                    <div className="text-sm text-surface-500 italic">No structured steps — use case-level actions above.</div>
                  ) : (
                    <ul className="space-y-3">
                      {parsed.steps.map((step, idx) => {
                        const stepRes = Array.isArray(selectedCase.stepResults) ? selectedCase.stepResults[idx] : null;
                        const stepStatus = stepRes?.status || 'untested';
                        const existingNote = stepRes?.note || stepRes?.notes || '';
                        const noteKey = `${selectedCase.id}:${idx}`;
                        const isNoteOpen = !!openNotes[noteKey];
                        const draft = noteDrafts[noteKey] !== undefined ? noteDrafts[noteKey] : existingNote;
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
                            {existingNote && !isNoteOpen && (
                              <div className="mt-2 text-xs text-surface-600 bg-surface-50 border border-surface-200 rounded px-2 py-1.5 italic">
                                Note: {existingNote}
                              </div>
                            )}
                            <div className="mt-2">
                              <StepActionButtons
                                currentStatus={stepStatus}
                                disabled={busy}
                                onSet={(s) => setStepResult(selectedCase.id, idx, s)}
                                onAddNote={() => setOpenNotes((o) => ({ ...o, [noteKey]: !o[noteKey] }))}
                              />
                            </div>
                            {isNoteOpen && (
                              <div className="mt-2">
                                <textarea
                                  value={draft}
                                  onChange={(e) => setNoteDrafts((d) => ({ ...d, [noteKey]: e.target.value }))}
                                  rows={2}
                                  placeholder="Add a note for this step"
                                  className="input text-xs py-1.5"
                                />
                                <div className="mt-1 flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => {
                                      setOpenNotes((o) => ({ ...o, [noteKey]: false }));
                                      setNoteDrafts((d) => { const n = { ...d }; delete n[noteKey]; return n; });
                                    }}
                                    className="btn-secondary btn-sm"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={async () => {
                                      await saveStepNote(selectedCase.id, idx, draft || '');
                                      setOpenNotes((o) => ({ ...o, [noteKey]: false }));
                                    }}
                                    className="btn-primary btn-sm"
                                  >
                                    Save note
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {selectedCase.jiraIssueKey && (
                  <div className="mt-5 text-xs">
                    {jiraUrl ? (
                      <a href={jiraUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline">
                        <ExternalLink size={12} /> Linked to Jira: {selectedCase.jiraIssueKey}
                      </a>
                    ) : (
                      <span className="text-brand-600">Linked to Jira: {selectedCase.jiraIssueKey}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Previous / Next navigation footer */}
              <div className="border-t border-surface-200/70 px-5 py-2.5 flex items-center justify-between bg-surface-50">
                <button
                  onClick={() => goToAdjacent(-1)}
                  disabled={currentVisibleIndex <= 0}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <div className="text-xs text-surface-500">
                  {currentVisibleIndex >= 0 ? `${currentVisibleIndex + 1} of ${visibleCases.length}` : ''}
                </div>
                <button
                  onClick={() => goToAdjacent(1)}
                  disabled={currentVisibleIndex < 0 || currentVisibleIndex >= visibleCases.length - 1}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
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
      {showEditRun && (
        <EditRunModal
          run={run}
          onClose={() => setShowEditRun(false)}
          onSave={handleUpdateRun}
        />
      )}
      {showExecLog && (
        <ExecutionLogModal projectId={projectId} runId={runId} onClose={() => setShowExecLog(false)} />
      )}
    </div>
  );
}
