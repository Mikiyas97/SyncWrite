import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'General', items: [
    { keys: ['Ctrl', 'S'], description: 'Force save document' },
    { keys: ['Ctrl', 'F'], description: 'Find in document' },
    { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['Escape'], description: 'Close panel / find bar' },
  ]},
  { category: 'Formatting', items: [
    { keys: ['Ctrl', 'B'], description: 'Bold' },
    { keys: ['Ctrl', 'I'], description: 'Italic' },
    { keys: ['Ctrl', 'U'], description: 'Underline' },
  ]},
  { category: 'Text Structure', items: [
    { keys: ['Ctrl', 'Shift', '1'], description: 'Heading 1' },
    { keys: ['Ctrl', 'Shift', '2'], description: 'Heading 2' },
    { keys: ['Ctrl', 'Shift', '3'], description: 'Heading 3' },
    { keys: ['Ctrl', 'Shift', '8'], description: 'Bullet list' },
    { keys: ['Ctrl', 'Shift', '9'], description: 'Ordered list' },
  ]},
  { category: 'Export', items: [
    { keys: ['Ctrl', 'Shift', 'E'], description: 'Export as Markdown' },
    { keys: ['Ctrl', 'Shift', 'P'], description: 'Export as PDF' },
  ]},
  { category: 'History', items: [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  ]},
];

const Kbd = ({ children }: { children: string }) => (
  <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm font-mono">
    {children}
  </kbd>
);

/**
 * Modal that displays all available keyboard shortcuts organized by category.
 */
export const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(80vh-72px)]">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={`${shortcut.description}-${key}-${i}`} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-400 dark:text-gray-500 text-xs">+</span>}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
