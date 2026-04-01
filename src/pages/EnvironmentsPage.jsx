import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Plus, Loader2, Trash2, Check, Settings, Edit2, X } from 'lucide-react';

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [variables, setVariables] = useState([{ key: '', value: '' }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/environments');
      setEnvs(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName('');
    setVariables([{ key: '', value: '' }]);
    setShowCreate(false);
    setEditingId(null);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.request('POST', '/environments', { name, variables: varsToObj(), isActive: envs.length === 0 });
      resetForm();
      load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEdit = (env) => {
    setEditingId(env.id);
    setName(env.name);
    setVariables(objToVars(env.variables));
    setShowCreate(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.request('PATCH', '/environments/' + editingId, { name, variables: varsToObj() });
      resetForm();
      load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this environment?')) return;
    try {
      await api.request('DELETE', '/environments/' + id);
      setEnvs((prev) => prev.filter((e) => e.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleActivate = async (id) => {
    try {
      await api.request('POST', '/environments/' + id + '/activate');
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Environments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage variables for different environments</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary"><Plus size={16} /> New Environment</button>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Environment' : 'New Environment'}</h2>
            <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Environment Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="E.g. Production, Staging, Dev" required autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Variables</label>
                  <button type="button" onClick={addVar} className="btn-ghost text-xs"><Plus size={12} /> Add Variable</button>
                </div>
                <div className="space-y-2">
                  {variables.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={v.key} onChange={(e) => updateVar(i, 'key', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="VARIABLE_NAME" />
                      <input value={v.value} onChange={(e) => updateVar(i, 'value', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="value" />
                      <button type="button" onClick={() => removeVar(i)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Use {'{{VARIABLE_NAME}}'} in your test URLs and headers to reference these values.</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 size={16} className="animate-spin" />} {editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
      ) : envs.length === 0 ? (
        <div className="text-center py-20">
          <Settings size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No environments yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create environments to switch between dev, staging, and production</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Environment</button>
        </div>
      ) : (
        <div className="space-y-4">
          {envs.map((env) => {
            const vars = typeof env.variables === 'string' ? JSON.parse(env.variables) : env.variables || {};
            const varEntries = Object.entries(vars);

            return (
              <div key={env.id} className={`card p-5 transition-all ${env.isActive ? 'border-green-300 bg-green-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{env.name}</h3>
                    {env.isActive ? (
                      <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><Check size={10} /> Active</span>
                    ) : (
                      <button onClick={() => handleActivate(env.id)} className="badge bg-gray-100 text-gray-500 hover:bg-brand-100 hover:text-brand-700 transition-colors cursor-pointer">Set Active</button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(env)} className="p-1.5 text-gray-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(env.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                {varEntries.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase">Variable</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {varEntries.map(([key, value]) => (
                          <tr key={key} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 font-mono text-xs text-gray-700">{key}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No variables defined</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
