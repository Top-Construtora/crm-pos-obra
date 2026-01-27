import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/data-source.js';
import { User } from '../entities/User.js';
import { authMiddleware, generateToken } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await userRepository.findOne({ where: { email, ativo: true } });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken(user);

    res.json({
      user: user.toJSON(),
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
      return res.status(401).json({ error: 'Não autenticado' });
    }

    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (_req, res: Response) => {
  // JWT não tem logout server-side, apenas remove no cliente
  res.json({ message: 'Logout realizado com sucesso' });
});

export { router as authRoutes };
