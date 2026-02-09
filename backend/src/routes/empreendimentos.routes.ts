import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Empreendimento } from '../entities/Empreendimento.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { obrasSupabaseService } from '../services/obrasSupabase.service.js';

const router = Router();
const empreendimentoRepository = AppDataSource.getRepository(Empreendimento);

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/empreendimentos - Busca direto do Supabase
router.get('/', async (_req, res: Response) => {
  try {
    const obras = await obrasSupabaseService.listarObrasAtivas();

    // Mapear para o formato esperado pelo frontend
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

// GET /api/empreendimentos/:id - Busca direto do Supabase
router.get('/:id', async (req, res: Response) => {
  try {
    const obra = await obrasSupabaseService.buscarObraPorId(req.params.id);

    if (!obra) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    // Mapear para o formato esperado pelo frontend
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

// POST, PUT e DELETE desabilitados - Os empreendimentos são gerenciados diretamente no Supabase
// Se necessário gerenciar empreendimentos, faça diretamente na tabela obras_top do Supabase

// POST /api/empreendimentos - DESABILITADO (gerenciar no Supabase)
router.post('/', requireRoles('ADMIN'), async (_req, res: Response) => {
  res.status(403).json({
    error: 'Empreendimentos são gerenciados diretamente no Supabase. Acesse o painel do Supabase para criar novos empreendimentos.'
  });
});

// PUT /api/empreendimentos/:id - DESABILITADO (gerenciar no Supabase)
router.put('/:id', requireRoles('ADMIN'), async (_req, res: Response) => {
  res.status(403).json({
    error: 'Empreendimentos são gerenciados diretamente no Supabase. Acesse o painel do Supabase para editar empreendimentos.'
  });
});

// DELETE /api/empreendimentos/:id - DESABILITADO (gerenciar no Supabase)
router.delete('/:id', requireRoles('ADMIN'), async (_req, res: Response) => {
  res.status(403).json({
    error: 'Empreendimentos são gerenciados diretamente no Supabase. Acesse o painel do Supabase para desativar empreendimentos.'
  });
});

export { router as empreendimentosRoutes };
