import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { calcularSLA } from '../utils/sla.js';
import { toCamel, sanitizeUser } from '../utils/db.js';

const router = Router();

router.use(authMiddleware);

// Helper: buscar chamados com filtro de tecnico
async function fetchChamados(user: any, filters: any = {}, selectFields = '*') {
  let query = supabase.from('chamados').select(selectFields);

  if (user.role === 'TECNICO') {
    query = query.eq('responsavel_id', user.id);
  }

  for (const [key, value] of Object.entries(filters)) {
    if (key === 'status_in') {
      query = query.in('status', value as string[]);
    } else if (key === 'gte') {
      const [col, val] = value as [string, string];
      query = query.gte(col, val);
    } else {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toCamel);
}

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let query = supabase.from('chamados').select('status, sla_horas, criado_em');
    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const all = (chamados || []).map(toCamel);
    const total = all.length;
    const abertos = all.filter((c) => c.status === 'ABERTO').length;
    const emAndamento = all.filter((c) => c.status === 'EM_ANDAMENTO').length;
    const aguardando = all.filter((c) => c.status === 'AGUARDANDO').length;
    const finalizados = all.filter((c) => c.status === 'FINALIZADO').length;

    const ativos = all.filter((c) => ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO'].includes(c.status));
    let vencidos = 0;
    let proximosVencimento = 0;

    ativos.forEach((chamado) => {
      const slaInfo = calcularSLA(chamado);
      if (slaInfo.status === 'VENCIDO') vencidos++;
      else if (slaInfo.status === 'PROXIMO_VENCIMENTO') proximosVencimento++;
    });

    res.json({ total, abertos, emAndamento, aguardando, finalizados, vencidos, proximosVencimento });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatisticas' });
  }
});

// GET /api/dashboard/sla-proximos
router.get('/sla-proximos', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let query = supabase
      .from('chamados')
      .select('*, empreendimento:empreendimentos(*), responsavel:users!responsavel_id(*)')
      .in('status', ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO'])
      .order('criado_em', { ascending: true });

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const chamadosComSLA = (chamados || [])
      .map((c) => {
        const chamado = toCamel(c);
        if (chamado.responsavel) chamado.responsavel = sanitizeUser(chamado.responsavel);
        return { ...chamado, slaInfo: calcularSLA(chamado) };
      })
      .filter((c) => c.slaInfo.status === 'VENCIDO' || c.slaInfo.status === 'PROXIMO_VENCIMENTO')
      .sort((a, b) => a.slaInfo.tempoRestante - b.slaInfo.tempoRestante)
      .slice(0, 10);

    res.json(chamadosComSLA);
  } catch (error) {
    console.error('Get sla proximos error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados proximos do SLA' });
  }
});

// GET /api/dashboard/recentes
router.get('/recentes', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let query = supabase
      .from('chamados')
      .select('*, empreendimento:empreendimentos(*), responsavel:users!responsavel_id(*)')
      .order('criado_em', { ascending: false })
      .limit(5);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const result = (chamados || []).map((c) => {
      const chamado = toCamel(c);
      if (chamado.responsavel) chamado.responsavel = sanitizeUser(chamado.responsavel);
      return { ...chamado, slaInfo: calcularSLA(chamado) };
    });

    res.json(result);
  } catch (error) {
    console.error('Get recentes error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados recentes' });
  }
});

// GET /api/dashboard/por-categoria
router.get('/por-categoria', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const chamados = await fetchChamados(user, {}, 'categoria');

    const map = new Map<string, number>();
    chamados.forEach((c) => {
      map.set(c.categoria, (map.get(c.categoria) || 0) + 1);
    });

    const result = Array.from(map.entries()).map(([categoria, total]) => ({ categoria, total }));
    res.json(result);
  } catch (error) {
    console.error('Get por categoria error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados por categoria' });
  }
});

// GET /api/dashboard/por-periodo?dias=30
router.get('/por-periodo', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 30;
    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('chamados')
      .select('criado_em')
      .gte('criado_em', dataLimite);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const map = new Map<string, number>();
    (chamados || []).forEach((c) => {
      const data = new Date(c.criado_em).toISOString().slice(0, 10);
      map.set(data, (map.get(data) || 0) + 1);
    });

    const result = Array.from(map.entries())
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data));

    res.json(result);
  } catch (error) {
    console.error('Get por periodo error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados por periodo' });
  }
});

