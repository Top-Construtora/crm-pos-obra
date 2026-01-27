import { Router, Response } from 'express';
import { Like, In } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { Chamado } from '../entities/Chamado.js';
import { Historico } from '../entities/Historico.js';
import { Comentario } from '../entities/Comentario.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { AuthRequest, ChamadoStatus } from '../types/index.js';
import { calcularSLA } from '../utils/sla.js';

const router = Router();
const chamadoRepository = AppDataSource.getRepository(Chamado);
const historicoRepository = AppDataSource.getRepository(Historico);
const comentarioRepository = AppDataSource.getRepository(Comentario);

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/chamados
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, empreendimentoId, categoria, responsavelId, prioridade, busca } = req.query;
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('chamado.responsavel', 'responsavel')
      .leftJoinAndSelect('chamado.criadoPor', 'criadoPor')
      .orderBy('chamado.criadoEm', 'DESC');

    // Filtro por perfil: técnico vê apenas seus chamados
    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavelId = :userId', { userId: user.id });
    }

    // Filtros opcionais
    if (status) {
      queryBuilder.andWhere('chamado.status = :status', { status });
    }
    if (empreendimentoId) {
      queryBuilder.andWhere('chamado.empreendimentoId = :empreendimentoId', { empreendimentoId });
    }
    if (categoria) {
      queryBuilder.andWhere('chamado.categoria = :categoria', { categoria });
    }
    if (responsavelId) {
      queryBuilder.andWhere('chamado.responsavelId = :responsavelId', { responsavelId });
    }
    if (prioridade) {
      queryBuilder.andWhere('chamado.prioridade = :prioridade', { prioridade });
    }
    if (busca) {
      queryBuilder.andWhere(
        '(chamado.clienteNome LIKE :busca OR chamado.descricao LIKE :busca OR chamado.unidade LIKE :busca OR CAST(chamado.numero AS TEXT) LIKE :busca)',
        { busca: `%${busca}%` }
      );
    }

    const chamados = await queryBuilder.getMany();

    // Adicionar info de SLA
    const chamadosComSLA = chamados.map((chamado) => ({
      ...chamado,
      slaInfo: calcularSLA(chamado),
    }));

    res.json(chamadosComSLA);
  } catch (error) {
    console.error('List chamados error:', error);
    res.status(500).json({ error: 'Erro ao listar chamados' });
  }
});

// GET /api/chamados/kanban
router.get('/kanban', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { empreendimentoId, categoria, responsavelId } = req.query;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('chamado.responsavel', 'responsavel')
      .orderBy('chamado.prioridade', 'DESC')
      .addOrderBy('chamado.criadoEm', 'ASC');

    // Filtro por perfil
    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavelId = :userId', { userId: user.id });
    }

    // Filtros opcionais
    if (empreendimentoId) {
      queryBuilder.andWhere('chamado.empreendimentoId = :empreendimentoId', { empreendimentoId });
    }
    if (categoria) {
      queryBuilder.andWhere('chamado.categoria = :categoria', { categoria });
    }
    if (responsavelId) {
      queryBuilder.andWhere('chamado.responsavelId = :responsavelId', { responsavelId });
    }

    const chamados = await queryBuilder.getMany();

    // Organizar por status
    const kanban = {
      ABERTO: [] as any[],
      EM_ANDAMENTO: [] as any[],
      AGUARDANDO: [] as any[],
      FINALIZADO: [] as any[],
    };

    chamados.forEach((chamado) => {
      const chamadoComSLA = {
        ...chamado,
        slaInfo: calcularSLA(chamado),
      };
      kanban[chamado.status].push(chamadoComSLA);
    });

    res.json(kanban);
  } catch (error) {
    console.error('Get kanban error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do kanban' });
  }
});

// GET /api/chamados/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const chamado = await chamadoRepository.findOne({
      where: { id: req.params.id },
      relations: ['empreendimento', 'responsavel', 'criadoPor', 'historico', 'historico.usuario', 'comentarios', 'comentarios.usuario'],
      order: {
        historico: { criadoEm: 'DESC' },
        comentarios: { criadoEm: 'DESC' },
      },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar permissão (técnico só vê seus chamados)
    const user = req.user!;
    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    res.json({
      ...chamado,
      slaInfo: calcularSLA(chamado),
    });
  } catch (error) {
    console.error('Get chamado error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamado' });
  }
});

