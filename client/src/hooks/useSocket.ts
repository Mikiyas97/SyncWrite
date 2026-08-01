import { useEffect, useState, useRef } from 'react';
import { socket } from '../api/socket';

/**
 * Manages the Socket.IO connection lifecycle.
 * Call this once at the top level (e.g., Dashboard or App) to keep the socket connected
 * while the user is authenticated.
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
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('error', onSocketError);
      socket.disconnect();
    };
  }, []);

  return { isConnected, error, socket };
};

/**
 * Joins a document room and handles incoming content changes.
 * Returns a function to emit local content changes to other users.
 */
export const useDocumentSocket = (
  documentId: string | undefined,
  onRemoteContent: (content: Record<string, any>, userId: string) => void,
) => {
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const onRemoteContentRef = useRef(onRemoteContent);

  // Keep the callback ref fresh without re-running the effect
  useEffect(() => {
    onRemoteContentRef.current = onRemoteContent;
  }, [onRemoteContent]);

  useEffect(() => {
    if (!documentId || !socket.connected) return;

    let isCancelled = false;

    // Listen for remote content changes
    const handleRemoteContent = (data: { content: Record<string, any>; userId: string }) => {
      onRemoteContentRef.current(data.content, data.userId);
    };

    socket.on('document:content', handleRemoteContent);

    // Join the document room
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

    return () => {
      isCancelled = true;
      socket.off('document:content', handleRemoteContent);
      socket.emit('document:leave', { documentId });
      setIsJoined(false);
    };
  }, [documentId, socket.connected]);

  // Function to broadcast local changes
  const emitContentChange = (content: Record<string, any>) => {
    if (!documentId || !isJoined) return;
    socket.emit('document:content', { documentId, content });
  };

  return { isJoined, joinError, emitContentChange };
};
