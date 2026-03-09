import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { upload, UPLOAD_DIR } from '../middlewares/upload.middleware.js';
import { AuthRequest, ChamadoStatus } from '../types/index.js';
import { calcularSLA } from '../utils/sla.js';
import { criarNotificacao } from '../utils/notificacao.js';
import { getIO } from '../socket.js';
import { toCamel, sanitizeUser } from '../utils/db.js';
import { obrasSupabaseService } from '../services/obrasSupabase.service.js';
import fs from 'fs';
import path from 'path';

// Sincroniza empreendimento do GIO para a tabela local (upsert)
async function syncEmpreendimento(empreendimentoId: string): Promise<void> {
  // Check if already exists locally
  const { data: local } = await supabase
    .from('empreendimentos')
    .select('id')
    .eq('id', empreendimentoId)
    .single();

  if (local) return; // Already synced

  // Fetch from GIO
  const obra = await obrasSupabaseService.buscarObraPorId(empreendimentoId);
  if (!obra) return;

  await supabase.from('empreendimentos').upsert({
    id: obra.id,
    nome: obra.nome_limpo || obra.nome,
    endereco: obra.endereco || '',
    ativo: obra.ativo !== false,
  });
}

const router = Router();

// Helper: buscar chamado com relacoes
async function getChamadoWithRelations(id: string, relations: string[] = []) {
  let select = '*, empreendimento:empreendimentos(*), responsavel:users!responsavel_id(*), criadoPor:users!criado_por_id(*)';

  if (relations.includes('historico')) {
    select += ', historico:historicos(*, usuario:users(*))';
  }
  if (relations.includes('comentarios')) {
    select += ', comentarios(*, usuario:users(*))';
  }
  if (relations.includes('vistoria')) {
    select += ', vistoria:vistorias(*)';
  }
  if (relations.includes('materiais')) {
    select += ', materiais(*)';
  }
  if (relations.includes('anexos')) {
    select += ', anexos(*, usuario:users(*))';
  }

  const { data, error } = await supabase
    .from('chamados')
    .select(select)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const chamado = toCamel(data);
  // Sanitize user fields
  if (chamado.responsavel) chamado.responsavel = sanitizeUser(chamado.responsavel);
  if (chamado.criadoPor) chamado.criadoPor = sanitizeUser(chamado.criadoPor);
  if (chamado.historico) {
    chamado.historico = chamado.historico.map((h: any) => {
      if (h.usuario) h.usuario = sanitizeUser(h.usuario);
      return h;
    });
  }
  if (chamado.comentarios) {
    chamado.comentarios = chamado.comentarios.map((c: any) => {
      if (c.usuario) c.usuario = sanitizeUser(c.usuario);
      return c;
    });
  }
  if (chamado.anexos) {
    chamado.anexos = chamado.anexos.map((a: any) => {
      if (a.usuario) a.usuario = sanitizeUser(a.usuario);
      return a;
    });
  }

  return chamado;
}

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/chamados
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, empreendimentoId, categoria, responsavelId, prioridade, busca, dataInicio, dataFim, slaStatus, page, limit } = req.query;
    const user = req.user!;

    let query = supabase
      .from('chamados')
      .select('*, empreendimento:empreendimentos(*), responsavel:users!responsavel_id(*), criadoPor:users!criado_por_id(*)', { count: 'exact' })
      .order('criado_em', { ascending: false });

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    if (status) query = query.eq('status', status as string);
    if (empreendimentoId) query = query.eq('empreendimento_id', empreendimentoId as string);
    if (categoria) query = query.eq('categoria', categoria as string);
    if (responsavelId) query = query.eq('responsavel_id', responsavelId as string);
    if (prioridade) query = query.eq('prioridade', prioridade as string);
    if (dataInicio) query = query.gte('criado_em', `${dataInicio}T00:00:00`);
    if (dataFim) query = query.lte('criado_em', `${dataFim}T23:59:59`);

    if (busca) {
      query = query.or(
        `cliente_nome.ilike.%${busca}%,descricao.ilike.%${busca}%,unidade.ilike.%${busca}%,cliente_email.ilike.%${busca}%`
      );
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    if (limitNum > 0) {
      const from = (pageNum - 1) * limitNum;
      query = query.range(from, from + limitNum - 1);
    }

    const { data: chamados, error, count } = await query;
    if (error) throw error;

    let chamadosComSLA = (chamados || []).map((c) => {
      const chamado = toCamel(c);
      if (chamado.responsavel) chamado.responsavel = sanitizeUser(chamado.responsavel);
      if (chamado.criadoPor) chamado.criadoPor = sanitizeUser(chamado.criadoPor);
      return { ...chamado, slaInfo: calcularSLA(chamado) };
    });

    if (slaStatus) {
      chamadosComSLA = chamadosComSLA.filter((c) => {
        if (slaStatus === 'VENCIDO') return c.slaInfo.status === 'VENCIDO';
        if (slaStatus === 'PROXIMO') return c.slaInfo.status === 'PROXIMO_VENCIMENTO';
        if (slaStatus === 'OK') return c.slaInfo.status === 'NO_PRAZO';
        return true;
      });
    }

    res.setHeader('X-Total-Count', (count || 0).toString());
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

    let query = supabase
      .from('chamados')
      .select('*, empreendimento:empreendimentos(*), responsavel:users!responsavel_id(*)')
      .order('criado_em', { ascending: true });

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }
    if (empreendimentoId) query = query.eq('empreendimento_id', empreendimentoId as string);
    if (categoria) query = query.eq('categoria', categoria as string);
    if (responsavelId) query = query.eq('responsavel_id', responsavelId as string);

    const { data: chamados, error } = await query;
    if (error) throw error;

    const kanban: Record<string, any[]> = {
      ABERTO: [],
      EM_ANDAMENTO: [],
      AGUARDANDO: [],
      FINALIZADO: [],
    };

    (chamados || []).forEach((c) => {
      const chamado = toCamel(c);
      if (chamado.responsavel) chamado.responsavel = sanitizeUser(chamado.responsavel);
      const chamadoComSLA = { ...chamado, slaInfo: calcularSLA(chamado) };
      kanban[chamado.status]?.push(chamadoComSLA);
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
    const chamado = await getChamadoWithRelations(req.params.id, [
      'historico', 'comentarios', 'vistoria', 'materiais', 'anexos',
    ]);

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const user = req.user!;
    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }

    res.json({ ...chamado, slaInfo: calcularSLA(chamado) });
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
      return res.status(400).json({ error: 'Campos obrigatorios nao preenchidos' });
    }

    // Sync empreendimento from GIO to local table
    await syncEmpreendimento(empreendimentoId);

    // Get next numero
    const { data: ultimo } = await supabase
      .from('chamados')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    const novoNumero = ultimo ? ultimo.numero + 1 : 1001;

    const { data: chamado, error } = await supabase
      .from('chamados')
      .insert({
        numero: novoNumero,
        empreendimento_id: empreendimentoId,
        unidade,
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone,
        cliente_email: clienteEmail || null,
        tipo,
        categoria,
        descricao,
        prioridade,
        sla_horas: slaHoras,
        status: 'ABERTO',
        responsavel_id: responsavelId || null,
        criado_por_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Historico de criacao
    await supabase.from('historicos').insert({
      chamado_id: chamado.id,
      tipo: 'CRIACAO',
      descricao: `Chamado #${novoNumero} criado`,
      usuario_id: user.id,
    });

    if (responsavelId) {
      await supabase.from('historicos').insert({
        chamado_id: chamado.id,
        tipo: 'RESPONSAVEL',
        descricao: 'Responsavel atribuido',
        usuario_id: user.id,
        dados_novos: JSON.stringify({ responsavelId }),
      });

      await criarNotificacao({
        usuarioId: responsavelId,
        tipo: 'ATRIBUICAO',
        titulo: `Novo chamado atribuido #${novoNumero}`,
        mensagem: `Voce foi designado como responsavel pelo chamado #${novoNumero}`,
        chamadoId: chamado.id,
        emailData: { chamadoNumero: novoNumero, descricao },
      });
    }

    const chamadoCompleto = await getChamadoWithRelations(chamado.id);
    const resultado = { ...chamadoCompleto, slaInfo: calcularSLA(chamadoCompleto!) };

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

    const { data: chamadoRaw, error: fetchError } = await supabase
      .from('chamados')
      .select('*, responsavel:users!responsavel_id(*)')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !chamadoRaw) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const chamado = toCamel(chamadoRaw);

    if (user.role === 'TECNICO') {
      if (chamado.responsavelId !== user.id) {
        return res.status(403).json({ error: 'Acesso nao autorizado' });
      }
      const { status } = req.body;
      if (status && status !== chamado.status) {
        const statusAnterior = chamado.status;
        const updates: any = { status };
        if (status === 'FINALIZADO') updates.finalizado_em = new Date().toISOString();

        await supabase.from('chamados').update(updates).eq('id', chamado.id);

        await supabase.from('historicos').insert({
          chamado_id: chamado.id,
          tipo: 'STATUS',
          descricao: `Status alterado de ${statusAnterior} para ${status}`,
          usuario_id: user.id,
          dados_anteriores: JSON.stringify({ status: statusAnterior }),
          dados_novos: JSON.stringify({ status }),
        });
      }
    } else {
      const {
        empreendimentoId, unidade, clienteNome, clienteTelefone, clienteEmail,
        tipo, categoria, descricao, prioridade, slaHoras, status, responsavelId,
        horasEstimadas, equipeNecessaria,
      } = req.body;

      const updates: any = {};
      const alteracoes: string[] = [];

      if (empreendimentoId && empreendimentoId !== chamado.empreendimentoId) {
        updates.empreendimento_id = empreendimentoId; alteracoes.push('empreendimento');
      }
      if (unidade && unidade !== chamado.unidade) {
        updates.unidade = unidade; alteracoes.push('unidade');
      }
      if (clienteNome && clienteNome !== chamado.clienteNome) {
        updates.cliente_nome = clienteNome; alteracoes.push('nome do cliente');
      }
      if (clienteTelefone && clienteTelefone !== chamado.clienteTelefone) {
        updates.cliente_telefone = clienteTelefone; alteracoes.push('telefone');
      }
      if (clienteEmail !== undefined) updates.cliente_email = clienteEmail;
      if (tipo && tipo !== chamado.tipo) {
        updates.tipo = tipo; alteracoes.push('tipo');
      }
      if (categoria && categoria !== chamado.categoria) {
        updates.categoria = categoria; alteracoes.push('categoria');
      }
      if (descricao && descricao !== chamado.descricao) {
        updates.descricao = descricao; alteracoes.push('descricao');
      }
      if (prioridade && prioridade !== chamado.prioridade) {
        updates.prioridade = prioridade; alteracoes.push('prioridade');
      }
      if (slaHoras && slaHoras !== chamado.slaHoras) {
        updates.sla_horas = slaHoras; alteracoes.push('SLA');
      }
      if (horasEstimadas !== undefined) updates.horas_estimadas = horasEstimadas;
      if (equipeNecessaria !== undefined) updates.equipe_necessaria = equipeNecessaria;

      if (status && status !== chamado.status) {
        const statusAnterior = chamado.status;
        updates.status = status;
        if (status === 'FINALIZADO') updates.finalizado_em = new Date().toISOString();

        await supabase.from('historicos').insert({
          chamado_id: chamado.id,
          tipo: 'STATUS',
          descricao: `Status alterado de ${statusAnterior} para ${status}`,
          usuario_id: user.id,
          dados_anteriores: JSON.stringify({ status: statusAnterior }),
          dados_novos: JSON.stringify({ status }),
        });

        if (chamado.responsavelId && chamado.responsavelId !== user.id) {
          await criarNotificacao({
            usuarioId: chamado.responsavelId,
            tipo: 'STATUS_ALTERADO',
            titulo: `Status alterado #${chamado.numero}`,
            mensagem: `Chamado #${chamado.numero} mudou de ${statusAnterior} para ${status}`,
            chamadoId: chamado.id,
            emailData: { chamadoNumero: chamado.numero, statusAnterior, statusNovo: status },
          });
        }
      }

      if (responsavelId !== undefined && responsavelId !== chamado.responsavelId) {
        const responsavelAnterior = chamado.responsavelId;
        updates.responsavel_id = responsavelId || null;

        await supabase.from('historicos').insert({
          chamado_id: chamado.id,
          tipo: 'RESPONSAVEL',
          descricao: responsavelId ? 'Responsavel alterado' : 'Responsavel removido',
          usuario_id: user.id,
          dados_anteriores: JSON.stringify({ responsavelId: responsavelAnterior }),
          dados_novos: JSON.stringify({ responsavelId }),
        });

        if (responsavelId) {
          await criarNotificacao({
            usuarioId: responsavelId,
            tipo: 'ATRIBUICAO',
            titulo: `Chamado atribuido #${chamado.numero}`,
            mensagem: `Voce foi designado como responsavel pelo chamado #${chamado.numero}`,
            chamadoId: chamado.id,
            emailData: { chamadoNumero: chamado.numero, descricao: chamado.descricao },
          });
        }
      }

      if (alteracoes.length > 0) {
        await supabase.from('historicos').insert({
          chamado_id: chamado.id,
          tipo: 'EDICAO',
          descricao: `Campos alterados: ${alteracoes.join(', ')}`,
          usuario_id: user.id,
        });
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('chamados').update(updates).eq('id', chamado.id);
      }
    }

    const chamadoAtualizado = await getChamadoWithRelations(chamado.id);
    const resultado = { ...chamadoAtualizado, slaInfo: calcularSLA(chamadoAtualizado!) };

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
      return res.status(400).json({ error: 'Status e obrigatorio' });
    }

    const { data: chamadoRaw } = await supabase
      .from('chamados')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!chamadoRaw) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const chamado = toCamel(chamadoRaw);

    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }

    const statusAnterior = chamado.status;
    const updates: any = { status };
    if (status === 'FINALIZADO') updates.finalizado_em = new Date().toISOString();

    await supabase.from('chamados').update(updates).eq('id', chamado.id);

    await supabase.from('historicos').insert({
      chamado_id: chamado.id,
      tipo: 'STATUS',
      descricao: `Status alterado de ${statusAnterior} para ${status}`,
      usuario_id: user.id,
      dados_anteriores: JSON.stringify({ status: statusAnterior }),
      dados_novos: JSON.stringify({ status }),
    });

    // Notificar criador e responsavel
    const notifyIds: string[] = [];
    if (chamado.criadoPorId && chamado.criadoPorId !== user.id) notifyIds.push(chamado.criadoPorId);
    if (chamado.responsavelId && chamado.responsavelId !== user.id) notifyIds.push(chamado.responsavelId);
    for (const uid of [...new Set(notifyIds)]) {
      await criarNotificacao({
        usuarioId: uid,
        tipo: 'STATUS_ALTERADO',
        titulo: `Status alterado #${chamado.numero}`,
        mensagem: `Chamado #${chamado.numero} mudou de ${statusAnterior} para ${status}`,
        chamadoId: chamado.id,
        emailData: { chamadoNumero: chamado.numero, statusAnterior, statusNovo: status },
      });
    }

    const io = getIO();
    if (io) io.emit('chamado:statusChanged', { id: chamado.id, status, statusAnterior });

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// DELETE /api/chamados/:id
router.delete('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const { data: chamado } = await supabase
      .from('chamados')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    // Limpar anexos do disco
    const { data: anexos } = await supabase
      .from('anexos')
      .select('nome_arquivo')
      .eq('chamado_id', chamado.id);

    for (const anexo of anexos || []) {
      const filePath = path.join(UPLOAD_DIR, anexo.nome_arquivo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // ON DELETE CASCADE cuida das tabelas filhas
    await supabase.from('chamados').delete().eq('id', chamado.id);

    res.json({ message: 'Chamado excluido com sucesso' });
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
      return res.status(400).json({ error: 'Texto e obrigatorio' });
    }

    const { data: chamadoRaw } = await supabase
      .from('chamados')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!chamadoRaw) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const chamado = toCamel(chamadoRaw);

    if (user.role === 'TECNICO' && chamado.responsavelId !== user.id) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }

    const { data: comentario, error } = await supabase
      .from('comentarios')
      .insert({
        chamado_id: chamado.id,
        texto,
        usuario_id: user.id,
      })
      .select('*, usuario:users(*)')
      .single();

    if (error) throw error;

    await supabase.from('historicos').insert({
      chamado_id: chamado.id,
      tipo: 'COMENTARIO',
      descricao: 'Novo comentario adicionado',
      usuario_id: user.id,
    });

    // Notificar participantes
    const notifyIds: string[] = [];
    if (chamado.criadoPorId && chamado.criadoPorId !== user.id) notifyIds.push(chamado.criadoPorId);
    if (chamado.responsavelId && chamado.responsavelId !== user.id) notifyIds.push(chamado.responsavelId);
    for (const uid of [...new Set(notifyIds)]) {
      await criarNotificacao({
        usuarioId: uid,
        tipo: 'COMENTARIO',
        titulo: `Novo comentario #${chamado.numero}`,
        mensagem: `${user.nome} comentou no chamado #${chamado.numero}`,
        chamadoId: chamado.id,
      });
    }

    const result = toCamel(comentario);
    if (result.usuario) result.usuario = sanitizeUser(result.usuario);

    res.status(201).json(result);
  } catch (error) {
    console.error('Create comentario error:', error);
    res.status(500).json({ error: 'Erro ao criar comentario' });
  }
});

