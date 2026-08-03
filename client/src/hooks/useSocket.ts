import { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../api/socket';
import type { UserPresence, RemoteCursor, CursorPosition } from '../api/socket';

/**
 * Manages the Socket.IO connection lifecycle.
 * Keeps the socket connected across page transitions while authenticated.
 */
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setError(null);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onConnectError(err: Error) {
      setError(err.message);
    }

    function onSocketError(err: { message: string }) {
      setError(err.message);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('error', onSocketError);

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('error', onSocketError);
      // Note: Do NOT disconnect socket on component unmount so socket connection
      // persists across page/route transitions.
    };
  }, []);

  return { isConnected, error, socket };
};

export interface TypingUser {
  userId: string;
  userName: string;
}

/**
 * Joins a document room, handles incoming content changes, tracks online presence,
 * remote cursors, and typing indicators.
 * Automatically re-joins room if socket reconnects.
 */
export const useDocumentSocket = (
  documentId: string | undefined,
  onRemoteContent: (content: Record<string, any>, userId: string) => void,
) => {
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const onRemoteContentRef = useRef(onRemoteContent);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    onRemoteContentRef.current = onRemoteContent;
  }, [onRemoteContent]);

  useEffect(() => {
    if (!documentId) return;

    let isCancelled = false;

    const joinRoom = () => {
      if (!socket.connected) return;
      socket.emit('document:join', { documentId }, (response) => {
        if (isCancelled) return;
        if (response.success) {
          setIsJoined(true);
          setJoinError(null);
        } else {
          setIsJoined(false);
          setJoinError(response.error || 'Failed to join document room');
        }
      });
    };

    // Handle remote content changes
    const handleRemoteContent = (data: { content: Record<string, any>; userId: string }) => {
      onRemoteContentRef.current(data.content, data.userId);
    };

    // Handle presence updates and clean up inactive cursors & typing indicators
    const handlePresenceUpdate = (users: UserPresence[]) => {
      if (!isCancelled) {
        setActiveUsers(users);
        const activeIds = new Set(users.map((u) => u.id));
        setRemoteCursors((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const userId of next.keys()) {
            if (!activeIds.has(userId)) {
              next.delete(userId);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        setTypingUsers((prev) => prev.filter((u) => activeIds.has(u.userId)));
      }
    };

    // Handle remote cursor updates
    const handleCursorUpdate = (data: RemoteCursor) => {
      if (isCancelled) return;
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        if (data.cursor === null) {
          next.delete(data.userId);
        } else {
          next.set(data.userId, data);
        }
        return next;
      });
    };

    // Handle typing indicators
    const handleTypingStart = (data: { userId: string; userName: string }) => {
      if (isCancelled) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, userName: data.userName }];
      });
      // Auto-clear after 4 seconds in case we miss a stop event
      const existingTimeout = typingTimeoutsRef.current.get(data.userId);
      if (existingTimeout) clearTimeout(existingTimeout);
      typingTimeoutsRef.current.set(
        data.userId,
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          typingTimeoutsRef.current.delete(data.userId);
        }, 4000),
      );
    };

    const handleTypingStop = (data: { userId: string }) => {
      if (isCancelled) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      const existingTimeout = typingTimeoutsRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutsRef.current.delete(data.userId);
      }
    };

    socket.on('document:content', handleRemoteContent);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('cursor:update', handleCursorUpdate);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('connect', joinRoom);

    // If already connected, join room immediately
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      isCancelled = true;
      socket.off('document:content', handleRemoteContent);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('cursor:update', handleCursorUpdate);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('connect', joinRoom);

      if (socket.connected) {
        socket.emit('document:leave', { documentId });
      }
      setIsJoined(false);
      setActiveUsers([]);
      setRemoteCursors(new Map());
      setTypingUsers([]);

      // Clear all typing timeouts
      for (const timeout of typingTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      typingTimeoutsRef.current.clear();
    };
  }, [documentId]);

  const emitContentChange = useCallback(
    (content: Record<string, any>) => {
      if (!documentId || !socket.connected) return;
      socket.emit('document:content', { documentId, content });
    },
    [documentId],
  );

  const emitCursorUpdate = useCallback(
    (cursor: CursorPosition | null) => {
      if (!documentId || !socket.connected) return;
      socket.emit('cursor:update', { documentId, cursor });
    },
    [documentId],
  );

  const emitTypingStart = useCallback(() => {
    if (!documentId || !socket.connected) return;
    socket.emit('typing:start', { documentId });
  }, [documentId]);

  const emitTypingStop = useCallback(() => {
    if (!documentId || !socket.connected) return;
    socket.emit('typing:stop', { documentId });
  }, [documentId]);

  return {
    isJoined,
    joinError,
    activeUsers,
    remoteCursors,
    typingUsers,
    emitContentChange,
    emitCursorUpdate,
    emitTypingStart,
    emitTypingStop,
  };
};

