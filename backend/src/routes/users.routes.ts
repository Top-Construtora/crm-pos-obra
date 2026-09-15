import { Router, Response } from 'express';
import { supabaseGio, supabaseGioAdmin } from '../config/supabase.js';
import { authMiddleware, requireGerenciar } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { listarEquipe } from '../services/equipe.service.js';

// Os usuarios do Pos-Obra sao os de public.profiles (GIO). A gestao de usuarios
// (criar/editar/senha/avatar) e feita no proprio GIO; aqui as rotas sao apenas
// de leitura para listar responsaveis/tecnicos atribuiveis.
const router = Router();

const GERENCIADO_NA_GIO = 'Usuarios sao gerenciados no GIO.';

function mapProfile(p: any) {
  return {
    id: p.id,
    nome: p.name,
    role: p.role,
    ativo: p.ativo !== false,
  };
}

function gioIndisponivel(res: Response) {
  return res.status(503).json({ error: 'Integracao com o GIO nao configurada.' });
}

router.use(authMiddleware);

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

// Edicao de perfil/senha/avatar: gerenciado no GIO.
router.put('/me', (_req, res: Response) => res.status(403).json({ error: GERENCIADO_NA_GIO }));
router.patch('/me/password', (_req, res: Response) => res.status(403).json({ error: GERENCIADO_NA_GIO }));
router.post('/me/avatar', (_req, res: Response) => res.status(403).json({ error: GERENCIADO_NA_GIO }));

// GET /api/users - lista usuarios (profiles)
router.get('/', requireGerenciar, async (_req, res: Response) => {
  try {
    if (!supabaseGio) return gioIndisponivel(res);
    const { data, error } = await supabaseGio
      .from('profiles')
      .select('id, name, role, ativo')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json((data || []).filter((p: any) => p.ativo !== false).map(mapProfile));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Erro ao listar usuarios' });
  }
});

// GET /api/users/tecnicos - pessoas atribuiveis como responsavel
// = equipe do Pos-Obra (profiles ativos com acesso_pos_obra, sem admins).
router.get('/tecnicos', async (_req, res: Response) => {
  try {
    if (!supabaseGioAdmin) return gioIndisponivel(res);
    const equipe = await listarEquipe();
    res.json(equipe.map((m) => ({
      id: m.id,
      nome: m.nome,
      role: m.papel === 'GESTOR' ? 'COORDENADOR' : 'TECNICO',
      ativo: true,
    })));
  } catch (error) {
    console.error('List tecnicos error:', error);
    res.status(500).json({ error: 'Erro ao listar tecnicos' });
  }
});

// GET /api/users/:id
router.get('/:id', requireGerenciar, async (req, res: Response) => {
  try {
    if (!supabaseGio) return gioIndisponivel(res);
    const { data, error } = await supabaseGio
      .from('profiles')
      .select('id, name, role, ativo')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json(mapProfile(data));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuario' });
  }
});

// Criacao/edicao/remocao: gerenciado no GIO.
router.post('/', (_req, res: Response) => res.status(403).json({ error: GERENCIADO_NA_GIO }));
router.put('/:id', (_req, res: Response) => res.status(403).json({ error: GERENCIADO_NA_GIO }));
router.delete('/:id', (_req, res: Response) => res.status(403).json({ error: GERENCIADO_NA_GIO }));

export { router as usersRoutes };
