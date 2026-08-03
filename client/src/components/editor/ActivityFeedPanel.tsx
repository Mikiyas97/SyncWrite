import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Activity,
  FilePlus,
  Edit3,
  UserPlus,
  UserMinus,
  Shield,
  LogIn,
  LogOut,
  RotateCcw,
  MessageSquare,
  MessageCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import type { ActivityItem, ActivityAction } from '../../types/activity';
import { getDocumentActivity } from '../../services/activityService';

interface ActivityFeedPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  liveActivity?: ActivityItem | null;
}

const ACTION_CONFIG: Record<
  ActivityAction,
  {
    icon: typeof Activity;
    color: string;
    label: string;
  }
> = {
  document_created: {
    icon: FilePlus,
    color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    label: 'Created',
  },
  document_renamed: {
    icon: Edit3,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    label: 'Renamed',
  },
  collaborator_added: {
    icon: UserPlus,
    color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    label: 'Shared',
  },
  collaborator_removed: {
    icon: UserMinus,
    color: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
    label: 'Removed',
  },
  collaborator_role_updated: {
    icon: Shield,
    color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
    label: 'Permission',
  },
  collaborator_joined: {
    icon: LogIn,
    color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    label: 'Joined',
  },
  collaborator_left: {
    icon: LogOut,
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    label: 'Left',
  },
  version_restored: {
    icon: RotateCcw,
    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    label: 'Restored',
  },
  comment_added: {
    icon: MessageSquare,
    color: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
    label: 'Comment',
  },
  comment_replied: {
    icon: MessageCircle,
    color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
    label: 'Reply',
  },
  comment_resolved: {
    icon: CheckCircle2,
    color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    label: 'Resolved',
  },
  comment_reopened: {
    icon: RefreshCw,
    color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    label: 'Re-opened',
  },
  comment_deleted: {
    icon: Trash2,
    color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    label: 'Deleted',
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderActivityDescription(activity: ActivityItem): React.ReactNode {
  const { action, details } = activity;
  const targetUserObj = typeof details?.targetUser === 'object' ? details.targetUser : null;
  const targetName = details?.targetUserName || targetUserObj?.name || 'a user';

  switch (action) {
    case 'document_created':
      return (
        <span>
          created <strong>{details?.title || 'the document'}</strong>
        </span>
      );
    case 'document_renamed':
      return (
        <span>
          renamed document to <strong>"{details?.newTitle || 'Untitled'}"</strong>
        </span>
      );
    case 'collaborator_added':
      return (
        <span>
          shared document with <strong>{targetName}</strong> as{' '}
          <span className="capitalize font-medium text-purple-600 dark:text-purple-400">
            {details?.role || 'viewer'}
          </span>
        </span>
      );
    case 'collaborator_removed':
      if (details?.isSelfRemoval) {
        return <span>left the document</span>;
      }
      return (
        <span>
          removed <strong>{targetName}</strong> from collaborators
        </span>
      );
    case 'collaborator_role_updated':
      return (
        <span>
          changed <strong>{targetName}</strong>'s role to{' '}
          <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
            {details?.newRole}
          </span>
        </span>
      );
    case 'collaborator_joined':
      return <span>joined real-time editing session</span>;
    case 'collaborator_left':
      return <span>left real-time session</span>;
    case 'version_restored':
      return (
        <span>
          restored version <strong>#{details?.versionNumber}</strong>
        </span>
      );
    case 'comment_added':
      return (
        <span>
          commented: <em className="text-gray-700 dark:text-gray-300">"{details?.commentSnippet}"</em>
        </span>
      );
    case 'comment_replied':
      return <span>replied to a comment thread</span>;
    case 'comment_resolved':
      return <span>resolved a comment thread</span>;
    case 'comment_reopened':
      return <span>re-opened a comment thread</span>;
    case 'comment_deleted':
      return <span>deleted a comment</span>;
    default:
      return <span>performed an activity</span>;
  }
}

export const ActivityFeedPanel = ({
  documentId,
  isOpen,
  onClose,
  liveActivity,
}: ActivityFeedPanelProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchActivities = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (pageNum === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const data = await getDocumentActivity(documentId, pageNum, 30);

        if (append) {
          setActivities((prev) => {
            const existingIds = new Set(prev.map((a) => a._id));
            const newItems = data.activities.filter((a) => !existingIds.has(a._id));
            return [...prev, ...newItems];
          });
        } else {
          setActivities(data.activities);
        }

        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(data.pagination.page);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load activity feed');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [documentId]
  );

  useEffect(() => {
    if (isOpen && documentId) {
      fetchActivities(1);
    }
  }, [isOpen, documentId, fetchActivities]);

  // Prepend live socket activity events when received
  useEffect(() => {
    if (liveActivity && liveActivity.document === documentId) {
      setActivities((prev) => {
        if (prev.some((a) => a._id === liveActivity._id)) return prev;
        return [liveActivity, ...prev];
      });
    }
  }, [liveActivity, documentId]);

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden shrink-0 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity Feed</h3>
          {activities.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full">
              {activities.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-xs">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={() => fetchActivities(1)}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-400 dark:text-gray-500">
            <Activity className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No activity yet</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">
              Document activities like renames, collaborator changes, and comments will appear here.
            </p>
          </div>
        ) : (
          <div>
            {activities.map((activity) => {
              const actionMeta = ACTION_CONFIG[activity.action] || {
                icon: Activity,
                color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
                label: 'Activity',
              };
              const IconComp = actionMeta.icon;
              const userName = activity.user?.name || 'Unknown User';
              const avatarColor = activity.user?.avatarColor || '#3B82F6';

              return (
                <div
                  key={activity._id}
                  className="px-4 py-3 bg-white dark:bg-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {userName}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${actionMeta.color}`}
                    >
                      <IconComp className="h-2.5 w-2.5" />
                      {actionMeta.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                    {renderActivityDescription(activity)}
                  </p>

                  <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(activity.createdAt)}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="p-3 text-center border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => fetchActivities(page + 1, true)}
                  disabled={isLoadingMore}
                  className="px-3 py-1 rounded text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {isLoadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
                  Load older activity
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
