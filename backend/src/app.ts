import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './database/data-source.js';
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { empreendimentosRoutes } from './routes/empreendimentos.routes.js';
import { chamadosRoutes } from './routes/chamados.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 3333;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/empreendimentos', empreendimentosRoutes);
app.use('/api/chamados', chamadosRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error middleware
app.use(errorMiddleware);

// Initialize database and start server
AppDataSource.initialize()
  .then(async () => {
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error initializing database:', error);
    process.exit(1);
  });

export default app;
