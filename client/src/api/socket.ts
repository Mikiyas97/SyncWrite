import { io, Socket } from 'socket.io-client';

export interface ServerToClientEvents {
  error: (error: { message: string }) => void;
}

export interface ClientToServerEvents {
}

// The API URL might be '/api', but we need to connect to the root namespace '/'
// If VITE_API_URL is an absolute URL (e.g., http://localhost:5000/api), we extract the origin.
// Otherwise, we just use '/' to rely on Vite's proxy for /socket.io
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '/';
  if (apiUrl.startsWith('http')) {
    return new URL(apiUrl).origin;
  }
  return '/';
};

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getSocketUrl(), {
  autoConnect: false, // Connect manually when authenticated
  withCredentials: true, // Send cookies with socket requests
});
