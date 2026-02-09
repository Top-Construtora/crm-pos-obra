import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/data-source.js';
import { Chamado } from '../entities/Chamado.js';
import { Historico } from '../entities/Historico.js';
import { calcularSLA } from '../utils/sla.js';

const router = Router();
const chamadoRepository = AppDataSource.getRepository(Chamado);
const historicoRepository = AppDataSource.getRepository(Historico);

// GET /api/portal-cliente/rastrear/:numero
// Permite rastrear um chamado pelo número e telefone/email do cliente
router.get('/rastrear/:numero', async (req: Request, res: Response) => {
  try {
    const { numero } = req.params;
    const { identificador } = req.query; // telefone ou email

    if (!identificador) {
      return res.status(400).json({ error: 'Informe o telefone ou email do cliente' });
    }

    const chamadoNum = parseInt(numero);
    if (isNaN(chamadoNum)) {
      return res.status(400).json({ error: 'Número de chamado inválido' });
    }

    const chamado = await chamadoRepository.findOne({
      where: { numero: chamadoNum },
      relations: ['empreendimento', 'responsavel', 'historico', 'historico.usuario'],
      order: {
        historico: { criadoEm: 'DESC' },
      },
    });

    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar se o identificador corresponde ao cliente
    const identificadorLower = (identificador as string).toLowerCase().replace(/\D/g, '');
    const telefoneChamado = chamado.clienteTelefone.toLowerCase().replace(/\D/g, '');
    const emailChamado = chamado.clienteEmail?.toLowerCase() || '';

    const isAuthorized =
      identificadorLower === telefoneChamado ||
      (identificador as string).toLowerCase() === emailChamado;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Telefone ou email não corresponde ao chamado' });
    }

    // Retornar dados limitados para o cliente
    const response = {
      numero: chamado.numero,
      empreendimento: {
        nome: chamado.empreendimento.nome,
        endereco: chamado.empreendimento.endereco,
      },
      unidade: chamado.unidade,
      clienteNome: chamado.clienteNome,
      tipo: chamado.tipo,
      categoria: chamado.categoria,
      descricao: chamado.descricao,
      prioridade: chamado.prioridade,
      status: chamado.status,
      responsavel: chamado.responsavel ? {
        nome: chamado.responsavel.nome,
      } : null,
      criadoEm: chamado.criadoEm,
      atualizadoEm: chamado.atualizadoEm,
      finalizadoEm: chamado.finalizadoEm,
      slaInfo: calcularSLA(chamado),
      historico: chamado.historico.map((h) => ({
        tipo: h.tipo,
        descricao: h.descricao,
        usuario: h.usuario ? h.usuario.nome : 'Sistema',
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
// Lista todos os chamados de um cliente
router.get('/meus-chamados', async (req: Request, res: Response) => {
  try {
    const { identificador } = req.query; // telefone ou email

    if (!identificador) {
      return res.status(400).json({ error: 'Informe o telefone ou email do cliente' });
    }

    // Buscar por telefone ou email
    const identificadorStr = identificador as string;
    const telefoneDigits = identificadorStr.replace(/\D/g, '');

    const queryBuilder = chamadoRepository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.empreendimento', 'empreendimento')
      .leftJoinAndSelect('chamado.responsavel', 'responsavel')
      .orderBy('chamado.criadoEm', 'DESC');

    // Se for email
    if (identificadorStr.includes('@')) {
      queryBuilder.where('LOWER(chamado.cliente_email) = LOWER(:email)', {
        email: identificadorStr,
      });
    } else {
      // Se for telefone
      queryBuilder.where(
        "REPLACE(REPLACE(REPLACE(REPLACE(chamado.cliente_telefone, '(', ''), ')', ''), ' ', ''), '-', '') = :telefone",
        { telefone: telefoneDigits }
      );
    }

    const chamados = await queryBuilder.getMany();

    const response = chamados.map((chamado) => ({
      numero: chamado.numero,
      empreendimento: {
        nome: chamado.empreendimento.nome,
      },
      unidade: chamado.unidade,
      categoria: chamado.categoria,
      descricao: chamado.descricao,
      prioridade: chamado.prioridade,
      status: chamado.status,
      responsavel: chamado.responsavel ? {
        nome: chamado.responsavel.nome,
      } : null,
      criadoEm: chamado.criadoEm,
      atualizadoEm: chamado.atualizadoEm,
      finalizadoEm: chamado.finalizadoEm,
      slaInfo: calcularSLA(chamado),
    }));

    res.json(response);
  } catch (error) {
    console.error('Meus chamados error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

export { router as portalClienteRoutes };
