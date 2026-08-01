import { FileText, Clock, Users } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { Document } from '../../types/document';

interface DocumentCardProps {
  document: Document;
  currentUserId: string;
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

export const DocumentCard = ({ document, currentUserId }: DocumentCardProps) => {
  const isOwner = document.owner._id === currentUserId;
  const collaboratorCount = document.collaborators.length;

  // Show up to 3 collaborator avatars
  const visibleCollaborators = document.collaborators.slice(0, 3);
  const extraCount = collaboratorCount - 3;

  return (
    <button
      className="group w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* Icon + Title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors shrink-0">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
            {document.title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isOwner ? 'Owned by you' : `Shared by ${document.owner.name}`}
          </p>
        </div>
      </div>

      {/* Footer: updated time + collaborators */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Edited {formatDate(document.updatedAt)}</span>
        </div>

        {collaboratorCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {visibleCollaborators.map((collab) => (
                <Avatar
                  key={collab._id}
                  name={collab.name}
                  color={collab.avatarColor}
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
    </button>
  );
};
