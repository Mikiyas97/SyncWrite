import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import {
  X,
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Crown,
  Search,
} from 'lucide-react';
import {
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  searchUsers,
} from '../../services/documentService';
import type { Document, DocumentRole } from '../../types/document';
import { useAuth } from '../../hooks/useAuth';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onDocumentUpdate: (updatedDoc: Document) => void;
}

interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const ShareModal = ({
  isOpen,
  onClose,
  document,
  onDocumentUpdate,
}: ShareModalProps) => {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer' | 'commenter'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // User search state
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !document) return null;

  const isOwner = currentUser?._id === document.owner._id;

  // Debounced user search
  const handleEmailChange = (value: string) => {
    setEmail(value);

    // Clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Only search if owner and input is long enough
    if (!isOwner || value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(value.trim());

        // Filter out users who are already collaborators or the owner
        const existingIds = new Set([
          document.owner._id,
          ...document.collaborators.map((c) => c.user._id),
        ]);
        const filtered = results.filter((u) => !existingIds.has(u._id));

        setSearchResults(filtered);
        setShowDropdown(filtered.length > 0);
      } catch {
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const selectUser = (user: UserSearchResult) => {
    setEmail(user.email);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleAddCollaborator = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      setShowDropdown(false);

      const updated = await addCollaborator(document._id, email.trim(), role);
      onDocumentUpdate(updated);
      setEmail('');
      setSearchResults([]);
      setSuccessMessage('Collaborator added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'editor' | 'viewer' | 'commenter') => {
    try {
      setActionLoadingId(userId);
      setError(null);
      const updated = await updateCollaboratorRole(document._id, userId, newRole);
      onDocumentUpdate(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      setActionLoadingId(userId);
      setError(null);
      await removeCollaborator(document._id, userId);

      // If user removed themselves, close modal
      if (userId === currentUser?._id) {
        onClose();
        return;
      }

      // Update local state by removing collaborator
      const updatedCollaborators = document.collaborators.filter(
        (c) => c.user._id !== userId
      );
      onDocumentUpdate({ ...document, collaborators: updatedCollaborators });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove collaborator');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="font-semibold text-gray-900">Share document</h3>
            <p className="text-xs text-gray-500 truncate max-w-[280px]">{document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Notifications */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-green-600 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Add Collaborator Form (Owner Only) */}
          {isOwner && (
            <form onSubmit={handleAddCollaborator} className="space-y-3">
              <label className="block text-xs font-medium text-gray-700">
                Add people by name or email
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                      onBlur={() => {
                        // Delay to allow click on dropdown
                        setTimeout(() => setShowDropdown(false), 200);
                      }}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectUser(result);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                            style={{ backgroundColor: result.avatarColor || '#3B82F6' }}
                          >
                            {getInitials(result.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                            <p className="text-xs text-gray-500 truncate">{result.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'editor' | 'viewer' | 'commenter')}
                  className="px-2.5 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 font-medium"
                >
                  <option value="viewer">Viewer</option>
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor</option>
                </select>

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Collaborators List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              People with access
            </h4>

            <div className="space-y-2 divide-y divide-gray-100">
              {/* Owner */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: document.owner.avatarColor || '#3B82F6' }}
                  >
                    {getInitials(document.owner.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {document.owner.name}{' '}
                      {currentUser?._id === document.owner._id && (
                        <span className="text-gray-400 font-normal">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{document.owner.email}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full shrink-0">
                  <Crown className="h-3 w-3" />
                  Owner
                </span>
              </div>

              {/* Collaborators */}
              {document.collaborators.map((c) => {
                const isCurrent = currentUser?._id === c.user._id;
                const isLoadingThis = actionLoadingId === c.user._id;

                return (
                  <div key={c.user._id} className="flex items-center justify-between py-2 pt-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ backgroundColor: c.user.avatarColor || '#3B82F6' }}
                      >
                        {getInitials(c.user.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {c.user.name} {isCurrent && <span className="text-gray-400 font-normal">(You)</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{c.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isLoadingThis ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : isOwner ? (
                        <>
                          <select
                            value={c.role}
                            onChange={(e) =>
                              handleRoleChange(
                                c.user._id,
                                e.target.value as DocumentRole & ('editor' | 'viewer' | 'commenter')
                              )
                            }
                            className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="commenter">Commenter</option>
                            <option value="editor">Editor</option>
                          </select>

                          <button
                            onClick={() => handleRemoveCollaborator(c.user._id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove access"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : isCurrent ? (
                        <div className="flex items-center gap-2">
                          <span className="capitalize px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                            {c.role}
                          </span>
                          <button
                            onClick={() => handleRemoveCollaborator(c.user._id)}
                            className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Leave document"
                          >
                            Leave
                          </button>
                        </div>
                      ) : (
                        <span className="capitalize px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                          {c.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
