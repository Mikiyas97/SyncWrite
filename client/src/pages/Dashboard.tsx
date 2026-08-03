import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { DashboardStatCards } from '../components/documents/DashboardStatCards';
import { DocumentTableView } from '../components/documents/DocumentTableView';
import { DocumentCard } from '../components/documents/DocumentCard';
import { RecentlyOpenedWidget } from '../components/documents/RecentlyOpenedWidget';
import { SharedWithYouWidget } from '../components/documents/SharedWithYouWidget';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useSocket } from '../hooks/useSocket';
import type { Document } from '../types/document';
import {
  Plus,
  FolderOpen,
  Loader2,
  AlertCircle,
  List as ListIcon,
  LayoutGrid,
  ChevronDown,
  ArrowRight,
  ChevronUp,
} from 'lucide-react';

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
    toggleFavoriteDocument,
    togglePinDocument,
  } = useDocuments();

  // Layout view & filter state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterCategory, setFilterCategory] = useState<'all' | 'pinned' | 'favorites' | 'owned' | 'shared'>('all');
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [starredDocIds, setStarredDocIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('syncwrite_starred_docs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal states
  const [deleteModalDoc, setDeleteModalDoc] = useState<{ id: string; title: string } | null>(null);
  const [renameModalDoc, setRenameModalDoc] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const userId = user?._id || '';

  const handleToggleStar = (id: string) => {
    toggleFavoriteDocument(id).catch((err) => console.error('Failed to toggle favorite:', err));
  };

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

  // Helper to ensure pinned documents are always pinned at the top
  const sortByPinnedAndRecent = (list: Document[]): Document[] => {
    return [...list].sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  // Filter documents according to selected category and search query
  const filteredDocuments = (): Document[] => {
    if (!documents) return [];
    let baseList: Document[] = [];
    if (filterCategory === 'pinned') {
      baseList = documents.pinned || [];
    } else if (filterCategory === 'favorites') {
      baseList = sortByPinnedAndRecent(documents.favorites || []);
    } else if (filterCategory === 'owned') {
      baseList = sortByPinnedAndRecent(documents.owned || []);
    } else if (filterCategory === 'shared') {
      baseList = sortByPinnedAndRecent(documents.shared || []);
    } else {
      const docMap = new Map<string, Document>();
      const allDocs = [...documents.owned, ...documents.shared];
      allDocs.forEach((d) => docMap.set(d._id, d));
      baseList = sortByPinnedAndRecent(Array.from(docMap.values()));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return baseList.filter((doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.owner?.name?.toLowerCase().includes(query)
      );
    }

    return baseList;
  };

  const allFilteredDocs = filteredDocuments();
  // Show max 10 documents by default unless expanded
  const displayedDocs = showAllDocs ? allFilteredDocs : allFilteredDocs.slice(0, 10);

  const allCount = documents ? documents.owned.length + documents.shared.length : 0;
  const ownedCount = documents ? documents.owned.length : 0;
  const sharedCount = documents ? documents.shared.length : 0;
  const recentCount = documents ? documents.recentlyOpened.length : 0;
  const pinnedCount = documents ? (documents.pinned?.length || 0) : 0;
  const favoriteCount = documents ? (documents.favorites?.length || 0) : 0;

  return (
    <DashboardLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {isSearching
                ? `Search results for "${searchQuery}"`
                : `Welcome back, ${user?.name || 'there'}`}
            </h1>
            {!isSearching && (
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-green-500 ring-4 ring-green-100 dark:ring-green-950/40' : 'bg-red-500 ring-4 ring-red-100 dark:ring-red-950/40'
                }`}
                title={isConnected ? 'Connected to real-time server' : socketError || 'Disconnected'}
              />
            )}
          </div>
          {!isSearching && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Manage your workspace documents, collaborations, and projects
            </p>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={isActionLoading || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-xs hover:shadow-md shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isActionLoading && !deleteModalDoc && !renameModalDoc ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Document
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Top 5 Summary Stat Cards */}
      {documents && !isSearching && (
        <DashboardStatCards
          allCount={allCount}
          ownedCount={ownedCount}
          sharedCount={sharedCount}
          recentCount={recentCount}
          pinnedCount={pinnedCount}
          favoriteCount={favoriteCount}
          activeCategory={filterCategory}
          onSelectCategory={(category) => {
            setFilterCategory(category);
            setShowAllDocs(false);
          }}
        />
      )}

      {/* Main Body */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
          <p className="text-sm font-medium">Loading your workspace documents...</p>
        </div>
      ) : documents ? (
        isSearching ? (
          /* Search Results Full Section */
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Search Results
              </h2>
              <span className="text-xs text-gray-400 font-medium">
                ({allFilteredDocs.length})
              </span>
            </div>

            <DocumentTableView
              documents={allFilteredDocs}
              currentUserId={userId}
              onToggleFavorite={toggleFavoriteDocument}
              onTogglePin={togglePinDocument}
              onRename={(id, title) => {
                setRenameModalDoc({ id, title });
                setNewTitle(title);
              }}
              onDuplicate={handleDuplicate}
              onDelete={(id) =>
                setDeleteModalDoc({
                  id,
                  title: allFilteredDocs.find((d) => d._id === id)?.title || 'this document',
                })
              }
              emptyMessage={`No documents matching "${searchQuery}".`}
            />
          </div>
        ) : (
          /* Main 2-Column Split Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Your Documents Card (8/12 width) */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-6 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  {/* Header: Title + Filter + View Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700/80 mb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {filterCategory === 'pinned'
                          ? 'Pinned Documents'
                          : filterCategory === 'favorites'
                          ? 'Favorite Documents'
                          : filterCategory === 'owned'
                          ? 'Owned Documents'
                          : filterCategory === 'shared'
                          ? 'Shared Documents'
                          : 'Your Documents'}
                      </h2>
                      <span className="text-xs text-gray-400 font-medium">
                        ({allFilteredDocs.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Filter Dropdown */}
                      <div className="relative">
                        <select
                          value={filterCategory}
                          onChange={(e) => {
                            setFilterCategory(e.target.value as any);
                            setShowAllDocs(false);
                          }}
                          className="appearance-none bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="all">All Documents</option>
                          <option value="pinned">Pinned Documents</option>
                          <option value="favorites">Favorite Documents</option>
                          <option value="owned">Owned by me</option>
                          <option value="shared">Shared with me</option>
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                      </div>

                      {/* View Mode Toggle Switch */}
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'list'
                              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                              : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                          title="List view"
                        >
                          <ListIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'grid'
                              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                              : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                          title="Grid view"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List View or Grid View rendering */}
                  {viewMode === 'list' ? (
                    <DocumentTableView
                      documents={displayedDocs}
                      currentUserId={userId}
                      onToggleFavorite={toggleFavoriteDocument}
                      onTogglePin={togglePinDocument}
                      onRename={(id, title) => {
                        setRenameModalDoc({ id, title });
                        setNewTitle(title);
                      }}
                      onDuplicate={handleDuplicate}
                      onDelete={(id) =>
                        setDeleteModalDoc({
                          id,
                          title: displayedDocs.find((d) => d._id === id)?.title || 'this document',
                        })
                      }
                      emptyMessage={
                        filterCategory === 'pinned'
                          ? "You haven't pinned any documents yet."
                          : filterCategory === 'favorites'
                          ? "You haven't favorited any documents yet."
                          : filterCategory === 'owned'
                          ? "You haven't created any documents yet."
                          : filterCategory === 'shared'
                          ? 'No documents have been shared with you.'
                          : 'No documents found.'
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {displayedDocs.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-xs text-gray-400 dark:text-gray-500">
                          {filterCategory === 'pinned'
                            ? "You haven't pinned any documents yet."
                            : filterCategory === 'favorites'
                            ? "You haven't favorited any documents yet."
                            : filterCategory === 'owned'
                            ? "You haven't created any documents yet."
                            : filterCategory === 'shared'
                            ? 'No documents have been shared with you.'
                            : 'No documents found.'}
                        </div>
                      ) : (
                        displayedDocs.map((doc) => (
                          <DocumentCard
                            key={doc._id}
                            document={doc}
                            currentUserId={userId}
                            onToggleFavorite={toggleFavoriteDocument}
                            onTogglePin={togglePinDocument}
                            onRename={(id, title) => {
                              setRenameModalDoc({ id, title });
                              setNewTitle(title);
                            }}
                            onDuplicate={handleDuplicate}
                            onDelete={(id) =>
                              setDeleteModalDoc({
                                id,
                                title: displayedDocs.find((d) => d._id === id)?.title || 'this document',
                              })
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Navigation / View All Link */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/80 mt-6 flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Showing {displayedDocs.length} of {allFilteredDocs.length} documents
                  </p>
                  {allFilteredDocs.length > 10 && (
                    <button
                      onClick={() => setShowAllDocs((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors focus:outline-none"
                    >
                      <span>{showAllDocs ? 'Show fewer' : `View all documents (${allFilteredDocs.length})`}</span>
                      {showAllDocs ? <ChevronUp className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sidebar Widgets (4/12 width) */}
            <div className="lg:col-span-4 flex flex-col space-y-6">
              <RecentlyOpenedWidget
                documents={documents.recentlyOpened}
                currentUserId={userId}
                onSeeAll={() => {
                  setFilterCategory('all');
                  setShowAllDocs(true);
                }}
              />
              <SharedWithYouWidget
                documents={documents.shared}
                currentUserId={userId}
                onSeeAll={() => {
                  setFilterCategory('shared');
                  setShowAllDocs(true);
                }}
              />
            </div>
          </div>
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

      {/* Rename Modal */}
      {renameModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs"
            onClick={() => !isActionLoading && setRenameModalDoc(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
              Rename Document
            </h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={isActionLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
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
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameConfirm}
                disabled={isActionLoading || !newTitle.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70"
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
