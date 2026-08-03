import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import type { Document } from '../../types/document';
import { getDocumentIconColor } from './DocumentTableRow';

interface RecentlyOpenedWidgetProps {
  documents: Document[];
  currentUserId?: string;
  onSeeAll?: () => void;
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const RecentlyOpenedWidget = ({
  documents,
  currentUserId,
  onSeeAll,
}: RecentlyOpenedWidgetProps) => {
  const recentItems = documents.slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-xs mb-6">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Recently Opened
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors focus:outline-none"
          >
            See all
          </button>
        )}
      </div>

      {/* List Items */}
      {recentItems.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
          No recently opened documents.
        </p>
      ) : (
        <div className="space-y-3">
          {recentItems.map((doc) => {
            const iconStyle = getDocumentIconColor(doc._id, doc.title);
            
            // Find when the current user last opened this document
            let openedAt = doc.updatedAt;
            if (currentUserId && doc.lastOpenedBy) {
              const entry = doc.lastOpenedBy.find((e: any) => {
                const uId = typeof e.user === 'object' ? e.user?._id : e.user;
                return uId === currentUserId;
              });
              if (entry?.openedAt) {
                openedAt = entry.openedAt;
              }
            }

            return (
              <Link
                key={doc._id}
                to={`/documents/${doc._id}`}
                className="group flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors no-underline"
              >
                <div className={`p-2 rounded-lg ${iconStyle} shrink-0`}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                    {doc.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatRelativeTime(openedAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
