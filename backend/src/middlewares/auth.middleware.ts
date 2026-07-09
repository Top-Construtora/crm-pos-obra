import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest, UserRole } from '../types/index.js';
import { supabaseGioAdmin } from '../config/supabase.js';
import { resolverAutorizacao } from '../services/equipe.service.js';

// Autenticacao via Supabase Auth da GIO: o frontend loga com o Supabase e envia
// o access_token; aqui validamos o token com supabase.auth.getUser (o proprio
// Supabase confirma a autenticidade). Autorizacao — fonte unica de papel:
// acesso_pos_obra (GIO) permite entrar; o papel (GESTOR/TECNICO) vem de
// pos_obra.membros; admin GIO e gestor automatico.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Client so para validar o token do usuario (auth.getUser).
function clientDoUsuario(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // SUPABASE_SERVICE_KEY e obrigatoria: sem ela nao ha acesso aos dados do
    // pos_obra (grants de anon revogados) nem resolucao de perfil/papel.
    if (!supabaseGioAdmin) {
      return res.status(503).json({ error: 'Backend mal configurado: SUPABASE_SERVICE_KEY ausente' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token nao fornecido' });
    }

    const [, token] = authHeader.split(' ');
    if (!token) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    // Valida o token direto no Supabase (autenticidade garantida por ele).
    const { data: auth, error: authError } = await clientDoUsuario(token).auth.getUser(token);
    if (authError || !auth.user) {
      return res.status(401).json({ error: 'Token invalido' });
    }

    const userId = auth.user.id;
    const emailAuth = auth.user.email;

    const autz = await resolverAutorizacao(userId);
    if (!autz) {
      return res.status(403).json({ error: 'Perfil nao encontrado na GIO' });
    }
    if (!autz.ativo) {
      return res.status(403).json({ error: 'Usuario desativado' });
    }
    if (!autz.temAcesso) {
      return res.status(403).json({ error: 'Sem acesso ao modulo Pos-Obra' });
    }

    const role: UserRole = autz.isAdminGio ? 'ADMIN' : autz.podeGerenciar ? 'COORDENADOR' : 'TECNICO';

    req.user = {
      id: userId,
      nome: autz.nome || emailAuth || 'Usuario',
      email: emailAuth || '',
      role,
      podeGerenciar: autz.podeGerenciar,
      ativo: true,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Token invalido' });
  }
};

/**
 * Exige que o usuario possa gerenciar (gestor definido na Equipe Tecnica ou
 * admin GIO).
 */
export const requireGerenciar = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }
  if (!req.user.podeGerenciar) {
    return res.status(403).json({ error: 'Acesso nao autorizado' });
  }
  next();
};

/**
 * Papel exigido por rota. Admin GIO (role ADMIN) passa em qualquer checagem;
 * demais precisam estar na lista (ex.: requireRoles('ADMIN') = so admin GIO).
 */
export const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }
    const ok = req.user.role === 'ADMIN' || roles.includes(req.user.role);
    if (!ok) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }
    next();
  };
};
