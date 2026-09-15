import { Router, Response } from 'express';
import { authMiddleware, requireGerenciar } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { listarEquipe, definirPapel, PapelEquipe } from '../services/equipe.service.js';

// Equipe do Pos-Obra: lista os usuarios da GIO com acesso ao modulo e permite
// ao gestor definir o papel de cada um (GESTOR/TECNICO). Admins da GIO ficam
// de fora (gestores implicitos). Usuarios/permissoes sao gerenciados na GIO.
const router = Router();

router.use(authMiddleware);

// GET /api/equipe
router.get('/', requireGerenciar, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(await listarEquipe());
  } catch (error: any) {
    console.error('List equipe error:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar equipe' });
  }
});

// PATCH /api/equipe/:profileId  { papel: 'GESTOR' | 'TECNICO' }
router.patch('/:profileId', requireGerenciar, async (req: AuthRequest, res: Response) => {
  try {
    const { papel } = req.body as { papel?: string };
    if (papel !== 'GESTOR' && papel !== 'TECNICO') {
      return res.status(400).json({ error: 'Papel invalido (use GESTOR ou TECNICO)' });
    }

    // Um gestor nao pode rebaixar a si mesmo (evita se trancar fora).
    if (req.params.profileId === req.user!.id && papel !== 'GESTOR') {
      return res.status(400).json({ error: 'Voce nao pode remover seu proprio papel de gestor' });
    }

    await definirPapel(req.params.profileId, papel as PapelEquipe);
    res.json({ message: 'Papel atualizado', profileId: req.params.profileId, papel });
  } catch (error: any) {
    console.error('Set papel error:', error);
    res.status(500).json({ error: error.message || 'Erro ao definir papel' });
  }
});

export { router as equipeRoutes };
