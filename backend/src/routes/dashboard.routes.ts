import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Chamado } from '../entities/Chamado.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { calcularSLA } from '../utils/sla.js';

const router = Router();
const chamadoRepository = AppDataSource.getRepository(Chamado);

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

export { router as dashboardRoutes };
