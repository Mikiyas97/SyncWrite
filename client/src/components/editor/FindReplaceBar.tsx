import { useState, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { searchHighlightKey } from '../../extensions/SearchHighlight';
import type { SearchHighlightState } from '../../extensions/SearchHighlight';
import { Search, X, ChevronUp, ChevronDown, Replace } from 'lucide-react';

interface FindReplaceBarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Find & Replace bar that slides down from the toolbar area.
 * Highlights search matches in the editor and provides next/prev navigation
 * plus single and batch replace.
 */
export const FindReplaceBar = ({ editor, isOpen, onClose }: FindReplaceBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when bar opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  // Update editor extension options when search term changes
  useEffect(() => {
    if (!editor) return;
    editor.extensionManager.extensions
      .find((ext) => ext.name === 'searchHighlight')
      ?.configure({ searchTerm, currentMatch: 0 });
    // Force view update
    editor.view.dispatch(editor.state.tr);
  }, [searchTerm, editor]);

  // Clean up search on close
  useEffect(() => {
    if (!isOpen && editor) {
      editor.extensionManager.extensions
        .find((ext) => ext.name === 'searchHighlight')
        ?.configure({ searchTerm: '', currentMatch: 0 });
      editor.view.dispatch(editor.state.tr);
    }
  }, [isOpen, editor]);

  const getSearchState = useCallback((): SearchHighlightState | null => {
    if (!editor) return null;
    return searchHighlightKey.getState(editor.state) as SearchHighlightState | null;
  }, [editor]);

  const navigateMatch = useCallback(
    (direction: 'next' | 'prev') => {
      if (!editor) return;
      const state = getSearchState();
      if (!state || state.matchCount === 0) return;

      let nextMatch: number;
      if (direction === 'next') {
        nextMatch = (state.currentMatch + 1) % state.matchCount;
      } else {
        nextMatch = (state.currentMatch - 1 + state.matchCount) % state.matchCount;
      }

      editor.extensionManager.extensions
        .find((ext) => ext.name === 'searchHighlight')
        ?.configure({ searchTerm, currentMatch: nextMatch });

      editor.view.dispatch(editor.state.tr);

      // Scroll to the current match
      const updatedState = searchHighlightKey.getState(editor.state) as SearchHighlightState | null;
      if (updatedState && updatedState.matchPositions[nextMatch]) {
        const pos = updatedState.matchPositions[nextMatch].from;
        editor.commands.setTextSelection(pos);
        editor.commands.scrollIntoView();
      }
    },
    [editor, searchTerm, getSearchState],
  );

  const handleReplace = useCallback(() => {
    if (!editor) return;
    const state = getSearchState();
    if (!state || state.matchCount === 0) return;

    const match = state.matchPositions[state.currentMatch];
    if (!match) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .deleteSelection()
      .insertContent(replaceTerm)
      .run();
  }, [editor, replaceTerm, getSearchState]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchTerm) return;
    const state = getSearchState();
    if (!state || state.matchCount === 0) return;

    // Replace from end to start to preserve positions
    const { tr } = editor.state;
    const sortedMatches = [...state.matchPositions].sort((a, b) => b.from - a.from);
    for (const match of sortedMatches) {
      tr.replaceWith(match.from, match.to, editor.state.schema.text(replaceTerm));
    }
    editor.view.dispatch(tr);
  }, [editor, searchTerm, replaceTerm, getSearchState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateMatch(e.shiftKey ? 'prev' : 'next');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [navigateMatch, onClose],
  );

  if (!isOpen) return null;

  const state = getSearchState();
  const matchCount = state?.matchCount || 0;
  const currentMatch = state?.currentMatch || 0;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 animate-in slide-in-from-top-2 duration-200">
      {/* Search Row */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Find in document..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px] text-center tabular-nums">
          {searchTerm ? `${matchCount > 0 ? currentMatch + 1 : 0} / ${matchCount}` : ''}
        </span>
        <button
          onClick={() => navigateMatch('prev')}
          disabled={matchCount === 0}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 transition-colors"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigateMatch('next')}
          disabled={matchCount === 0}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 transition-colors"
          title="Next match (Enter)"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`p-1.5 rounded transition-colors ${showReplace ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
          title="Toggle replace"
        >
          <Replace className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Close (Escape)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Replace Row */}
      {showReplace && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <Replace className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleReplace}
            disabled={matchCount === 0}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matchCount === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-30 transition-colors"
          >
            Replace All
          </button>
        </div>
      )}
    </div>
  );
};
