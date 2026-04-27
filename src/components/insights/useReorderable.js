import { useState } from 'react';

// Minimal drag-reorder using native HTML5 DnD. No library.
//
// Returns a `bind(id)` helper that yields the props for each draggable card,
// plus a `dragging` id and an `over` id so the consumer can render visual cues.
export function useReorderable({ order, enabled, onReorder }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  const bind = (id) => {
    if (!enabled) return {};
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragging(id);
        try { e.dataTransfer.setData('text/plain', id); } catch { /* noop */ }
        e.dataTransfer.effectAllowed = 'move';
      },
      onDragEnd: () => {
        setDragging(null);
        setOver(null);
      },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (over !== id) setOver(id);
      },
      onDragLeave: () => {
        if (over === id) setOver(null);
      },
      onDrop: (e) => {
        e.preventDefault();
        if (!dragging || dragging === id) return;
        const next = [...order];
        const fromIdx = next.indexOf(dragging);
        const toIdx = next.indexOf(id);
        if (fromIdx === -1 || toIdx === -1) return;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, dragging);
        onReorder(next);
        setOver(null);
        setDragging(null);
      },
    };
  };

  return { bind, dragging, over };
}