// GET /api/chamados/:id/comentarios
router.get('/:id/comentarios', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const { data: chamadoRaw } = await supabase
      .from('chamados')
      .select('id, responsavel_id')
      .eq('id', req.params.id)
      .single();

    if (!chamadoRaw) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    if (user.role === 'TECNICO' && chamadoRaw.responsavel_id !== user.id) {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }

    const { data: comentarios, error } = await supabase
      .from('comentarios')
      .select('*, usuario:users(*)')
      .eq('chamado_id', req.params.id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    const result = (comentarios || []).map((c) => {
      const com = toCamel(c);
      if (com.usuario) com.usuario = sanitizeUser(com.usuario);
      return com;
    });

    res.json(result);
  } catch (error) {
    console.error('List comentarios error:', error);
    res.status(500).json({ error: 'Erro ao listar comentarios' });
  }
});

// ==================== VISTORIA ====================

// GET /api/chamados/:id/vistoria
router.get('/:id/vistoria', async (req: AuthRequest, res: Response) => {
  try {
    const { data: vistoria, error } = await supabase
      .from('vistorias')
      .select('*')
      .eq('chamado_id', req.params.id)
      .single();

    if (error || !vistoria) {
      return res.status(404).json({ error: 'Vistoria nao encontrada' });
    }

    res.json(toCamel(vistoria));
  } catch (error) {
    console.error('Get vistoria error:', error);
    res.status(500).json({ error: 'Erro ao buscar vistoria' });
  }
});

