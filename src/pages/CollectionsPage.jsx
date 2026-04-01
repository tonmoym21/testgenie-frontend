import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, FolderOpen, Loader2, Trash2, Play, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/collections');
      setCollections(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.request('POST', '/collections', { name, description: desc || undefined });
      setShowCreate(false);
      setName('');
      setDesc('');
      load();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this collection and all its tests?')) return;
    try {
      await api.request('DELETE', '/collections/' + id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-gray-500 text-sm mt-1">Organize and run groups of tests</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Collection</button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Collection</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="E.g. Smoke Tests" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="input resize-none" rows={3} placeholder="What tests are in this collection?" />
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

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
      ) : collections.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No collections yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create a collection to organize your tests</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Collection</button>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <Link key={col.id} to={'/collections/' + col.id} className="card p-5 flex items-center justify-between hover:border-brand-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{col.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{col.testCount} test{col.testCount !== 1 ? 's' : ''}</span>
                    {col.description && <span className="text-xs text-gray-400 truncate max-w-xs">{col.description}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => handleDelete(e, col.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
