import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Empreendimento } from '../entities/Empreendimento.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
const empreendimentoRepository = AppDataSource.getRepository(Empreendimento);

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/empreendimentos
router.get('/', async (_req, res: Response) => {
  try {
    const empreendimentos = await empreendimentoRepository.find({
      where: { ativo: true },
      order: { nome: 'ASC' },
    });

    res.json(empreendimentos);
  } catch (error) {
    console.error('List empreendimentos error:', error);
    res.status(500).json({ error: 'Erro ao listar empreendimentos' });
  }
});

// GET /api/empreendimentos/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const empreendimento = await empreendimentoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    res.json(empreendimento);
  } catch (error) {
    console.error('Get empreendimento error:', error);
    res.status(500).json({ error: 'Erro ao buscar empreendimento' });
  }
});

// POST /api/empreendimentos
router.post('/', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const { nome, endereco } = req.body;

    if (!nome || !endereco) {
      return res.status(400).json({ error: 'Nome e endereço são obrigatórios' });
    }

    const empreendimento = empreendimentoRepository.create({
      nome,
      endereco,
      ativo: true,
    });

    await empreendimentoRepository.save(empreendimento);

    res.status(201).json(empreendimento);
  } catch (error) {
    console.error('Create empreendimento error:', error);
    res.status(500).json({ error: 'Erro ao criar empreendimento' });
  }
});

// PUT /api/empreendimentos/:id
router.put('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const empreendimento = await empreendimentoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    const { nome, endereco, ativo } = req.body;

    if (nome) empreendimento.nome = nome;
    if (endereco) empreendimento.endereco = endereco;
    if (typeof ativo === 'boolean') empreendimento.ativo = ativo;

    await empreendimentoRepository.save(empreendimento);

    res.json(empreendimento);
  } catch (error) {
    console.error('Update empreendimento error:', error);
    res.status(500).json({ error: 'Erro ao atualizar empreendimento' });
  }
});

// DELETE /api/empreendimentos/:id (soft delete)
router.delete('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const empreendimento = await empreendimentoRepository.findOne({
      where: { id: req.params.id },
    });

    if (!empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    empreendimento.ativo = false;
    await empreendimentoRepository.save(empreendimento);

    res.json({ message: 'Empreendimento desativado com sucesso' });
  } catch (error) {
    console.error('Delete empreendimento error:', error);
    res.status(500).json({ error: 'Erro ao desativar empreendimento' });
  }
});

export { router as empreendimentosRoutes };
