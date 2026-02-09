import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Chamado } from '../entities/Chamado.js';
import { Historico } from '../entities/Historico.js';
import { Comentario } from '../entities/Comentario.js';
import { Vistoria } from '../entities/Vistoria.js';
import { Material } from '../entities/Material.js';
import { Anexo } from '../entities/Anexo.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { upload, UPLOAD_DIR } from '../middlewares/upload.middleware.js';
import { AuthRequest, ChamadoStatus } from '../types/index.js';
import { calcularSLA } from '../utils/sla.js';
import { criarNotificacao } from '../utils/notificacao.js';
import { getIO } from '../socket.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const chamadoRepository = AppDataSource.getRepository(Chamado);
const historicoRepository = AppDataSource.getRepository(Historico);
const comentarioRepository = AppDataSource.getRepository(Comentario);
const vistoriaRepository = AppDataSource.getRepository(Vistoria);
const materialRepository = AppDataSource.getRepository(Material);
const anexoRepository = AppDataSource.getRepository(Anexo);

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/chamados
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, empreendimentoId, categoria, responsavelId, prioridade, busca, dataInicio, dataFim, slaStatus, page, limit } = req.query;
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('chamado.responsavel', 'responsavel')
      .leftJoinAndSelect('chamado.criadoPor', 'criadoPor')
      .orderBy('chamado.criadoEm', 'DESC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavelId = :userId', { userId: user.id });
    }

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
        '(chamado.cliente_nome LIKE :busca OR chamado.descricao LIKE :busca OR chamado.unidade LIKE :busca OR chamado.cliente_email LIKE :busca OR CAST(chamado.numero AS TEXT) LIKE :busca)',
        { busca: `%${busca}%` }
      );
    }
    if (dataInicio) {
      queryBuilder.andWhere('chamado.criado_em >= :dataInicio', { dataInicio: `${dataInicio}T00:00:00` });
    }
    if (dataFim) {
      queryBuilder.andWhere('chamado.criado_em <= :dataFim', { dataFim: `${dataFim}T23:59:59` });
    }

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0; // 0 = no limit (backward compatible)
    if (limitNum > 0) {
      queryBuilder.skip((pageNum - 1) * limitNum).take(limitNum);
    }

    const chamados = await queryBuilder.getMany();

    // Compute SLA and optionally filter by SLA status
    let chamadosComSLA = chamados.map((chamado) => ({
      ...chamado,
      slaInfo: calcularSLA(chamado),
    }));

    if (slaStatus) {
      chamadosComSLA = chamadosComSLA.filter((c) => {
        if (slaStatus === 'VENCIDO') return c.slaInfo.status === 'VENCIDO';
        if (slaStatus === 'PROXIMO') return c.slaInfo.status === 'PROXIMO_VENCIMENTO';
        if (slaStatus === 'OK') return c.slaInfo.status === 'NO_PRAZO';
        return true;
      });
    }

    res.setHeader('X-Total-Count', total.toString());
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

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavelId = :userId', { userId: user.id });
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

    const chamados = await queryBuilder.getMany();

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
      relations: [
        'empreendimento', 'responsavel', 'criadoPor',
        'historico', 'historico.usuario',
        'comentarios', 'comentarios.usuario',
        'vistoria', 'materiais', 'anexos', 'anexos.usuario',
      ],
      order: {
        historico: { criadoEm: 'DESC' },
        comentarios: { criadoEm: 'DESC' },
      },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

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
      empreendimentoId, unidade, clienteNome, clienteTelefone, clienteEmail,
      tipo, categoria, descricao, prioridade, slaHoras, responsavelId,
    } = req.body;

    if (!empreendimentoId || !unidade || !clienteNome || !clienteTelefone || !tipo || !categoria || !descricao || !prioridade || !slaHoras) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    const ultimoChamado = await chamadoRepository.findOne({ order: { numero: 'DESC' } });
    const novoNumero = ultimoChamado ? ultimoChamado.numero + 1 : 1001;

    const chamado = chamadoRepository.create({
      numero: novoNumero, empreendimentoId, unidade, clienteNome, clienteTelefone,
      clienteEmail, tipo, categoria, descricao, prioridade, slaHoras,
      status: 'ABERTO', responsavelId: responsavelId || null, criadoPorId: user.id,
    });

    await chamadoRepository.save(chamado);

    await historicoRepository.save({
      chamadoId: chamado.id, tipo: 'CRIACAO',
      descricao: `Chamado #${chamado.numero} criado`, usuarioId: user.id,
    });

    if (responsavelId) {
      await historicoRepository.save({
        chamadoId: chamado.id, tipo: 'RESPONSAVEL',
        descricao: 'Responsável atribuído', usuarioId: user.id,
        dadosNovos: JSON.stringify({ responsavelId }),
      });

      await criarNotificacao({
        usuarioId: responsavelId,
        tipo: 'ATRIBUICAO',
        titulo: `Novo chamado atribuido #${chamado.numero}`,
        mensagem: `Voce foi designado como responsavel pelo chamado #${chamado.numero}`,
        chamadoId: chamado.id,
        emailData: { chamadoNumero: chamado.numero, descricao },
      });
    }

    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ['empreendimento', 'responsavel', 'criadoPor'],
    });

    const resultado = {
      ...chamadoCompleto,
      slaInfo: calcularSLA(chamadoCompleto!),
    };

    // Emit socket event
    const io = getIO();
    if (io) io.emit('chamado:created', resultado);

    res.status(201).json(resultado);
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

    if (user.role === 'TECNICO') {
      if (chamado.responsavelId !== user.id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      const { status } = req.body;
      if (status && status !== chamado.status) {
        const statusAnterior = chamado.status;
        chamado.status = status;
        if (status === 'FINALIZADO') chamado.finalizadoEm = new Date();
        await chamadoRepository.save(chamado);

        await historicoRepository.save({
          chamadoId: chamado.id, tipo: 'STATUS',
          descricao: `Status alterado de ${statusAnterior} para ${status}`,
          usuarioId: user.id,
          dadosAnteriores: JSON.stringify({ status: statusAnterior }),
          dadosNovos: JSON.stringify({ status }),
        });
      }
    } else {
      const {
        empreendimentoId, unidade, clienteNome, clienteTelefone, clienteEmail,
        tipo, categoria, descricao, prioridade, slaHoras, status, responsavelId,
        horasEstimadas, equipeNecessaria,
      } = req.body;

      const alteracoes: string[] = [];

      if (empreendimentoId && empreendimentoId !== chamado.empreendimentoId) {
        chamado.empreendimentoId = empreendimentoId; alteracoes.push('empreendimento');
      }
      if (unidade && unidade !== chamado.unidade) {
        chamado.unidade = unidade; alteracoes.push('unidade');
      }
      if (clienteNome && clienteNome !== chamado.clienteNome) {
        chamado.clienteNome = clienteNome; alteracoes.push('nome do cliente');
      }
      if (clienteTelefone && clienteTelefone !== chamado.clienteTelefone) {
        chamado.clienteTelefone = clienteTelefone; alteracoes.push('telefone');
      }
      if (clienteEmail !== undefined) chamado.clienteEmail = clienteEmail;
      if (tipo && tipo !== chamado.tipo) {
        chamado.tipo = tipo; alteracoes.push('tipo');
      }
      if (categoria && categoria !== chamado.categoria) {
        chamado.categoria = categoria; alteracoes.push('categoria');
      }
      if (descricao && descricao !== chamado.descricao) {
        chamado.descricao = descricao; alteracoes.push('descrição');
      }
      if (prioridade && prioridade !== chamado.prioridade) {
        chamado.prioridade = prioridade; alteracoes.push('prioridade');
      }
      if (slaHoras && slaHoras !== chamado.slaHoras) {
        chamado.slaHoras = slaHoras; alteracoes.push('SLA');
      }
      if (horasEstimadas !== undefined) chamado.horasEstimadas = horasEstimadas;
      if (equipeNecessaria !== undefined) chamado.equipeNecessaria = equipeNecessaria;

      if (status && status !== chamado.status) {
        const statusAnterior = chamado.status;
        chamado.status = status;
        if (status === 'FINALIZADO') chamado.finalizadoEm = new Date();

        await historicoRepository.save({
          chamadoId: chamado.id, tipo: 'STATUS',
          descricao: `Status alterado de ${statusAnterior} para ${status}`,
          usuarioId: user.id,
          dadosAnteriores: JSON.stringify({ status: statusAnterior }),
          dadosNovos: JSON.stringify({ status }),
        });

        // Notificar responsavel sobre mudanca de status
        if (chamado.responsavelId && chamado.responsavelId !== user.id) {
          await criarNotificacao({
            usuarioId: chamado.responsavelId, tipo: 'STATUS_ALTERADO',
            titulo: `Status alterado #${chamado.numero}`,
            mensagem: `Chamado #${chamado.numero} mudou de ${statusAnterior} para ${status}`,
            chamadoId: chamado.id,
            emailData: { chamadoNumero: chamado.numero, statusAnterior, statusNovo: status },
          });
        }
      }

      if (responsavelId !== undefined && responsavelId !== chamado.responsavelId) {
        const responsavelAnterior = chamado.responsavelId;
        chamado.responsavelId = responsavelId || null;

        await historicoRepository.save({
          chamadoId: chamado.id, tipo: 'RESPONSAVEL',
          descricao: responsavelId ? 'Responsável alterado' : 'Responsável removido',
          usuarioId: user.id,
          dadosAnteriores: JSON.stringify({ responsavelId: responsavelAnterior }),
          dadosNovos: JSON.stringify({ responsavelId }),
        });

        if (responsavelId) {
          await criarNotificacao({
            usuarioId: responsavelId, tipo: 'ATRIBUICAO',
            titulo: `Chamado atribuido #${chamado.numero}`,
            mensagem: `Voce foi designado como responsavel pelo chamado #${chamado.numero}`,
            chamadoId: chamado.id,
            emailData: { chamadoNumero: chamado.numero, descricao: chamado.descricao },
          });
        }
      }

      if (alteracoes.length > 0) {
        await historicoRepository.save({
          chamadoId: chamado.id, tipo: 'EDICAO',
          descricao: `Campos alterados: ${alteracoes.join(', ')}`,
          usuarioId: user.id,
        });
      }

      await chamadoRepository.save(chamado);
    }

    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ['empreendimento', 'responsavel', 'criadoPor'],
    });

    const resultado = {
      ...chamadoAtualizado,
      slaInfo: calcularSLA(chamadoAtualizado!),
    };

    // Emit socket event
    const io = getIO();
    if (io) io.emit('chamado:updated', resultado);

    res.json(resultado);
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

    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const statusAnterior = chamado.status;
    chamado.status = status as ChamadoStatus;
    if (status === 'FINALIZADO') chamado.finalizadoEm = new Date();

    await chamadoRepository.save(chamado);

    await historicoRepository.save({
      chamadoId: chamado.id, tipo: 'STATUS',
      descricao: `Status alterado de ${statusAnterior} para ${status}`,
      usuarioId: user.id,
      dadosAnteriores: JSON.stringify({ status: statusAnterior }),
      dadosNovos: JSON.stringify({ status }),
    });

    // Notificar criador e responsavel
    const notifyIds: string[] = [];
    if (chamado.criadoPorId && chamado.criadoPorId !== user.id) notifyIds.push(chamado.criadoPorId);
    if (chamado.responsavelId && chamado.responsavelId !== user.id) notifyIds.push(chamado.responsavelId);
    for (const uid of [...new Set(notifyIds)]) {
      await criarNotificacao({
        usuarioId: uid, tipo: 'STATUS_ALTERADO',
        titulo: `Status alterado #${chamado.numero}`,
        mensagem: `Chamado #${chamado.numero} mudou de ${statusAnterior} para ${status}`,
        chamadoId: chamado.id,
        emailData: { chamadoNumero: chamado.numero, statusAnterior, statusNovo: status },
      });
    }

    // Emit socket event
    const io = getIO();
    if (io) io.emit('chamado:statusChanged', { id: chamado.id, status: chamado.status, statusAnterior });

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// DELETE /api/chamados/:id
router.delete('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Limpar anexos do disco
    const anexos = await anexoRepository.find({ where: { chamadoId: chamado.id } });
    for (const anexo of anexos) {
      const filePath = path.join(UPLOAD_DIR, anexo.nomeArquivo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await anexoRepository.delete({ chamadoId: chamado.id });
    await materialRepository.delete({ chamadoId: chamado.id });
    await vistoriaRepository.delete({ chamadoId: chamado.id });
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

    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const comentario = comentarioRepository.create({
      chamadoId: chamado.id, texto, usuarioId: user.id,
    });
    await comentarioRepository.save(comentario);

    await historicoRepository.save({
      chamadoId: chamado.id, tipo: 'COMENTARIO',
      descricao: 'Novo comentário adicionado', usuarioId: user.id,
    });

    // Notificar participantes (exceto quem comentou)
    const notifyIds: string[] = [];
    if (chamado.criadoPorId && chamado.criadoPorId !== user.id) notifyIds.push(chamado.criadoPorId);
    if (chamado.responsavelId && chamado.responsavelId !== user.id) notifyIds.push(chamado.responsavelId);
    for (const uid of [...new Set(notifyIds)]) {
      await criarNotificacao({
        usuarioId: uid, tipo: 'COMENTARIO',
        titulo: `Novo comentario #${chamado.numero}`,
        mensagem: `${user.nome} comentou no chamado #${chamado.numero}`,
        chamadoId: chamado.id,
      });
    }

    const comentarioCompleto = await comentarioRepository.findOne({
      where: { id: comentario.id }, relations: ['usuario'],
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
    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

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

// ==================== VISTORIA ====================

// GET /api/chamados/:id/vistoria
router.get('/:id/vistoria', async (req: AuthRequest, res: Response) => {
  try {
    const vistoria = await vistoriaRepository.findOne({
      where: { chamadoId: req.params.id },
    });

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada' });
    }

    res.json(vistoria);
  } catch (error) {
    console.error('Get vistoria error:', error);
    res.status(500).json({ error: 'Erro ao buscar vistoria' });
  }
});

// POST /api/chamados/:id/vistoria
router.post('/:id/vistoria', async (req: AuthRequest, res: Response) => {
  try {
    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });
    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const existente = await vistoriaRepository.findOne({ where: { chamadoId: chamado.id } });
    if (existente) {
      return res.status(400).json({ error: 'Vistoria já existe para este chamado' });
    }

    const { dataVistoria, horaInicio, horaTermino, tecnicoPresente, causaIdentificada, parecerTecnico } = req.body;

    if (!dataVistoria || !horaInicio || !tecnicoPresente) {
      return res.status(400).json({ error: 'Campos obrigatórios: dataVistoria, horaInicio, tecnicoPresente' });
    }

    const vistoria = vistoriaRepository.create({
      chamadoId: chamado.id, dataVistoria, horaInicio, horaTermino,
      tecnicoPresente, causaIdentificada, parecerTecnico,
    });
    await vistoriaRepository.save(vistoria);

    await historicoRepository.save({
      chamadoId: chamado.id, tipo: 'EDICAO',
      descricao: 'Vistoria técnica registrada',
      usuarioId: req.user!.id,
    });

    res.status(201).json(vistoria);
  } catch (error) {
    console.error('Create vistoria error:', error);
    res.status(500).json({ error: 'Erro ao criar vistoria' });
  }
});

// PUT /api/chamados/:id/vistoria
router.put('/:id/vistoria', async (req: AuthRequest, res: Response) => {
  try {
    const vistoria = await vistoriaRepository.findOne({ where: { chamadoId: req.params.id } });
    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada' });
    }

    const { dataVistoria, horaInicio, horaTermino, tecnicoPresente, causaIdentificada, parecerTecnico } = req.body;

    if (dataVistoria !== undefined) vistoria.dataVistoria = dataVistoria;
    if (horaInicio !== undefined) vistoria.horaInicio = horaInicio;
    if (horaTermino !== undefined) vistoria.horaTermino = horaTermino;
    if (tecnicoPresente !== undefined) vistoria.tecnicoPresente = tecnicoPresente;
    if (causaIdentificada !== undefined) vistoria.causaIdentificada = causaIdentificada;
    if (parecerTecnico !== undefined) vistoria.parecerTecnico = parecerTecnico;

    await vistoriaRepository.save(vistoria);

    await historicoRepository.save({
      chamadoId: req.params.id, tipo: 'EDICAO',
      descricao: 'Vistoria técnica atualizada',
      usuarioId: req.user!.id,
    });

    res.json(vistoria);
  } catch (error) {
    console.error('Update vistoria error:', error);
    res.status(500).json({ error: 'Erro ao atualizar vistoria' });
  }
});

// DELETE /api/chamados/:id/vistoria
router.delete('/:id/vistoria', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const vistoria = await vistoriaRepository.findOne({ where: { chamadoId: req.params.id } });
    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada' });
    }

    await vistoriaRepository.remove(vistoria);
    res.json({ message: 'Vistoria removida com sucesso' });
  } catch (error) {
    console.error('Delete vistoria error:', error);
    res.status(500).json({ error: 'Erro ao remover vistoria' });
  }
});

