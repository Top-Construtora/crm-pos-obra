import { Router, Response } from 'express';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { obrasSupabaseService } from '../services/obrasSupabase.service.js';

const router = Router();

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/empreendimentos - Busca direto do Supabase GIO
router.get('/', async (_req, res: Response) => {
  try {
    const obras = await obrasSupabaseService.listarObrasAtivas();

    const empreendimentos = obras.map(obra => ({
      id: obra.id,
      nome: obra.nome_limpo || obra.nome,
      endereco: obra.endereco || '',
      ativo: obra.ativo !== false,
      criadoEm: obra.created_at,
      atualizadoEm: obra.updated_at,
    }));

    res.json(empreendimentos);
  } catch (error) {
    console.error('List empreendimentos error:', error);
    res.status(500).json({ error: 'Erro ao listar empreendimentos' });
  }
});

// GET /api/empreendimentos/:id - Busca direto do Supabase GIO
router.get('/:id', async (req, res: Response) => {
  try {
    const obra = await obrasSupabaseService.buscarObraPorId(req.params.id);

    if (!obra) {
      return res.status(404).json({ error: 'Empreendimento nao encontrado' });
    }

    const empreendimento = {
      id: obra.id,
      nome: obra.nome_limpo || obra.nome,
      endereco: obra.endereco || '',
      ativo: obra.ativo !== false,
      criadoEm: obra.created_at,
      atualizadoEm: obra.updated_at,
    };

    res.json(empreendimento);
  } catch (error) {
    console.error('Get empreendimento error:', error);
    res.status(500).json({ error: 'Erro ao buscar empreendimento' });
  }
});

// POST, PUT, DELETE desabilitados - gerenciados no Supabase GIO
router.post('/', requireRoles('ADMIN'), async (_req, res: Response) => {
  res.status(403).json({ error: 'Empreendimentos sao gerenciados no Supabase GIO.' });
});

router.put('/:id', requireRoles('ADMIN'), async (_req, res: Response) => {
  res.status(403).json({ error: 'Empreendimentos sao gerenciados no Supabase GIO.' });
});

router.delete('/:id', requireRoles('ADMIN'), async (_req, res: Response) => {
  res.status(403).json({ error: 'Empreendimentos sao gerenciados no Supabase GIO.' });
});

export { router as empreendimentosRoutes };
