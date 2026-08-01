import { useEffect, useState } from 'react';
import { socket } from '../api/socket';

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

    // Connect manually
    socket.connect();

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
