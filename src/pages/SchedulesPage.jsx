import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Plus, Loader2, Trash2, Clock, Play, Pause, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const PRESETS = [
  { label: 'Every 5 min', cron: '*/5 * * * *' },
  { label: 'Every 30 min', cron: '*/30 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Daily 9am', cron: '0 9 * * *' },
  { label: 'Daily 6pm', cron: '0 18 * * *' },
  { label: 'Mon-Fri 9am', cron: '0 9 * * 1-5' },
];

const RESULT_ICON = {
  passed: <CheckCircle size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  error: <AlertTriangle size={14} className="text-amber-500" />,
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [cronExpr, setCronExpr] = useState('0 9 * * *');
  const [testUrl, setTestUrl] = useState('');
  const [testMethod, setTestMethod] = useState('GET');
  const [expectedStatus, setExpectedStatus] = useState('200');

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/schedules');
      setSchedules(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const testDef = {
        name: name || 'Scheduled API Test',
        type: 'api',
        config: {
          method: testMethod,
          url: testUrl,
          timeout: 10000,
          assertions: [{ target: 'status', operator: 'equals', expected: Number(expectedStatus) }],
        },
      };
      await api.request('POST', '/schedules', { testDefinition: testDef, cronExpression: cronExpr, name });
      setShowCreate(false);
      setName('');
      setTestUrl('');
      load();
    } catch (err) { alert(err.message || 'Failed to create schedule'); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id) => {
    try {
      await api.request('PATCH', '/schedules/' + id + '/toggle');
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api.request('DELETE', '/schedules/' + id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Scheduled Tests</h1>
          <p className="text-gray-500 text-sm mt-1">Automate test runs on a schedule</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Schedule</button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule a Test</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="E.g. Health Check - Production" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cron Schedule</label>
                <input value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} className="input font-mono text-sm mb-2" placeholder="*/5 * * * *" required />
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button key={p.cron} type="button" onClick={() => setCronExpr(p.cron)} className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${cronExpr === p.cron ? 'bg-brand-100 border-brand-300 text-brand-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <select value={testMethod} onChange={(e) => setTestMethod(e.target.value)} className="input py-1.5 text-sm w-28">
                  {['GET', 'POST', 'PUT', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} className="input py-1.5 text-sm flex-1" placeholder="https://api.example.com/health" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expected Status</label>
                <input value={expectedStatus} onChange={(e) => setExpectedStatus(e.target.value)} className="input py-1.5 text-sm w-24" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">{creating && <Loader2 size={16} className="animate-spin" />} Create Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No scheduled tests</h3>
          <p className="text-gray-400 text-sm mb-6">Set up automated test runs on a cron schedule</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Schedule</button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const def = typeof s.testDefinition === 'string' ? JSON.parse(s.testDefinition) : s.testDefinition;
            return (
              <div key={s.id} className={`card p-5 transition-all ${s.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggle(s.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${s.isActive ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                      {s.isActive ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{def?.name || 'Scheduled Test'}</span>
                        <span className={`badge text-[10px] ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.isActive ? 'Active' : 'Paused'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span className="font-mono">{s.cronExpression}</span>
                        <span>{def?.config?.method} {def?.config?.url}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.lastResult && (
                      <div className="flex items-center gap-1 text-xs">{RESULT_ICON[s.lastResult]}<span className="text-gray-500">Last: {s.lastResult}</span></div>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
