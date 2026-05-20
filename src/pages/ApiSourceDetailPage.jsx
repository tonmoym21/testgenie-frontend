import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CommitToCollectionModal from '../components/CommitToCollectionModal';
import { api } from '../services/api';
import {
  ArrowLeft, Search, X, ChevronDown, ChevronRight, Trash2, AlertCircle, Cable,
} from 'lucide-react';

// Browse + select + commit. The page owns:
//   - the catalog (loaded once per source)
//   - the filtered view (method/tag/search, all client-side)
//   - the selection set (Set<endpointId>, survives filter changes)
// On commit, we hand the selection + a target collection to the modal,
// which calls POST /api/sources/commit and the executor pipeline takes over.

const METHOD_BADGE = {
  GET: 'badge-info', POST: 'badge-success',
  PUT: 'badge-warn', PATCH: 'badge-warn',
  DELETE: 'badge-danger', HEAD: 'badge-muted', OPTIONS: 'badge-muted',
};

function methodClass(m) { return METHOD_BADGE[(m || '').toUpperCase()] || 'badge-muted'; }

function groupByTag(endpoints) {
  // Each endpoint can carry multiple tags; we put it under the first tag,
  // falling back to "Untagged" so nothing disappears.
  const groups = new Map();
  for (const ep of endpoints) {
    const tag = (Array.isArray(ep.tags) && ep.tags.length ? ep.tags[0] : 'Untagged');
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag).push(ep);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function ApiSourceDetailPage() {
  const { sourceId } = useParams();
  const [source, setSource] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [collapsed, setCollapsed] = useState(() => new Set()); // collapsed tag groups

  // Selection persists to sessionStorage so an accidental nav / refresh
  // doesn't nuke 20 minutes of curation. Keyed by sourceId so each source
  // has its own staged selection.
  const storageKey = `tf:sources:selected:${sourceId}`;
  const [selected, setSelected] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) return new Set(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set();
  });
  const [showCommit, setShowCommit] = useState(false);

  // Persist + before-unload guard for in-progress selections.
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(Array.from(selected))); }
    catch { /* quota / private mode — ignore */ }
  }, [selected, storageKey]);

  useEffect(() => {
    function onBeforeUnload(e) {
      if (selected.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [selected]);

  // Load once. Filtering is client-side — fast for the ~hundreds of
  // endpoints a typical spec carries. If the catalog grows past a few
  // thousand, swap to server-side filtering via the existing query params.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [src, eps] = await Promise.all([
          api.request('GET', `/sources/${sourceId}`),
          api.request('GET', `/sources/${sourceId}/endpoints`),
        ]);
        if (cancelled) return;
        setSource(src);
        setEndpoints(eps.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load source');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sourceId]);

  const allTags = useMemo(() => {
    const set = new Set();
    for (const ep of endpoints) (ep.tags || []).forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [endpoints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return endpoints.filter((ep) => {
      if (methodFilter !== 'ALL' && ep.method !== methodFilter) return false;
      if (tagFilter !== 'ALL' && !(ep.tags || []).includes(tagFilter)) return false;
      if (q) {
        const hay = `${ep.method} ${ep.path} ${ep.summary || ''} ${ep.operationId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [endpoints, search, methodFilter, tagFilter]);

  const grouped = useMemo(() => groupByTag(filtered), [filtered]);

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((ep) => next.add(ep.id));
      return next;
    });
  }
  function deselectAll() { setSelected(new Set()); }

  function selectGroup(tag) {
    const ids = grouped.find(([t]) => t === tag)?.[1] || [];
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((e) => next.has(e.id));
      if (allOn) ids.forEach((e) => next.delete(e.id));
      else       ids.forEach((e) => next.add(e.id));
      return next;
    });
  }

  function toggleCollapse(tag) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  return (
    <>
      <div className="page">
        <div className="mb-4">
          <Link to="/sources" className="text-sm text-surface-500 hover:text-surface-800 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Sources
          </Link>
        </div>

        <div className="page-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <Cable size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="page-title truncate">{source?.name || 'Loading…'}</h1>
              <p className="page-subtitle">
                {source ? (
                  <>
                    {source.format} · {source.endpointCount} endpoint{source.endpointCount === 1 ? '' : 's'}
                    {source.sourceUrl ? <> · <span className="font-mono text-xs">{source.sourceUrl}</span></> : null}
                  </>
                ) : ' '}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5" /> {error}
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search path, summary, operationId…"
              className="input pl-9"
            />
          </div>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="input input-sm w-auto">
            <option value="ALL">All methods</option>
            {['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="input input-sm w-auto">
            <option value="ALL">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={selectAllVisible} className="btn-ghost btn-sm">Select all visible</button>
          {selected.size > 0 && (
            <button onClick={deselectAll} className="btn-ghost btn-sm text-red-600">Clear ({selected.size})</button>
          )}
        </div>

        {loading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="card px-4 py-3 flex items-center gap-3">
                <div className="skeleton w-4 h-4 rounded" />
                <div className="skeleton w-14 h-5 rounded" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty">
            <h3 className="text-lg font-semibold text-surface-800 mb-1">
              {endpoints.length === 0 ? 'This source has no endpoints' : 'No endpoints match'}
            </h3>
            <p className="text-surface-500 text-sm">
              {endpoints.length === 0
                ? 'The spec parsed to zero operations. Try refreshing the source or check the spec for path/method entries.'
                : 'Try clearing the filters above.'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3 pb-24">
            {grouped.map(([tag, eps]) => {
              const isCollapsed = collapsed.has(tag);
              const groupAllSelected = eps.every((e) => selected.has(e.id));
              return (
                <div key={tag} className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-surface-50 border-b border-surface-200 flex items-center gap-3">
                    <button onClick={() => toggleCollapse(tag)} className="icon-btn">
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <input
                      type="checkbox"
                      checked={groupAllSelected}
                      ref={(el) => { if (el) el.indeterminate = !groupAllSelected && eps.some((e) => selected.has(e.id)); }}
                      onChange={() => selectGroup(tag)}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <div className="flex-1 font-medium text-sm text-surface-800">{tag}</div>
                    <span className="text-xs text-surface-500">{eps.length}</span>
                  </div>
                  {!isCollapsed && (
                    <div className="divide-y">
                      {eps.map((ep) => (
                        <label
                          key={ep.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(ep.id)}
                            onChange={() => toggleOne(ep.id)}
                            className="w-4 h-4 accent-brand-600"
                          />
                          <span className={`badge ${methodClass(ep.method)} w-14 justify-center text-xs`}>
                            {ep.method}
                          </span>
                          <span className="font-mono text-xs text-surface-800 truncate flex-1">{ep.path}</span>
                          {ep.summary && (
                            <span className="text-xs text-surface-500 truncate max-w-[40%]">{ep.summary}</span>
                          )}
                          {ep.stability === 'deprecated' && (
                            <span className="badge badge-warn text-[10px]">deprecated</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky selection footer — assembly tray entry point */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center px-4 pb-4">
            <div className="pointer-events-auto card shadow-soft-lg px-5 py-3 flex items-center gap-4 animate-slide-up">
              <span className="font-medium text-surface-800">
                {selected.size} endpoint{selected.size === 1 ? '' : 's'} selected
              </span>
              <button onClick={deselectAll} className="icon-btn" title="Clear selection" aria-label="Clear selection">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setShowCommit(true)} className="btn-primary">
                Add to Collection
              </button>
            </div>
          </div>
        )}
      </div>

      {showCommit && (
        <CommitToCollectionModal
          endpointIds={Array.from(selected)}
          endpoints={endpoints.filter((e) => selected.has(e.id))}
          onClose={() => setShowCommit(false)}
          onCommitted={() => {
            setShowCommit(false);
            setSelected(new Set());
            try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
          }}
        />
      )}
    </>
  );
}
