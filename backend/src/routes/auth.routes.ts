import { Router, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// O login agora e feito no frontend via Supabase Auth (projeto GIO). O backend
// nao emite mais tokens proprios; ele apenas valida o access_token do Supabase.

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }
  res.json({ user: req.user });
});

// POST /api/auth/logout (o logout de fato ocorre no Supabase, no frontend)
router.post('/logout', authMiddleware, (_req, res: Response) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

export { router as authRoutes };
