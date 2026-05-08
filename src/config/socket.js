import { Server } from 'socket.io';
import { pubClient, subClient } from './redis.js';
import { createAdapter } from '@socket.io/redis-adapter';

let io;

export const initSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // restrict in production
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  await subClient.subscribe('socket-events');

  subClient.on('message', (channel, message) => {
    if (channel !== 'socket-events') return;
    try {
      const parsed = JSON.parse(message);

      if (!parsed.userId || !parsed.type) return;

      const room = io.sockets.adapter.rooms.get(parsed.userId);

      if (!room) {
        console.log('User not connected:', parsed.userId);
      }

      io.to(parsed.userId).emit(parsed.type, parsed.data);
    } catch (err) {
      console.error('Invalid message:', err.message);
    }
  });

  io.use((socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId;

      if (!userId) {
        return next(new Error('Unauthorized: userId missing'));
      }

      socket.userId = userId;

      next();
    } catch (err) {
      next(new Error(err.message || 'Socket auth failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(userId);

    console.log("Joined room:", socket.userId);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket not initialized');
  }
  return io;
};
