import { useState, useEffect, useCallback } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Trash2,
  Reply,
  Send,
  Loader2,
  AlertCircle,
  RotateCw,
  Check,
} from 'lucide-react';
import type { Comment } from '../../types/document';
import {
  listComments,
  addComment,
  addReply,
  resolveComment,
  deleteComment,
} from '../../services/commentService';
import { socket } from '../../api/socket';

interface CommentsPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  currentUserId: string;
  isDocumentOwner: boolean;
}

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

export const CommentsPanel = ({
  documentId,
  isOpen,
  onClose,
  userRole,
  currentUserId,
  isDocumentOwner,
}: CommentsPanelProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const canAddComment = userRole !== 'viewer';
  const canResolve = isDocumentOwner || userRole === 'editor';

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listComments(documentId);
      setComments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();

      const handleCommentUpdated = (data: { documentId: string }) => {
        if (data.documentId === documentId) {
          fetchComments();
        }
      };

      socket.on('comment:updated', handleCommentUpdated);

      return () => {
        socket.off('comment:updated', handleCommentUpdated);
      };
    }
  }, [isOpen, documentId, fetchComments]);

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await addComment(documentId, newCommentText.trim());
      setComments((prev) => [created, ...prev]);
      setNewCommentText('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReply = async (commentId: string) => {
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const createdReply = await addReply(documentId, commentId, replyText.trim());
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            return {
              ...c,
              replies: [...(c.replies || []), createdReply],
            };
          }
          return c;
        })
      );
      setReplyText('');
      setActiveReplyId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleResolve = async (commentId: string) => {
    try {
      const updated = await resolveComment(documentId, commentId);
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, ...updated } : c))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resolve comment');
    }
  };

  const handleDelete = async (commentId: string, parentId?: string) => {
    try {
      await deleteComment(documentId, commentId);
      if (parentId) {
        // Delete reply
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === parentId) {
              return {
                ...c,
                replies: (c.replies || []).filter((r) => r._id !== commentId),
              };
            }
            return c;
          })
        );
      } else {
        // Delete top-level comment
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  if (!isOpen) return null;

  const openComments = comments.filter((c) => !c.isResolved);
  const resolvedComments = comments.filter((c) => c.isResolved);
  const displayedComments = showResolved ? comments : openComments;

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden shrink-0 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comments</h3>
          {openComments.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full">
              {openComments.length}
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

      {/* New Comment Form (Owner, Editor, Commenter) */}
      {canAddComment ? (
        <form onSubmit={handleCreateComment} className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="flex flex-col gap-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              maxLength={2000}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmitting}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Comment
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          You are viewing in read-only mode
        </div>
      )}

      {/* Filter toggle for resolved comments */}
      {resolvedComments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{resolvedComments.length} resolved thread(s)</span>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-xs">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={fetchComments}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : displayedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-400 dark:text-gray-500">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No comments yet</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Start a conversation on this document.</p>
          </div>
        ) : (
          displayedComments.map((comment) => {
            const canDeleteTop =
              comment.author._id === currentUserId || isDocumentOwner;
            const isReplying = activeReplyId === comment._id;

            return (
              <div
                key={comment._id}
                className={`p-3 transition-colors ${
                  comment.isResolved ? 'bg-gray-50/60 dark:bg-gray-900/40 opacity-75' : 'bg-white dark:bg-gray-800'
                }`}
              >
                {/* Author row */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: comment.author.avatarColor }}
                    >
                      {comment.author.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {comment.author.name}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>

                  {/* Top-level actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canResolve && (
                      <button
                        onClick={() => handleToggleResolve(comment._id)}
                        className={`p-1 rounded transition-colors ${
                          comment.isResolved
                            ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40'
                            : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={comment.isResolved ? 'Re-open thread' : 'Resolve thread'}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDeleteTop && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap pl-7 mb-2">
                  {comment.content}
                </p>

                {/* Resolved banner info */}
                {comment.isResolved && comment.resolvedBy && (
                  <div className="pl-7 mb-2 flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    <span>Resolved by {comment.resolvedBy.name}</span>
                  </div>
                )}

                {/* Replies list */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-7 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-gray-700 ml-2">
                    {comment.replies.map((reply) => {
                      const canDeleteReply =
                        reply.author._id === currentUserId || isDocumentOwner;

                      return (
                        <div key={reply._id} className="pl-2">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                                style={{ backgroundColor: reply.author.avatarColor }}
                              >
                                {reply.author.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">
                                {reply.author.name}
                              </span>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0">
                                {formatRelativeTime(reply.createdAt)}
                              </span>
                            </div>
                            {canDeleteReply && (
                              <button
                                onClick={() => handleDelete(reply._id, comment._id)}
                                className="p-0.5 rounded text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete reply"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-5">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply trigger + form */}
                {canAddComment && !comment.isResolved && (
                  <div className="pl-7 mt-2">
                    {isReplying ? (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          autoFocus
                          className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 resize-none"
                          maxLength={2000}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyText('');
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleCreateReply(comment._id)}
                            disabled={!replyText.trim() || isSubmittingReply}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {isSubmittingReply && <Loader2 className="h-3 w-3 animate-spin" />}
                            Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveReplyId(comment._id);
                          setReplyText('');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <Reply className="h-3 w-3" />
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
