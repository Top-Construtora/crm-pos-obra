import { Router, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { classificarChamado } from '../services/classificacao.service.js';

const router = Router();

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// POST /api/classificacao/analisar
router.post('/analisar', async (req: AuthRequest, res: Response) => {
  try {
    const { descricao } = req.body;

    if (!descricao || typeof descricao !== 'string') {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const resultado = classificarChamado(descricao);

    res.json(resultado);
  } catch (error) {
    console.error('Classificacao error:', error);
    res.status(500).json({ error: 'Erro ao classificar chamado' });
  }
});

export { router as classificacaoRoutes };
