import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { toCamel, sanitizeUser } from '../utils/db.js';

const router = Router();

router.use(authMiddleware);

function processAgenda(raw: any) {
  const agenda = toCamel(raw);
  if (agenda.tecnico) agenda.tecnico = sanitizeUser(agenda.tecnico);
  if (agenda.chamado?.empreendimento) {
    agenda.chamado.empreendimento = toCamel(agenda.chamado.empreendimento);
  }
  return agenda;
}

// GET /api/agenda
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { tecnicoId, dataInicio, dataFim, status } = req.query;

    let query = supabase
      .from('agenda_tecnica')
      .select('*, chamado:chamados(*, empreendimento:empreendimentos(*)), tecnico:users!tecnico_id(*)')
      .order('data_agendamento', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .order('ordem_roteiro', { ascending: true });

    if (user.role === 'TECNICO') {
      query = query.eq('tecnico_id', user.id);
    } else if (tecnicoId) {
      query = query.eq('tecnico_id', tecnicoId as string);
    }

    if (dataInicio) query = query.gte('data_agendamento', dataInicio as string);
    if (dataFim) query = query.lte('data_agendamento', dataFim as string);
    if (status) query = query.eq('status', status as string);

    const { data: agendamentos, error } = await query;
    if (error) throw error;

    res.json((agendamentos || []).map(processAgenda));
  } catch (error) {
    console.error('List agenda error:', error);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

// GET /api/agenda/calendario/:ano/:mes
router.get('/calendario/:ano/:mes', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { ano, mes } = req.params;
    const { tecnicoId } = req.query;

    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);

    if (isNaN(mesNum) || isNaN(anoNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ error: 'Mes ou ano invalido' });
    }

    const dataInicio = `${anoNum}-${mesNum.toString().padStart(2, '0')}-01`;
    const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
    const dataFim = `${anoNum}-${mesNum.toString().padStart(2, '0')}-${ultimoDia}`;

    let query = supabase
      .from('agenda_tecnica')
      .select('*, chamado:chamados(*, empreendimento:empreendimentos(*)), tecnico:users!tecnico_id(*)')
      .gte('data_agendamento', dataInicio)
      .lte('data_agendamento', dataFim)
      .order('data_agendamento', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (user.role === 'TECNICO') {
      query = query.eq('tecnico_id', user.id);
    } else if (tecnicoId) {
      query = query.eq('tecnico_id', tecnicoId as string);
    }

    const { data: agendamentos, error } = await query;
    if (error) throw error;

    const calendario: Record<string, any[]> = {};
    (agendamentos || []).forEach((raw) => {
      const ag = processAgenda(raw);
      if (!calendario[ag.dataAgendamento]) {
        calendario[ag.dataAgendamento] = [];
      }
      calendario[ag.dataAgendamento].push(ag);
    });

    res.json(calendario);
  } catch (error) {
    console.error('Get calendario error:', error);
    res.status(500).json({ error: 'Erro ao buscar calendario' });
  }
});

// GET /api/agenda/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data: raw, error } = await supabase
      .from('agenda_tecnica')
      .select('*, chamado:chamados(*, empreendimento:empreendimentos(*)), tecnico:users!tecnico_id(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !raw) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }

    const agenda = processAgenda(raw);
    const user = req.user!;
    if (user.role === 'TECNICO' && agenda.tecnicoId !== user.id) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
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
      return res.status(400).json({ error: 'Campos obrigatorios: chamadoId, tecnicoId, dataAgendamento, horaInicio' });
    }

    const { data: chamado } = await supabase
      .from('chamados')
      .select('id')
      .eq('id', chamadoId)
      .single();

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const { data: agenda, error } = await supabase
      .from('agenda_tecnica')
      .insert({
        chamado_id: chamadoId,
        tecnico_id: tecnicoId,
        data_agendamento: dataAgendamento,
        hora_inicio: horaInicio,
        hora_fim: horaFim || null,
        observacoes: observacoes || null,
        latitude: latitude || null,
        longitude: longitude || null,
        status: 'AGENDADO',
      })
      .select('*, chamado:chamados(*, empreendimento:empreendimentos(*)), tecnico:users!tecnico_id(*)')
      .single();

    if (error) throw error;
    res.status(201).json(processAgenda(agenda));
  } catch (error) {
    console.error('Create agenda error:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PUT /api/agenda/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const { data: agendaRaw } = await supabase
      .from('agenda_tecnica')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!agendaRaw) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }

    const agenda = toCamel(agendaRaw);

    if (user.role === 'TECNICO' && agenda.tecnicoId !== user.id) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }

    const { tecnicoId, dataAgendamento, horaInicio, horaFim, status, observacoes, ordemRoteiro, latitude, longitude } = req.body;
    const updates: any = {};

    if (user.role !== 'TECNICO') {
      if (tecnicoId !== undefined) updates.tecnico_id = tecnicoId;
      if (dataAgendamento !== undefined) updates.data_agendamento = dataAgendamento;
      if (horaInicio !== undefined) updates.hora_inicio = horaInicio;
      if (horaFim !== undefined) updates.hora_fim = horaFim;
      if (ordemRoteiro !== undefined) updates.ordem_roteiro = ordemRoteiro;
    }

    if (status !== undefined) {
      updates.status = status;
      if (status === 'NO_LOCAL' && !agenda.inicioAtendimento) {
        updates.inicio_atendimento = new Date().toISOString();
      }
      if (status === 'CONCLUIDO' && !agenda.fimAtendimento) {
        updates.fim_atendimento = new Date().toISOString();
      }
    }
    if (observacoes !== undefined) updates.observacoes = observacoes;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;

    const { data: updated, error } = await supabase
      .from('agenda_tecnica')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, chamado:chamados(*, empreendimento:empreendimentos(*)), tecnico:users!tecnico_id(*)')
      .single();

    if (error) throw error;
    res.json(processAgenda(updated));
  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// DELETE /api/agenda/:id
router.delete('/:id', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: agenda } = await supabase
      .from('agenda_tecnica')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!agenda) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }

    await supabase.from('agenda_tecnica').delete().eq('id', req.params.id);
    res.json({ message: 'Agendamento removido com sucesso' });
  } catch (error) {
    console.error('Delete agenda error:', error);
    res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
});

// POST /api/agenda/roteirizar
router.post('/roteirizar', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { tecnicoId, data } = req.body;

    if (!tecnicoId || !data) {
      return res.status(400).json({ error: 'Campos obrigatorios: tecnicoId, data' });
    }

    const { data: agendamentos, error } = await supabase
      .from('agenda_tecnica')
      .select('id')
      .eq('tecnico_id', tecnicoId)
      .eq('data_agendamento', data)
      .order('hora_inicio', { ascending: true });

    if (error) throw error;

    if (!agendamentos || agendamentos.length === 0) {
      return res.json({ message: 'Nenhum agendamento encontrado para roteirizar' });
    }

    for (let i = 0; i < agendamentos.length; i++) {
      await supabase
        .from('agenda_tecnica')
        .update({ ordem_roteiro: i + 1 })
        .eq('id', agendamentos[i].id);
    }

    res.json({ message: 'Roteiro otimizado com sucesso', total: agendamentos.length });
  } catch (error) {
    console.error('Roteirizar error:', error);
    res.status(500).json({ error: 'Erro ao roteirizar agendamentos' });
  }
});

export { router as agendaRoutes };
