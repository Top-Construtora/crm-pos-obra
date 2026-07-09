import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest, UserRole } from '../types/index.js';
import { supabaseGioAdmin } from '../config/supabase.js';
import { resolverAutorizacao } from '../services/equipe.service.js';

// Autenticacao via Supabase Auth da GIO: o frontend loga com o Supabase e envia
// o access_token; aqui validamos o token com supabase.auth.getUser (o proprio
// Supabase confirma a autenticidade). A autorizacao segue o modelo
// "GIO libera, Pos-Obra define": acesso_pos_obra (GIO) permite entrar; o papel
// (GESTOR/TECNICO) vem de pos_obra.membros; admin GIO e gestor sempre.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Papeis GIO que sempre entram (alem de quem tiver a permissao granular).
const ROLES_ACESSO = ['admin'];

// Client no contexto do usuario (carrega o token) para que auth.uid() resolva
// dentro de gio_has_access e das policies (usado no fallback sem service key).
function clientDoUsuario(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function temPermissao(client: ReturnType<typeof clientDoUsuario>, perm: string): Promise<boolean> {
  const { data, error } = await client.rpc('gio_has_access', {
    allowed_roles: ROLES_ACESSO,
    allowed_perms: [perm],
  });
  if (error) {
    console.error(`Erro em gio_has_access(${perm}):`, error.message);
    return false;
  }
  return data === true;
}

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

    const client = clientDoUsuario(token);

    // Valida o token direto no Supabase (autenticidade garantida por ele).
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) {
      return res.status(401).json({ error: 'Token invalido' });
    }

    const userId = auth.user.id;
    const emailAuth = auth.user.email;

    let nome: string | null = null;
    let role: UserRole = 'TECNICO';
    let podeGerenciar = false;

    if (supabaseGioAdmin) {
      // Caminho principal: resolve perfil + permissoes efetivas + papel da
      // equipe com a service key (1-2 queries, roles cacheados).
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
      nome = autz.nome;
      podeGerenciar = autz.podeGerenciar;
      role = autz.isAdminGio ? 'ADMIN' : podeGerenciar ? 'COORDENADOR' : 'TECNICO';
    } else {
      // Fallback sem SUPABASE_SERVICE_KEY: autoriza via gio_has_access com o
      // token do usuario (sem papel da equipe; nomes podem ficar vazios).
      const { data: profile } = await client
        .from('profiles')
        .select('name, ativo')
        .eq('id', userId)
        .single();

      if (profile && profile.ativo === false) {
        return res.status(403).json({ error: 'Usuario desativado' });
      }

      const temAcesso = await temPermissao(client, 'acesso_pos_obra');
      if (!temAcesso) {
        return res.status(403).json({ error: 'Sem acesso ao modulo Pos-Obra' });
      }

      nome = profile?.name || null;
      podeGerenciar = await temPermissao(client, 'gerenciar_pos_obra');
      role = podeGerenciar ? 'COORDENADOR' : 'TECNICO';
    }

    req.user = {
      id: userId,
      nome: nome || emailAuth || 'Usuario',
      email: emailAuth || '',
      role,
      podeGerenciar,
      ativo: true,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Token invalido' });
  }
};

/**
 * Exige que o usuario possa gerenciar (gestor da equipe, gerenciar_pos_obra
 * na GIO ou admin GIO).
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
