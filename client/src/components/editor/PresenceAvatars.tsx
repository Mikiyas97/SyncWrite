import { useState, useRef, useEffect } from 'react';
import type { UserPresence } from '../../api/socket';
import type { TypingUser } from '../../hooks/useSocket';
import type { Document, DocumentRole } from '../../types/document';
import { X, Crown, ShieldCheck, Eye, MessageSquare, PenTool } from 'lucide-react';

export interface CurrentUserProp {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  avatarColor?: string;
}

interface PresenceAvatarsProps {
  users: UserPresence[];
  typingUsers?: TypingUser[];
  currentUserId?: string;
  currentUser?: CurrentUserProp | null;
  document?: Document | null;
}

/**
 * Get initials from user name (e.g. "John Doe" -> "JD")
 */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getRoleBadge(role: DocumentRole) {
  switch (role) {
    case 'owner':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 rounded-md shrink-0">
          <Crown className="h-2.5 w-2.5" />
          Owner
        </span>
      );
    case 'editor':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 rounded-md shrink-0">
          <ShieldCheck className="h-2.5 w-2.5" />
          Editor
        </span>
      );
    case 'commenter':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/50 rounded-md shrink-0">
          <MessageSquare className="h-2.5 w-2.5" />
          Commenter
        </span>
      );
    case 'viewer':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-md shrink-0">
          <Eye className="h-2.5 w-2.5" />
          Viewer
        </span>
      );
  }
}

export const PresenceAvatars = ({
  users = [],
  typingUsers = [],
  currentUserId,
  currentUser,
  document: doc,
}: PresenceAvatarsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selfId = currentUserId || currentUser?._id || currentUser?.id;
  const activeIds = new Set(users.map((u) => u.id));
  if (selfId) activeIds.add(selfId);

  const typingUserIds = new Set((typingUsers || []).map((u) => u.userId));

  // Format typing text for header pill
  let typingText = '';
  if (typingUsers && typingUsers.length > 0) {
    const names = typingUsers.map((u) => u.userName.split(' ')[0]);
    if (names.length === 1) {
      typingText = `${names[0]} typing...`;
    } else if (names.length === 2) {
      typingText = `${names[0]} & ${names[1]} typing...`;
    } else {
      typingText = `${names[0]} & ${names.length - 1} others...`;
    }
  }

  // Combine document members and active socket users
  interface CombinedUser {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    role: DocumentRole;
    isOnline: boolean;
  }

  const userMap = new Map<string, CombinedUser>();

  // Add document owner
  if (doc?.owner) {
    userMap.set(doc.owner._id, {
      id: doc.owner._id,
      name: doc.owner.name,
      email: doc.owner.email,
      avatarColor: doc.owner.avatarColor || '#3B82F6',
      role: 'owner',
      isOnline: activeIds.has(doc.owner._id),
    });
  }

  // Add document collaborators
  if (doc?.collaborators) {
    for (const c of doc.collaborators) {
      if (c.user && c.user._id) {
        userMap.set(c.user._id, {
          id: c.user._id,
          name: c.user.name,
          email: c.user.email,
          avatarColor: c.user.avatarColor || '#3B82F6',
          role: c.role || 'viewer',
          isOnline: activeIds.has(c.user._id),
        });
      }
    }
  }

  // Add current user if not already in map
  if (currentUser && selfId && !userMap.has(selfId)) {
    userMap.set(selfId, {
      id: selfId,
      name: currentUser.name,
      email: currentUser.email,
      avatarColor: currentUser.avatarColor || '#3B82F6',
      role: doc?.owner._id === selfId ? 'owner' : 'editor',
      isOnline: true,
    });
  }

  // Add any additional active socket users
  for (const u of users) {
    if (u && u.id && !userMap.has(u.id)) {
      userMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor || '#3B82F6',
        role: 'editor',
        isOnline: true,
      });
    }
  }

  const allMembers = Array.from(userMap.values());
  const onlineMembers = allMembers.filter((m) => m.isOnline);
  const offlineMembers = allMembers.filter((m) => !m.isOnline);

  if (allMembers.length === 0) return null;

  const maxVisible = 4;
  const visibleAvatars = onlineMembers.length > 0 ? onlineMembers.slice(0, maxVisible) : allMembers.slice(0, maxVisible);
  const overflowCount = (onlineMembers.length > 0 ? onlineMembers.length : allMembers.length) - maxVisible;

  return (
    <div className="flex items-center gap-2" ref={containerRef}>
      {/* Trigger Button / Avatars Stack */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center -space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          title="Click to view people in document editor"
        >
          {visibleAvatars.map((user) => {
            const initials = getInitials(user.name);
            const bgColor = user.avatarColor || '#3B82F6';

            return (
              <div key={user.id} className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white dark:border-gray-800 shadow-sm ring-1 ring-black/5 select-none transition-transform hover:scale-105"
                  style={{ backgroundColor: bgColor }}
                >
                  {initials}
                </div>
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800" />
                )}
              </div>
            );
          })}

          {overflowCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-sm ring-1 ring-black/5">
              +{overflowCount}
            </div>
          )}
        </button>

        {/* Profile Details Dropdown List */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Document Members ({onlineMembers.length} Online)
                </h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Users List */}
            <div className="p-2 max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
              {/* Online Section */}
              {onlineMembers.length > 0 && (
                <div className="space-y-1 pb-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Active Now ({onlineMembers.length})
                  </div>
                  {onlineMembers.map((user) => {
                    const isSelf = user.id === selfId;
                    const isTyping = typingUserIds.has(user.id);
                    const initials = getInitials(user.name);

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                              style={{ backgroundColor: user.avatarColor }}
                            >
                              {initials}
                            </div>
                            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {user.name}
                              </p>
                              {isSelf && (
                                <span className="px-1 py-0.2 text-[9px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded shrink-0 border border-blue-100 dark:border-blue-900/50">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isTyping ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full shrink-0 border border-blue-200 dark:border-blue-900/50 animate-pulse">
                              <PenTool className="h-2.5 w-2.5 animate-pulse" />
                              Typing...
                            </span>
                          ) : (
                            getRoleBadge(user.role)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Offline Section */}
              {offlineMembers.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Offline ({offlineMembers.length})
                  </div>
                  {offlineMembers.map((user) => {
                    const initials = getInitials(user.name);

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg transition-colors opacity-75"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm grayscale"
                              style={{ backgroundColor: user.avatarColor }}
                            >
                              {initials}
                            </div>
                            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600 ring-2 ring-white dark:ring-gray-800" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                              {user.name}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {getRoleBadge(user.role)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Typing Indicator Badge Next to Profiles */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 rounded-full text-[11px] font-medium text-blue-600 dark:text-blue-400 animate-in fade-in zoom-in duration-150 shrink-0 select-none shadow-sm">
          <PenTool className="h-3 w-3 text-blue-500 dark:text-blue-400 animate-pulse shrink-0" />
          <span className="truncate max-w-[80px] sm:max-w-[110px] font-semibold">{typingText}</span>
          <div className="flex items-center gap-0.5 ml-0.5 shrink-0">
            <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
    </div>
  );
};
