import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

// Endpoint selection → collection_tests rows.
//
// User picks a target collection (existing or new) and optionally a bulk
// auth profile. We post to /api/sources/commit, which writes the existing
// test_definition JSONB shape so the existing executor and run reports
// pipeline work with no changes.

export default function CommitToCollectionModal({ endpointIds, endpoints, onClose, onCommitted }) {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Target collection
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [collectionId, setCollectionId] = useState('');
  const [newName, setNewName] = useState('Imported API');

  // Auth profile
  const [authType, setAuthType] = useState('none');
  const [tokenVar, setTokenVar] = useState('authToken');
  const [headerName, setHeaderName] = useState('X-API-Key');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { collectionId, created: [...] }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.request('GET', '/collections');
        if (cancelled) return;
        const items = d.data || [];
        setCollections(items);
        if (items.length) setCollectionId(items[0].id);
        else setMode('new');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load collections');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function buildAuthProfile() {
    if (authType === 'bearer') {
      return { type: 'bearer', tokenVar: tokenVar.trim() || 'authToken' };
    }
    if (authType === 'apiKey') {
      return { type: 'apiKey', headerName: headerName.trim() || 'X-API-Key', tokenVar: tokenVar.trim() || 'apiKey' };
    }
    return undefined;
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      let targetCollectionId = collectionId;

      // Create target collection on the fly if asked.
      if (mode === 'new') {
        const trimmed = newName.trim();
        if (!trimmed) { setError('Collection name is required'); setSubmitting(false); return; }
        const c = await api.request('POST', '/collections', { name: trimmed });
        targetCollectionId = c.id;
      }
      if (!targetCollectionId) {
        setError('Pick a collection');
        setSubmitting(false);
        return;
      }

      const r = await api.request('POST', '/sources/commit', {
        collectionId: Number(targetCollectionId),
        endpointIds,
        authProfile: buildAuthProfile(),
      });
      setDone(r);
    } catch (err) {
      setError(err.message || 'Commit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-xl shadow-soft-lg animate-slide-up flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">Add to Collection</h2>
            <p className="text-xs text-surface-500">
              {endpointIds.length} endpoint{endpointIds.length === 1 ? '' : 's'} will be turned into runnable tests.
            </p>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-1">
                {done.created.length} test{done.created.length === 1 ? '' : 's'} created
              </h3>
              <p className="text-sm text-surface-500 mb-5">Ready to run from the collection page.</p>
              <button
                className="btn-primary"
                onClick={() => { onCommitted(); navigate(`/collections/${done.collectionId}`); }}
              >
                Open collection
              </button>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-10 w-full rounded" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Target collection</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        className={`btn-sm ${mode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMode('existing')}
                        disabled={collections.length === 0}
                      >
                        Existing
                      </button>
                      <button
                        className={`btn-sm ${mode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMode('new')}
                      >
                        New
                      </button>
                    </div>
                    {mode === 'existing' ? (
                      <select
                        value={collectionId}
                        onChange={(e) => setCollectionId(e.target.value)}
                        className="input"
                      >
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Collection name"
                        className="input"
                      />
                    )}
                  </div>

                  <div>
                    <label className="label">Bulk auth (optional)</label>
                    <p className="text-xs text-surface-500 mb-2">
                      Apply the same auth to every imported test. Use an environment variable —
                      the actual secret is set per environment, never stored in the test definition.
                    </p>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value)}
                      className="input mb-2"
                    >
                      <option value="none">No auth</option>
                      <option value="bearer">Bearer token</option>
                      <option value="apiKey">API key (header)</option>
                    </select>
                    {authType === 'bearer' && (
                      <div className="space-y-2">
                        <div className="text-xs text-surface-500">
                          Header: <span className="font-mono">Authorization: Bearer &#123;&#123;{tokenVar || 'authToken'}&#125;&#125;</span>
                        </div>
                        <input
                          value={tokenVar}
                          onChange={(e) => setTokenVar(e.target.value)}
                          placeholder="Variable name (e.g. authToken)"
                          className="input"
                        />
                      </div>
                    )}
                    {authType === 'apiKey' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={headerName}
                          onChange={(e) => setHeaderName(e.target.value)}
                          placeholder="Header name (e.g. X-API-Key)"
                          className="input"
                        />
                        <input
                          value={tokenVar}
                          onChange={(e) => setTokenVar(e.target.value)}
                          placeholder="Variable (e.g. apiKey)"
                          className="input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Compact preview of what will be created */}
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Preview</div>
                    <div className="border border-surface-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                      {endpoints.slice(0, 10).map((e) => (
                        <div key={e.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                          <span className="font-mono text-surface-500 w-12">{e.method}</span>
                          <span className="font-mono text-surface-800 truncate flex-1">{e.path}</span>
                        </div>
                      ))}
                      {endpoints.length > 10 && (
                        <div className="px-3 py-1.5 text-xs text-surface-500">…and {endpoints.length - 10} more</div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} className="btn-primary" disabled={submitting || loading}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : `Create ${endpointIds.length} test${endpointIds.length === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
