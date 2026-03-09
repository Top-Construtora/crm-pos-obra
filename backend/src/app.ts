import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { initSocket } from './socket.js';
import { supabase } from './config/supabase.js';
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { empreendimentosRoutes } from './routes/empreendimentos.routes.js';
import { chamadosRoutes } from './routes/chamados.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { notificacoesRoutes } from './routes/notificacoes.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { classificacaoRoutes } from './routes/classificacao.routes.js';
import { portalClienteRoutes } from './routes/portal-cliente.routes.js';
import { agendaRoutes } from './routes/agenda.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3333;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  exposedHeaders: ['X-Total-Count'],
}));
app.use(express.json());

// Routes
app.use('/api/portal-cliente', portalClienteRoutes); // Public route
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/empreendimentos', empreendimentosRoutes);
app.use('/api/chamados', chamadosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/classificacao', classificacaoRoutes);
app.use('/api/agenda', agendaRoutes);

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', async (_, res) => {
  // Test Supabase connection
  const { error } = await supabase.from('settings').select('id').limit(1);
  res.json({
    status: error ? 'degraded' : 'ok',
    timestamp: new Date().toISOString(),
    database: error ? `error: ${error.message}` : 'connected',
  });
});

// Error middleware
app.use(errorMiddleware);

// Initialize Socket.IO and start server
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
