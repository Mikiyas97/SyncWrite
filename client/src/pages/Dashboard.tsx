import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { DocumentSection } from '../components/documents/DocumentSection';
import { mockDocuments, CURRENT_USER_ID } from '../data/mockDocuments';
import { Plus, FolderOpen, Users, Clock } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Use the real user ID if available, fall back to mock
  const userId = user?._id || CURRENT_USER_ID;

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return mockDocuments;
    const query = searchQuery.toLowerCase();
    return mockDocuments.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.owner.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Categorize documents
  const myDocuments = useMemo(
    () => filteredDocuments.filter((doc) => doc.owner._id === userId),
    [filteredDocuments, userId]
  );

  const sharedWithMe = useMemo(
    () =>
      filteredDocuments.filter(
        (doc) =>
          doc.owner._id !== userId &&
          doc.collaborators.some((c) => c._id === userId)
      ),
    [filteredDocuments, userId]
  );

  const recentlyOpened = useMemo(
    () =>
      filteredDocuments
        .filter((doc) => doc.lastOpenedAt)
        .sort(
          (a, b) =>
            new Date(b.lastOpenedAt!).getTime() -
            new Date(a.lastOpenedAt!).getTime()
        )
        .slice(0, 6),
    [filteredDocuments]
  );

  const isSearching = searchQuery.trim().length > 0;

  return (
    <DashboardLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      {/* Header: greeting + create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSearching
              ? `Search results for "${searchQuery}"`
              : `Welcome back, ${user?.name || 'there'}`}
          </h1>
          {!isSearching && (
            <p className="text-sm text-gray-500 mt-1">
              Manage your documents and collaborations
            </p>
          )}
        </div>

        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow-md shrink-0">
          <Plus className="h-4 w-4" />
          Create Document
        </button>
      </div>

      {/* Search results (flat list) */}
      {isSearching ? (
        <DocumentSection
          title="Results"
          icon={<FolderOpen className="h-5 w-5 text-gray-500" />}
          documents={filteredDocuments}
          currentUserId={userId}
          emptyMessage={`No documents matching "${searchQuery}".`}
        />
      ) : (
        <>
          {/* Recently Opened */}
          <DocumentSection
            title="Recently Opened"
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            documents={recentlyOpened}
            currentUserId={userId}
            emptyMessage="You haven't opened any documents yet."
          />

          {/* My Documents */}
          <DocumentSection
            title="My Documents"
            icon={<FolderOpen className="h-5 w-5 text-blue-500" />}
            documents={myDocuments}
            currentUserId={userId}
            emptyMessage="You haven't created any documents yet. Click 'Create Document' to get started."
          />

          {/* Shared with Me */}
          <DocumentSection
            title="Shared with Me"
            icon={<Users className="h-5 w-5 text-violet-500" />}
            documents={sharedWithMe}
            currentUserId={userId}
            emptyMessage="No documents have been shared with you yet."
          />
        </>
      )}
    </DashboardLayout>
  );
};
