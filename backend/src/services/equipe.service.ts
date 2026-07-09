// Equipe do Pos-Obra: resolve quem tem acesso (permissoes da GIO) e o papel
// operacional (pos_obra.membros). Modelo: a GIO libera (acesso_pos_obra);
// o Pos-Obra define o papel (GESTOR/TECNICO) na tela Equipe Tecnica.
// Requer SUPABASE_SERVICE_KEY (RLS de profiles bloqueia a anon key).
import { supabase, supabaseGioAdmin } from '../config/supabase.js';

export type PapelEquipe = 'GESTOR' | 'TECNICO';

export interface MembroEquipe {
  id: string;
  nome: string;
  roleGio: string;
  papel: PapelEquipe;
}

interface ProfileRow {
  id: string;
  name: string;
  role: string;
  ativo: boolean | null;
  permissions: unknown;
}

const PERM_ACESSO = 'acesso_pos_obra';

function requireAdmin() {
  if (!supabaseGioAdmin) {
    throw new Error('SUPABASE_SERVICE_KEY nao configurada no backend.');
  }
  return supabaseGioAdmin;
}

// Cache leve do mapa cargo -> default_permissions (evita 1 query por request).
let rolesCache: { data: Record<string, string[]>; expiraEm: number } | null = null;

async function mapaDefaultPermissions(): Promise<Record<string, string[]>> {
  const agora = Date.now();
  if (rolesCache && rolesCache.expiraEm > agora) return rolesCache.data;

  const { data, error } = await requireAdmin()
    .from('roles')
    .select('name, default_permissions');
  if (error) throw new Error(error.message);

  const mapa = Object.fromEntries(
    (data || []).map((r: any) => [r.name, Array.isArray(r.default_permissions) ? r.default_permissions : []]),
  );
  rolesCache = { data: mapa, expiraEm: agora + 60_000 };
  return mapa;
}

function permsDoProfile(p: ProfileRow, defaults: Record<string, string[]>): Set<string> {
  const proprias = Array.isArray(p.permissions) ? (p.permissions as string[]) : [];
  const doCargo = defaults[p.role] || [];
  return new Set([...proprias, ...doCargo]);
}

/** Papel salvo em pos_obra.membros (null = sem registro => TECNICO). */
export async function papelDoMembro(profileId: string): Promise<PapelEquipe | null> {
  const { data, error } = await supabase
    .from('membros')
    .select('role')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.role as PapelEquipe) || null;
}

/** Define o papel de um membro (upsert). */
export async function definirPapel(profileId: string, papel: PapelEquipe): Promise<void> {
  const { error } = await supabase
    .from('membros')
    .upsert({ profile_id: profileId, role: papel }, { onConflict: 'profile_id' });
  if (error) throw new Error(error.message);
}

/**
 * Resolucao de autorizacao do usuario logado (usada pelo middleware).
 * Fonte UNICA de papel: pos_obra.membros (GESTOR/TECNICO); admin GIO e gestor
 * automatico (bootstrap: um admin promove o primeiro gestor). A GIO concede
 * apenas a entrada (acesso_pos_obra).
 */
export async function resolverAutorizacao(userId: string): Promise<{
  nome: string | null;
  ativo: boolean;
  isAdminGio: boolean;
  temAcesso: boolean;
  podeGerenciar: boolean;
} | null> {
  const { data, error } = await requireAdmin()
    .from('profiles')
    .select('id, name, role, ativo, permissions')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const profile = data as ProfileRow;
  const ativo = profile.ativo !== false;
  const isAdminGio = profile.role === 'admin';

  const defaults = await mapaDefaultPermissions();
  const perms = permsDoProfile(profile, defaults);
  const temAcesso = isAdminGio || perms.has(PERM_ACESSO);

  let podeGerenciar = isAdminGio;
  if (!podeGerenciar && temAcesso) {
    podeGerenciar = (await papelDoMembro(userId)) === 'GESTOR';
  }

  return { nome: profile.name, ativo, isAdminGio, temAcesso, podeGerenciar };
}

/**
 * Lista a equipe do Pos-Obra: profiles ATIVOS da GIO com acesso_pos_obra,
 * excluindo admins (sao gestores implicitos e nao aparecem na tela).
 * Papel vem de pos_obra.membros (padrao TECNICO).
 */
export async function listarEquipe(): Promise<MembroEquipe[]> {
  const [{ data, error }, defaults] = await Promise.all([
    requireAdmin().from('profiles').select('id, name, role, ativo, permissions').order('name'),
    mapaDefaultPermissions(),
  ]);
  if (error) throw new Error(error.message);

  const elegiveis = ((data || []) as ProfileRow[]).filter((p) =>
    p.ativo !== false &&
    p.role !== 'admin' &&
    permsDoProfile(p, defaults).has(PERM_ACESSO),
  );

  if (elegiveis.length === 0) return [];

  const { data: membros, error: errMembros } = await supabase
    .from('membros')
    .select('profile_id, role')
    .in('profile_id', elegiveis.map((p) => p.id));
  if (errMembros) throw new Error(errMembros.message);

  const papelPorId = Object.fromEntries((membros || []).map((m: any) => [m.profile_id, m.role]));

  return elegiveis.map((p) => ({
    id: p.id,
    nome: p.name,
    roleGio: p.role,
    papel: (papelPorId[p.id] as PapelEquipe) || 'TECNICO',
  }));
}
