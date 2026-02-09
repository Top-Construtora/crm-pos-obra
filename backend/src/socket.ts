import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from './types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'assistencia-tecnica-secret-key';

let io: SocketServer | null = null;

export function initSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token nao fornecido'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    // Join user-specific room for targeted notifications
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io
    });
  });

  console.log('Socket.IO initialized');
  return io;
}

export function getIO(): SocketServer | null {
  return io;
}
