import { X } from 'lucide-react';

const STATUSES = [
  { id: 'passed',   label: 'Passed' },
  { id: 'failed',   label: 'Failed' },
  { id: 'blocked',  label: 'Blocked' },
  { id: 'skipped',  label: 'Skipped' },
  { id: 'retest',   label: 'Retest' },
  { id: 'untested', label: 'Untested' },
];

const PRIORITIES = [
  { id: 'critical', label: 'Critical' },
  { id: 'high',     label: 'High' },
  { id: 'medium',   label: 'Medium' },
  { id: 'low',      label: 'Low' },
];

// In a real backend wiring, owners/teams/tags would come from the project's
// own metadata. Stub with sensible placeholders so the drawer renders.
const STUB_OWNERS = ['unassigned', 'me', 'team-lead'];
const STUB_TEAMS = ['frontend', 'backend', 'qa', 'platform'];
const STUB_TAGS = ['regression', 'smoke', 'auth', 'checkout', 'flaky'];

function ChipGroup({ value = [], options, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = value.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize
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

export default function FiltersDrawer({
  open,
  filters,
  projectName,
  onChange,
  onClear,
  onClose,
}) {
  if (!open) return null;

  const set = (patch) => onChange({ ...filters, ...patch });
  const toggle = (key, id) => {
    const next = filters[key] || [];
    set({ [key]: next.includes(id) ? next.filter((x) => x !== id) : [...next, id] });
  };

  const isDirty =
    filters.dateFrom || filters.dateTo ||
    (filters.owners && filters.owners.length) ||
    (filters.statuses && filters.statuses.length) ||
    (filters.priorities && filters.priorities.length) ||
    (filters.teams && filters.teams.length) ||
    (filters.tags && filters.tags.length);

  return (
    <div className="card p-5 mb-6 bg-surface-50/60 dark:bg-surface-900/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100">Filters</h3>
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
              value={filters.dateFrom || ''}
              onChange={(e) => set({ dateFrom: e.target.value })}
              className="input"
              aria-label="From"
            />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => set({ dateTo: e.target.value })}
              className="input"
              aria-label="To"
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
          <ChipGroup value={filters.owners} options={STUB_OWNERS} onToggle={(id) => toggle('owners', id)} />
        </Field>

        <Field label="Status">
          <ChipGroup value={filters.statuses} options={STATUSES} onToggle={(id) => toggle('statuses', id)} />
        </Field>

        <Field label="Priority">
          <ChipGroup value={filters.priorities} options={PRIORITIES} onToggle={(id) => toggle('priorities', id)} />
        </Field>

        <Field label="Team">
          <ChipGroup value={filters.teams} options={STUB_TEAMS} onToggle={(id) => toggle('teams', id)} />
        </Field>

        <Field label="Tag">
          <ChipGroup value={filters.tags} options={STUB_TAGS} onToggle={(id) => toggle('tags', id)} />
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