// POST /api/chamados/:id/vistoria
router.post('/:id/vistoria', async (req: AuthRequest, res: Response) => {
  try {
    const { data: chamado } = await supabase
      .from('chamados')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const { data: existente } = await supabase
      .from('vistorias')
      .select('id')
      .eq('chamado_id', chamado.id)
      .single();

    if (existente) {
      return res.status(400).json({ error: 'Vistoria ja existe para este chamado' });
    }

    const { dataVistoria, horaInicio, horaTermino, tecnicoPresente, causaIdentificada, parecerTecnico } = req.body;

    if (!dataVistoria || !horaInicio || !tecnicoPresente) {
      return res.status(400).json({ error: 'Campos obrigatorios: dataVistoria, horaInicio, tecnicoPresente' });
    }

    const { data: vistoria, error } = await supabase
      .from('vistorias')
      .insert({
        chamado_id: chamado.id,
        data_vistoria: dataVistoria,
        hora_inicio: horaInicio,
        hora_termino: horaTermino || null,
        tecnico_presente: tecnicoPresente,
        causa_identificada: causaIdentificada || null,
        parecer_tecnico: parecerTecnico || null,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('historicos').insert({
      chamado_id: chamado.id,
      tipo: 'EDICAO',
      descricao: 'Vistoria tecnica registrada',
      usuario_id: req.user!.id,
    });

    res.status(201).json(toCamel(vistoria));
  } catch (error) {
    console.error('Create vistoria error:', error);
    res.status(500).json({ error: 'Erro ao criar vistoria' });
  }
});

// PUT /api/chamados/:id/vistoria
router.put('/:id/vistoria', async (req: AuthRequest, res: Response) => {
  try {
    const { data: vistoriaRaw } = await supabase
      .from('vistorias')
      .select('*')
      .eq('chamado_id', req.params.id)
      .single();

    if (!vistoriaRaw) {
      return res.status(404).json({ error: 'Vistoria nao encontrada' });
    }

    const { dataVistoria, horaInicio, horaTermino, tecnicoPresente, causaIdentificada, parecerTecnico } = req.body;
    const updates: any = {};

    if (dataVistoria !== undefined) updates.data_vistoria = dataVistoria;
    if (horaInicio !== undefined) updates.hora_inicio = horaInicio;
    if (horaTermino !== undefined) updates.hora_termino = horaTermino;
    if (tecnicoPresente !== undefined) updates.tecnico_presente = tecnicoPresente;
    if (causaIdentificada !== undefined) updates.causa_identificada = causaIdentificada;
    if (parecerTecnico !== undefined) updates.parecer_tecnico = parecerTecnico;

    const { data: vistoria, error } = await supabase
      .from('vistorias')
      .update(updates)
      .eq('chamado_id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('historicos').insert({
      chamado_id: req.params.id,
      tipo: 'EDICAO',
      descricao: 'Vistoria tecnica atualizada',
      usuario_id: req.user!.id,
    });

    res.json(toCamel(vistoria));
  } catch (error) {
    console.error('Update vistoria error:', error);
    res.status(500).json({ error: 'Erro ao atualizar vistoria' });
  }
});

// DELETE /api/chamados/:id/vistoria
router.delete('/:id/vistoria', requireRoles('ADMIN', 'COORDENADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: vistoria } = await supabase
      .from('vistorias')
      .select('id')
      .eq('chamado_id', req.params.id)
      .single();

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria nao encontrada' });
    }

    await supabase.from('vistorias').delete().eq('chamado_id', req.params.id);
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
    const { data: materiais, error } = await supabase
      .from('materiais')
      .select('*')
      .eq('chamado_id', req.params.id)
      .order('criado_em', { ascending: true });

    if (error) throw error;
    res.json((materiais || []).map(toCamel));
  } catch (error) {
    console.error('List materiais error:', error);
    res.status(500).json({ error: 'Erro ao listar materiais' });
  }
});

