import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import Document from '../models/Document';
import User from '../models/User';
import { logger } from '../utils/logger';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  UserPresence,
} from './types';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: No cookies found'));
      }

      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=').map((c) => c.trim());
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const token = cookies['jwt'];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const decoded = jwt.verify(token, secret) as { userId: string };

      // Fetch user details for presence awareness
      const user = await User.findById(decoded.userId).select('name email avatarColor');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.data.userId = decoded.userId;
      socket.data.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error });
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);

    registerDocumentHandlers(socket);

    // Handle presence cleanup on disconnect
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('doc:')) {
          // Broadcast presence update after this socket leaves
          setTimeout(() => {
            broadcastPresence(room);
          }, 0);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} - Reason: ${reason}`);
    });
  });

  return io;
};

/**
 * Broadcast presence list to all users in a document room.
 * Deduplicates active users by user ID.
 */
async function broadcastPresence(room: string) {
  if (!io) return;
  try {
    const sockets = await io.in(room).fetchSockets();
    const userMap = new Map<string, UserPresence>();

    for (const s of sockets) {
      if (s.data.user) {
        userMap.set(s.data.user.id, s.data.user);
      }
    }

    const activeUsers = Array.from(userMap.values());
    io.to(room).emit('presence:update', activeUsers);
  } catch (error) {
    logger.error('Error broadcasting presence', { error });
  }
}

/**
 * Register document collaboration event handlers on a socket.
 */
function registerDocumentHandlers(socket: AppSocket) {
  // Join a document room after verifying access
  socket.on('document:join', async ({ documentId }, callback) => {
    try {
      const userId = socket.data.userId;
      const document = await Document.findById(documentId);

      if (!document) {
        return callback({ success: false, error: 'Document not found' });
      }

      const isOwner = document.owner.toString() === userId;
      const isCollaborator = document.collaborators.some(
        (c) => c.user.toString() === userId
      );

      if (!isOwner && !isCollaborator) {
        return callback({ success: false, error: 'Access denied' });
      }

      const room = `doc:${documentId}`;
      socket.join(room);
      logger.info(`User ${userId} joined room ${room}`);

      // Broadcast presence update to everyone in the room
      await broadcastPresence(room);

      callback({ success: true });
    } catch (error) {
      logger.error('Error joining document room', { error });
      callback({ success: false, error: 'Failed to join document' });
    }
  });

  // Leave a document room
  socket.on('document:leave', async ({ documentId }) => {
    const room = `doc:${documentId}`;
    socket.leave(room);
    logger.info(`User ${socket.data.userId} left room ${room}`);

    // Broadcast presence update after user leaves
    await broadcastPresence(room);
  });

  // Broadcast content changes to other users in the same document room
  socket.on('document:content', ({ documentId, content }) => {
    const room = `doc:${documentId}`;
    logger.info(`Broadcasting content update for room ${room} from user ${socket.data.userId}`);

    // Send to everyone in the room EXCEPT the sender
    socket.to(room).emit('document:content', {
      content,
      userId: socket.data.userId,
    });
  });
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
