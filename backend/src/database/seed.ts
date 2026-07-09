import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Seed leve: no novo modelo os USUARIOS vem de public.profiles (GIO) e as
// OBRAS de public.obras_top (GIO). O CRM nao tem mais tabelas users/
// empreendimentos, entao nao ha o que semear alem das configuracoes padrao.
// Os chamados de demonstracao devem ser criados pela propria aplicacao (assim
// referenciam profiles/obras reais). Este script apenas garante as settings.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'pos_obra' },
});

const SETTINGS_PADRAO = [
  { chave: 'sla_padrao', valor: '48' },
  { chave: 'categorias_ativas', valor: 'HIDRAULICA,ELETRICA,PINTURA,ESQUADRIAS,IMPERMEABILIZACAO,ESTRUTURAL,OUTROS' },
  { chave: 'email_habilitado', valor: 'false' },
  { chave: 'nome_sistema', valor: 'CRM Pos-Obra' },
];

async function seed() {
  console.log('Garantindo settings padrao...');

  const { error } = await supabase
    .from('settings')
    .upsert(SETTINGS_PADRAO, { onConflict: 'chave', ignoreDuplicates: true });

  if (error) throw error;

  console.log('Settings garantidas.');
  console.log('\nUsuarios vem de public.profiles (GIO) e obras de public.obras_top (GIO).');
  console.log('Chamados de demonstracao devem ser criados pela aplicacao.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
