import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Chamado } from '../entities/Chamado.js';
import { User } from '../entities/User.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { calcularSLA } from '../utils/sla.js';

const router = Router();
const chamadoRepository = AppDataSource.getRepository(Chamado);
const userRepository = AppDataSource.getRepository(User);

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // Base query
    let whereClause = {};
    if (user.role === 'TECNICO') {
      whereClause = { responsavelId: user.id };
    }

    // Contar por status
    const [total, abertos, emAndamento, aguardando, finalizados] = await Promise.all([
      chamadoRepository.count({ where: whereClause }),
      chamadoRepository.count({ where: { ...whereClause, status: 'ABERTO' } }),
      chamadoRepository.count({ where: { ...whereClause, status: 'EM_ANDAMENTO' } }),
      chamadoRepository.count({ where: { ...whereClause, status: 'AGUARDANDO' } }),
      chamadoRepository.count({ where: { ...whereClause, status: 'FINALIZADO' } }),
    ]);

    // Contar vencidos e próximos do vencimento
    const chamadosAtivos = await chamadoRepository.find({
      where: [
        { ...whereClause, status: 'ABERTO' },
        { ...whereClause, status: 'EM_ANDAMENTO' },
        { ...whereClause, status: 'AGUARDANDO' },
      ],
    });

    let vencidos = 0;
    let proximosVencimento = 0;

    chamadosAtivos.forEach((chamado) => {
      const slaInfo = calcularSLA(chamado);
      if (slaInfo.status === 'VENCIDO') {
        vencidos++;
      } else if (slaInfo.status === 'PROXIMO_VENCIMENTO') {
        proximosVencimento++;
      }
    });

    res.json({
      total,
      abertos,
      emAndamento,
      aguardando,
      finalizados,
      vencidos,
      proximosVencimento,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// GET /api/dashboard/sla-proximos
router.get('/sla-proximos', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('chamado.responsavel', 'responsavel')
      .where('chamado.status IN (:...statuses)', {
        statuses: ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO'],
      })
      .orderBy('chamado.criadoEm', 'ASC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavelId = :userId', { userId: user.id });
    }

    const chamados = await queryBuilder.getMany();

    // Filtrar e ordenar por SLA
    const chamadosComSLA = chamados
      .map((chamado) => ({
        ...chamado,
        slaInfo: calcularSLA(chamado),
      }))
      .filter((c) => c.slaInfo.status === 'VENCIDO' || c.slaInfo.status === 'PROXIMO_VENCIMENTO')
      .sort((a, b) => a.slaInfo.tempoRestante - b.slaInfo.tempoRestante)
      .slice(0, 10);

    res.json(chamadosComSLA);
  } catch (error) {
    console.error('Get sla proximos error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados próximos do SLA' });
  }
});

// GET /api/dashboard/recentes
router.get('/recentes', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('chamado.responsavel', 'responsavel')
      .orderBy('chamado.criadoEm', 'DESC')
      .take(5);

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavelId = :userId', { userId: user.id });
    }

    const chamados = await queryBuilder.getMany();

    const chamadosComSLA = chamados.map((chamado) => ({
      ...chamado,
      slaInfo: calcularSLA(chamado),
    }));

    res.json(chamadosComSLA);
  } catch (error) {
    console.error('Get recentes error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados recentes' });
  }
});

// GET /api/dashboard/por-categoria
router.get('/por-categoria', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select('chamado.categoria', 'categoria')
      .addSelect('COUNT(*)', 'total')
      .groupBy('chamado.categoria');

    if (user.role === 'TECNICO') {
      queryBuilder.where('chamado.responsavelId = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();

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

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select("strftime('%Y-%m-%d', chamado.criado_em)", 'data')
      .addSelect('COUNT(*)', 'total')
      .where("chamado.criado_em >= datetime('now', :dias)", { dias: `-${dias} days` })
      .groupBy("strftime('%Y-%m-%d', chamado.criado_em)")
      .orderBy("strftime('%Y-%m-%d', chamado.criado_em)", 'ASC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();
    res.json(result);
  } catch (error) {
    console.error('Get por periodo error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados por período' });
  }
});