// POST /api/chamados/:id/materiais
router.post('/:id/materiais', async (req: AuthRequest, res: Response) => {
  try {
    const { data: chamado } = await supabase
      .from('chamados')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const { nome, quantidade, valorUnitario } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do material e obrigatorio' });
    }

    const { data: material, error } = await supabase
      .from('materiais')
      .insert({
        chamado_id: chamado.id,
        nome,
        quantidade: quantidade || 1,
        valor_unitario: valorUnitario || 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(toCamel(material));
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Erro ao adicionar material' });
  }
});

// PUT /api/chamados/:id/materiais/:materialId
router.put('/:id/materiais/:materialId', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, quantidade, valorUnitario, aprovado } = req.body;
    const updates: any = {};

    if (nome !== undefined) updates.nome = nome;
    if (quantidade !== undefined) updates.quantidade = quantidade;
    if (valorUnitario !== undefined) updates.valor_unitario = valorUnitario;
    if (aprovado !== undefined) updates.aprovado = aprovado;

    const { data: material, error } = await supabase
      .from('materiais')
      .update(updates)
      .eq('id', req.params.materialId)
      .eq('chamado_id', req.params.id)
      .select()
      .single();

    if (error || !material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    res.json(toCamel(material));
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

// PATCH /api/chamados/:id/materiais/:materialId/aprovado
router.patch('/:id/materiais/:materialId/aprovado', async (req: AuthRequest, res: Response) => {
  try {
    const { data: mat } = await supabase
      .from('materiais')
      .select('aprovado')
      .eq('id', req.params.materialId)
      .eq('chamado_id', req.params.id)
      .single();

    if (!mat) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    const { data: material, error } = await supabase
      .from('materiais')
      .update({ aprovado: !mat.aprovado })
      .eq('id', req.params.materialId)
      .select()
      .single();

    if (error) throw error;
    res.json(toCamel(material));
  } catch (error) {
    console.error('Toggle material aprovado error:', error);
    res.status(500).json({ error: 'Erro ao alterar aprovacao' });
  }
});

// DELETE /api/chamados/:id/materiais/:materialId
router.delete('/:id/materiais/:materialId', async (req: AuthRequest, res: Response) => {
  try {
    const { data: material } = await supabase
      .from('materiais')
      .select('id')
      .eq('id', req.params.materialId)
      .eq('chamado_id', req.params.id)
      .single();

    if (!material) {
      return res.status(404).json({ error: 'Material nao encontrado' });
    }

    await supabase.from('materiais').delete().eq('id', req.params.materialId);
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
    const { data: anexos, error } = await supabase
      .from('anexos')
      .select('*, usuario:users(*)')
      .eq('chamado_id', req.params.id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    const result = (anexos || []).map((a) => {
      const anexo = toCamel(a);
      if (anexo.usuario) anexo.usuario = sanitizeUser(anexo.usuario);
      return anexo;
    });

    res.json(result);
  } catch (error) {
    console.error('List anexos error:', error);
    res.status(500).json({ error: 'Erro ao listar anexos' });
  }
});

// POST /api/chamados/:id/anexos
router.post('/:id/anexos', upload.single('arquivo'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: chamado } = await supabase
      .from('chamados')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Arquivo e obrigatorio' });
    }

    const { data: anexo, error } = await supabase
      .from('anexos')
      .insert({
        chamado_id: chamado.id,
        nome_original: file.originalname,
        nome_arquivo: file.filename,
        tamanho: file.size,
        tipo: file.mimetype,
        usuario_id: req.user!.id,
      })
      .select('*, usuario:users(*)')
      .single();

    if (error) throw error;

    await supabase.from('historicos').insert({
      chamado_id: chamado.id,
      tipo: 'EDICAO',
      descricao: `Anexo adicionado: ${file.originalname}`,
      usuario_id: req.user!.id,
    });

    const result = toCamel(anexo);
    if (result.usuario) result.usuario = sanitizeUser(result.usuario);

    res.status(201).json(result);
  } catch (error) {
    console.error('Upload anexo error:', error);
    res.status(500).json({ error: 'Erro ao enviar anexo' });
  }
});

