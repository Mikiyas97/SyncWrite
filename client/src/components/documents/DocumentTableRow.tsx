import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Star, MoreHorizontal, Edit2, Copy, Trash2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { Document } from '../../types/document';

interface DocumentTableRowProps {
  document: Document;
  currentUserId: string;
  isStarred?: boolean;
  onToggleStar?: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

// Map document title/id to deterministic icon color styles
export function getDocumentIconColor(id: string, title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('strategy') || lower.includes('okr') || lower.includes('sheet') || lower.includes('budget')) {
    return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400';
  }
  if (lower.includes('design') || lower.includes('guideline') || lower.includes('brand')) {
    return 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400';
  }
  if (lower.includes('pitch') || lower.includes('deck') || lower.includes('presentation')) {
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400';
  }
  if (lower.includes('policy') || lower.includes('notes') || lower.includes('meeting')) {
    return 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400';
  }
  // Default blue
  const colors = [
    'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
  ];
  let charSum = 0;
  for (let i = 0; i < id.length; i++) charSum += id.charCodeAt(i);
  return colors[charSum % colors.length];
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDateWithRelative(dateString: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export const DocumentTableRow = ({
  document,
  currentUserId,
  isStarred = false,
  onToggleStar,
  onRename,
  onDuplicate,
  onDelete,
}: DocumentTableRowProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = document.owner._id === currentUserId;
  const iconColorStyle = getDocumentIconColor(document._id, document.title);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className="group relative flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
      {/* Left: Document Icon & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
        <div className={`p-2 rounded-lg ${iconColorStyle} shrink-0 transition-transform group-hover:scale-105`}>
          <FileText className="h-4 w-4" />
        </div>
        <Link
          to={`/documents/${document._id}`}
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate no-underline"
        >
          {document.title}
        </Link>
        {onToggleStar && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleStar(document._id);
            }}
            className="p-1 text-gray-300 dark:text-gray-600 hover:text-amber-400 dark:hover:text-amber-400 transition-colors focus:outline-none shrink-0"
            title={isStarred ? 'Unstar document' : 'Star document'}
          >
            <Star
              className={`h-4 w-4 ${
                isStarred ? 'fill-amber-400 text-amber-400' : 'fill-none'
              }`}
            />
          </button>
        )}
      </div>

      {/* Owner */}
      <div className="w-36 hidden md:flex items-center gap-2 shrink-0">
        <Avatar
          name={document.owner.name}
          color={document.owner.avatarColor}
          size="sm"
          className="h-6 w-6 text-[10px]"
        />
        <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
          {isOwner ? 'You' : document.owner.name}
        </span>
      </div>

      {/* Date Created */}
      <div className="w-32 hidden lg:block text-xs text-gray-500 dark:text-gray-400 shrink-0">
        {formatShortDate(document.createdAt)}
      </div>

      {/* Last Modified */}
      <div className="w-36 hidden sm:block text-xs text-gray-500 dark:text-gray-400 shrink-0">
        {formatDateWithRelative(document.updatedAt)}
      </div>

      {/* Context Menu Button */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-30 animate-in fade-in slide-in-from-top-2">
            {isOwner && (
              <button
                onClick={(e) => handleAction(e, () => onRename(document._id, document.title))}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                Rename
              </button>
            )}
            <button
              onClick={(e) => handleAction(e, () => onDuplicate(document._id))}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-gray-400" />
              Duplicate
            </button>
            {isOwner && (
              <button
                onClick={(e) => handleAction(e, () => onDelete(document._id))}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
