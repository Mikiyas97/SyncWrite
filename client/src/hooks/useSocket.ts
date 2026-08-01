import { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../api/socket';
import type { UserPresence } from '../api/socket';

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

/**
 * Joins a document room, handles incoming content changes, and tracks online presence.
 * Automatically re-joins room if socket reconnects.
 */
export const useDocumentSocket = (
  documentId: string | undefined,
  onRemoteContent: (content: Record<string, any>, userId: string) => void,
) => {
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const onRemoteContentRef = useRef(onRemoteContent);

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

    // Handle presence updates
    const handlePresenceUpdate = (users: UserPresence[]) => {
      if (!isCancelled) {
        setActiveUsers(users);
      }
    };

    socket.on('document:content', handleRemoteContent);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('connect', joinRoom);

    // If already connected, join room immediately
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      isCancelled = true;
      socket.off('document:content', handleRemoteContent);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('connect', joinRoom);

      if (socket.connected) {
        socket.emit('document:leave', { documentId });
      }
      setIsJoined(false);
      setActiveUsers([]);
    };
  }, [documentId]);

  const emitContentChange = useCallback(
    (content: Record<string, any>) => {
      if (!documentId || !socket.connected) return;
      socket.emit('document:content', { documentId, content });
    },
    [documentId],
  );

  return { isJoined, joinError, activeUsers, emitContentChange };
};
