import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Plus, Loader2, Trash2, Check, Settings, Edit2, X, Eye, EyeOff } from 'lucide-react';

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [variables, setVariables] = useState([{ key: '', value: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revealIds, setRevealIds] = useState(new Set());

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/environments');
      setEnvs(data.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName(''); setVariables([{ key: '', value: '' }]);
    setShowCreate(false); setEditingId(null);
  };

  const addVar = () => setVariables([...variables, { key: '', value: '' }]);
  const removeVar = (i) => { if (variables.length > 1) setVariables(variables.filter((_, idx) => idx !== i)); };
  const updateVar = (i, field, val) => { const u = [...variables]; u[i] = { ...u[i], [field]: val }; setVariables(u); };

  const varsToObj = () => {
    const obj = {};
    variables.filter((v) => v.key).forEach((v) => { obj[v.key] = v.value; });
    return obj;
  };

  const objToVars = (obj) => {
    const entries = Object.entries(obj || {});
    return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.request('PATCH', '/environments/' + editingId, { name, variables: varsToObj() });
      } else {
        await api.request('POST', '/environments', { name, variables: varsToObj(), isActive: envs.length === 0 });
      }
      resetForm(); load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (env) => {
    setEditingId(env.id); setName(env.name);
    setVariables(objToVars(env.variables)); setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this environment?')) return;
    try {
      await api.request('DELETE', '/environments/' + id);
      setEnvs((prev) => prev.filter((e) => e.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleActivate = async (id) => {
    try { await api.request('POST', '/environments/' + id + '/activate'); load(); }
    catch (err) { setError(err.message); }
  };

  const toggleReveal = (id) => {
    const next = new Set(revealIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setRevealIds(next);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Environments</h1>
          <p className="page-subtitle">Variables per environment</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary">
          <Plus size={16} /> New environment
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start justify-between gap-3
                                     dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"><X size={16} /></button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={resetForm}>
          <div className="card p-6 w-full max-w-lg shadow-soft-lg max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                {editingId ? 'Edit environment' : 'New environment'}
              </h2>
              <button onClick={resetForm} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input"
                  placeholder="E.g. Production, Staging, Dev" required autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Variables</label>
                  <button type="button" onClick={addVar} className="btn-ghost btn-xs"><Plus size={12} /> Add</button>
                </div>
                <div className="space-y-2">
                  {variables.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={v.key} onChange={(e) => updateVar(i, 'key', e.target.value)}
                        className="input input-sm flex-1 font-mono" placeholder="VARIABLE_NAME" />
                      <input value={v.value} onChange={(e) => updateVar(i, 'value', e.target.value)}
                        className="input input-sm flex-1 font-mono" placeholder="value" />
                      <button type="button" onClick={() => removeVar(i)} disabled={variables.length === 1}
                        className="icon-btn hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30" aria-label="Remove variable">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">
                  Reference with <code className="kbd">{'{{VARIABLE_NAME}}'}</code> in URLs, headers, or body.
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1,2].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 w-32 mb-4" />
              <div className="skeleton h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!loading && envs.length === 0 && (
        <div className="empty">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 flex items-center justify-center mb-4">
            <Settings size={24} />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">No environments yet</h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm mb-6 max-w-xs">Define variables once, then switch contexts across dev, staging, and production.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New environment</button>
        </div>
      )}

      {!loading && envs.length > 0 && (
        <div className="space-y-4">
          {envs.map((env) => {
            const vars = typeof env.variables === 'string' ? JSON.parse(env.variables) : env.variables || {};
            const varEntries = Object.entries(vars);
            const revealed = revealIds.has(env.id);

            return (
              <div key={env.id} className={`card p-5 transition-all ${env.isActive ? 'ring-2 ring-emerald-500/30 border-emerald-200 bg-emerald-50/30 dark:ring-emerald-400/40 dark:border-emerald-400/30 dark:bg-emerald-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-surface-900 dark:text-surface-100">{env.name}</h3>
                    {env.isActive ? (
                      <span className="badge-success"><Check size={10} /> Active</span>
                    ) : (
                      <button onClick={() => handleActivate(env.id)} className="badge-muted hover:bg-brand-50 hover:text-brand-700 transition-colors
                                                                            dark:hover:bg-lime-500/10 dark:hover:text-lime-300">
                        Activate
                      </button>
                    )}
                    <span className="badge-muted"><span className="tabular-nums">{varEntries.length}</span> var{varEntries.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {varEntries.length > 0 && (
                      <button onClick={() => toggleReveal(env.id)} className="icon-btn" aria-label={revealed ? 'Hide values' : 'Reveal values'} title={revealed ? 'Hide values' : 'Reveal values'}>
                        {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                    <button onClick={() => handleEdit(env)} className="icon-btn" aria-label="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(env.id)} className="icon-btn hover:text-red-500 dark:hover:text-red-400" aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                {varEntries.length > 0 ? (
                  <div className="bg-surface-50 dark:bg-surface-950/60 rounded-lg overflow-hidden ring-1 ring-surface-200/60 dark:ring-surface-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                          <th className="text-left px-3 py-2 text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Variable</th>
                          <th className="text-left px-3 py-2 text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {varEntries.map(([key, value]) => (
                          <tr key={key} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                            <td className="px-3 py-2 font-mono text-xs text-surface-800 dark:text-surface-200">{key}</td>
                            <td className="px-3 py-2 font-mono text-xs text-surface-600 dark:text-surface-300">
                              {revealed ? value : '•'.repeat(Math.min(String(value).length, 14))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-surface-400 dark:text-surface-500">No variables defined yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
