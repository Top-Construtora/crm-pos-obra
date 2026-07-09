import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest, UserRole } from '../types/index.js';

// Autenticacao via Supabase Auth da GIO: o frontend loga com o Supabase e envia
// o access_token; aqui validamos o token com supabase.auth.getUser (o proprio
// Supabase confirma a autenticidade) e autorizamos via public.gio_has_access
// (mesma logica de canAccessX da GIO). Os usuarios sao os de public.profiles.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Papeis GIO que sempre entram (alem de quem tiver a permissao granular).
const ROLES_ACESSO = ['admin'];

// Client no contexto do usuario (carrega o token) para que auth.uid() resolva
// dentro de gio_has_access e das policies.
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

    // Perfil (nome + ativo). RLS permite o usuario ler o proprio profile.
    const { data: profile } = await client
      .from('profiles')
      .select('name, ativo')
      .eq('id', userId)
      .single();

    if (profile && profile.ativo === false) {
      return res.status(403).json({ error: 'Usuario desativado' });
    }

    // Autorizacao pelo modulo Pos-Obra (permissoes da GIO).
    const temAcesso = await temPermissao(client, 'acesso_pos_obra');
    if (!temAcesso) {
      return res.status(403).json({ error: 'Sem acesso ao modulo Pos-Obra' });
    }

    const podeGerenciar = await temPermissao(client, 'gerenciar_pos_obra');

    req.user = {
      id: userId,
      nome: profile?.name || emailAuth || 'Usuario',
      email: emailAuth || '',
      role: podeGerenciar ? 'COORDENADOR' : 'TECNICO',
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
 * Exige que o usuario possa gerenciar (permissao gerenciar_pos_obra).
 * Substitui os antigos requireRoles('ADMIN'|'COORDENADOR').
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
 * Compatibilidade: mantem a assinatura antiga requireRoles(...). Como so
 * existem os papeis derivados COORDENADOR (gerencia) e TECNICO, qualquer lista
 * que inclua ADMIN/COORDENADOR exige poder gerenciar.
 */
export const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nao autenticado' });
    }
    const exigeGerenciar = roles.includes('ADMIN') || roles.includes('COORDENADOR');
    if (exigeGerenciar && !req.user.podeGerenciar) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }
    next();
  };
};
