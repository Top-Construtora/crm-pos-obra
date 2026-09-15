// Resolucao de pessoas a partir de public.profiles (banco GIO).
// Nao ha FK cross-schema entre pos_obra e public.profiles, entao os nomes
// sao resolvidos aqui, sob demanda, a partir dos uuids guardados nos chamados.
// Usa o client ADMIN (service key): a RLS de profiles so permite SELECT para
// "authenticated", e o backend opera com anon key (nomes viravam "-").
import { supabaseGio, supabaseGioAdmin } from '../config/supabase.js';

export interface Pessoa {
  id: string;
  nome: string;
}

/**
 * Mapa id -> nome a partir de profiles. Ignora ids nulos/duplicados.
 * Retorna {} se o client GIO nao estiver configurado ou a lista for vazia.
 */
export async function nomesDeProfiles(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unicos = [...new Set(ids.filter((v): v is string => !!v))];
  const client = supabaseGioAdmin || supabaseGio;
  if (unicos.length === 0 || !client) return {};

  const { data, error } = await client
    .from('profiles')
    .select('id, name')
    .in('id', unicos);

  if (error) {
    console.error('Erro ao resolver nomes de profiles:', error);
    return {};
  }

  return Object.fromEntries((data || []).map((p: any) => [p.id, p.name]));
}

/** Monta { id, nome } a partir de um id e do mapa de nomes (ou null). */
export function pessoaDe(id: string | null | undefined, nomes: Record<string, string>): Pessoa | null {
  if (!id) return null;
  return { id, nome: nomes[id] || '-' };
}
