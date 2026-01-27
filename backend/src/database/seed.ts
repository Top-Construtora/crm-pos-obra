import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source.js';
import { User } from '../entities/User.js';
import { Empreendimento } from '../entities/Empreendimento.js';
import { Chamado } from '../entities/Chamado.js';
import { Historico } from '../entities/Historico.js';
import { Comentario } from '../entities/Comentario.js';

async function seed() {
  await AppDataSource.initialize();
  console.log('Database initialized for seeding...');

  const userRepository = AppDataSource.getRepository(User);
  const empreendimentoRepository = AppDataSource.getRepository(Empreendimento);
  const chamadoRepository = AppDataSource.getRepository(Chamado);
  const historicoRepository = AppDataSource.getRepository(Historico);
  const comentarioRepository = AppDataSource.getRepository(Comentario);

  // Limpar tabelas usando query builder
  await comentarioRepository.createQueryBuilder().delete().execute();
  await historicoRepository.createQueryBuilder().delete().execute();
  await chamadoRepository.createQueryBuilder().delete().execute();
  await empreendimentoRepository.createQueryBuilder().delete().execute();
  await userRepository.createQueryBuilder().delete().execute();

  console.log('Tables cleared...');

  // Criar usuários
  const senhaHash = await bcrypt.hash('admin123', 10);
  const senhaCoord = await bcrypt.hash('coord123', 10);
  const senhaTec = await bcrypt.hash('tecnico123', 10);

  const users = await userRepository.save([
    {
      nome: 'Administrador',
      email: 'admin@empresa.com',
      senha: senhaHash,
      role: 'ADMIN' as const,
      ativo: true,
    },
    {
      nome: 'Carlos Coordenador',
      email: 'coord@empresa.com',
      senha: senhaCoord,
      role: 'COORDENADOR' as const,
      ativo: true,
    },
    {
      nome: 'João Silva',
      email: 'joao@empresa.com',
      senha: senhaTec,
      role: 'TECNICO' as const,
      ativo: true,
    },
    {
      nome: 'Maria Santos',
      email: 'maria@empresa.com',
      senha: senhaTec,
      role: 'TECNICO' as const,
      ativo: true,
    },
    {
      nome: 'Pedro Oliveira',
      email: 'pedro@empresa.com',
      senha: senhaTec,
      role: 'TECNICO' as const,
      ativo: true,
    },
  ]);

  console.log(`Created ${users.length} users`);

  // Criar empreendimentos
  const empreendimentos = await empreendimentoRepository.save([
    {
      nome: 'Residencial Aurora',
      endereco: 'Rua das Flores, 100 - Centro',
      ativo: true,
    },
    {
      nome: 'Edifício Solar',
      endereco: 'Av. Principal, 500 - Jardim América',
      ativo: true,
    },
    {
      nome: 'Condomínio Vista Verde',
      endereco: 'Rua do Parque, 200 - Vila Nova',
      ativo: true,
    },
    {
      nome: 'Comercial Center Plaza',
      endereco: 'Av. Comercial, 1000 - Centro',
      ativo: true,
    },
    {
      nome: 'Residencial Horizonte',
      endereco: 'Rua Nova, 300 - Alto da Boa Vista',
      ativo: true,
    },
  ]);

  console.log(`Created ${empreendimentos.length} empreendimentos`);

  // Criar chamados
  const admin = users[0];
  const coord = users[1];
  const tecnicos = users.slice(2);

  const agora = new Date();
  const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const doisDiasAtras = new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tresDiasAtras = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000);
  const cincoDiasAtras = new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000);

  const chamadosData = [
    // Chamados em aberto
    {
      numero: 1001,
      empreendimentoId: empreendimentos[0].id,
      unidade: 'Apto 101',
      clienteNome: 'Ana Paula Ferreira',
      clienteTelefone: '(11) 99999-1111',
      clienteEmail: 'ana.paula@email.com',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'HIDRAULICA' as const,
      descricao: 'Vazamento na torneira da cozinha. Água pingando constantemente.',
      prioridade: 'ALTA' as const,
      slaHoras: 24,
      status: 'ABERTO' as const,
      responsavelId: undefined,
      criadoPorId: coord.id,
      criadoEm: umDiaAtras,
    },
    {
      numero: 1002,
      empreendimentoId: empreendimentos[1].id,
      unidade: 'Apto 302',
      clienteNome: 'Roberto Mendes',
      clienteTelefone: '(11) 99999-2222',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'ELETRICA' as const,
      descricao: 'Tomada do quarto não está funcionando. Já verifiquei o disjuntor.',
      prioridade: 'MEDIA' as const,
      slaHoras: 48,
      status: 'ABERTO' as const,
      responsavelId: undefined,
      criadoPorId: admin.id,
      criadoEm: agora,
    },
    {
      numero: 1003,
      empreendimentoId: empreendimentos[2].id,
      unidade: 'Casa 15',
      clienteNome: 'Fernanda Lima',
      clienteTelefone: '(11) 99999-3333',
      clienteEmail: 'fernanda.lima@email.com',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'PINTURA' as const,
      descricao: 'Manchas de umidade na parede do banheiro.',
      prioridade: 'BAIXA' as const,
      slaHoras: 72,
      status: 'ABERTO' as const,
      responsavelId: tecnicos[0].id,
      criadoPorId: coord.id,
      criadoEm: doisDiasAtras,
    },
    // Chamados em andamento
    {
      numero: 1004,
      empreendimentoId: empreendimentos[0].id,
      unidade: 'Apto 205',
      clienteNome: 'Lucas Andrade',
      clienteTelefone: '(11) 99999-4444',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'ESQUADRIAS' as const,
      descricao: 'Porta do quarto não fecha corretamente. Precisa de ajuste.',
      prioridade: 'MEDIA' as const,
      slaHoras: 48,
      status: 'EM_ANDAMENTO' as const,
      responsavelId: tecnicos[1].id,
      criadoPorId: admin.id,
      criadoEm: doisDiasAtras,
    },
    {
      numero: 1005,
      empreendimentoId: empreendimentos[3].id,
      unidade: 'Sala 101',
      clienteNome: 'Empresa ABC Ltda',
      clienteTelefone: '(11) 99999-5555',
      clienteEmail: 'contato@empresaabc.com',
      tipo: 'COMERCIAL' as const,
      categoria: 'ELETRICA' as const,
      descricao: 'Ar condicionado central não está refrigerando adequadamente.',
      prioridade: 'URGENTE' as const,
      slaHoras: 8,
      status: 'EM_ANDAMENTO' as const,
      responsavelId: tecnicos[2].id,
      criadoPorId: coord.id,
      criadoEm: agora,
    },
    {
      numero: 1006,
      empreendimentoId: empreendimentos[1].id,
      unidade: 'Apto 401',
      clienteNome: 'Patricia Souza',
      clienteTelefone: '(11) 99999-6666',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'IMPERMEABILIZACAO' as const,
      descricao: 'Infiltração na laje da varanda durante chuvas.',
      prioridade: 'ALTA' as const,
      slaHoras: 24,
      status: 'EM_ANDAMENTO' as const,
      responsavelId: tecnicos[0].id,
      criadoPorId: admin.id,
      criadoEm: tresDiasAtras,
    },
    // Chamados aguardando
    {
      numero: 1007,
      empreendimentoId: empreendimentos[4].id,
      unidade: 'Casa 08',
      clienteNome: 'Marcos Pereira',
      clienteTelefone: '(11) 99999-7777',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'ESTRUTURAL' as const,
      descricao: 'Trinca na parede da sala, precisa de avaliação estrutural.',
      prioridade: 'ALTA' as const,
      slaHoras: 24,
      status: 'AGUARDANDO' as const,
      responsavelId: tecnicos[1].id,
      criadoPorId: coord.id,
      criadoEm: cincoDiasAtras,
    },
    {
      numero: 1008,
      empreendimentoId: empreendimentos[2].id,
      unidade: 'Casa 22',
      clienteNome: 'Juliana Costa',
      clienteTelefone: '(11) 99999-8888',
      clienteEmail: 'juliana.costa@email.com',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'HIDRAULICA' as const,
      descricao: 'Aguardando peça para reparo do registro do chuveiro.',
      prioridade: 'MEDIA' as const,
      slaHoras: 48,
      status: 'AGUARDANDO' as const,
      responsavelId: tecnicos[2].id,
      criadoPorId: admin.id,
      criadoEm: doisDiasAtras,
    },
    // Chamados finalizados
    {
      numero: 1009,
      empreendimentoId: empreendimentos[0].id,
      unidade: 'Apto 103',
      clienteNome: 'Ricardo Gomes',
      clienteTelefone: '(11) 99999-9999',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'PINTURA' as const,
      descricao: 'Retoque de pintura na área de serviço após reparo.',
      prioridade: 'BAIXA' as const,
      slaHoras: 72,
      status: 'FINALIZADO' as const,
      responsavelId: tecnicos[0].id,
      criadoPorId: coord.id,
      criadoEm: cincoDiasAtras,
      finalizadoEm: doisDiasAtras,
    },
    {
      numero: 1010,
      empreendimentoId: empreendimentos[1].id,
      unidade: 'Apto 201',
      clienteNome: 'Camila Ribeiro',
      clienteTelefone: '(11) 99998-1111',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'ELETRICA' as const,
      descricao: 'Troca de disjuntor que estava desarmando.',
      prioridade: 'MEDIA' as const,
      slaHoras: 48,
      status: 'FINALIZADO' as const,
      responsavelId: tecnicos[1].id,
      criadoPorId: admin.id,
      criadoEm: tresDiasAtras,
      finalizadoEm: umDiaAtras,
    },
    {
      numero: 1011,
      empreendimentoId: empreendimentos[3].id,
      unidade: 'Sala 205',
      clienteNome: 'Tech Solutions',
      clienteTelefone: '(11) 99998-2222',
      tipo: 'COMERCIAL' as const,
      categoria: 'OUTROS' as const,
      descricao: 'Instalação de suporte para TV na sala de reuniões.',
      prioridade: 'BAIXA' as const,
      slaHoras: 72,
      status: 'FINALIZADO' as const,
      responsavelId: tecnicos[2].id,
      criadoPorId: coord.id,
      criadoEm: cincoDiasAtras,
      finalizadoEm: tresDiasAtras,
    },
    // Mais chamados para variar
    {
      numero: 1012,
      empreendimentoId: empreendimentos[4].id,
      unidade: 'Casa 03',
      clienteNome: 'Eduardo Martins',
      clienteTelefone: '(11) 99998-3333',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'HIDRAULICA' as const,
      descricao: 'Entupimento no ralo do box do banheiro.',
      prioridade: 'MEDIA' as const,
      slaHoras: 24,
      status: 'ABERTO' as const,
      responsavelId: undefined,
      criadoPorId: admin.id,
      criadoEm: agora,
    },
    {
      numero: 1013,
      empreendimentoId: empreendimentos[0].id,
      unidade: 'Apto 504',
      clienteNome: 'Beatriz Almeida',
      clienteTelefone: '(11) 99998-4444',
      clienteEmail: 'beatriz@email.com',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'ESQUADRIAS' as const,
      descricao: 'Janela da sala com dificuldade para abrir.',
      prioridade: 'BAIXA' as const,
      slaHoras: 72,
      status: 'ABERTO' as const,
      responsavelId: tecnicos[0].id,
      criadoPorId: coord.id,
      criadoEm: umDiaAtras,
    },
    {
      numero: 1014,
      empreendimentoId: empreendimentos[2].id,
      unidade: 'Casa 11',
      clienteNome: 'Gabriel Santos',
      clienteTelefone: '(11) 99998-5555',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'IMPERMEABILIZACAO' as const,
      descricao: 'Umidade subindo pela parede do quarto.',
      prioridade: 'ALTA' as const,
      slaHoras: 24,
      status: 'EM_ANDAMENTO' as const,
      responsavelId: tecnicos[1].id,
      criadoPorId: admin.id,
      criadoEm: tresDiasAtras,
    },
    {
      numero: 1015,
      empreendimentoId: empreendimentos[1].id,
      unidade: 'Apto 102',
      clienteNome: 'Renata Dias',
      clienteTelefone: '(11) 99998-6666',
      tipo: 'RESIDENCIAL' as const,
      categoria: 'PINTURA' as const,
      descricao: 'Descascamento de tinta no teto do banheiro.',
      prioridade: 'BAIXA' as const,
      slaHoras: 72,
      status: 'FINALIZADO' as const,
      responsavelId: tecnicos[2].id,
      criadoPorId: coord.id,
      criadoEm: cincoDiasAtras,
      finalizadoEm: doisDiasAtras,
    },
  ];

  const chamados = await chamadoRepository.save(chamadosData);
  console.log(`Created ${chamados.length} chamados`);

  // Criar históricos para cada chamado
  for (const chamado of chamados) {
    // Histórico de criação
    await historicoRepository.save({
      chamadoId: chamado.id,
      tipo: 'CRIACAO' as const,
      descricao: `Chamado #${chamado.numero} criado`,
      usuarioId: chamado.criadoPorId,
    });

    // Se tem responsável, adiciona histórico de atribuição
    if (chamado.responsavelId) {
      const responsavel = users.find((u) => u.id === chamado.responsavelId);
      await historicoRepository.save({
        chamadoId: chamado.id,
        tipo: 'RESPONSAVEL' as const,
        descricao: `Chamado atribuído para ${responsavel?.nome}`,
        usuarioId: chamado.criadoPorId,
        dadosNovos: JSON.stringify({ responsavelId: chamado.responsavelId }),
      });
    }

    // Se não está em aberto, adiciona histórico de mudança de status
    if (chamado.status !== 'ABERTO') {
      await historicoRepository.save({
        chamadoId: chamado.id,
        tipo: 'STATUS' as const,
        descricao: `Status alterado para ${chamado.status}`,
        usuarioId: chamado.responsavelId || chamado.criadoPorId,
        dadosAnteriores: JSON.stringify({ status: 'ABERTO' }),
        dadosNovos: JSON.stringify({ status: chamado.status }),
      });
    }
  }

  console.log('Created historicos for all chamados');

  // Criar alguns comentários
  const comentariosData = [
    {
      chamadoId: chamados[3].id, // Em andamento
      texto: 'Agendada visita para amanhã às 14h.',
      usuarioId: tecnicos[1].id,
    },
    {
      chamadoId: chamados[4].id, // Urgente em andamento
      texto: 'Verificado o sistema. Problema no compressor.',
      usuarioId: tecnicos[2].id,
    },
    {
      chamadoId: chamados[4].id,
      texto: 'Peça de reposição já solicitada. Previsão de chegada em 2h.',
      usuarioId: tecnicos[2].id,
    },
    {
      chamadoId: chamados[6].id, // Aguardando
      texto: 'Aguardando retorno do engenheiro estrutural.',
      usuarioId: tecnicos[1].id,
    },
    {
      chamadoId: chamados[8].id, // Finalizado
      texto: 'Serviço concluído. Cliente satisfeito.',
      usuarioId: tecnicos[0].id,
    },
  ];

  await comentarioRepository.save(comentariosData);
  console.log(`Created ${comentariosData.length} comentarios`);

  console.log('\nSeed completed successfully!');
  console.log('\nUsuários criados:');
  console.log('  - admin@empresa.com / admin123 (ADMIN)');
  console.log('  - coord@empresa.com / coord123 (COORDENADOR)');
  console.log('  - joao@empresa.com / tecnico123 (TECNICO)');
  console.log('  - maria@empresa.com / tecnico123 (TECNICO)');
  console.log('  - pedro@empresa.com / tecnico123 (TECNICO)');

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
