import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { calcularSLA } from '../utils/sla.js';
import { toCamel } from '../utils/db.js';
import { nomesDeProfiles } from '../utils/pessoas.js';

const router = Router();

// GET /api/portal-cliente/rastrear/:numero
router.get('/rastrear/:numero', async (req: Request, res: Response) => {
  try {
    const { numero } = req.params;
    const { identificador } = req.query;

    if (!identificador) {
      return res.status(400).json({ error: 'Informe o telefone ou email do cliente' });
    }

    const chamadoNum = parseInt(numero);
    if (isNaN(chamadoNum)) {
      return res.status(400).json({ error: 'Numero de chamado invalido' });
    }

    // historico:historicos(*) e embed do mesmo schema (pos_obra) e continua valido.
    const { data: chamadoRaw, error } = await supabase
      .from('chamados')
      .select('*, historico:historicos(*)')
      .eq('numero', chamadoNum)
      .single();

    if (error || !chamadoRaw) {
      return res.status(404).json({ error: 'Chamado nao encontrado' });
    }

    const chamado = toCamel(chamadoRaw);

    // Verificar identificador
    const identificadorLower = (identificador as string).toLowerCase().replace(/\D/g, '');
    const telefoneChamado = chamado.clienteTelefone.toLowerCase().replace(/\D/g, '');
    const emailChamado = chamado.clienteEmail?.toLowerCase() || '';

    const isAuthorized =
      identificadorLower === telefoneChamado ||
      (identificador as string).toLowerCase() === emailChamado;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Telefone ou email nao corresponde ao chamado' });
    }

    // Nomes de responsavel e autores do historico (profiles).
    const nomes = await nomesDeProfiles([
      chamado.responsavelId,
      ...(chamado.historico || []).map((h: any) => h.usuarioId),
    ]);

    const response = {
      numero: chamado.numero,
      empreendimento: {
        nome: chamado.empreendimentoNome || null,
      },
      unidade: chamado.unidade,
      clienteNome: chamado.clienteNome,
      tipo: chamado.tipo,
      categoria: chamado.categoria,
      descricao: chamado.descricao,
      prioridade: chamado.prioridade,
      status: chamado.status,
      responsavel: chamado.responsavelId ? { nome: nomes[chamado.responsavelId] || '-' } : null,
      criadoEm: chamado.criadoEm,
      atualizadoEm: chamado.atualizadoEm,
      finalizadoEm: chamado.finalizadoEm,
      slaInfo: calcularSLA(chamado),
      historico: (chamado.historico || [])
        .sort((a: any, b: any) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
        .map((h: any) => ({
          tipo: h.tipo,
          descricao: h.descricao,
          usuario: nomes[h.usuarioId] || 'Sistema',
          criadoEm: h.criadoEm,
        })),
    };

    res.json(response);
  } catch (error) {
    console.error('Rastrear chamado error:', error);
    res.status(500).json({ error: 'Erro ao rastrear chamado' });
  }
});

// GET /api/portal-cliente/meus-chamados
router.get('/meus-chamados', async (req: Request, res: Response) => {
  try {
    const { identificador } = req.query;

    if (!identificador) {
      return res.status(400).json({ error: 'Informe o telefone ou email do cliente' });
    }

    const identificadorStr = identificador as string;

    let query = supabase
      .from('chamados')
      .select('*')
      .order('criado_em', { ascending: false });

    if (identificadorStr.includes('@')) {
      query = query.ilike('cliente_email', identificadorStr);
    } else {
      // Para telefone, buscar com ilike para flexibilidade
      const telefoneDigits = identificadorStr.replace(/\D/g, '');
      query = query.like('cliente_telefone', `%${telefoneDigits.slice(-8)}%`);
    }

    const { data: chamados, error } = await query;
    if (error) throw error;

    // Filtro extra para telefone (matching exato de digitos)
    let filtered = chamados || [];
    if (!identificadorStr.includes('@')) {
      const telefoneDigits = identificadorStr.replace(/\D/g, '');
      filtered = filtered.filter((c) => {
        const cDigits = c.cliente_telefone.replace(/\D/g, '');
        return cDigits === telefoneDigits;
      });
    }

    const nomes = await nomesDeProfiles(filtered.map((c: any) => c.responsavel_id));

    const response = filtered.map((c) => {
      const chamado = toCamel(c);
      return {
        numero: chamado.numero,
        empreendimento: { nome: chamado.empreendimentoNome || null },
        unidade: chamado.unidade,
        categoria: chamado.categoria,
        descricao: chamado.descricao,
        prioridade: chamado.prioridade,
        status: chamado.status,
        responsavel: chamado.responsavelId ? { nome: nomes[chamado.responsavelId] || '-' } : null,
        criadoEm: chamado.criadoEm,
        atualizadoEm: chamado.atualizadoEm,
        finalizadoEm: chamado.finalizadoEm,
        slaInfo: calcularSLA(chamado),
      };
    });

    res.json(response);
  } catch (error) {
    console.error('Meus chamados error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

export { router as portalClienteRoutes };
