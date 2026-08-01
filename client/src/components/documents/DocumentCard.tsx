import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, Users, MoreVertical, Edit2, Copy, Trash2, Eye, MessageSquare, Pencil } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { Document } from '../../types/document';

interface DocumentCardProps {
  document: Document;
  currentUserId: string;
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
  onRename,
  onDuplicate,
  onDelete,
}: DocumentCardProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = document.owner._id === currentUserId;
  const collaboratorCount = document.collaborators.length;

  // Determine the user's role on this document
  const myCollaborator = document.collaborators.find(c => c.user._id === currentUserId);
  const myRole = isOwner ? 'owner' : (myCollaborator?.role || null);

  const roleConfig = {
    viewer: { label: 'Viewer', icon: Eye, color: 'text-gray-500 bg-gray-50' },
    commenter: { label: 'Commenter', icon: MessageSquare, color: 'text-violet-600 bg-violet-50' },
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
      className="block group relative w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer no-underline"
    >
      {/* Context Menu Button */}
      <div className="absolute top-4 right-4 z-10" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          data-state={isMenuOpen ? 'open' : 'closed'}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-in fade-in slide-in-from-top-2">
            {isOwner && (
              <button
                onClick={(e) => handleAction(e, () => onRename(document._id, document.title))}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="h-4 w-4 text-gray-400" />
                Rename
              </button>
            )}
            
            <button
              onClick={(e) => handleAction(e, () => onDuplicate(document._id))}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Copy className="h-4 w-4 text-gray-400" />
              Duplicate
            </button>
            
            {isOwner && (
              <button
                onClick={(e) => handleAction(e, () => onDelete(document._id))}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors" title={document.title}>
            {document.title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
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
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Edited {formatDate(document.updatedAt)}</span>
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
