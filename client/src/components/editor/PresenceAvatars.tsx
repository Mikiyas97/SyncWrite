import type { UserPresence } from '../../api/socket';

interface PresenceAvatarsProps {
  users: UserPresence[];
  currentUserId?: string;
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

export const PresenceAvatars = ({ users, currentUserId }: PresenceAvatarsProps) => {
  if (!users || users.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const initials = getInitials(user.name);
        const bgColor = user.avatarColor || '#3B82F6';

        return (
          <div
            key={user.id}
            className="relative group cursor-pointer"
            title={`${user.name} (${user.email})${isSelf ? ' - You' : ''}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white shadow-sm ring-1 ring-black/5 select-none transition-transform group-hover:scale-110 group-hover:z-10"
              style={{ backgroundColor: bgColor }}
            >
              {initials}
            </div>

            {/* Online indicator dot */}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />

            {/* Hover Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1 rounded shadow-lg whitespace-nowrap">
                {user.name} {isSelf && <span className="text-gray-400 font-normal">(You)</span>}
              </div>
              <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