// GET /api/dashboard/tempo-resolucao
router.get('/tempo-resolucao', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let query = supabase
      .from('chamados')
      .select('criado_em, finalizado_em')
      .eq('status', 'FINALIZADO')
      .not('finalizado_em', 'is', null);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const mesMap = new Map<string, { totalHoras: number; count: number }>();
    (chamados || []).forEach((c) => {
      const mes = new Date(c.criado_em).toISOString().slice(0, 7);
      const horas = (new Date(c.finalizado_em).getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60);
      const entry = mesMap.get(mes) || { totalHoras: 0, count: 0 };
      entry.totalHoras += horas;
      entry.count++;
      mesMap.set(mes, entry);
    });

    const result = Array.from(mesMap.entries())
      .map(([mes, { totalHoras, count }]) => ({
        mes,
        mediaHoras: Math.round((totalHoras / count) * 10) / 10,
        total: count,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    res.json(result);
  } catch (error) {
    console.error('Get tempo resolucao error:', error);
    res.status(500).json({ error: 'Erro ao buscar tempo de resolucao' });
  }
});

// GET /api/dashboard/sla-compliance?dias=30
router.get('/sla-compliance', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 30;
    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('chamados')
      .select('criado_em, finalizado_em, sla_horas')
      .eq('status', 'FINALIZADO')
      .not('finalizado_em', 'is', null)
      .gte('criado_em', dataLimite);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const weekMap = new Map<string, { dentro: number; fora: number }>();
    (chamados || []).forEach((c) => {
      const criadoEm = new Date(c.criado_em);
      const day = criadoEm.getDay();
      const diff = criadoEm.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(criadoEm);
      weekStart.setDate(diff);
      const key = weekStart.toISOString().slice(0, 10);

      if (!weekMap.has(key)) weekMap.set(key, { dentro: 0, fora: 0 });
      const entry = weekMap.get(key)!;
      const horasResolucao = (new Date(c.finalizado_em).getTime() - criadoEm.getTime()) / (1000 * 60 * 60);
      if (horasResolucao <= c.sla_horas) entry.dentro++;
      else entry.fora++;
    });

    const result = Array.from(weekMap.entries())
      .map(([semana, { dentro, fora }]) => ({
        semana,
        dentro,
        fora,
        total: dentro + fora,
        percentual: Math.round((dentro / (dentro + fora)) * 100),
      }))
      .sort((a, b) => a.semana.localeCompare(b.semana));

    res.json(result);
  } catch (error) {
    console.error('Get sla compliance error:', error);
    res.status(500).json({ error: 'Erro ao buscar compliance de SLA' });
  }
});

// GET /api/dashboard/por-tecnico
router.get('/por-tecnico', async (req: AuthRequest, res: Response) => {
  try {
    const { data: tecnicos, error: tecError } = await supabase
      .from('users')
      .select('id, nome, role')
      .eq('ativo', true);

    if (tecError) throw tecError;

    // Buscar todos chamados de uma vez
    const { data: todosChamados, error: chamError } = await supabase
      .from('chamados')
      .select('responsavel_id, status, criado_em, finalizado_em');

    if (chamError) throw chamError;

    const result = (tecnicos || []).map((tecnico) => {
      const meusChamados = (todosChamados || []).filter((c) => c.responsavel_id === tecnico.id);
      const atribuidos = meusChamados.length;
      const finalizados = meusChamados.filter((c) => c.status === 'FINALIZADO').length;
      const emAberto = meusChamados.filter((c) => ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO'].includes(c.status)).length;

      const finalizadosComTempo = meusChamados.filter((c) => c.status === 'FINALIZADO' && c.finalizado_em);
      let mediaHoras = 0;
      if (finalizadosComTempo.length > 0) {
        const totalHoras = finalizadosComTempo.reduce((sum, c) => {
          return sum + (new Date(c.finalizado_em).getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60);
        }, 0);
        mediaHoras = Math.round((totalHoras / finalizadosComTempo.length) * 10) / 10;
      }

      return {
        id: tecnico.id,
        nome: tecnico.nome,
        role: tecnico.role,
        atribuidos,
        finalizados,
        emAberto,
        mediaHoras,
        taxaResolucao: atribuidos > 0 ? Math.round((finalizados / atribuidos) * 100) : 0,
      };
    });

    result.sort((a, b) => b.finalizados - a.finalizados);
    res.json(result);
  } catch (error) {
    console.error('Get por tecnico error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados por tecnico' });
  }
});

// GET /api/dashboard/por-status
router.get('/por-status', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const chamados = await fetchChamados(user, {}, 'status');

    const map = new Map<string, number>();
    chamados.forEach((c) => {
      map.set(c.status, (map.get(c.status) || 0) + 1);
    });

    const result = Array.from(map.entries()).map(([status, total]) => ({ status, total }));
    res.json(result);
  } catch (error) {
    console.error('Get por status error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados por status' });
  }
});

