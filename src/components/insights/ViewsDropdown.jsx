import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Plus, Copy, Pencil, Trash2, Users, Lock } from 'lucide-react';

export default function ViewsDropdown({
  views,
  activeView,
  isAdmin,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onShareToggle,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const personal = views.filter((v) => v.scope === 'personal');
  const shared = views.filter((v) => v.scope === 'org');

  const renderRow = (v) => (
    <li key={v.id} className="group flex items-center gap-1 px-1">
      <button
        onClick={() => { onSelect(v.id); setOpen(false); }}
        className={`flex-1 text-left text-sm px-2 py-1.5 rounded-md transition-colors flex items-center gap-2
          ${activeView?.id === v.id
            ? 'bg-brand-50 text-brand-700 font-medium dark:bg-lime-500/10 dark:text-lime-300'
            : 'text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800'}`}
      >
        {v.scope === 'org'
          ? <Users size={12} className="text-surface-400 dark:text-surface-500 shrink-0" />
          : <Lock size={12} className="text-surface-400 dark:text-surface-500 shrink-0" />}
        <span className="truncate">{v.name}</span>
      </button>
      <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
        <button
          title="Rename"
          onClick={() => onRename(v)}
          className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800"
        >
          <Pencil size={12} />
        </button>
        <button
          title="Duplicate"
          onClick={() => onDuplicate(v)}
          className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800"
        >
          <Copy size={12} />
        </button>
        {isAdmin && (
          <button
            title={v.scope === 'org' ? 'Make personal' : 'Share with org'}
            onClick={() => onShareToggle(v)}
            className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800"
          >
            <Users size={12} />
          </button>
        )}
        <button
          title="Delete"
          onClick={() => onDelete(v)}
          className="p-1 rounded text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-500/10"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </li>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <LayoutGrid size={14} />
        <span className="max-w-[160px] truncate">{activeView?.name || 'Default view'}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 card p-2 shadow-soft-lg z-30 bg-white dark:bg-surface-900 ring-1 ring-surface-200 dark:ring-surface-700">
          {shared.length > 0 && (
            <>
              <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-surface-500 dark:text-surface-400 font-semibold">
                Shared with org
              </div>
              <ul className="space-y-0.5 mb-2">{shared.map(renderRow)}</ul>
            </>
          )}
          <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-surface-500 dark:text-surface-400 font-semibold">
            My views
          </div>
          {personal.length === 0 ? (
            <p className="px-2 py-2 text-xs text-surface-400 dark:text-surface-500">No saved views yet.</p>
          ) : (
            <ul className="space-y-0.5">{personal.map(renderRow)}</ul>
          )}

          <div className="border-t border-surface-200 dark:border-surface-700 mt-2 pt-2">
            <button
              onClick={() => { onCreate(); setOpen(false); }}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md text-brand-600 dark:text-lime-300 hover:bg-brand-50 dark:hover:bg-lime-500/10 flex items-center gap-2 font-medium"
            >
              <Plus size={14} /> Save current as new view
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
