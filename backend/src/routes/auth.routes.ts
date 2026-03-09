import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { authMiddleware, generateToken } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { toCamel, sanitizeUser } from '../utils/db.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('ativo', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const userCamel = toCamel(user);
    const token = generateToken(userCamel);

    res.json({
      user: sanitizeUser(userCamel),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    res.json({ user: sanitizeUser(req.user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (_req, res: Response) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

export { router as authRoutes };
