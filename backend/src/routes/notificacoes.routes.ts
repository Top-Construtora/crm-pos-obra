import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Notificacao } from '../entities/Notificacao.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const notificacaoRepository = AppDataSource.getRepository(Notificacao);

router.use(authMiddleware);

// GET /api/notificacoes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const notificacoes = await notificacaoRepository.find({
      where: { usuarioId: user.id },
      order: { criadoEm: 'DESC' },
      take: 50,
    });
    res.json(notificacoes);
  } catch (error) {
    console.error('List notificacoes error:', error);
    res.status(500).json({ error: 'Erro ao listar notificações' });
  }
});

// GET /api/notificacoes/nao-lidas/count
router.get('/nao-lidas/count', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const count = await notificacaoRepository.count({
      where: { usuarioId: user.id, lida: false },
    });
    res.json({ count });
  } catch (error) {
    console.error('Count notificacoes error:', error);
    res.status(500).json({ error: 'Erro ao contar notificações' });
  }
});

// PATCH /api/notificacoes/:id/lida
router.patch('/:id/lida', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const notificacao = await notificacaoRepository.findOne({
      where: { id: req.params.id, usuarioId: user.id },
    });

    if (!notificacao) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    notificacao.lida = true;
    await notificacaoRepository.save(notificacao);
    res.json(notificacao);
  } catch (error) {
    console.error('Mark notificacao lida error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
});

// PATCH /api/notificacoes/marcar-todas-lidas
router.patch('/marcar-todas-lidas', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    await notificacaoRepository.update(
      { usuarioId: user.id, lida: false },
      { lida: true }
    );
    res.json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    console.error('Mark all notificacoes lida error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

export { router as notificacoesRoutes };