// ==================== MATERIAIS ====================

// GET /api/chamados/:id/materiais
router.get('/:id/materiais', async (req: AuthRequest, res: Response) => {
  try {
    const materiais = await materialRepository.find({
      where: { chamadoId: req.params.id },
      order: { criadoEm: 'ASC' },
    });
    res.json(materiais);
  } catch (error) {
    console.error('List materiais error:', error);
    res.status(500).json({ error: 'Erro ao listar materiais' });
  }
});

// POST /api/chamados/:id/materiais
router.post('/:id/materiais', async (req: AuthRequest, res: Response) => {
  try {
    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });
    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const { nome, quantidade, valorUnitario } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do material é obrigatório' });
    }

    const material = materialRepository.create({
      chamadoId: chamado.id,
      nome,
      quantidade: quantidade || 1,
      valorUnitario: valorUnitario || 0,
    });
    await materialRepository.save(material);

    res.status(201).json(material);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Erro ao adicionar material' });
  }
});

// PUT /api/chamados/:id/materiais/:materialId
router.put('/:id/materiais/:materialId', async (req: AuthRequest, res: Response) => {
  try {
    const material = await materialRepository.findOne({
      where: { id: req.params.materialId, chamadoId: req.params.id },
    });
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    const { nome, quantidade, valorUnitario, aprovado } = req.body;
    if (nome !== undefined) material.nome = nome;
    if (quantidade !== undefined) material.quantidade = quantidade;
    if (valorUnitario !== undefined) material.valorUnitario = valorUnitario;
    if (aprovado !== undefined) material.aprovado = aprovado;

    await materialRepository.save(material);
    res.json(material);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

// PATCH /api/chamados/:id/materiais/:materialId/aprovado
router.patch('/:id/materiais/:materialId/aprovado', async (req: AuthRequest, res: Response) => {
  try {
    const material = await materialRepository.findOne({
      where: { id: req.params.materialId, chamadoId: req.params.id },
    });
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    material.aprovado = !material.aprovado;
    await materialRepository.save(material);
    res.json(material);
  } catch (error) {
    console.error('Toggle material aprovado error:', error);
    res.status(500).json({ error: 'Erro ao alterar aprovação' });
  }
});

// DELETE /api/chamados/:id/materiais/:materialId
router.delete('/:id/materiais/:materialId', async (req: AuthRequest, res: Response) => {
  try {
    const material = await materialRepository.findOne({
      where: { id: req.params.materialId, chamadoId: req.params.id },
    });
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    await materialRepository.remove(material);
    res.json({ message: 'Material removido com sucesso' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Erro ao remover material' });
  }
});

// ==================== ANEXOS ====================

// GET /api/chamados/:id/anexos
router.get('/:id/anexos', async (req: AuthRequest, res: Response) => {
  try {
    const anexos = await anexoRepository.find({
      where: { chamadoId: req.params.id },
      relations: ['usuario'],
      order: { criadoEm: 'DESC' },
    });
    res.json(anexos);
  } catch (error) {
    console.error('List anexos error:', error);
    res.status(500).json({ error: 'Erro ao listar anexos' });
  }
});

// POST /api/chamados/:id/anexos
router.post('/:id/anexos', upload.single('arquivo'), async (req: AuthRequest, res: Response) => {
  try {
    const chamado = await chamadoRepository.findOne({ where: { id: req.params.id } });
    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }

    const anexo = anexoRepository.create({
      chamadoId: chamado.id,
      nomeOriginal: file.originalname,
      nomeArquivo: file.filename,
      tamanho: file.size,
      tipo: file.mimetype,
      usuarioId: req.user!.id,
    });
    await anexoRepository.save(anexo);

    await historicoRepository.save({
      chamadoId: chamado.id, tipo: 'EDICAO',
      descricao: `Anexo adicionado: ${file.originalname}`,
      usuarioId: req.user!.id,
    });

    const anexoCompleto = await anexoRepository.findOne({
      where: { id: anexo.id }, relations: ['usuario'],
    });

    res.status(201).json(anexoCompleto);
  } catch (error) {
    console.error('Upload anexo error:', error);
    res.status(500).json({ error: 'Erro ao enviar anexo' });
  }
});

// GET /api/chamados/:id/anexos/:anexoId/download
router.get('/:id/anexos/:anexoId/download', async (req: AuthRequest, res: Response) => {
  try {
    const anexo = await anexoRepository.findOne({
      where: { id: req.params.anexoId, chamadoId: req.params.id },
    });
    if (!anexo) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    const filePath = path.join(UPLOAD_DIR, anexo.nomeArquivo);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no disco' });
    }

    res.download(filePath, anexo.nomeOriginal);
  } catch (error) {
    console.error('Download anexo error:', error);
    res.status(500).json({ error: 'Erro ao baixar anexo' });
  }
});

// DELETE /api/chamados/:id/anexos/:anexoId
router.delete('/:id/anexos/:anexoId', async (req: AuthRequest, res: Response) => {
  try {
    const anexo = await anexoRepository.findOne({
      where: { id: req.params.anexoId, chamadoId: req.params.id },
    });
    if (!anexo) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    const filePath = path.join(UPLOAD_DIR, anexo.nomeArquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await anexoRepository.remove(anexo);

    await historicoRepository.save({
      chamadoId: req.params.id, tipo: 'EDICAO',
      descricao: `Anexo removido: ${anexo.nomeOriginal}`,
      usuarioId: req.user!.id,
    });

    res.json({ message: 'Anexo removido com sucesso' });
  } catch (error) {
    console.error('Delete anexo error:', error);
    res.status(500).json({ error: 'Erro ao remover anexo' });
  }
});

export { router as chamadosRoutes };
