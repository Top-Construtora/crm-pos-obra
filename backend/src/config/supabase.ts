import { createClient } from '@supabase/supabase-js';

// Banco principal - CRM Pos-Obra
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL ou SUPABASE_ANON_KEY nao configuradas. Configure no arquivo .env');
}

// As tabelas do CRM ficam num schema dedicado (pos_obra) dentro do
// Supabase da GIO, isolado do public. Lembre de expor "pos_obra" em
// Project Settings > API > Exposed schemas.
//
// SERVICE KEY obrigatoria aqui: o acesso anonimo ao schema pos_obra foi
// revogado na GIO (migration 20260721100000_pos_obra_revoke_anon) porque a
// anon key e publica — so o backend (service_role, BYPASSRLS) acessa os dados.
const dataKey = process.env.SUPABASE_SERVICE_KEY || supabaseKey;
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn('SUPABASE_SERVICE_KEY ausente: usando anon key para pos_obra — as consultas falharao (grants de anon revogados).');
}

export const supabase = createClient(supabaseUrl, dataKey, {
  db: { schema: 'pos_obra' },
  auth: { persistSession: false, autoRefreshToken: false },
});

// Banco GIO - Dados compartilhados (obras, colaboradores)
const gioUrl = process.env.GIO_SUPABASE_URL || '';
const gioKey = process.env.GIO_SUPABASE_ANON_KEY || '';

if (!gioUrl || !gioKey) {
  console.warn('GIO_SUPABASE_URL ou GIO_SUPABASE_ANON_KEY nao configuradas. Configure no arquivo .env');
}

export const supabaseGio = gioUrl && gioKey
  ? createClient(gioUrl, gioKey)
  : null;

// Client ADMIN (service_role) do banco GIO — ignora RLS. Usado APENAS no
// backend para lookups de public.profiles/roles (nomes, permissoes, equipe):
// a RLS da GIO permite SELECT em profiles somente para "authenticated", e o
// backend opera com anon key. NUNCA expor esta key ao frontend.
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!serviceKey) {
  console.warn('SUPABASE_SERVICE_KEY nao configurada. Nomes de usuarios e a tela Equipe Tecnica nao funcionarao (RLS de profiles bloqueia a anon key).');
}

export const supabaseGioAdmin = serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
