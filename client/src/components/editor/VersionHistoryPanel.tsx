import { useState, useEffect, useCallback } from 'react';
import {
  X,
  History,
  RotateCcw,
  Loader2,
  AlertCircle,
  Clock,
  Save,
  RotateCw,
  ChevronDown,
  Eye,
} from 'lucide-react';
import type { DocumentVersion, VersionSource } from '../../types/document';
import {
  listVersions,
  getVersion,
  restoreVersion,
} from '../../services/versionService';
import { socket } from '../../api/socket';

interface VersionHistoryPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  canRestore: boolean;
  onPreviewVersion: (content: Record<string, any>) => void;
  onClearPreview: () => void;
  onRestore: (document: any) => void;
}

const SOURCE_CONFIG: Record<VersionSource, { label: string; color: string; icon: typeof Save }> = {
  manual: { label: 'Manual', color: 'bg-blue-100 text-blue-700', icon: Save },
  auto: { label: 'Auto', color: 'bg-gray-100 text-gray-600', icon: Clock },
  restore: { label: 'Restored', color: 'bg-amber-100 text-amber-700', icon: RotateCcw },
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const VersionHistoryPanel = ({
  documentId,
  isOpen,
  onClose,
  canRestore,
  onPreviewVersion,
  onClearPreview,
  onRestore,
}: VersionHistoryPanelProps) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchVersions = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const data = await listVersions(documentId, pageNum, 20);

      if (append) {
        setVersions((prev) => [...prev, ...data.versions]);
      } else {
        setVersions(data.versions);
      }
      setHasMore(pageNum < data.pagination.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load versions');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedVersionId(null);
      fetchVersions(1);

      const handleVersionCreated = (data: { documentId: string; version: any }) => {
        if (data.documentId === documentId) {
          fetchVersions(1);
        }
      };

      socket.on('version:created', handleVersionCreated);

      return () => {
        socket.off('version:created', handleVersionCreated);
        onClearPreview();
        setSelectedVersionId(null);
      };
    }
    return () => {
      onClearPreview();
      setSelectedVersionId(null);
    };
  }, [isOpen, documentId, fetchVersions, onClearPreview]);

  const handleSelectVersion = async (version: DocumentVersion) => {
    if (selectedVersionId === version._id) {
      // Deselect — clear preview
      setSelectedVersionId(null);
      onClearPreview();
      return;
    }

    setSelectedVersionId(version._id);
    setIsPreviewLoading(true);

    try {
      const fullVersion = await getVersion(documentId, version._id);
      if (fullVersion.content) {
        onPreviewVersion(fullVersion.content);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load version content');
      setSelectedVersionId(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersionId) return;

    setIsRestoring(true);
    try {
      const data = await restoreVersion(documentId, selectedVersionId);
      onRestore(data.document);
      setSelectedVersionId(null);
      // Refresh the list to show the new restore version
      await fetchVersions(1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleLoadMore = () => {
    fetchVersions(page + 1, true);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden shrink-0 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version History</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview indicator */}
      {selectedVersionId && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
            <Eye className="h-3.5 w-3.5" />
            <span className="font-medium">Previewing version</span>
          </div>
          {canRestore && (
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isRestoring ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Restore
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-xs">Loading versions...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
            <p className="text-xs text-red-500">{error}</p>
            <button
              onClick={() => fetchVersions(1)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-400">
            <History className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium text-gray-500">No versions yet</p>
            <p className="text-xs mt-1">
              Versions are created automatically as you edit or when you save manually.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {versions.map((version) => {
              const sourceConfig = SOURCE_CONFIG[version.source];
              const SourceIcon = sourceConfig.icon;
              const isSelected = selectedVersionId === version._id;

              return (
                <button
                  key={version._id}
                  onClick={() => handleSelectVersion(version)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          v{version.versionNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceConfig.color}`}
                        >
                          <SourceIcon className="h-2.5 w-2.5" />
                          {sourceConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ backgroundColor: version.createdBy.avatarColor }}
                        >
                          {version.createdBy.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {version.createdBy.name}
                        </span>
                      </div>
                      <span
                        className="text-[11px] text-gray-400 dark:text-gray-500"
                        title={formatFullDate(version.createdAt)}
                      >
                        {formatRelativeTime(version.createdAt)}
                      </span>
                    </div>
                    {isSelected && isPreviewLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-3">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Load older versions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