// GET /api/chamados/:id/anexos/:anexoId/download
router.get('/:id/anexos/:anexoId/download', async (req: AuthRequest, res: Response) => {
  try {
    const { data: anexo } = await supabase
      .from('anexos')
      .select('nome_arquivo, nome_original')
      .eq('id', req.params.anexoId)
      .eq('chamado_id', req.params.id)
      .single();

    if (!anexo) {
      return res.status(404).json({ error: 'Anexo nao encontrado' });
    }

    const filePath = path.join(UPLOAD_DIR, anexo.nome_arquivo);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo nao encontrado no disco' });
    }

    res.download(filePath, anexo.nome_original);
  } catch (error) {
    console.error('Download anexo error:', error);
    res.status(500).json({ error: 'Erro ao baixar anexo' });
  }
});

// DELETE /api/chamados/:id/anexos/:anexoId
router.delete('/:id/anexos/:anexoId', async (req: AuthRequest, res: Response) => {
  try {
    const { data: anexo } = await supabase
      .from('anexos')
      .select('*')
      .eq('id', req.params.anexoId)
      .eq('chamado_id', req.params.id)
      .single();

    if (!anexo) {
      return res.status(404).json({ error: 'Anexo nao encontrado' });
    }

    const filePath = path.join(UPLOAD_DIR, anexo.nome_arquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await supabase.from('anexos').delete().eq('id', req.params.anexoId);

    await supabase.from('historicos').insert({
      chamado_id: req.params.id,
      tipo: 'EDICAO',
      descricao: `Anexo removido: ${anexo.nome_original}`,
      usuario_id: req.user!.id,
    });

    res.json({ message: 'Anexo removido com sucesso' });
  } catch (error) {
    console.error('Delete anexo error:', error);
    res.status(500).json({ error: 'Erro ao remover anexo' });
  }
});

export { router as chamadosRoutes };
