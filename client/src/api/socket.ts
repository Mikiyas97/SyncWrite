import { io, Socket } from 'socket.io-client';

export interface UserPresence {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
}

export interface CursorPosition {
  from: number;
  to: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  cursor: CursorPosition | null;
}

export interface ServerToClientEvents {
  error: (error: { message: string }) => void;
  'document:content': (data: { content: Record<string, any>; userId: string }) => void;
  'document:joined': (data: { userId: string }) => void;
  'document:left': (data: { userId: string }) => void;
  'presence:update': (users: UserPresence[]) => void;
  'version:created': (data: { documentId: string; version: any }) => void;
  'comment:updated': (data: { documentId: string }) => void;
  'cursor:update': (data: RemoteCursor) => void;
  'typing:start': (data: { userId: string; userName: string }) => void;
  'typing:stop': (data: { userId: string }) => void;
}

export interface ClientToServerEvents {
  'document:join': (data: { documentId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'document:leave': (data: { documentId: string }) => void;
  'document:content': (data: { documentId: string; content: Record<string, any> }) => void;
  'cursor:update': (data: { documentId: string; cursor: CursorPosition | null }) => void;
  'typing:start': (data: { documentId: string }) => void;
  'typing:stop': (data: { documentId: string }) => void;
}

// Connect to the root namespace. Vite proxies /socket.io to the backend.
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '/';
  if (apiUrl.startsWith('http')) {
    return new URL(apiUrl).origin;
  }
  return '/';
};

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getSocketUrl(), {
  autoConnect: false,
  withCredentials: true,
});