// GET /api/dashboard/tempo-resolucao
router.get('/tempo-resolucao', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select("strftime('%Y-%m', chamado.criado_em)", 'mes')
      .addSelect(
        "ROUND(AVG((julianday(chamado.finalizado_em) - julianday(chamado.criado_em)) * 24), 1)",
        'mediaHoras'
      )
      .addSelect('COUNT(*)', 'total')
      .where('chamado.status = :status', { status: 'FINALIZADO' })
      .andWhere('chamado.finalizado_em IS NOT NULL')
      .groupBy("strftime('%Y-%m', chamado.criado_em)")
      .orderBy("strftime('%Y-%m', chamado.criado_em)", 'ASC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();
    res.json(result);
  } catch (error) {
    console.error('Get tempo resolucao error:', error);
    res.status(500).json({ error: 'Erro ao buscar tempo de resolução' });
  }
});

// GET /api/dashboard/sla-compliance?dias=30
router.get('/sla-compliance', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 30;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .where('chamado.status = :status', { status: 'FINALIZADO' })
      .andWhere('chamado.finalizado_em IS NOT NULL')
      .andWhere("chamado.criado_em >= datetime('now', :dias)", { dias: `-${dias} days` });

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const chamados = await queryBuilder.getMany();

    // Group by week
    const weekMap = new Map<string, { dentro: number; fora: number }>();
    chamados.forEach((c) => {
      const criadoEm = new Date(c.criadoEm);
      // Get ISO week start (Monday)
      const day = criadoEm.getDay();
      const diff = criadoEm.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(criadoEm);
      weekStart.setDate(diff);
      const key = weekStart.toISOString().slice(0, 10);

      if (!weekMap.has(key)) {
        weekMap.set(key, { dentro: 0, fora: 0 });
      }
      const entry = weekMap.get(key)!;
      const finalizadoEm = new Date(c.finalizadoEm!);
      const horasResolucao = (finalizadoEm.getTime() - criadoEm.getTime()) / (1000 * 60 * 60);
      if (horasResolucao <= c.slaHoras) {
        entry.dentro++;
      } else {
        entry.fora++;
      }
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
    const tecnicos = await userRepository.find({
      where: { ativo: true },
    });

    const result = await Promise.all(
      tecnicos.map(async (tecnico) => {
        const [atribuidos, finalizados] = await Promise.all([
          chamadoRepository.count({ where: { responsavelId: tecnico.id } }),
          chamadoRepository.count({ where: { responsavelId: tecnico.id, status: 'FINALIZADO' } }),
        ]);

        // Average resolution time for completed chamados
        const tempoQuery = await chamadoRepository
          .createQueryBuilder('chamado')
          .select(
            "ROUND(AVG((julianday(chamado.finalizado_em) - julianday(chamado.criado_em)) * 24), 1)",
            'mediaHoras'
          )
          .where('chamado.responsavel_id = :id', { id: tecnico.id })
          .andWhere('chamado.status = :status', { status: 'FINALIZADO' })
          .andWhere('chamado.finalizado_em IS NOT NULL')
          .getRawOne();

        const emAberto = await chamadoRepository.count({
          where: [
            { responsavelId: tecnico.id, status: 'ABERTO' },
            { responsavelId: tecnico.id, status: 'EM_ANDAMENTO' },
            { responsavelId: tecnico.id, status: 'AGUARDANDO' },
          ],
        });

        return {
          id: tecnico.id,
          nome: tecnico.nome,
          role: tecnico.role,
          atribuidos,
          finalizados,
          emAberto,
          mediaHoras: parseFloat(tempoQuery?.mediaHoras) || 0,
          taxaResolucao: atribuidos > 0 ? Math.round((finalizados / atribuidos) * 100) : 0,
        };
      })
    );

    // Sort by finalizados desc
    result.sort((a, b) => b.finalizados - a.finalizados);
    res.json(result);
  } catch (error) {
    console.error('Get por tecnico error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados por técnico' });
  }
});

// GET /api/dashboard/por-status
router.get('/por-status', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select('chamado.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('chamado.status');

    if (user.role === 'TECNICO') {
      queryBuilder.where('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();
    res.json(result);
  } catch (error) {
    console.error('Get por status error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados por status' });
  }
});

