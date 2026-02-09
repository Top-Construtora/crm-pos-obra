import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zgfbxlnbkaoqtibtbpcx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.warn('SUPABASE_ANON_KEY não configurada. Configure no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
