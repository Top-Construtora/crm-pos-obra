import { createClient } from '@supabase/supabase-js';

// Banco principal - CRM Pos-Obra
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL ou SUPABASE_ANON_KEY nao configuradas. Configure no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Banco GIO - Dados compartilhados (obras, colaboradores)
const gioUrl = process.env.GIO_SUPABASE_URL || '';
const gioKey = process.env.GIO_SUPABASE_ANON_KEY || '';

if (!gioUrl || !gioKey) {
  console.warn('GIO_SUPABASE_URL ou GIO_SUPABASE_ANON_KEY nao configuradas. Configure no arquivo .env');
}

export const supabaseGio = gioUrl && gioKey
  ? createClient(gioUrl, gioKey)
  : null;
