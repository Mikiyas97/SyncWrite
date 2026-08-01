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

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  user?: UserPresence;
}
