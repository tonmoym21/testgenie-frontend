import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, LayoutGrid, Plus, Copy, Pencil, Trash2,
  Users, Lock, Star, StarOff,
} from 'lucide-react';

// View row capability rules (mirror the spec's auth section):
//   - personal view: only `createdBy === userId` may rename/delete/setDefault
//   - org view:      only admin/owner may rename/delete/setDefault
//   - duplicate is always available (creates a personal copy)
function rowCapabilities({ view, userId, isAdmin }) {
  if (view.scope === 'org') {
    return {
      canRename: !!isAdmin,
      canDelete: !!isAdmin,
      canSetDefault: !!isAdmin,
      canMakePersonal: !!isAdmin,
      canDuplicate: true,
    };
  }
  const isOwner = !!userId && view.createdBy === userId;
  return {
    canRename: isOwner,
    canDelete: isOwner,
    canSetDefault: isOwner,
    canShareToOrg: !!isAdmin && isOwner,
    canDuplicate: true,
  };
}

export default function ViewsDropdown({
  views,
  activeView,
  userId,
  isAdmin,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onShareToOrg,
  onMakePersonal,
  onSetDefault,
  onClearDefault,
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

  const renderRow = (v) => {
    const caps = rowCapabilities({ view: v, userId, isAdmin });
    return (
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
          <span className="truncate flex-1">{v.name}</span>
          {v.isDefault && (
            <span className="text-[9px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5">
              <Star size={10} className="fill-current" /> default
            </span>
          )}
        </button>

        <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
          {caps.canSetDefault && (
            v.isDefault ? (
              <button title="Clear default" onClick={() => onClearDefault(v)} className="p-1 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                <StarOff size={12} />
              </button>
            ) : (
              <button title={v.scope === 'org' ? 'Set as org default' : 'Set as my default'} onClick={() => onSetDefault(v)} className="p-1 rounded text-surface-400 hover:text-amber-600 hover:bg-surface-100 dark:hover:bg-surface-800">
                <Star size={12} />
              </button>
            )
          )}
          {caps.canRename && (
            <button title="Rename" onClick={() => onRename(v)} className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800">
              <Pencil size={12} />
            </button>
          )}
          {caps.canDuplicate && (
            <button title="Duplicate to personal" onClick={() => onDuplicate(v)} className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800">
              <Copy size={12} />
            </button>
          )}
          {caps.canShareToOrg && (
            <button title="Share with org" onClick={() => onShareToOrg(v)} className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800">
              <Users size={12} />
            </button>
          )}
          {caps.canMakePersonal && (
            <button title="Make personal" onClick={() => onMakePersonal(v)} className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800">
              <Lock size={12} />
            </button>
          )}
          {caps.canDelete && (
            <button title="Delete" onClick={() => onDelete(v)} className="p-1 rounded text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-500/10">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </li>
    );
  };

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
        <div role="menu" className="absolute right-0 mt-2 w-80 card p-2 shadow-soft-lg z-30 bg-white dark:bg-surface-900 ring-1 ring-surface-200 dark:ring-surface-700">
          {shared.length > 0 && (
            <>
              <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-surface-500 dark:text-surface-400 font-semibold flex items-center gap-1">
                <Users size={10} /> Shared with org
              </div>
              <ul className="space-y-0.5 mb-2">{shared.map(renderRow)}</ul>
            </>
          )}
          <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-surface-500 dark:text-surface-400 font-semibold flex items-center gap-1">
            <Lock size={10} /> My views
          </div>
          {personal.length === 0 ? (
            <p className="px-2 py-2 text-xs text-surface-400 dark:text-surface-500">No saved views yet.</p>
          ) : (
            <ul className="space-y-0.5">{personal.map(renderRow)}</ul>
          )}

          <div className="border-t border-surface-200 dark:border-surface-700 mt-2 pt-2 space-y-0.5">
            <button
              onClick={() => { onCreate('personal'); setOpen(false); }}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md text-brand-600 dark:text-lime-300 hover:bg-brand-50 dark:hover:bg-lime-500/10 flex items-center gap-2 font-medium"
            >
              <Plus size={14} /> Save as personal view
            </button>
            {isAdmin && (
              <button
                onClick={() => { onCreate('org'); setOpen(false); }}
                className="w-full text-left text-sm px-2 py-1.5 rounded-md text-brand-600 dark:text-lime-300 hover:bg-brand-50 dark:hover:bg-lime-500/10 flex items-center gap-2 font-medium"
              >
                <Plus size={14} /> Save as org view
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
