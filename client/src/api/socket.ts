import { io, Socket } from 'socket.io-client';

export interface UserPresence {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
}

export interface ServerToClientEvents {
  error: (error: { message: string }) => void;
  'document:content': (data: { content: Record<string, any>; userId: string }) => void;
  'document:joined': (data: { userId: string }) => void;
  'document:left': (data: { userId: string }) => void;
  'presence:update': (users: UserPresence[]) => void;
}

export interface ClientToServerEvents {
  'document:join': (data: { documentId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'document:leave': (data: { documentId: string }) => void;
  'document:content': (data: { documentId: string; content: Record<string, any> }) => void;
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
