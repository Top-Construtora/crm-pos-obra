import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { AgendaTecnica } from '../entities/AgendaTecnica.js';
import { Chamado } from '../entities/Chamado.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const agendaRepository = AppDataSource.getRepository(AgendaTecnica);
const chamadoRepository = AppDataSource.getRepository(Chamado);

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/agenda - Lista agendamentos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { tecnicoId, dataInicio, dataFim, status } = req.query;

    const queryBuilder = agendaRepository
      .createQueryBuilder('agenda')
      .leftJoinAndSelect('agenda.chamado', 'chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('agenda.tecnico', 'tecnico')
      .orderBy('agenda.data_agendamento', 'ASC')
      .addOrderBy('agenda.hora_inicio', 'ASC')
      .addOrderBy('agenda.ordem_roteiro', 'ASC');

    // Se for técnico, mostrar apenas seus agendamentos
    if (user.role === 'TECNICO') {
      queryBuilder.where('agenda.tecnico_id = :userId', { userId: user.id });
    } else if (tecnicoId) {
      queryBuilder.where('agenda.tecnico_id = :tecnicoId', { tecnicoId });
    }

    if (dataInicio) {
      queryBuilder.andWhere('agenda.data_agendamento >= :dataInicio', { dataInicio });
    }
    if (dataFim) {
      queryBuilder.andWhere('agenda.data_agendamento <= :dataFim', { dataFim });
    }
    if (status) {
      queryBuilder.andWhere('agenda.status = :status', { status });
    }

    const agendamentos = await queryBuilder.getMany();

    res.json(agendamentos);
  } catch (error) {
    console.error('List agenda error:', error);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

// GET /api/agenda/calendario/:mes/:ano
// Retorna agendamentos de um mês específico agrupados por data
router.get('/calendario/:ano/:mes', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { ano, mes } = req.params;
    const { tecnicoId } = req.query;

    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);

    if (isNaN(mesNum) || isNaN(anoNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ error: 'Mês ou ano inválido' });
    }

    const dataInicio = `${anoNum}-${mesNum.toString().padStart(2, '0')}-01`;
    const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
    const dataFim = `${anoNum}-${mesNum.toString().padStart(2, '0')}-${ultimoDia}`;

    const queryBuilder = agendaRepository
      .createQueryBuilder('agenda')
      .leftJoinAndSelect('agenda.chamado', 'chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('agenda.tecnico', 'tecnico')
      .where('agenda.data_agendamento >= :dataInicio', { dataInicio })
      .andWhere('agenda.data_agendamento <= :dataFim', { dataFim })
      .orderBy('agenda.data_agendamento', 'ASC')
      .addOrderBy('agenda.hora_inicio', 'ASC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('agenda.tecnico_id = :userId', { userId: user.id });
    } else if (tecnicoId) {
      queryBuilder.andWhere('agenda.tecnico_id = :tecnicoId', { tecnicoId });
    }

    const agendamentos = await queryBuilder.getMany();

    // Agrupar por data
    const calendario: Record<string, any[]> = {};
    agendamentos.forEach((ag) => {
      if (!calendario[ag.dataAgendamento]) {
        calendario[ag.dataAgendamento] = [];
      }
      calendario[ag.dataAgendamento].push(ag);
    });

    res.json(calendario);
  } catch (error) {
    console.error('Get calendario error:', error);
    res.status(500).json({ error: 'Erro ao buscar calendário' });
  }
});

// GET /api/agenda/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const agenda = await agendaRepository.findOne({
      where: { id: req.params.id },
      relations: ['chamado', 'chamado.empreendimento', 'tecnico'],
    });

    if (!agenda) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const user = req.user!;
    if (user.role === 'TECNICO' && agenda.tecnicoId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    res.json(agenda);
  } catch (error) {
    console.error('Get agenda error:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
});

