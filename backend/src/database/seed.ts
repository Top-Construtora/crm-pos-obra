import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting seed...');

  // Limpar tabelas (ordem importa por causa dos FKs)
  await supabase.from('anexos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('materiais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('vistorias').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('comentarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('historicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notificacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('agenda_tecnica').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('chamados').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('empreendimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Tables cleared...');

  // Criar usuarios
  const senhaHash = await bcrypt.hash('admin123', 10);
  const senhaCoord = await bcrypt.hash('coord123', 10);
  const senhaTec = await bcrypt.hash('tecnico123', 10);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .insert([
      { nome: 'Administrador', email: 'admin@empresa.com', senha: senhaHash, role: 'ADMIN', ativo: true },
      { nome: 'Carlos Coordenador', email: 'coord@empresa.com', senha: senhaCoord, role: 'COORDENADOR', ativo: true },
      { nome: 'Joao Silva', email: 'joao@empresa.com', senha: senhaTec, role: 'TECNICO', ativo: true },
      { nome: 'Maria Santos', email: 'maria@empresa.com', senha: senhaTec, role: 'TECNICO', ativo: true },
      { nome: 'Pedro Oliveira', email: 'pedro@empresa.com', senha: senhaTec, role: 'TECNICO', ativo: true },
    ])
    .select();

  if (usersError) throw usersError;
  console.log(`Created ${users!.length} users`);

  const admin = users![0];
  const coord = users![1];
  const tecnicos = users!.slice(2);

  // Criar empreendimentos
  const { data: empreendimentos, error: empError } = await supabase
    .from('empreendimentos')
    .insert([
      { nome: 'Residencial Aurora', endereco: 'Rua das Flores, 100 - Centro', ativo: true },
      { nome: 'Edificio Solar', endereco: 'Av. Principal, 500 - Jardim America', ativo: true },
      { nome: 'Condominio Vista Verde', endereco: 'Rua do Parque, 200 - Vila Nova', ativo: true },
      { nome: 'Comercial Center Plaza', endereco: 'Av. Comercial, 1000 - Centro', ativo: true },
      { nome: 'Residencial Horizonte', endereco: 'Rua Nova, 300 - Alto da Boa Vista', ativo: true },
    ])
    .select();

  if (empError) throw empError;
  console.log(`Created ${empreendimentos!.length} empreendimentos`);

  const agora = new Date();
  const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const doisDiasAtras = new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tresDiasAtras = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000);
  const cincoDiasAtras = new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000);

  // Criar chamados
  const chamadosData = [
    { numero: 1001, empreendimento_id: empreendimentos![0].id, unidade: 'Apto 101', cliente_nome: 'Ana Paula Ferreira', cliente_telefone: '(11) 99999-1111', cliente_email: 'ana.paula@email.com', tipo: 'RESIDENCIAL', categoria: 'HIDRAULICA', descricao: 'Vazamento na torneira da cozinha.', prioridade: 'ALTA', sla_horas: 24, status: 'ABERTO', responsavel_id: null, criado_por_id: coord.id, criado_em: umDiaAtras.toISOString() },
    { numero: 1002, empreendimento_id: empreendimentos![1].id, unidade: 'Apto 302', cliente_nome: 'Roberto Mendes', cliente_telefone: '(11) 99999-2222', tipo: 'RESIDENCIAL', categoria: 'ELETRICA', descricao: 'Tomada do quarto nao funciona.', prioridade: 'MEDIA', sla_horas: 48, status: 'ABERTO', criado_por_id: admin.id, criado_em: agora.toISOString() },
    { numero: 1003, empreendimento_id: empreendimentos![2].id, unidade: 'Casa 15', cliente_nome: 'Fernanda Lima', cliente_telefone: '(11) 99999-3333', cliente_email: 'fernanda.lima@email.com', tipo: 'RESIDENCIAL', categoria: 'PINTURA', descricao: 'Manchas de umidade na parede.', prioridade: 'BAIXA', sla_horas: 72, status: 'ABERTO', responsavel_id: tecnicos[0].id, criado_por_id: coord.id, criado_em: doisDiasAtras.toISOString() },
    { numero: 1004, empreendimento_id: empreendimentos![0].id, unidade: 'Apto 205', cliente_nome: 'Lucas Andrade', cliente_telefone: '(11) 99999-4444', tipo: 'RESIDENCIAL', categoria: 'ESQUADRIAS', descricao: 'Porta nao fecha corretamente.', prioridade: 'MEDIA', sla_horas: 48, status: 'EM_ANDAMENTO', responsavel_id: tecnicos[1].id, criado_por_id: admin.id, criado_em: doisDiasAtras.toISOString() },
    { numero: 1005, empreendimento_id: empreendimentos![3].id, unidade: 'Sala 101', cliente_nome: 'Empresa ABC Ltda', cliente_telefone: '(11) 99999-5555', cliente_email: 'contato@empresaabc.com', tipo: 'COMERCIAL', categoria: 'ELETRICA', descricao: 'Ar condicionado nao refrigera.', prioridade: 'URGENTE', sla_horas: 8, status: 'EM_ANDAMENTO', responsavel_id: tecnicos[2].id, criado_por_id: coord.id, criado_em: agora.toISOString() },
    { numero: 1006, empreendimento_id: empreendimentos![1].id, unidade: 'Apto 401', cliente_nome: 'Patricia Souza', cliente_telefone: '(11) 99999-6666', tipo: 'RESIDENCIAL', categoria: 'IMPERMEABILIZACAO', descricao: 'Infiltracao na laje da varanda.', prioridade: 'ALTA', sla_horas: 24, status: 'EM_ANDAMENTO', responsavel_id: tecnicos[0].id, criado_por_id: admin.id, criado_em: tresDiasAtras.toISOString() },
    { numero: 1007, empreendimento_id: empreendimentos![4].id, unidade: 'Casa 08', cliente_nome: 'Marcos Pereira', cliente_telefone: '(11) 99999-7777', tipo: 'RESIDENCIAL', categoria: 'ESTRUTURAL', descricao: 'Trinca na parede da sala.', prioridade: 'ALTA', sla_horas: 24, status: 'AGUARDANDO', responsavel_id: tecnicos[1].id, criado_por_id: coord.id, criado_em: cincoDiasAtras.toISOString() },
    { numero: 1008, empreendimento_id: empreendimentos![2].id, unidade: 'Casa 22', cliente_nome: 'Juliana Costa', cliente_telefone: '(11) 99999-8888', cliente_email: 'juliana.costa@email.com', tipo: 'RESIDENCIAL', categoria: 'HIDRAULICA', descricao: 'Aguardando peca para reparo do registro.', prioridade: 'MEDIA', sla_horas: 48, status: 'AGUARDANDO', responsavel_id: tecnicos[2].id, criado_por_id: admin.id, criado_em: doisDiasAtras.toISOString() },
    { numero: 1009, empreendimento_id: empreendimentos![0].id, unidade: 'Apto 103', cliente_nome: 'Ricardo Gomes', cliente_telefone: '(11) 99999-9999', tipo: 'RESIDENCIAL', categoria: 'PINTURA', descricao: 'Retoque de pintura na area de servico.', prioridade: 'BAIXA', sla_horas: 72, status: 'FINALIZADO', responsavel_id: tecnicos[0].id, criado_por_id: coord.id, criado_em: cincoDiasAtras.toISOString(), finalizado_em: doisDiasAtras.toISOString() },
    { numero: 1010, empreendimento_id: empreendimentos![1].id, unidade: 'Apto 201', cliente_nome: 'Camila Ribeiro', cliente_telefone: '(11) 99998-1111', tipo: 'RESIDENCIAL', categoria: 'ELETRICA', descricao: 'Troca de disjuntor.', prioridade: 'MEDIA', sla_horas: 48, status: 'FINALIZADO', responsavel_id: tecnicos[1].id, criado_por_id: admin.id, criado_em: tresDiasAtras.toISOString(), finalizado_em: umDiaAtras.toISOString() },
  ];

  const { data: chamados, error: chamError } = await supabase
    .from('chamados')
    .insert(chamadosData)
    .select();

  if (chamError) throw chamError;
  console.log(`Created ${chamados!.length} chamados`);

  // Criar historicos
  const historicosData: any[] = [];
  for (const chamado of chamados!) {
    historicosData.push({
      chamado_id: chamado.id,
      tipo: 'CRIACAO',
      descricao: `Chamado #${chamado.numero} criado`,
      usuario_id: chamado.criado_por_id,
    });

    if (chamado.responsavel_id) {
      historicosData.push({
        chamado_id: chamado.id,
        tipo: 'RESPONSAVEL',
        descricao: 'Responsavel atribuido',
        usuario_id: chamado.criado_por_id,
        dados_novos: JSON.stringify({ responsavelId: chamado.responsavel_id }),
      });
    }

    if (chamado.status !== 'ABERTO') {
      historicosData.push({
        chamado_id: chamado.id,
        tipo: 'STATUS',
        descricao: `Status alterado para ${chamado.status}`,
        usuario_id: chamado.responsavel_id || chamado.criado_por_id,
        dados_anteriores: JSON.stringify({ status: 'ABERTO' }),
        dados_novos: JSON.stringify({ status: chamado.status }),
      });
    }
  }

  await supabase.from('historicos').insert(historicosData);
  console.log('Created historicos');

  // Criar comentarios
  await supabase.from('comentarios').insert([
    { chamado_id: chamados![3].id, texto: 'Agendada visita para amanha as 14h.', usuario_id: tecnicos[1].id },
    { chamado_id: chamados![4].id, texto: 'Verificado o sistema. Problema no compressor.', usuario_id: tecnicos[2].id },
    { chamado_id: chamados![4].id, texto: 'Peca de reposicao ja solicitada.', usuario_id: tecnicos[2].id },
    { chamado_id: chamados![6].id, texto: 'Aguardando retorno do engenheiro estrutural.', usuario_id: tecnicos[1].id },
    { chamado_id: chamados![8].id, texto: 'Servico concluido. Cliente satisfeito.', usuario_id: tecnicos[0].id },
  ]);
  console.log('Created comentarios');

  console.log('\nSeed completed successfully!');
  console.log('\nUsuarios criados:');
  console.log('  - admin@empresa.com / admin123 (ADMIN)');
  console.log('  - coord@empresa.com / coord123 (COORDENADOR)');
  console.log('  - joao@empresa.com / tecnico123 (TECNICO)');
  console.log('  - maria@empresa.com / tecnico123 (TECNICO)');
  console.log('  - pedro@empresa.com / tecnico123 (TECNICO)');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
