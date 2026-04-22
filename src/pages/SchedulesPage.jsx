import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { 
  Plus, Loader2, Trash2, Calendar, Play, Pause, Clock, CheckCircle, 
  XCircle, Edit2, X, Folder, Globe, Mail, ChevronDown, RefreshCw
} from 'lucide-react';

const CRON_PRESETS = [
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Weekly on Monday', value: '0 9 * * 1' },
  { label: 'Custom', value: 'custom' },
];

function ScheduleModal({ schedule, collections, environments, onSave, onCancel }) {
  const [name, setName] = useState(schedule?.name || '');
  const [scheduleType, setScheduleType] = useState(schedule?.scheduleType || 'collection');
  const [collectionId, setCollectionId] = useState(schedule?.collectionId || '');
  const [folderId, setFolderId] = useState(schedule?.folderId || '');
  const [environmentId, setEnvironmentId] = useState(schedule?.environmentId || '');
  const [cronPreset, setCronPreset] = useState('custom');
  const [cronExpression, setCronExpression] = useState(schedule?.cronExpression || '0 9 * * *');
  const [notifyOnFailure, setNotifyOnFailure] = useState(schedule?.notifyOnFailure ?? true);
  const [notifyEmail, setNotifyEmail] = useState(schedule?.notifyEmail || '');
  const [folders, setFolders] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load folders when collection changes
  useEffect(() => {
    if (collectionId && scheduleType !== 'single') {
      api.request('GET', `/collections/${collectionId}/folders`)
        .then(res => setFolders(res.data || []))
        .catch(() => setFolders([]));
    } else {
      setFolders([]);
    }
  }, [collectionId, scheduleType]);

  // Set cron preset if it matches
  useEffect(() => {
    const preset = CRON_PRESETS.find(p => p.value === cronExpression);
    setCronPreset(preset ? preset.value : 'custom');
  }, []);

  const handlePresetChange = (preset) => {
    setCronPreset(preset);
    if (preset !== 'custom') {
      setCronExpression(preset);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !cronExpression.trim()) {
      alert('Name and cron expression are required');
      return;
    }
    if (scheduleType !== 'single' && !collectionId) {
      alert('Please select a collection');
      return;
    }
    if (scheduleType === 'folder' && !folderId) {
      alert('Please select a folder');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        scheduleType,
        collectionId: scheduleType !== 'single' ? parseInt(collectionId) : undefined,
        folderId: scheduleType === 'folder' ? parseInt(folderId) : undefined,
        environmentId: environmentId ? parseInt(environmentId) : undefined,
        cronExpression,
        notifyOnFailure,
        notifyEmail: notifyOnFailure && notifyEmail ? notifyEmail : undefined,
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onCancel}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-soft-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">{schedule ? 'Edit schedule' : 'New schedule'}</h2>
          <button onClick={onCancel} className="icon-btn" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="label">Schedule name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Daily API Health Check"
              autoFocus
            />
          </div>

          {/* Schedule Type */}
          <div>
            <label className="label">What to run</label>
            <div className="inline-flex p-1 rounded-lg bg-surface-100 w-full">
              <button
                type="button"
                onClick={() => setScheduleType('collection')}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  scheduleType === 'collection' ? 'bg-white text-surface-900 shadow-soft' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                <Folder size={15} /> Collection
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('folder')}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  scheduleType === 'folder' ? 'bg-white text-surface-900 shadow-soft' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                <Folder size={15} /> Folder
              </button>
            </div>
          </div>

          {/* Collection Select */}
          {scheduleType !== 'single' && (
            <div>
              <label className="label">Collection</label>
              <select
                value={collectionId}
                onChange={(e) => { setCollectionId(e.target.value); setFolderId(''); }}
                className="input"
              >
                <option value="">Select a collection...</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.testCount} tests)</option>
                ))}
              </select>
            </div>
          )}

          {/* Folder Select (if folder type) */}
          {scheduleType === 'folder' && collectionId && (
            <div>
              <label className="label">Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="input"
              >
                <option value="">Select a folder...</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.testCount} tests)</option>
                ))}
              </select>
              {folders.length === 0 && (
                <p className="text-xs text-surface-400 mt-1">This collection has no folders</p>
              )}
            </div>
          )}

          {/* Environment */}
          <div>
            <label className="label">Environment <span className="text-surface-400 font-normal">(optional)</span></label>
            <select
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="input"
            >
              <option value="">Use active environment</option>
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.isActive && '(Active)'}
                </option>
              ))}
            </select>
          </div>

          {/* Cron Schedule */}
          <div>
            <label className="label">Schedule</label>
            <select
              value={cronPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="input mb-2"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {cronPreset === 'custom' && (
              <input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                className="input font-mono text-sm"
                placeholder="* * * * *"
              />
            )}
            <p className="text-xs text-surface-400 mt-2">
              {cronExpression && <>Cron: <code className="kbd">{cronExpression}</code></>}
            </p>
          </div>

          {/* Notifications */}
          <div className="border-t border-surface-200 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnFailure}
                onChange={(e) => setNotifyOnFailure(e.target.checked)}
                className="rounded border-surface-300 text-brand-600"
              />
              <span className="text-sm font-medium text-surface-700">Notify on failure</span>
            </label>
            {notifyOnFailure && (
              <input
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="input mt-2"
                type="email"
                placeholder="notification@example.com"
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-surface-200 flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {schedule ? 'Save changes' : 'Create schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [collections, setCollections] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const load = useCallback(async () => {
    try {
      const [schedData, colData, envData] = await Promise.all([
        api.request('GET', '/schedules'),
        api.request('GET', '/collections'),
        api.request('GET', '/environments'),
      ]);
      setSchedules(schedData.data || []);
      setCollections(colData.data || []);
      setEnvironments(envData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    await api.request('POST', '/schedules', data);
    setShowModal(false);
    load();
  };

  const handleUpdate = async (data) => {
    await api.request('PATCH', `/schedules/${editingSchedule.id}`, data);
    setEditingSchedule(null);
    load();
  };

  const handleToggle = async (id) => {
    await api.request('PATCH', `/schedules/${id}/toggle`);
    load();
  };

  const handleRunNow = async (id) => {
    try {
      const result = await api.request('POST', `/schedules/${id}/run-now`);
      alert(`Run complete! ${result.passed} passed, ${result.failed} failed`);
      load();
    } catch (err) {
      alert('Run failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    await api.request('DELETE', `/schedules/${id}`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedules</h1>
          <p className="page-subtitle">Automate test runs with cron-based schedules.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary btn-sm"><Plus size={14} /> New schedule</button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="skeleton w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/5" /><div className="skeleton h-3 w-3/5" /></div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ScheduleModal
          collections={collections}
          environments={environments}
          onSave={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      )}

      {editingSchedule && (
        <ScheduleModal
          schedule={editingSchedule}
          collections={collections}
          environments={environments}
          onSave={handleUpdate}
          onCancel={() => setEditingSchedule(null)}
        />
      )}

      {!loading && schedules.length === 0 ? (
        <div className="empty">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 mb-1">No schedules yet</h3>
          <p className="text-surface-500 text-sm mb-6 max-w-xs">Run your collections or folders on autopilot with a cron schedule.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Create schedule</button>
        </div>
      ) : !loading && (
        <div className="card divide-y divide-surface-100 overflow-hidden">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={() => handleToggle(schedule.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      schedule.isActive
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-600/15'
                        : 'bg-surface-100 text-surface-400 hover:bg-surface-200'
                    }`}
                    title={schedule.isActive ? 'Pause schedule' : 'Activate schedule'}
                    aria-label={schedule.isActive ? 'Pause' : 'Activate'}
                  >
                    {schedule.isActive ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-surface-900 truncate">{schedule.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-surface-500">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        {schedule.cronExpression}
                      </span>
                      {schedule.collectionName && (
                        <span className="flex items-center gap-1">
                          <Folder size={12} />
                          {schedule.collectionName}
                          {schedule.folderName && ` / ${schedule.folderName}`}
                        </span>
                      )}
                      {schedule.environmentName && (
                        <span className="flex items-center gap-1">
                          <Globe size={12} />
                          {schedule.environmentName}
                        </span>
                      )}
                      {schedule.notifyEmail && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {schedule.notifyEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {schedule.lastStatus && (
                    <span className={schedule.lastStatus === 'passed' ? 'badge-success' : 'badge-danger'}>
                      {schedule.lastStatus === 'passed' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {schedule.runCount} runs
                    </span>
                  )}
                  <button onClick={() => handleRunNow(schedule.id)} className="btn-ghost btn-xs ml-2">
                    <Play size={12} /> Run now
                  </button>
                  <button onClick={() => setEditingSchedule(schedule)} className="icon-btn" aria-label="Edit"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(schedule.id)} className="icon-btn hover:text-red-500" aria-label="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
