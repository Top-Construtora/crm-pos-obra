import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { toCamel } from '../utils/db.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRoles('ADMIN'));

// Default settings
const DEFAULTS: Record<string, string> = {
  sla_padrao: '48',
  categorias_ativas: 'HIDRAULICA,ELETRICA,PINTURA,ESQUADRIAS,IMPERMEABILIZACAO,ESTRUTURAL,OUTROS',
  email_habilitado: 'false',
  nome_sistema: 'CRM Pos-Obra',
};

// GET /api/settings
router.get('/', async (_req, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    const result: Record<string, { valor: string; atualizadoEm?: string }> = {};
    for (const [chave, valor] of Object.entries(DEFAULTS)) {
      const saved = (settings || []).find((s) => s.chave === chave);
      result[chave] = saved
        ? { valor: saved.valor, atualizadoEm: saved.atualizado_em }
        : { valor };
    }

    res.json(result);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Erro ao buscar configuracoes' });
  }
});

// PUT /api/settings/:chave
router.put('/:chave', async (req, res: Response) => {
  try {
    const { chave } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({ error: 'Valor e obrigatorio' });
    }

    // Upsert: try update first, then insert
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('chave', chave)
      .single();

    let setting;
    if (existing) {
      const { data, error } = await supabase
        .from('settings')
        .update({ valor: String(valor) })
        .eq('chave', chave)
        .select()
        .single();

      if (error) throw error;
      setting = data;
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert({ chave, valor: String(valor) })
        .select()
        .single();

      if (error) throw error;
      setting = data;
    }

    const result = toCamel(setting);
    res.json({ chave: result.chave, valor: result.valor, atualizadoEm: result.atualizadoEm });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuracao' });
  }
});

export { router as settingsRoutes };
