import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { toCamel } from '../utils/db.js';

const router = Router();

router.use(authMiddleware);

// GET /api/notificacoes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { lida } = req.query;

    let query = supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(50);

    if (lida === 'true') query = query.eq('lida', true);
    if (lida === 'false') query = query.eq('lida', false);

    const { data: notificacoes, error } = await query;

    if (error) throw error;
    res.json((notificacoes || []).map(toCamel));
  } catch (error) {
    console.error('List notificacoes error:', error);
    res.status(500).json({ error: 'Erro ao listar notificacoes' });
  }
});

// GET /api/notificacoes/nao-lidas/count
router.get('/nao-lidas/count', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { count, error } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user.id)
      .eq('lida', false);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Count notificacoes error:', error);
    res.status(500).json({ error: 'Erro ao contar notificacoes' });
  }
});

// PATCH /api/notificacoes/:id/lida
router.patch('/:id/lida', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    const { data: notificacao, error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', req.params.id)
      .eq('usuario_id', user.id)
      .select()
      .single();

    if (error || !notificacao) {
      return res.status(404).json({ error: 'Notificacao nao encontrada' });
    }

    res.json(toCamel(notificacao));
  } catch (error) {
    console.error('Mark notificacao lida error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificacao' });
  }
});

// PATCH /api/notificacoes/marcar-todas-lidas
router.patch('/marcar-todas-lidas', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', user.id)
      .eq('lida', false);

    if (error) throw error;
    res.json({ message: 'Todas as notificacoes foram marcadas como lidas' });
  } catch (error) {
    console.error('Mark all notificacoes lida error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificacoes' });
  }
});

// DELETE /api/notificacoes/todas
router.delete('/todas', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('usuario_id', user.id);

    if (error) throw error;
    res.json({ message: 'Todas as notificacoes foram removidas' });
  } catch (error) {
    console.error('Delete all notificacoes error:', error);
    res.status(500).json({ error: 'Erro ao remover notificacoes' });
  }
});

// DELETE /api/notificacoes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { data: notificacao } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('id', req.params.id)
      .eq('usuario_id', user.id)
      .single();

    if (!notificacao) {
      return res.status(404).json({ error: 'Notificacao nao encontrada' });
    }

    await supabase.from('notificacoes').delete().eq('id', req.params.id);
    res.json({ message: 'Notificacao removida com sucesso' });
  } catch (error) {
    console.error('Delete notificacao error:', error);
    res.status(500).json({ error: 'Erro ao remover notificacao' });
  }
});

export { router as notificacoesRoutes };
