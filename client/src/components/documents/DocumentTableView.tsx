import { useState, useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { DocumentTableRow } from './DocumentTableRow';
import type { Document } from '../../types/document';

interface DocumentTableViewProps {
  documents: Document[];
  currentUserId: string;
  starredDocIds?: string[];
  onToggleStar?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

export const DocumentTableView = ({
  documents,
  currentUserId,
  starredDocIds = [],
  onToggleStar,
  onToggleFavorite,
  onTogglePin,
  onRename,
  onDuplicate,
  onDelete,
  emptyMessage = 'No documents found.',
}: DocumentTableViewProps) => {
  const [sortField, setSortField] = useState<'title' | 'createdAt' | 'updatedAt' | 'pinned'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'title' | 'createdAt' | 'updatedAt' | 'pinned') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      // Pinned documents are always pinned at the top
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) {
        return pinB - pinA;
      }
      if (sortField === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else if (sortField === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      } else {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
    });
  }, [documents, sortField, sortOrder]);

  if (documents.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Table Headers */}
      <div className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/80">
        <div className="flex-1 pr-4">
          <button
            onClick={() => handleSort('title')}
            className="inline-flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
          >
            <span>Name</span>
            {sortField === 'title' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />
            )}
          </button>
        </div>
        <div className="w-36 hidden md:block">Owner</div>
        <div className="w-32 hidden lg:block">
          <button
            onClick={() => handleSort('createdAt')}
            className="inline-flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
          >
            <span>Date Created</span>
            {sortField === 'createdAt' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />
            )}
          </button>
        </div>
        <div className="w-36 hidden sm:block">
          <button
            onClick={() => handleSort('updatedAt')}
            className="inline-flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
          >
            <span>Last Modified</span>
            {sortField === 'updatedAt' && (
              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />
            )}
          </button>
        </div>
        <div className="w-8 shrink-0"></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
        {sortedDocuments.map((doc) => (
          <DocumentTableRow
            key={doc._id}
            document={doc}
            currentUserId={currentUserId}
            isStarred={starredDocIds.includes(doc._id)}
            onToggleStar={onToggleStar}
            onToggleFavorite={onToggleFavorite}
            onTogglePin={onTogglePin}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
