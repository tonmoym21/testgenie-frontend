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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{schedule ? 'Edit Schedule' : 'New Schedule'}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">What to Run</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('collection')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  scheduleType === 'collection' 
                    ? 'bg-brand-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Folder size={16} className="inline mr-1" /> Collection
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('folder')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  scheduleType === 'folder' 
                    ? 'bg-brand-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Folder size={16} className="inline mr-1" /> Folder
              </button>
            </div>
          </div>

          {/* Collection Select */}
          {scheduleType !== 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
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
                <p className="text-xs text-gray-400 mt-1">This collection has no folders</p>
              )}
            </div>
          )}

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environment (Optional)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
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
            <p className="text-xs text-gray-400 mt-1">
              {cronExpression && `Cron: ${cronExpression}`}
            </p>
          </div>

          {/* Notifications */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnFailure}
                onChange={(e) => setNotifyOnFailure(e.target.checked)}
                className="rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm font-medium text-gray-700">Notify on failure</span>
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

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {schedule ? 'Save Changes' : 'Create Schedule'}
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

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Schedules</h1>
          <p className="text-gray-500 text-sm mt-1">Automate your test runs with cron schedules</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Schedule</button>
        </div>
      </div>

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

      {schedules.length === 0 ? (
        <div className="text-center py-20">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No schedules yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create a schedule to automatically run your tests</p>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Create Schedule</button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(schedule.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      schedule.isActive 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={schedule.isActive ? 'Pause schedule' : 'Activate schedule'}
                  >
                    {schedule.isActive ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                  <div>
                    <h3 className="font-semibold text-gray-700">{schedule.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
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
                <div className="flex items-center gap-2">
                  {schedule.lastStatus && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      schedule.lastStatus === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {schedule.lastStatus === 'passed' ? <CheckCircle size={12} className="inline mr-1" /> : <XCircle size={12} className="inline mr-1" />}
                      {schedule.runCount} runs
                    </span>
                  )}
                  <button onClick={() => handleRunNow(schedule.id)} className="btn-ghost text-xs">
                    <Play size={14} /> Run Now
                  </button>
                  <button onClick={() => setEditingSchedule(schedule)} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(schedule.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
