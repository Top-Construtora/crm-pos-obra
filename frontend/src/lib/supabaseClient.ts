import { createClient } from '@supabase/supabase-js'

// Cliente do Supabase Auth da GIO. O login do CRM Pos-Obra usa os mesmos
// usuarios da GIO (Supabase Auth); o access_token e enviado ao backend, que o
// valida e autoriza via gio_has_access.
const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY nao configurados no .env')
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'pos-obra-gio-auth',
  },
})
