import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Globe2, Plus, Search, Trash2, Edit2, Check, X, Eye, EyeOff, Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';

function VariableRow({ variable, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(variable.value);
  const [description, setDescription] = useState(variable.description || '');
  const [isSecret, setIsSecret] = useState(variable.isSecret);
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(variable.id, { value, isSecret, description });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(variable.value);
    setDescription(variable.description || '');
    setIsSecret(variable.isSecret);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-brand-50/30 dark:bg-lime-500/5">
        <td className="px-4 py-3 font-mono text-sm font-medium text-purple-700 dark:text-purple-300">{variable.key}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type={isSecret ? 'password' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input py-1 text-sm font-mono flex-1"
              autoFocus
            />
            <button onClick={() => setIsSecret((s) => !s)} className="p-1.5 rounded text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-200" title={isSecret ? 'Make visible' : 'Make secret'}>
              {isSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </td>
        <td className="px-4 py-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input py-1 text-sm flex-1 w-full"
            placeholder="Description…"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button onClick={handleSave} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg dark:text-emerald-400 dark:hover:bg-emerald-500/10">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button onClick={handleCancel} className="p-1.5 text-surface-400 hover:bg-surface-100 rounded-lg dark:text-surface-500 dark:hover:bg-surface-800"><X size={14} /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-surface-50 hover:bg-surface-50/50 group dark:border-surface-800 dark:hover:bg-surface-800/40">
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-medium text-purple-700 dark:text-purple-300">{variable.key}</span>
        {variable.isSecret && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium uppercase dark:bg-amber-500/15 dark:text-amber-300">secret</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-surface-600 dark:text-surface-300 truncate max-w-xs">
            {variable.isSecret ? (showValue ? variable.value : '••••••••') : variable.value || <span className="text-surface-300 dark:text-surface-600 italic">empty</span>}
          </span>
          {variable.isSecret && (
            <button onClick={() => setShowValue((s) => !s)} className="p-1 text-surface-300 hover:text-surface-500 dark:text-surface-600 dark:hover:text-surface-300">
              {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-surface-400 dark:text-surface-500">{variable.description || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1.5 text-surface-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg dark:text-surface-600 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(variable.id, variable.key)} className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg dark:text-surface-600 dark:hover:text-red-300 dark:hover:bg-red-500/10"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function AddVariableForm({ onAdd, onCancel }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) { setError('Key is required'); return; }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) { setError('Key must be a valid identifier (letters, digits, underscores)'); return; }
    setSaving(true);
    try {
      await onAdd({ key: key.trim(), value, isSecret, description });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 mb-4 border-2 border-purple-200 bg-purple-50/20 dark:border-purple-400/30 dark:bg-purple-500/5">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs text-surface-500 dark:text-surface-400 mb-1 block">Key <span className="text-red-500 dark:text-red-400">*</span></label>
          <input value={key} onChange={(e) => { setKey(e.target.value); setError(''); }} className="input py-1.5 text-sm font-mono" placeholder="BASE_URL" autoFocus />
        </div>
        <div>
          <label className="text-xs text-surface-500 dark:text-surface-400 mb-1 block">Value</label>
          <div className="flex gap-1">
            <input type={isSecret ? 'password' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} className="input py-1.5 text-sm font-mono flex-1" placeholder="https://api.example.com" />
            <button type="button" onClick={() => setIsSecret((s) => !s)} className="px-2 py-1.5 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-600 text-xs dark:border-surface-700 dark:text-surface-500 dark:hover:text-surface-200">
              {isSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-surface-500 dark:text-surface-400 mb-1 block">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="input py-1.5 text-sm" placeholder="Optional note" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-300 mb-3">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving && <Loader2 size={14} className="animate-spin" />} Add
        </button>
      </div>
    </form>
  );
}

export default function GlobalsPage() {
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef(null);

  const load = async (q = '') => {
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const data = await api.request('GET', `/globals${params}`);
      setVariables(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // SSE connection for real-time workspace sync
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/globals/stream`;
    const es = new EventSource(url + (token ? `?token=${token}` : ''));

    es.addEventListener('connected', () => setSseConnected(true));
    es.addEventListener('upsert', (e) => {
      const updated = JSON.parse(e.data);
      setVariables((prev) => {
        const idx = prev.findIndex((v) => v.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev].sort((a, b) => a.key.localeCompare(b.key));
      });
    });
    es.addEventListener('delete', (e) => {
      const { id } = JSON.parse(e.data);
      setVariables((prev) => prev.filter((v) => v.id !== id));
    });
    es.onerror = () => setSseConnected(false);

    eventSourceRef.current = es;
    return () => es.close();
  }, []);

  useEffect(() => { load(search); }, [search]);

  const handleAdd = async (data) => {
    await api.request('POST', '/globals', data);
    setShowAdd(false);
    load(search);
  };

  const handleUpdate = async (id, data) => {
    await api.request('PUT', `/globals/${id}`, data);
    load(search);
  };

  const handleDelete = async (id, key) => {
    if (!confirm(`Delete global variable "${key}"?`)) return;
    await api.request('DELETE', `/globals/${id}`);
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  const filtered = search
    ? variables.filter((v) => v.key.toLowerCase().includes(search.toLowerCase()) || (v.description || '').toLowerCase().includes(search.toLowerCase()))
    : variables;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3 text-surface-900 dark:text-surface-50">
            <Globe2 className="text-purple-600 dark:text-purple-300" />
            Globals
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
            Workspace-shared. Use <code className="kbd">{'{{env:KEY}}'}</code> or <code className="kbd">{'{{KEY}}'}</code> in any request.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${sseConnected ? 'text-green-600 dark:text-emerald-400' : 'text-surface-400 dark:text-surface-500'}`}>
            {sseConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {sseConnected ? 'Live' : 'Offline'}
          </span>
          <button onClick={() => load(search)} className="btn-secondary"><RefreshCw size={16} /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Search by key or description…"
        />
      </div>

      {showAdd && <AddVariableForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-600 dark:text-lime-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Globe2 size={48} className="mx-auto text-surface-200 dark:text-surface-700 mb-4" />
          <h3 className="text-lg font-medium text-surface-500 dark:text-surface-300 mb-1">{search ? 'No matches' : 'No globals yet'}</h3>
          <p className="text-sm text-surface-400 dark:text-surface-500 mb-6">
            {search ? 'Try a different search term' : 'Add variables the whole team can use in tests'}
          </p>
          {!search && <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add</button>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50 dark:border-surface-800 dark:bg-surface-950/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide w-1/4">Key</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide w-1/3">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <VariableRow
                  key={v.id}
                  variable={v}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-surface-100 bg-surface-50/30 dark:border-surface-800 dark:bg-surface-950/30">
            <p className="text-xs text-surface-400 dark:text-surface-500"><span className="tabular-nums">{filtered.length}</span> variable{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