// POST /api/chamados
router.post('/', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      empreendimentoId,
      unidade,
      clienteNome,
      clienteTelefone,
      clienteEmail,
      tipo,
      categoria,
      descricao,
      prioridade,
      slaHoras,
      responsavelId,
    } = req.body;

    // Validações
    if (!empreendimentoId || !unidade || !clienteNome || !clienteTelefone || !tipo || !categoria || !descricao || !prioridade || !slaHoras) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    // Gerar número do chamado
    const ultimoChamado = await chamadoRepository.findOne({
      order: { numero: 'DESC' },
    });
    const novoNumero = ultimoChamado ? ultimoChamado.numero + 1 : 1001;

    const chamado = chamadoRepository.create({
      numero: novoNumero,
      empreendimentoId,
      unidade,
      clienteNome,
      clienteTelefone,
      clienteEmail,
      tipo,
      categoria,
      descricao,
      prioridade,
      slaHoras,
      status: 'ABERTO',
      responsavelId: responsavelId || null,
      criadoPorId: user.id,
    });

    await chamadoRepository.save(chamado);

    // Criar histórico de criação
    await historicoRepository.save({
      chamadoId: chamado.id,
      tipo: 'CRIACAO',
      descricao: `Chamado #${chamado.numero} criado`,
      usuarioId: user.id,
    });

    // Se tem responsável, criar histórico de atribuição
    if (responsavelId) {
      await historicoRepository.save({
        chamadoId: chamado.id,
        tipo: 'RESPONSAVEL',
        descricao: 'Responsável atribuído',
        usuarioId: user.id,
        dadosNovos: JSON.stringify({ responsavelId }),
      });
    }

    // Recarregar com relacionamentos
    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ['empreendimento', 'responsavel', 'criadoPor'],
    });

    res.status(201).json({
      ...chamadoCompleto,
      slaInfo: calcularSLA(chamadoCompleto!),
    });
  } catch (error) {
    console.error('Create chamado error:', error);
    res.status(500).json({ error: 'Erro ao criar chamado' });
  }
});

// PUT /api/chamados/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const chamado = await chamadoRepository.findOne({
      where: { id: req.params.id },
      relations: ['responsavel'],
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnico só pode editar status e adicionar comentário
    if (user.role === 'TECNICO') {
      if (chamado.responsavelId !== user.id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      // Técnico não pode editar outros campos
      const { status } = req.body;
      if (status && status !== chamado.status) {
        const statusAnterior = chamado.status;
        chamado.status = status;
        if (status === 'FINALIZADO') {
          chamado.finalizadoEm = new Date();
        }
        await chamadoRepository.save(chamado);

        await historicoRepository.save({
          chamadoId: chamado.id,
          tipo: 'STATUS',
          descricao: `Status alterado de ${statusAnterior} para ${status}`,
          usuarioId: user.id,
          dadosAnteriores: JSON.stringify({ status: statusAnterior }),
          dadosNovos: JSON.stringify({ status }),
        });
      }
    } else {
      // Admin e Coordenador podem editar tudo
      const {
        empreendimentoId,
        unidade,
        clienteNome,
        clienteTelefone,
        clienteEmail,
        tipo,
        categoria,
        descricao,
        prioridade,
        slaHoras,
        status,
        responsavelId,
      } = req.body;

      const alteracoes: string[] = [];

      if (empreendimentoId && empreendimentoId !== chamado.empreendimentoId) {
        chamado.empreendimentoId = empreendimentoId;
        alteracoes.push('empreendimento');
      }
      if (unidade && unidade !== chamado.unidade) {
        chamado.unidade = unidade;
        alteracoes.push('unidade');
      }
      if (clienteNome && clienteNome !== chamado.clienteNome) {
        chamado.clienteNome = clienteNome;
        alteracoes.push('nome do cliente');
      }
      if (clienteTelefone && clienteTelefone !== chamado.clienteTelefone) {
        chamado.clienteTelefone = clienteTelefone;
        alteracoes.push('telefone');
      }
      if (clienteEmail !== undefined) {
        chamado.clienteEmail = clienteEmail;
      }
      if (tipo && tipo !== chamado.tipo) {
        chamado.tipo = tipo;
        alteracoes.push('tipo');
      }
      if (categoria && categoria !== chamado.categoria) {
        chamado.categoria = categoria;
        alteracoes.push('categoria');
      }
      if (descricao && descricao !== chamado.descricao) {
        chamado.descricao = descricao;
        alteracoes.push('descrição');
      }
      if (prioridade && prioridade !== chamado.prioridade) {
        chamado.prioridade = prioridade;
        alteracoes.push('prioridade');
      }
      if (slaHoras && slaHoras !== chamado.slaHoras) {
        chamado.slaHoras = slaHoras;
        alteracoes.push('SLA');
      }

      // Status
      if (status && status !== chamado.status) {
        const statusAnterior = chamado.status;
        chamado.status = status;
        if (status === 'FINALIZADO') {
          chamado.finalizadoEm = new Date();
        }

        await historicoRepository.save({
          chamadoId: chamado.id,
          tipo: 'STATUS',
          descricao: `Status alterado de ${statusAnterior} para ${status}`,
          usuarioId: user.id,
          dadosAnteriores: JSON.stringify({ status: statusAnterior }),
          dadosNovos: JSON.stringify({ status }),
        });
      }

      // Responsável
      if (responsavelId !== undefined && responsavelId !== chamado.responsavelId) {
        const responsavelAnterior = chamado.responsavelId;
        chamado.responsavelId = responsavelId || null;

        await historicoRepository.save({
          chamadoId: chamado.id,
          tipo: 'RESPONSAVEL',
          descricao: responsavelId ? 'Responsável alterado' : 'Responsável removido',
          usuarioId: user.id,
          dadosAnteriores: JSON.stringify({ responsavelId: responsavelAnterior }),
          dadosNovos: JSON.stringify({ responsavelId }),
        });
      }

      // Histórico de edição geral
      if (alteracoes.length > 0) {
        await historicoRepository.save({
          chamadoId: chamado.id,
          tipo: 'EDICAO',
          descricao: `Campos alterados: ${alteracoes.join(', ')}`,
          usuarioId: user.id,
        });
      }

      await chamadoRepository.save(chamado);
    }

    // Recarregar com relacionamentos
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ['empreendimento', 'responsavel', 'criadoPor'],
    });

    res.json({
      ...chamadoAtualizado,
      slaInfo: calcularSLA(chamadoAtualizado!),
    });
  } catch (error) {
    console.error('Update chamado error:', error);
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
});

