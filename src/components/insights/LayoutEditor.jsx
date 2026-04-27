import { useState } from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';

// In-place editor for the predefined module layout. No freeform canvas, no
// resize, no custom widget creation (per spec non-goals).
//
// Props:
//   modules:   [{ id, label }] — the full set of supported modules
//   visible:   string[]        — currently visible ids (in order they should render)
//   order:     string[]        — full canonical order of all modules
//   onChange({ visibleModules, moduleOrder })
//   onReset()                  — restore to default (or org default if provided)
export default function LayoutEditor({ modules, visible, order, onChange, onReset }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  const labelFor = (id) => modules.find((m) => m.id === id)?.label || id;

  const reorder = (fromId, toId) => {
    if (!fromId || fromId === toId) return;
    const next = [...order];
    const fromIdx = next.indexOf(fromId);
    const toIdx = next.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromId);
    onChange({ moduleOrder: next, visibleModules: visible });
  };

  const toggleVisible = (id) => {
    const isOn = visible.includes(id);
    const nextVisible = isOn ? visible.filter((x) => x !== id) : [...visible, id];
    // Keep visible array sorted by current `order` so render stays consistent.
    nextVisible.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    onChange({ visibleModules: nextVisible, moduleOrder: order });
  };

  return (
    <div className="card p-5 mb-6 bg-surface-50/60 dark:bg-surface-900/40">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100">Layout</h3>
          <p className="text-[11px] text-surface-500 dark:text-surface-400">
            Drag to reorder. Toggle visibility with the eye icon.
          </p>
        </div>
        {onReset && (
          <button onClick={onReset} className="btn-ghost btn-sm" title="Reset to default order and full visibility">
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {order.map((id) => {
          const isVisible = visible.includes(id);
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragging(id);
                try { e.dataTransfer.setData('text/plain', id); } catch { /* noop */ }
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => { e.preventDefault(); if (over !== id) setOver(id); }}
              onDragLeave={() => { if (over === id) setOver(null); }}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              onDrop={(e) => { e.preventDefault(); reorder(dragging, id); setDragging(null); setOver(null); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 transition-colors
                ${dragging === id ? 'opacity-40' : ''}
                ${over === id && dragging && dragging !== id
                  ? 'ring-brand-500 dark:ring-lime-400 bg-brand-50/40 dark:bg-lime-500/10'
                  : 'ring-surface-200 dark:ring-surface-700 bg-white dark:bg-surface-900'}
                ${!isVisible ? 'opacity-60' : ''}`}
            >
              <GripVertical size={14} className="text-surface-400 dark:text-surface-500 cursor-grab active:cursor-grabbing shrink-0" />
              <span className={`text-sm flex-1 ${isVisible ? 'text-surface-800 dark:text-surface-100' : 'text-surface-500 dark:text-surface-500 line-through'}`}>
                {labelFor(id)}
              </span>
              <button
                onClick={() => toggleVisible(id)}
                className="p-1.5 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 dark:hover:text-surface-100 dark:hover:bg-surface-800"
                title={isVisible ? 'Hide module' : 'Show module'}
                aria-pressed={isVisible}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
