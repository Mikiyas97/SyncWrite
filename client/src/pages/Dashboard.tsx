import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { DocumentSection } from '../components/documents/DocumentSection';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useSocket } from '../hooks/useSocket';
import { Plus, FolderOpen, Users, Clock, Loader2, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, error: socketError } = useSocket();
  const {
    documents,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createDocument,
    renameDocument,
    duplicateDocument,
    deleteDocument,
  } = useDocuments();

  // Modal states
  const [deleteModalDoc, setDeleteModalDoc] = useState<{ id: string; title: string } | null>(null);
  const [renameModalDoc, setRenameModalDoc] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const userId = user?._id || '';

  const handleCreate = async () => {
    try {
      setIsActionLoading(true);
      const createdDocument = await createDocument();
      navigate(`/documents/${createdDocument._id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRenameConfirm = async () => {
    if (!renameModalDoc || !newTitle.trim()) return;
    try {
      setIsActionLoading(true);
      await renameDocument(renameModalDoc.id, newTitle.trim());
      setRenameModalDoc(null);
    } catch (err) {
      console.error('Failed to rename document:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalDoc) return;
    try {
      setIsActionLoading(true);
      await deleteDocument(deleteModalDoc.id);
      setDeleteModalDoc(null);
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setIsActionLoading(true);
      await duplicateDocument(id);
    } catch (err) {
      console.error('Failed to duplicate document:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <DashboardLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      {/* Header: greeting + create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isSearching
                ? `Search results for "${searchQuery}"`
                : `Welcome back, ${user?.name || 'there'}`}
            </h1>
            {!isSearching && (
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                title={isConnected ? 'Connected to real-time server' : socketError || 'Disconnected'}
              />
            )}
          </div>
          {!isSearching && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your documents and collaborations
            </p>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={isActionLoading || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow-md shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isActionLoading && !deleteModalDoc && !renameModalDoc ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Document
        </button>
      </div>

      {/* States */}
      {error && (
        <div className="mb-8 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
          <p>Loading documents...</p>
        </div>
      ) : documents ? (
        isSearching ? (
          <DocumentSection
            title="Results"
            icon={<FolderOpen className="h-5 w-5 text-gray-500" />}
            documents={[...documents.owned, ...documents.shared]}
            currentUserId={userId}
            emptyMessage={`No documents matching "${searchQuery}".`}
            onRename={(id, title) => {
              setRenameModalDoc({ id, title });
              setNewTitle(title);
            }}
            onDuplicate={handleDuplicate}
            onDelete={(id) => setDeleteModalDoc({ id, title: documents.owned.find(d => d._id === id)?.title || 'this document' })}
          />
        ) : (
          <>
            {/* Recently Opened */}
            {documents.recentlyOpened.length > 0 && (
              <DocumentSection
                title="Recently Opened"
                icon={<Clock className="h-5 w-5 text-amber-500" />}
                documents={documents.recentlyOpened}
                currentUserId={userId}
                onRename={(id, title) => {
                  setRenameModalDoc({ id, title });
                  setNewTitle(title);
                }}
                onDuplicate={handleDuplicate}
                onDelete={(id) => setDeleteModalDoc({ id, title: documents.recentlyOpened.find(d => d._id === id)?.title || 'this document' })}
              />
            )}

            {/* My Documents */}
            <DocumentSection
              title="My Documents"
              icon={<FolderOpen className="h-5 w-5 text-blue-500" />}
              documents={documents.owned}
              currentUserId={userId}
              emptyMessage="You haven't created any documents yet. Click 'Create Document' to get started."
              onRename={(id, title) => {
                setRenameModalDoc({ id, title });
                setNewTitle(title);
              }}
              onDuplicate={handleDuplicate}
              onDelete={(id) => setDeleteModalDoc({ id, title: documents.owned.find(d => d._id === id)?.title || 'this document' })}
            />

            {/* Shared with Me */}
            <DocumentSection
              title="Shared with Me"
              icon={<Users className="h-5 w-5 text-violet-500" />}
              documents={documents.shared}
              currentUserId={userId}
              emptyMessage="No documents have been shared with you yet."
              onRename={(id, title) => {
                setRenameModalDoc({ id, title });
                setNewTitle(title);
              }}
              onDuplicate={handleDuplicate}
              onDelete={(id) => setDeleteModalDoc({ id, title: documents.shared.find(d => d._id === id)?.title || 'this document' })}
            />
          </>
        )
      ) : null}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalDoc}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteModalDoc?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isActionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalDoc(null)}
      />

      {/* Rename Modal (Reusing ConfirmModal layout manually for input) */}
      {renameModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => !isActionLoading && setRenameModalDoc(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rename Document</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={isActionLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter new document title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setRenameModalDoc(null);
              }}
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setRenameModalDoc(null)}
                disabled={isActionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameConfirm}
                disabled={isActionLoading || !newTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                {isActionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
