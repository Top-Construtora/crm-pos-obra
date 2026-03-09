import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { AuthRequest, JwtPayload, UserRole } from '../types/index.js';
import { toCamel } from '../utils/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'assistencia-tecnica-secret-key';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token nao fornecido' });
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .eq('ativo', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Usuario nao encontrado ou inativo' });
    }

    req.user = toCamel(user);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido' });
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }

    next();
  };
};

export const generateToken = (user: any): string => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
