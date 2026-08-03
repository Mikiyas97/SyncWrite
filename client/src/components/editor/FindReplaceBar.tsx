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
 * Modern floating compact Find & Replace widget.
 * Floating in the top right corner of the document workspace.
 */
export const FindReplaceBar = ({ editor, isOpen, onClose }: FindReplaceBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dispatch search transaction metadata to ProseMirror plugin
  const syncSearch = useCallback(
    (term: string, targetMatchIdx: number) => {
      if (!editor) return;

      const tr = editor.state.tr.setMeta(searchHighlightKey, {
        searchTerm: term,
        currentMatch: targetMatchIdx,
      });

      editor.view.dispatch(tr);

      const state = searchHighlightKey.getState(editor.state) as SearchHighlightState | null;
      const count = state?.matchCount || 0;
      setMatchCount(count);

      const validIdx = count > 0 ? Math.min(Math.max(0, targetMatchIdx), count - 1) : 0;
      setCurrentMatch(validIdx);

      // Scroll into view if matches exist
      if (state && state.matchPositions && state.matchPositions[validIdx]) {
        const match = state.matchPositions[validIdx];
        editor.commands.setTextSelection({ from: match.from, to: match.to });
        editor.commands.scrollIntoView();
      }
    },
    [editor],
  );

  // Focus search input when bar opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  // Update search when search term changes or bar opens
  useEffect(() => {
    if (isOpen) {
      syncSearch(searchTerm, 0);
    }
  }, [searchTerm, isOpen, syncSearch]);

  // Clean up search highlights on close
  useEffect(() => {
    if (!isOpen && editor) {
      syncSearch('', 0);
      setMatchCount(0);
      setCurrentMatch(0);
    }
  }, [isOpen, editor, syncSearch]);

  // Listen for editor document transactions to keep match counts in sync
  useEffect(() => {
    if (!editor || !isOpen || !searchTerm) return;
    const handleTransaction = () => {
      const state = searchHighlightKey.getState(editor.state) as SearchHighlightState | null;
      if (state) {
        setMatchCount(state.matchCount);
        setCurrentMatch(state.currentMatch);
      }
    };
    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, isOpen, searchTerm]);

  const navigateMatch = useCallback(
    (direction: 'next' | 'prev') => {
      if (matchCount === 0) return;
      let nextIdx: number;
      if (direction === 'next') {
        nextIdx = (currentMatch + 1) % matchCount;
      } else {
        nextIdx = (currentMatch - 1 + matchCount) % matchCount;
      }
      syncSearch(searchTerm, nextIdx);
    },
    [matchCount, currentMatch, searchTerm, syncSearch],
  );

  const handleReplace = useCallback(() => {
    if (!editor || matchCount === 0) return;
    const state = searchHighlightKey.getState(editor.state) as SearchHighlightState | null;
    if (!state || !state.matchPositions[currentMatch]) return;

    const match = state.matchPositions[currentMatch];
    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .deleteSelection()
      .insertContent(replaceTerm)
      .run();

    setTimeout(() => {
      syncSearch(searchTerm, currentMatch);
    }, 20);
  }, [editor, matchCount, currentMatch, replaceTerm, searchTerm, syncSearch]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchTerm || matchCount === 0) return;
    const state = searchHighlightKey.getState(editor.state) as SearchHighlightState | null;
    if (!state || state.matchPositions.length === 0) return;

    const { tr } = editor.state;
    const sortedMatches = [...state.matchPositions].sort((a, b) => b.from - a.from);
    for (const match of sortedMatches) {
      tr.replaceWith(match.from, match.to, editor.state.schema.text(replaceTerm));
    }
    editor.view.dispatch(tr);

    setTimeout(() => {
      syncSearch(searchTerm, 0);
    }, 20);
  }, [editor, searchTerm, replaceTerm, matchCount, syncSearch]);

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

  return (
    <div className="absolute top-4 right-6 z-40 bg-white dark:bg-gray-800/95 rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/90 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-xs">
      {/* Search Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Find in document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-44 sm:w-56 text-xs pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-600/80 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition-all"
          />
        </div>

        {searchTerm.length > 0 && (
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 min-w-[44px] text-center tabular-nums">
            {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : '0 results'}
          </span>
        )}

        <div className="flex items-center gap-0.5 border-l border-gray-200 dark:border-gray-700 pl-1.5">
          <button
            onClick={() => navigateMatch('prev')}
            disabled={matchCount === 0}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors cursor-pointer"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigateMatch('next')}
            disabled={matchCount === 0}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors cursor-pointer"
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              showReplace
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            title="Toggle replace"
          >
            <Replace className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer ml-1"
            title="Close (Escape)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Replace Row */}
      {showReplace && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-700/80">
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-44 sm:w-56 text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600/80 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition-all"
          />
          <button
            onClick={handleReplace}
            disabled={matchCount === 0}
            className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors cursor-pointer shrink-0"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matchCount === 0}
            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-30 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};
