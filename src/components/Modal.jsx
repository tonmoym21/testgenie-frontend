import { useEffect, useId, useRef } from 'react';

// Minimal modal primitive. Provides:
//   - role="dialog" + aria-modal + aria-labelledby
//   - Escape closes
//   - Backdrop-click closes (with optional guard to confirm on dirty modals)
//   - Focus is returned to the element that opened the modal
//
// Deliberately not a full focus trap — that costs ~150 LOC for marginal value
// at this tier. We instead auto-focus the first focusable element on open
// which covers the common keyboard-user case.

export default function Modal({
  title,
  subtitle,
  onClose,
  size = 'md',           // sm | md | lg | xl
  guardClose,            // optional () => boolean — return false to block close
  children,
  footer,
}) {
  const titleId = useId();
  const ref = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        tryClose();
      }
    }
    document.addEventListener('keydown', onKey);

    // Auto-focus first focusable descendant on mount.
    const node = ref.current;
    if (node) {
      const focusable = node.querySelector(
        'input,textarea,select,button,[tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      // Return focus to whatever was focused before the modal opened — so
      // tab order is preserved and screen readers announce sensibly.
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tryClose() {
    if (guardClose && guardClose() === false) return;
    onClose();
  }

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div
      className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={tryClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`card w-full ${widths[size] || widths.md} shadow-soft-lg animate-slide-up flex flex-col max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-surface-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={tryClose}
            className="icon-btn flex-shrink-0"
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