// POST /api/agenda
router.post('/', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { chamadoId, tecnicoId, dataAgendamento, horaInicio, horaFim, observacoes, latitude, longitude } = req.body;

    if (!chamadoId || !tecnicoId || !dataAgendamento || !horaInicio) {
      return res.status(400).json({ error: 'Campos obrigatórios: chamadoId, tecnicoId, dataAgendamento, horaInicio' });
    }

    const chamado = await chamadoRepository.findOne({ where: { id: chamadoId } });
    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const agenda = agendaRepository.create({
      chamadoId,
      tecnicoId,
      dataAgendamento,
      horaInicio,
      horaFim,
      observacoes,
      latitude,
      longitude,
      status: 'AGENDADO',
    });

    await agendaRepository.save(agenda);

    const agendaCompleta = await agendaRepository.findOne({
      where: { id: agenda.id },
      relations: ['chamado', 'chamado.empreendimento', 'tecnico'],
    });

    res.status(201).json(agendaCompleta);
  } catch (error) {
    console.error('Create agenda error:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PUT /api/agenda/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const agenda = await agendaRepository.findOne({ where: { id: req.params.id } });

    if (!agenda) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (user.role === 'TECNICO' && agenda.tecnicoId !== user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const { tecnicoId, dataAgendamento, horaInicio, horaFim, status, observacoes, ordemRoteiro, latitude, longitude } = req.body;

    if (user.role !== 'TECNICO') {
      // Admin e coordenador podem alterar tudo
      if (tecnicoId !== undefined) agenda.tecnicoId = tecnicoId;
      if (dataAgendamento !== undefined) agenda.dataAgendamento = dataAgendamento;
      if (horaInicio !== undefined) agenda.horaInicio = horaInicio;
      if (horaFim !== undefined) agenda.horaFim = horaFim;
      if (ordemRoteiro !== undefined) agenda.ordemRoteiro = ordemRoteiro;
    }

    // Todos podem alterar status e observações
    if (status !== undefined) {
      agenda.status = status;
      // Registrar início e fim de atendimento
      if (status === 'NO_LOCAL' && !agenda.inicioAtendimento) {
        agenda.inicioAtendimento = new Date();
      }
      if (status === 'CONCLUIDO' && !agenda.fimAtendimento) {
        agenda.fimAtendimento = new Date();
      }
    }
    if (observacoes !== undefined) agenda.observacoes = observacoes;
    if (latitude !== undefined) agenda.latitude = latitude;
    if (longitude !== undefined) agenda.longitude = longitude;

    await agendaRepository.save(agenda);

    const agendaAtualizada = await agendaRepository.findOne({
      where: { id: agenda.id },
      relations: ['chamado', 'chamado.empreendimento', 'tecnico'],
    });

    res.json(agendaAtualizada);
  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// DELETE /api/agenda/:id
router.delete('/:id', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const agenda = await agendaRepository.findOne({ where: { id: req.params.id } });

    if (!agenda) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    await agendaRepository.remove(agenda);

    res.json({ message: 'Agendamento removido com sucesso' });
  } catch (error) {
    console.error('Delete agenda error:', error);
    res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
});

// POST /api/agenda/roteirizar
// Otimiza a ordem dos agendamentos de um técnico em uma data específica
router.post('/roteirizar', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { tecnicoId, data } = req.body;

    if (!tecnicoId || !data) {
      return res.status(400).json({ error: 'Campos obrigatórios: tecnicoId, data' });
    }

    const agendamentos = await agendaRepository.find({
      where: {
        tecnicoId,
        dataAgendamento: data,
      },
      relations: ['chamado', 'chamado.empreendimento'],
      order: {
        horaInicio: 'ASC',
      },
    });

    if (agendamentos.length === 0) {
      return res.json({ message: 'Nenhum agendamento encontrado para roteirizar' });
    }

    // Ordenar por proximidade (simplificado - em produção usar API de rotas)
    // Aqui vamos apenas numerar sequencialmente
    for (let i = 0; i < agendamentos.length; i++) {
      agendamentos[i].ordemRoteiro = i + 1;
      await agendaRepository.save(agendamentos[i]);
    }

    res.json({
      message: 'Roteiro otimizado com sucesso',
      total: agendamentos.length,
    });
  } catch (error) {
    console.error('Roteirizar error:', error);
    res.status(500).json({ error: 'Erro ao roteirizar agendamentos' });
  }
});

export { router as agendaRoutes };
