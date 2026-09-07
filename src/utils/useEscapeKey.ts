import { useEffect } from 'react';

/**
 * Fires `onEscape` when the user presses Escape.
 * Only active while `isOpen` is true.
 */
export function useEscapeKey(isOpen: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isOpen, onEscape]);
}
