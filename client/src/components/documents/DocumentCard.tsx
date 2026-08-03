import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, Users, MoreVertical, Edit2, Copy, Trash2, Eye, MessageSquare, Pencil, Star, Pin } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { Document } from '../../types/document';

interface DocumentCardProps {
  document: Document;
  currentUserId: string;
  onToggleFavorite?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Formats a date string to a human-readable relative or absolute format.
 */
function formatDate(dateString: string): string {
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

export const DocumentCard = ({
  document,
  currentUserId,
  onToggleFavorite,
  onTogglePin,
  onRename,
  onDuplicate,
  onDelete,
}: DocumentCardProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = document.owner._id === currentUserId;
  const collaboratorCount = document.collaborators.length;
  const isFav = !!document.isFavorite;
  const isPin = !!document.isPinned;

  // Determine the user's role on this document
  const myCollaborator = document.collaborators.find(c => c.user._id === currentUserId);
  const myRole = isOwner ? 'owner' : (myCollaborator?.role || null);

  const roleConfig = {
    viewer: { label: 'Viewer', icon: Eye, color: 'text-blue-600 bg-gray-50' },
    commenter: { label: 'Commenter', icon: MessageSquare, color: 'text-blue-600 bg-violet-50' },
    editor: { label: 'Editor', icon: Pencil, color: 'text-blue-600 bg-blue-50' },
  } as const;

  // Show up to 3 collaborator avatars
  const visibleCollaborators = document.collaborators.slice(0, 3);
  const extraCount = collaboratorCount - 3;

  // Close dropdown when clicking outside
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
    <Link
      to={`/documents/${document._id}`}
      className="block group relative w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer no-underline"
    >
      {/* Context Menu Button */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1" ref={menuRef}>
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePin(document._id);
            }}
            className={`p-1 rounded-lg transition-colors focus:outline-none ${
              isPin
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                : 'text-gray-300 dark:text-gray-600 hover:text-blue-500 opacity-0 group-hover:opacity-100'
            }`}
            title={isPin ? 'Unpin document' : 'Pin document'}
          >
            <Pin className={`h-3.5 w-3.5 ${isPin ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''}`} />
          </button>
        )}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(document._id);
            }}
            className={`p-1 rounded-lg transition-colors focus:outline-none ${
              isFav
                ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/30'
                : 'text-gray-300 dark:text-gray-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            }`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          data-state={isMenuOpen ? 'open' : 'closed'}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-8 mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20 animate-in fade-in slide-in-from-top-2">
            {onTogglePin && (
              <button
                onClick={(e) => handleAction(e, () => onTogglePin(document._id))}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Pin className={`h-4 w-4 ${isPin ? 'text-blue-600 fill-blue-600' : 'text-gray-400'}`} />
                {isPin ? 'Unpin document' : 'Pin to top'}
              </button>
            )}
            {onToggleFavorite && (
              <button
                onClick={(e) => handleAction(e, () => onToggleFavorite(document._id))}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Star className={`h-4 w-4 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-gray-400'}`} />
                {isFav ? 'Remove favorite' : 'Add to favorites'}
              </button>
            )}
            {isOwner && (
              <button
                onClick={(e) => handleAction(e, () => onRename(document._id, document.title))}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit2 className="h-4 w-4 text-gray-400" />
                Rename
              </button>
            )}
            
            <button
              onClick={(e) => handleAction(e, () => onDuplicate(document._id))}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="h-4 w-4 text-gray-400" />
              Duplicate
            </button>
            
            {isOwner && (
              <button
                onClick={(e) => handleAction(e, () => onDelete(document._id))}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Icon + Title */}
      <div className="flex items-start gap-3 mb-3 pr-8">
        <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors shrink-0">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors" title={document.title}>
            {document.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {isOwner ? 'Owned by you' : `Shared by ${document.owner.name}`}
          </p>
        </div>
        {/* Role badge for shared documents */}
        {!isOwner && myRole && myRole !== 'owner' && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${roleConfig[myRole].color}`}>
            {(() => { const Icon = roleConfig[myRole].icon; return <Icon className="h-3 w-3" />; })()}
            {roleConfig[myRole].label}
          </span>
        )}
      </div>

      {/* Footer: updated time + collaborators */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex flex-col text-[11px] text-gray-400 dark:text-gray-500 gap-0.5">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Edited {formatDate(document.updatedAt)}</span>
          </div>
          <span className="text-[10px] text-gray-400/80 dark:text-gray-500/80">Created {formatDate(document.createdAt)}</span>
        </div>

        {collaboratorCount > 0 && (
          <div className="flex items-center gap-1" title={`${collaboratorCount} collaborator${collaboratorCount !== 1 ? 's' : ''}`}>
            <div className="flex -space-x-1.5">
              {visibleCollaborators.map((collab) => (
                <Avatar
                  key={collab.user._id}
                  name={collab.user.name}
                  color={collab.user.avatarColor}
                  size="sm"
                  className="h-6 w-6 text-[10px] ring-2 ring-white"
                />
              ))}
            </div>
            {extraCount > 0 && (
              <span className="text-[10px] text-gray-400 ml-1">+{extraCount}</span>
            )}
            <Users className="h-3.5 w-3.5 text-gray-400 ml-1" />
          </div>
        )}
      </div>
    </Link>
  );
};
