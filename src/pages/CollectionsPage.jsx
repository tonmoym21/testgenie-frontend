import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Library, Loader2, Trash2, ChevronRight, X } from 'lucide-react';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/collections');
      setCollections(data.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.request('POST', '/collections', { name, description: desc || undefined });
      setShowCreate(false); setName(''); setDesc(''); load();
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this collection and all its tests?')) return;
    try {
      await api.request('DELETE', '/collections/' + id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-subtitle">Group tests into suites you can execute together.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New collection</button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={16} /></button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md shadow-soft-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">New collection</h2>
                <p className="text-sm text-surface-500 mt-0.5">Bundle related tests for easy reruns.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="E.g. Smoke tests" required autoFocus />
              </div>
              <div>
                <label className="label">Description <span className="text-surface-400 font-normal">(optional)</span></label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="input resize-none" rows={3} placeholder="What's in this collection?" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating && <Loader2 size={16} className="animate-spin" />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <div className="skeleton w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/5" /><div className="skeleton h-3 w-3/5" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && collections.length === 0 && (
        <div className="empty">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Library size={24} />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 mb-1">No collections yet</h3>
          <p className="text-surface-500 text-sm mb-6 max-w-xs">Create a collection to execute a group of tests together.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New collection</button>
        </div>
      )}

      {!loading && collections.length > 0 && (
        <div className="card divide-y divide-surface-100 overflow-hidden">
          {collections.map((col) => (
            <Link key={col.id} to={'/collections/' + col.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-brand-600 text-white flex items-center justify-center shrink-0">
                <Library size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-surface-900 truncate">{col.name}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-surface-500">
                  <span className="badge-muted">{col.testCount} test{col.testCount !== 1 ? 's' : ''}</span>
                  {col.description && <span className="truncate">{col.description}</span>}
                </div>
              </div>
              <button onClick={(e) => handleDelete(e, col.id)} className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500" aria-label="Delete"><Trash2 size={15} /></button>
              <ChevronRight size={16} className="text-surface-300 group-hover:text-brand-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
