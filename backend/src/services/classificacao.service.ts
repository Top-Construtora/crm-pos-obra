import { Categoria, Prioridade } from '../types/index.js';

interface ClassificacaoResult {
  categoria: Categoria;
  prioridade: Prioridade;
  slaHoras: number;
  confianca: number;
}

// Palavras-chave para cada categoria
const palavrasChaveCategoria: Record<Categoria, string[]> = {
  HIDRAULICA: [
    'agua', 'vazamento', 'torneira', 'cano', 'encanamento', 'infiltracao',
    'chuveiro', 'descarga', 'vaso', 'sanitario', 'pia', 'ralo', 'esgoto',
    'tubulacao', 'hidraulica', 'goteira', 'registro', 'valvula'
  ],
  ELETRICA: [
    'luz', 'lampada', 'tomada', 'interruptor', 'disjuntor', 'fio',
    'eletrica', 'choque', 'curto', 'energia', 'fiacao', 'quadro',
    'eletrico', 'voltagem', 'instalacao eletrica'
  ],
  PINTURA: [
    'pintura', 'tinta', 'parede', 'teto', 'descascando', 'manchas',
    'mofo', 'bolor', 'umidade', 'repintar', 'retoque', 'massa corrida'
  ],
  ESQUADRIAS: [
    'porta', 'janela', 'fechadura', 'trinco', 'vidro', 'esquadria',
    'batente', 'dobradica', 'macaneta', 'persiana', 'basculante',
    'correr', 'aluminio'
  ],
  IMPERMEABILIZACAO: [
    'impermeabilizacao', 'infiltracao', 'umidade', 'laje', 'telha',
    'calha', 'rufo', 'manta', 'vedacao', 'telhado'
  ],
  ESTRUTURAL: [
    'rachadura', 'trinca', 'estrutura', 'concreto', 'laje', 'viga',
    'pilar', 'fundacao', 'recalque', 'fissura', 'estrutural'
  ],
  OUTROS: []
};

// Palavras-chave para urgência
const palavrasChaveUrgencia = {
  URGENTE: [
    'urgente', 'emergencia', 'grave', 'serio', 'imediato', 'agora',
    'perigo', 'risco', 'critico', 'grande vazamento', 'sem agua',
    'sem luz', 'alaga', 'curto circuito'
  ],
  ALTA: [
    'importante', 'prioritario', 'rapido', 'logo', 'hoje', 'vazamento',
    'nao funciona', 'quebrado', 'danificado'
  ],
  MEDIA: [
    'regular', 'normal', 'medio', 'semana', 'dias'
  ],
  BAIXA: [
    'pequeno', 'leve', 'simples', 'quando possivel', 'nao urgente'
  ]
};

// SLA padrão por prioridade (em horas)
const slaPadrao: Record<Prioridade, number> = {
  URGENTE: 4,
  ALTA: 24,
  MEDIA: 72,
  BAIXA: 168
};

/**
 * Classifica automaticamente um chamado baseado em sua descrição
 */
export function classificarChamado(descricao: string): ClassificacaoResult {
  const descricaoLower = descricao.toLowerCase();

  // Classificar categoria
  let categoriaSugerida: Categoria = 'OUTROS';
  let maxPontos = 0;

  for (const [categoria, palavras] of Object.entries(palavrasChaveCategoria)) {
    let pontos = 0;
    for (const palavra of palavras) {
      if (descricaoLower.includes(palavra)) {
        pontos++;
      }
    }
    if (pontos > maxPontos) {
      maxPontos = pontos;
      categoriaSugerida = categoria as Categoria;
    }
  }

  // Classificar prioridade
  let prioridadeSugerida: Prioridade = 'MEDIA';

  // Verificar palavras de urgência (ordem de prioridade)
  for (const palavra of palavrasChaveUrgencia.URGENTE) {
    if (descricaoLower.includes(palavra)) {
      prioridadeSugerida = 'URGENTE';
      break;
    }
  }

  if (prioridadeSugerida === 'MEDIA') {
    for (const palavra of palavrasChaveUrgencia.ALTA) {
      if (descricaoLower.includes(palavra)) {
        prioridadeSugerida = 'ALTA';
        break;
      }
    }
  }

  if (prioridadeSugerida === 'MEDIA') {
    for (const palavra of palavrasChaveUrgencia.BAIXA) {
      if (descricaoLower.includes(palavra)) {
        prioridadeSugerida = 'BAIXA';
        break;
      }
    }
  }

  // Calcular confiança (0-100)
  const confianca = Math.min(100, maxPontos * 20);

  return {
    categoria: categoriaSugerida,
    prioridade: prioridadeSugerida,
    slaHoras: slaPadrao[prioridadeSugerida],
    confianca
  };
}

/**
 * Analisa múltiplas descrições e retorna estatísticas
 */
export function analisarChamados(descricoes: string[]): {
  categorias: Record<Categoria, number>;
  prioridades: Record<Prioridade, number>;
} {
  const categorias: Record<Categoria, number> = {
    HIDRAULICA: 0,
    ELETRICA: 0,
    PINTURA: 0,
    ESQUADRIAS: 0,
    IMPERMEABILIZACAO: 0,
    ESTRUTURAL: 0,
    OUTROS: 0
  };

  const prioridades: Record<Prioridade, number> = {
    URGENTE: 0,
    ALTA: 0,
    MEDIA: 0,
    BAIXA: 0
  };

  for (const descricao of descricoes) {
    const result = classificarChamado(descricao);
    categorias[result.categoria]++;
    prioridades[result.prioridade]++;
  }

  return { categorias, prioridades };
}