// PATCH /api/chamados/:id/status (para Kanban)
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const chamado = await chamadoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnico só pode alterar seus próprios chamados
    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const statusAnterior = chamado.status;
    chamado.status = status as ChamadoStatus;

    if (status === 'FINALIZADO') {
      chamado.finalizadoEm = new Date();
    }

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamadoId: chamado.id,
      tipo: 'STATUS',
      descricao: `Status alterado de ${statusAnterior} para ${status}`,
      usuarioId: user.id,
      dadosAnteriores: JSON.stringify({ status: statusAnterior }),
      dadosNovos: JSON.stringify({ status }),
    });

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// DELETE /api/chamados/:id
router.delete('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const chamado = await chamadoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Deletar comentários e histórico primeiro
    await comentarioRepository.delete({ chamadoId: chamado.id });
    await historicoRepository.delete({ chamadoId: chamado.id });
    await chamadoRepository.remove(chamado);

    res.json({ message: 'Chamado excluído com sucesso' });
  } catch (error) {
    console.error('Delete chamado error:', error);
    res.status(500).json({ error: 'Erro ao excluir chamado' });
  }
});

// POST /api/chamados/:id/comentarios
router.post('/:id/comentarios', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    const chamado = await chamadoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnico só pode comentar em seus chamados
    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const comentario = comentarioRepository.create({
      chamadoId: chamado.id,
      texto,
      usuarioId: user.id,
    });

    await comentarioRepository.save(comentario);

    // Registrar no histórico
    await historicoRepository.save({
      chamadoId: chamado.id,
      tipo: 'COMENTARIO',
      descricao: 'Novo comentário adicionado',
      usuarioId: user.id,
    });

    // Recarregar com relacionamento
    const comentarioCompleto = await comentarioRepository.findOne({
      where: { id: comentario.id },
      relations: ['usuario'],
    });

    res.status(201).json(comentarioCompleto);
  } catch (error) {
    console.error('Create comentario error:', error);
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
});

// GET /api/chamados/:id/comentarios
router.get('/:id/comentarios', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const chamado = await chamadoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnico só pode ver comentários de seus chamados
    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const comentarios = await comentarioRepository.find({
      where: { chamadoId: chamado.id },
      relations: ['usuario'],
      order: { criadoEm: 'DESC' },
    });

    res.json(comentarios);
  } catch (error) {
    console.error('List comentarios error:', error);
    res.status(500).json({ error: 'Erro ao listar comentários' });
  }
});

export { router as chamadosRoutes };
