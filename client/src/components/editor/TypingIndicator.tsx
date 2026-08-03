import type { TypingUser } from '../../hooks/useSocket';
import { PenTool } from 'lucide-react';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

/**
 * Animated typing indicator showing which collaborators are currently typing.
 * Displays as a subtle bar below the toolbar with bouncing dots animation.
 */
export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.userName.split(' ')[0]);
  let text: string;

  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing...`;
  }

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-blue-50/90 dark:bg-blue-950/60 border-b border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 animate-in fade-in slide-in-from-top-1 duration-200 shrink-0">
      <div className="flex items-center gap-2 font-medium">
        <PenTool className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 animate-pulse" />
        <span>{text}</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
};
