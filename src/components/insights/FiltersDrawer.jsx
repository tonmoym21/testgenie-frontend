import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { metadataApi } from '../../services/metadataApi';

function ChipGroup({ value = [], options, onToggle, capitalize = false }) {
  if (!options || options.length === 0) {
    return <p className="text-xs text-surface-400 dark:text-surface-500">None available</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.name;
        const active = value.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${capitalize ? 'capitalize' : ''}
              ${active
                ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-lime-500/15 dark:text-lime-200 dark:border-lime-400/40'
                : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300 dark:bg-surface-900 dark:text-surface-300 dark:border-surface-700 dark:hover:border-surface-600'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const EMPTY_META = { owners: [], teams: [], tags: [], statuses: [], priorities: [] };

export default function FiltersDrawer({
  open,
  filters,
  projectId,
  projectName,
  onChange,
  onClear,
  onClose,
}) {
  const [meta, setMeta] = useState(EMPTY_META);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setMetaLoading(true);
    metadataApi.getMetadata(projectId)
      .then((m) => { if (!cancelled) setMeta(m); })
      .catch(() => { if (!cancelled) setMeta(EMPTY_META); })
      .finally(() => { if (!cancelled) setMetaLoading(false); });
    return () => { cancelled = true; };
  }, [open, projectId]);

  if (!open) return null;

  const set = (patch) => onChange({ ...filters, ...patch });
  const toggle = (key, id) => {
    const next = filters[key] || [];
    set({ [key]: next.includes(id) ? next.filter((x) => x !== id) : [...next, id] });
  };

  const isDirty =
    filters.startDate || filters.endDate ||
    (filters.ownerIds?.length) || (filters.teamIds?.length) ||
    (filters.tags?.length) || (filters.statuses?.length) ||
    (filters.priorities?.length);

  return (
    <div className="card p-5 mb-6 bg-surface-50/60 dark:bg-surface-900/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          Filters
          {metaLoading && <Loader2 size={12} className="animate-spin text-surface-400" />}
        </h3>
        <button
          onClick={onClose}
          className="icon-btn text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100"
          aria-label="Close filters"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Date range">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => set({ startDate: e.target.value })}
              className="input"
              aria-label="Start date"
            />
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => set({ endDate: e.target.value })}
              className="input"
              aria-label="End date"
            />
          </div>
          <p className="text-[11px] text-surface-400 dark:text-surface-500 mt-1">Overrides the time-range tabs above.</p>
        </Field>

        <Field label="Project">
          <div className="text-sm text-surface-600 dark:text-surface-300 px-3 py-2 rounded-md bg-white ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
            {projectName || 'Current project'}
          </div>
          <p className="text-[11px] text-surface-400 dark:text-surface-500 mt-1">Insights are scoped to this project. Switch projects from the sidebar.</p>
        </Field>

        <Field label="Owner">
          <ChipGroup value={filters.ownerIds} options={meta.owners} onToggle={(id) => toggle('ownerIds', id)} />
        </Field>

        <Field label="Team">
          <ChipGroup value={filters.teamIds} options={meta.teams} onToggle={(id) => toggle('teamIds', id)} />
        </Field>

        <Field label="Tag">
          <ChipGroup value={filters.tags} options={meta.tags} onToggle={(id) => toggle('tags', id)} />
        </Field>

        <Field label="Status">
          <ChipGroup value={filters.statuses} options={meta.statuses} onToggle={(id) => toggle('statuses', id)} capitalize />
        </Field>

        <Field label="Priority">
          <ChipGroup value={filters.priorities} options={meta.priorities} onToggle={(id) => toggle('priorities', id)} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-surface-200 dark:border-surface-700">
        <button
          onClick={onClear}
          className="btn-ghost btn-sm"
          disabled={!isDirty}
        >
          Clear all
        </button>
        <button onClick={onClose} className="btn-primary btn-sm">
          Done
        </button>
      </div>
    </div>
  );
}
