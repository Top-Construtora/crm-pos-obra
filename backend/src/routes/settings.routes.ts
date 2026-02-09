import { Router, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Settings } from '../entities/Settings.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
const settingsRepository = AppDataSource.getRepository(Settings);

// All settings routes require admin
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
    const settings = await settingsRepository.find();

    // Merge defaults with saved settings
    const result: Record<string, { valor: string; atualizadoEm?: Date }> = {};
    for (const [chave, valor] of Object.entries(DEFAULTS)) {
      const saved = settings.find((s) => s.chave === chave);
      result[chave] = saved
        ? { valor: saved.valor, atualizadoEm: saved.atualizadoEm }
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

    let setting = await settingsRepository.findOne({ where: { chave } });
    if (!setting) {
      setting = settingsRepository.create({ chave, valor: String(valor) });
    } else {
      setting.valor = String(valor);
    }

    await settingsRepository.save(setting);
    res.json({ chave: setting.chave, valor: setting.valor, atualizadoEm: setting.atualizadoEm });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuracao' });
  }
});

export { router as settingsRoutes };
