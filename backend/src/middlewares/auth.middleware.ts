import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source.js';
import { User } from '../entities/User.js';
import { AuthRequest, JwtPayload, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'assistencia-tecnica-secret-key';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId, ativo: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    next();
  };
};

export const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
