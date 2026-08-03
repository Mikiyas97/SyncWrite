import { useEffect, useCallback } from 'react';

export interface ShortcutHandlers {
  onSave?: () => void;
  onFind?: () => void;
  onExportMd?: () => void;
  onExportPdf?: () => void;
  onShowShortcuts?: () => void;
  onClosePanel?: () => void;
}

/**
 * Custom hook that registers global keyboard shortcuts for the editor.
 * Handles Ctrl+S (save), Ctrl+F (find), Ctrl+/ (help), Escape (close).
 */
export const useKeyboardShortcuts = (handlers: ShortcutHandlers, enabled: boolean = true) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Don't intercept if user is in an input/textarea outside the editor
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Ctrl+S - Force save
      if (isCtrl && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }

      // Ctrl+F - Find
      if (isCtrl && e.key === 'f') {
        e.preventDefault();
        handlers.onFind?.();
        return;
      }

      // Ctrl+Shift+E - Export Markdown
      if (isCtrl && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        handlers.onExportMd?.();
        return;
      }

      // Ctrl+Shift+P - Export PDF
      if (isCtrl && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handlers.onExportPdf?.();
        return;
      }

      // Ctrl+/ - Show shortcuts help
      if (isCtrl && e.key === '/') {
        e.preventDefault();
        handlers.onShowShortcuts?.();
        return;
      }

      // Escape - Close panel / find bar
      if (e.key === 'Escape' && !isInputField) {
        handlers.onClosePanel?.();
        return;
      }
    },
    [handlers, enabled],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