// GET /api/dashboard/reincidencia?dias=90
router.get('/reincidencia', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 90;
    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('chamados')
      .select('*, empreendimento:empreendimentos(nome)')
      .gte('criado_em', dataLimite);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    // Group by empreendimento_id + unidade + categoria
    const groupMap = new Map<string, any[]>();
    (chamados || []).forEach((c) => {
      const key = `${c.empreendimento_id}|${c.unidade}|${c.categoria}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(c);
    });

    const enriched = Array.from(groupMap.entries())
      .filter(([, items]) => items.length > 1)
      .map(([, items]) => ({
        empreendimento: items[0]?.empreendimento?.nome || 'N/A',
        unidade: items[0].unidade,
        categoria: items[0].categoria,
        total: items.length,
        chamados: items
          .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
          .map((c) => ({
            numero: c.numero,
            descricao: c.descricao,
            status: c.status,
            criadoEm: c.criado_em,
          })),
      }))
      .sort((a, b) => b.total - a.total);

    res.json(enriched);
  } catch (error) {
    console.error('Get reincidencia error:', error);
    res.status(500).json({ error: 'Erro ao buscar reincidencias' });
  }
});

// GET /api/dashboard/tempo-medio-categoria
router.get('/tempo-medio-categoria', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let query = supabase
      .from('chamados')
      .select('categoria, criado_em, finalizado_em')
      .eq('status', 'FINALIZADO')
      .not('finalizado_em', 'is', null);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    const catMap = new Map<string, { totalHoras: number; count: number }>();
    (chamados || []).forEach((c) => {
      const horas = (new Date(c.finalizado_em).getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60);
      const entry = catMap.get(c.categoria) || { totalHoras: 0, count: 0 };
      entry.totalHoras += horas;
      entry.count++;
      catMap.set(c.categoria, entry);
    });

    const result = Array.from(catMap.entries())
      .map(([categoria, { totalHoras, count }]) => ({
        categoria,
        mediaHoras: Math.round((totalHoras / count) * 10) / 10,
        total: count,
      }))
      .sort((a, b) => b.mediaHoras - a.mediaHoras);

    res.json(result);
  } catch (error) {
    console.error('Get tempo medio categoria error:', error);
    res.status(500).json({ error: 'Erro ao buscar tempo medio por categoria' });
  }
});

// GET /api/dashboard/taxa-primeira-vez?dias=30
router.get('/taxa-primeira-vez', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 30;
    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

    let countQuery = supabase
      .from('chamados')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'FINALIZADO');

    if (user.role === 'TECNICO') {
      countQuery = countQuery.eq('responsavel_id', user.id);
    }

    const { count: totalFinalizados } = await countQuery;

    let query = supabase
      .from('chamados')
      .select('id, historico:historicos(tipo, dados_novos)')
      .eq('status', 'FINALIZADO')
      .gte('criado_em', dataLimite);

    if (user.role === 'TECNICO') {
      query = query.eq('responsavel_id', user.id);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    let primeiraVez = 0;
    (chamados || []).forEach((chamado: any) => {
      const temAguardando = chamado.historico?.some(
        (h: any) => h.tipo === 'STATUS' && h.dados_novos?.includes('AGUARDANDO')
      );
      if (!temAguardando) primeiraVez++;
    });

    const total = totalFinalizados || 0;
    const taxa = total > 0 ? Math.round((primeiraVez / total) * 100) : 0;

    res.json({ total, primeiraVez, taxa });
  } catch (error) {
    console.error('Get taxa primeira vez error:', error);
    res.status(500).json({ error: 'Erro ao buscar taxa de primeira vez' });
  }
});

// GET /api/dashboard/prioridade-distribuicao
router.get('/prioridade-distribuicao', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const chamados = await fetchChamados(user, {}, 'prioridade');

    const map = new Map<string, number>();
    chamados.forEach((c) => {
      map.set(c.prioridade, (map.get(c.prioridade) || 0) + 1);
    });

    const result = Array.from(map.entries())
      .map(([prioridade, total]) => ({ prioridade, total }))
      .sort((a, b) => b.total - a.total);

    res.json(result);
  } catch (error) {
    console.error('Get prioridade distribuicao error:', error);
    res.status(500).json({ error: 'Erro ao buscar distribuicao de prioridade' });
  }
});

export { router as dashboardRoutes };