// GET /api/dashboard/reincidencia?dias=90
// Identifica chamados recorrentes (mesma unidade, categoria similar em período)
router.get('/reincidencia', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 90;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select('chamado.empreendimento_id', 'empreendimentoId')
      .addSelect('chamado.unidade', 'unidade')
      .addSelect('chamado.categoria', 'categoria')
      .addSelect('COUNT(*)', 'total')
      .where("chamado.criado_em >= datetime('now', :dias)", { dias: `-${dias} days` })
      .groupBy('chamado.empreendimento_id, chamado.unidade, chamado.categoria')
      .having('COUNT(*) > 1')
      .orderBy('COUNT(*)', 'DESC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();

    // Enriquecer com informações dos chamados
    const enriched = await Promise.all(
      result.map(async (item) => {
        const chamados = await chamadoRepository
          .createQueryBuilder('chamado')
          .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
          .where('chamado.empreendimento_id = :empId', { empId: item.empreendimentoId })
          .andWhere('chamado.unidade = :unidade', { unidade: item.unidade })
          .andWhere('chamado.categoria = :categoria', { categoria: item.categoria })
          .andWhere("chamado.criado_em >= datetime('now', :dias)", { dias: `-${dias} days` })
          .orderBy('chamado.criado_em', 'DESC')
          .getMany();

        return {
          empreendimento: chamados[0]?.empreendimento?.nome || 'N/A',
          unidade: item.unidade,
          categoria: item.categoria,
          total: parseInt(item.total),
          chamados: chamados.map((c) => ({
            numero: c.numero,
            descricao: c.descricao,
            status: c.status,
            criadoEm: c.criadoEm,
          })),
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Get reincidencia error:', error);
    res.status(500).json({ error: 'Erro ao buscar reincidências' });
  }
});

// GET /api/dashboard/tempo-medio-categoria
// Tempo médio de resolução por categoria
router.get('/tempo-medio-categoria', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select('chamado.categoria', 'categoria')
      .addSelect(
        "ROUND(AVG((julianday(chamado.finalizado_em) - julianday(chamado.criado_em)) * 24), 1)",
        'mediaHoras'
      )
      .addSelect('COUNT(*)', 'total')
      .where('chamado.status = :status', { status: 'FINALIZADO' })
      .andWhere('chamado.finalizado_em IS NOT NULL')
      .groupBy('chamado.categoria')
      .orderBy('mediaHoras', 'DESC');

    if (user.role === 'TECNICO') {
      queryBuilder.andWhere('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();
    res.json(result);
  } catch (error) {
    console.error('Get tempo medio categoria error:', error);
    res.status(500).json({ error: 'Erro ao buscar tempo médio por categoria' });
  }
});

// GET /api/dashboard/taxa-primeira-vez
// Porcentagem de chamados resolvidos na primeira visita
router.get('/taxa-primeira-vez', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const dias = parseInt(req.query.dias as string) || 30;

    let whereClause = {};
    if (user.role === 'TECNICO') {
      whereClause = { responsavelId: user.id };
    }

    const totalFinalizados = await chamadoRepository.count({
      where: {
        ...whereClause,
        status: 'FINALIZADO',
      },
    });

    // Chamados que passaram apenas por: ABERTO -> FINALIZADO ou ABERTO -> EM_ANDAMENTO -> FINALIZADO
    // (sem passar por AGUARDANDO, que geralmente indica necessidade de retorno)
    const chamadosSimples = await chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.historico', 'historico')
      .where('chamado.status = :status', { status: 'FINALIZADO' })
      .andWhere("chamado.criado_em >= datetime('now', :dias)", { dias: `-${dias} days` })
      .getMany();

    let primeiraVez = 0;
    chamadosSimples.forEach((chamado) => {
      const temAguardando = chamado.historico?.some(
        (h) => h.tipo === 'STATUS' && h.dadosNovos?.includes('AGUARDANDO')
      );
      if (!temAguardando) {
        primeiraVez++;
      }
    });

    const taxa = totalFinalizados > 0 ? Math.round((primeiraVez / totalFinalizados) * 100) : 0;

    res.json({
      total: totalFinalizados,
      primeiraVez,
      taxa,
    });
  } catch (error) {
    console.error('Get taxa primeira vez error:', error);
    res.status(500).json({ error: 'Erro ao buscar taxa de primeira vez' });
  }
});

// GET /api/dashboard/prioridade-distribuicao
// Distribuição de chamados por prioridade
router.get('/prioridade-distribuicao', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .select('chamado.prioridade', 'prioridade')
      .addSelect('COUNT(*)', 'total')
      .groupBy('chamado.prioridade')
      .orderBy('COUNT(*)', 'DESC');

    if (user.role === 'TECNICO') {
      queryBuilder.where('chamado.responsavel_id = :userId', { userId: user.id });
    }

    const result = await queryBuilder.getRawMany();
    res.json(result);
  } catch (error) {
    console.error('Get prioridade distribuicao error:', error);
    res.status(500).json({ error: 'Erro ao buscar distribuição de prioridade' });
  }
});

export { router as dashboardRoutes };
