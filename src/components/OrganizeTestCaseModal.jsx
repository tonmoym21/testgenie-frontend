import { useState, useEffect, useMemo } from 'react';
import { X, Folder, FolderPlus, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';

/**
 * Post-approval (and re-organize) modal that asks the user where the test case
 * should live: keep it loose on the Test Cases page, move it into an existing
 * folder, or create a new folder and file it there.
 *
 * Folders are project-scoped and org-shared; this modal treats them as a flat
 * list (sub-folders are rendered indented for visibility but selection is flat).
 *
 * Props:
 *   projectId    — current project id
 *   testCase     — the test_cases row (must include id, title, folderId)
 *   onClose()    — dismiss without saving
 *   onSaved(tc)  — the (possibly updated) test case after the chosen action
 */
export default function OrganizeTestCaseModal({ projectId, testCase, onClose, onSaved }) {
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [mode, setMode] = useState(null); // 'keep' | 'existing' | 'new'
  const [selectedFolderId, setSelectedFolderId] = useState(testCase?.folderId ?? null);
  const [newFolderName, setNewFolderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.getFolders(projectId);
        if (!alive) return;
        setFolders(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (alive) setError('Could not load folders: ' + err.message);
      } finally {
        if (alive) setLoadingFolders(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  // Pre-select a sensible default mode based on current folder placement.
  useEffect(() => {
    if (mode != null) return;
    if (testCase?.folderId) {
      setMode('existing');
      setSelectedFolderId(testCase.folderId);
    } else {
      setMode('keep');
    }
  }, [testCase, mode]);

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [folders]);

  const canSubmit = (() => {
    if (saving) return false;
    if (mode === 'keep') return true;
    if (mode === 'existing') return selectedFolderId != null;
    if (mode === 'new') return newFolderName.trim().length > 0;
    return false;
  })();

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      let nextFolderId = null;

      if (mode === 'existing') {
        nextFolderId = Number(selectedFolderId);
      } else if (mode === 'new') {
        const created = await api.createFolder(projectId, { name: newFolderName.trim() });
        nextFolderId = created?.id;
        if (!nextFolderId) throw new Error('Folder creation returned no id');
      }
      // mode === 'keep' → nextFolderId stays null (unfiled)

      // Only call the move endpoint if the placement actually changes.
      const currentFolderId = testCase?.folderId ?? null;
      let updated = testCase;
      if (nextFolderId !== currentFolderId) {
        updated = await api.updateTestCase(projectId, testCase.id, { folderId: nextFolderId });
      }

      onSaved?.(updated);
    } catch (err) {
      setError(err.message || 'Could not save organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4">
      <div className="bg-white dark:bg-surface-900 rounded-xl shadow-soft-lg w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-200/70 dark:border-surface-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Organize test case</h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate" title={testCase?.title}>
              {testCase?.title || 'Approved test case'}
            </p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close" disabled={saving}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <OptionRow
            active={mode === 'keep'}
            onClick={() => setMode('keep')}
            icon={<Check size={14} />}
            title="Keep on Test Cases page"
            description="Leave it unfiled — still visible and searchable from the project's Test Cases list."
          />

          <OptionRow
            active={mode === 'existing'}
            onClick={() => setMode('existing')}
            icon={<Folder size={14} />}
            title="Add to existing folder"
            description={loadingFolders ? 'Loading folders…' : (sortedFolders.length === 0 ? 'No folders yet — create one below.' : 'Pick a folder for this case.')}
          >
            {mode === 'existing' && (
              <select
                autoFocus
                value={selectedFolderId ?? ''}
                onChange={(e) => setSelectedFolderId(e.target.value ? Number(e.target.value) : null)}
                className="input mt-2 text-sm"
                disabled={loadingFolders || sortedFolders.length === 0 || saving}
              >
                <option value="">— select folder —</option>
                {sortedFolders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </OptionRow>

          <OptionRow
            active={mode === 'new'}
            onClick={() => setMode('new')}
            icon={<FolderPlus size={14} />}
            title="Create new folder and add it there"
            description="One-shot: create the folder and move this test case into it."
          >
            {mode === 'new' && (
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Analytics Admin role"
                maxLength={200}
                disabled={saving}
                className="input mt-2 text-sm"
              />
            )}
          </OptionRow>

          {error && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm" disabled={saving}>
              Skip for now
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={!canSubmit}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OptionRow({ active, onClick, icon, title, description, children }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border px-3 py-3 transition-colors ${
        active
          ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10'
          : 'border-surface-200 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
          active ? 'border-brand-600 bg-brand-600 text-white' : 'border-surface-300 dark:border-surface-600 text-surface-400'
        }`}>
          {active ? <Check size={12} /> : icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{title}</div>
          <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{description}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
