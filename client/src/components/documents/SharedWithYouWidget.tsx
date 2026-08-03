import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import type { Document } from '../../types/document';
import { getDocumentIconColor } from './DocumentTableRow';

interface SharedWithYouWidgetProps {
  documents: Document[];
  currentUserId: string;
  onSeeAll?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const SharedWithYouWidget = ({
  documents,
  currentUserId,
  onSeeAll,
}: SharedWithYouWidgetProps) => {
  const sharedItems = documents.slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-xs">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Shared with You
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
      {sharedItems.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
          No documents shared with you yet.
        </p>
      ) : (
        <div className="space-y-3">
          {sharedItems.map((doc) => {
            const iconStyle = getDocumentIconColor(doc._id, doc.title);
            const myCollab = doc.collaborators?.find((c) => c.user._id === currentUserId);
            const roleLabel = myCollab?.role ? myCollab.role.charAt(0).toUpperCase() + myCollab.role.slice(1) : 'Editor';

            return (
              <Link
                key={doc._id}
                to={`/documents/${doc._id}`}
                className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors no-underline"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg ${iconStyle} shrink-0`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {doc.owner.name} • <span className="text-gray-400 dark:text-gray-500">{roleLabel}</span>
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 text-right">
                  {formatDate(doc.updatedAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
