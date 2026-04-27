import { useState, useEffect, useMemo } from 'react';
import { X, Folder, FolderPlus, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';

/**
 * Post-approval (and re-organize) modal that asks the user where the test cases
 * should live: keep current placement, move into an existing folder, or create
 * a new folder and file them there.
 *
 * Folders are project-scoped and org-shared.
 *
 * Props:
 *   projectId     — current project id
 *   testCases     — array of test_cases rows ({ id, title, folderId }). For the
 *                   single-case flow pass [oneCase].
 *   onClose()     — dismiss without saving
 *   onSaved(tcs)  — array of (possibly updated) test cases after the chosen action
 */
export default function OrganizeTestCaseModal({ projectId, testCases, onClose, onSaved }) {
  const cases = useMemo(() => (Array.isArray(testCases) ? testCases : (testCases ? [testCases] : [])), [testCases]);
  const isBulk = cases.length > 1;
  const firstCase = cases[0];

  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [mode, setMode] = useState(null); // 'keep' | 'existing' | 'new'
  const [selectedFolderId, setSelectedFolderId] = useState(firstCase?.folderId ?? null);
  const [newFolderName, setNewFolderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
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

  // Pre-select a sensible default. For a single case already filed somewhere,
  // open in 'existing' mode with that folder. Otherwise default to 'keep'.
  useEffect(() => {
    if (mode != null) return;
    if (!isBulk && firstCase?.folderId) {
      setMode('existing');
      setSelectedFolderId(firstCase.folderId);
    } else {
      setMode('keep');
    }
  }, [isBulk, firstCase, mode]);

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [folders]);

  const canSubmit = (() => {
    if (saving || cases.length === 0) return false;
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
    setSaveProgress({ done: 0, total: cases.length });

    try {
      // mode === 'keep' — make no changes; preserve existing placement.
      if (mode === 'keep') {
        onSaved?.(cases);
        return;
      }

      let targetFolderId = null;
      if (mode === 'existing') {
        targetFolderId = Number(selectedFolderId);
      } else if (mode === 'new') {
        const created = await api.createFolder(projectId, { name: newFolderName.trim() });
        targetFolderId = created?.id;
        if (!targetFolderId) throw new Error('Folder creation returned no id');
      }

      // Move each test case that isn't already in the target folder.
      const updated = [];
      for (const tc of cases) {
        try {
          if (tc.folderId === targetFolderId) {
            updated.push(tc);
          } else {
            const next = await api.updateTestCase(projectId, tc.id, { folderId: targetFolderId });
            updated.push(next);
          }
        } catch (perCaseErr) {
          // Keep going for the rest; surface a partial-failure message at the end.
          updated.push({ ...tc, _moveError: perCaseErr.message });
        }
        setSaveProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      const failures = updated.filter((u) => u._moveError);
      if (failures.length > 0) {
        setError(`${failures.length} of ${updated.length} could not be moved. The rest were filed.`);
      }

      onSaved?.(updated);
    } catch (err) {
      setError(err.message || 'Could not save organization');
    } finally {
      setSaving(false);
    }
  };

  const headline = isBulk
    ? `Organize ${cases.length} test cases`
    : 'Organize test case';
  const subline = isBulk
    ? 'Pick one destination — the action below applies to all of them.'
    : (firstCase?.title || 'Approved test case');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4">
      <div className="bg-white dark:bg-surface-900 rounded-xl shadow-soft-lg w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-200/70 dark:border-surface-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">{headline}</h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate" title={subline}>
              {subline}
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
            title={isBulk ? 'Keep current placement' : 'Keep on Test Cases page'}
            description={isBulk
              ? 'Make no changes. Cases already in folders stay there; loose cases stay loose.'
              : "Leave it unfiled — still visible and searchable from the project's Test Cases list."}
          />

          <OptionRow
            active={mode === 'existing'}
            onClick={() => setMode('existing')}
            icon={<Folder size={14} />}
            title={isBulk ? 'Move all into an existing folder' : 'Add to existing folder'}
            description={loadingFolders ? 'Loading folders…' : (sortedFolders.length === 0 ? 'No folders yet — create one below.' : 'Pick a folder to file these cases.')}
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
            title={isBulk ? 'Create new folder and add all there' : 'Create new folder and add it there'}
            description={isBulk
              ? 'One-shot: create the folder and file every selected test case into it.'
              : 'One-shot: create the folder and move this test case into it.'}
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

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-surface-500 dark:text-surface-400">
              {saving && saveProgress.total > 0
                ? `Filing ${saveProgress.done} / ${saveProgress.total}…`
                : (isBulk ? `${cases.length} test cases selected` : '')}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-secondary btn-sm" disabled={saving}>
                Skip for now
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={!canSubmit}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
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
