import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { supabase } from './config/supabase.js';

// Autentica a conexao do socket com o mesmo access_token do Supabase (GIO),
// validado pelo proprio Supabase via getUser.

let io: SocketServer | null = null;

export function initSocket(server: HttpServer): SocketServer {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://crm-pos-obra-frontend.vercel.app',
    'https://crm-pos-obra.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  io = new SocketServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token nao fornecido'));
    }
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return next(new Error('Token invalido'));
      }
      socket.data.userId = data.user.id;
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
