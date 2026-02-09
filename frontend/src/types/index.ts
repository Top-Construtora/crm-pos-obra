// Perfis de usuário
export type UserRole = 'ADMIN' | 'COORDENADOR' | 'TECNICO';

// Status do chamado
export type ChamadoStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'FINALIZADO';

// Prioridade
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

// Tipo do imóvel
export type TipoImovel = 'RESIDENCIAL' | 'COMERCIAL';

// Categorias
export type Categoria =
  | 'HIDRAULICA'
  | 'ELETRICA'
  | 'PINTURA'
  | 'ESQUADRIAS'
  | 'IMPERMEABILIZACAO'
  | 'ESTRUTURAL'
  | 'OUTROS';

// Usuário
export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  criadoEm: string;
}

// Empreendimento
export interface Empreendimento {
  id: string;
  nome: string;
  endereco: string;
  ativo: boolean;
}

// Histórico
export interface Historico {
  id: string;
  chamadoId: string;
  tipo: 'CRIACAO' | 'STATUS' | 'RESPONSAVEL' | 'EDICAO' | 'COMENTARIO';
  descricao: string;
  usuarioId: string;
  usuario?: User;
  dadosAnteriores?: string;
  dadosNovos?: string;
  criadoEm: string;
}

// Comentário
export interface Comentario {
  id: string;
  chamadoId: string;
  texto: string;
  usuarioId: string;
  usuario?: User;
  criadoEm: string;
}

// Vistoria
export interface Vistoria {
  id: string;
  chamadoId: string;
  dataVistoria?: string;
  horaInicio?: string;
  horaTermino?: string;
  tecnicoPresente?: string;
  causaIdentificada?: string;
  parecerTecnico?: string;
  criadoEm: string;
  atualizadoEm: string;
}

// Material
export interface Material {
  id: string;
  chamadoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  aprovado: boolean;
  criadoEm: string;
}

// Anexo
export interface Anexo {
  id: string;
  chamadoId: string;
  nomeOriginal: string;
  nomeArquivo: string;
  tamanho: number;
  tipo: string;
  usuarioId: string;
  usuario?: User;
  criadoEm: string;
}

// Notificacao
export type NotificacaoTipo = 'NOVO_CHAMADO' | 'STATUS_ALTERADO' | 'ATRIBUICAO' | 'COMENTARIO' | 'SLA_ALERTA';

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  lida: boolean;
  chamadoId?: string;
  criadoEm: string;
}

// Chamado
export interface Chamado {
  id: string;
  numero: number;
  empreendimentoId: string;
  empreendimento?: Empreendimento;
  unidade: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail?: string;
  tipo: TipoImovel;
  categoria: Categoria;
  descricao: string;
  prioridade: Prioridade;
  slaHoras: number;
  status: ChamadoStatus;
  responsavelId: string | null;
  responsavel?: User;
  criadoPorId: string;
  criadoPor?: User;
  horasEstimadas?: number;
  equipeNecessaria?: string;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  historico?: Historico[];
  comentarios?: Comentario[];
  vistoria?: Vistoria;
  materiais?: Material[];
  anexos?: Anexo[];
  slaInfo?: SLAInfo;
}

// SLA
export type SLAStatus = 'NO_PRAZO' | 'PROXIMO_VENCIMENTO' | 'VENCIDO';

export interface SLAInfo {
  status: SLAStatus;
  tempoRestante: number; // em minutos
  percentualUsado: number;
  dataLimite: Date;
}

// Auth
export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Dashboard Stats
export interface DashboardStats {
  total: number;
  abertos: number;
  emAndamento: number;
  aguardando: number;
  finalizados: number;
  vencidos: number;
  proximosVencimento: number;
}

// Filtros de Chamados
export interface ChamadoFilters {
  status?: ChamadoStatus;
  empreendimentoId?: string;
  categoria?: Categoria;
  responsavelId?: string;
  prioridade?: Prioridade;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  slaStatus?: 'VENCIDO' | 'PROXIMO' | 'OK';
  page?: number;
  limit?: number;
}

// Dados para criação/edição
export interface ChamadoInput {
  empreendimentoId: string;
  unidade: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail?: string;
  tipo: TipoImovel;
  categoria: Categoria;
  descricao: string;
  prioridade: Prioridade;
  slaHoras: number;
  responsavelId?: string;
  horasEstimadas?: number;
  equipeNecessaria?: string;
}

export interface VistoriaInput {
  dataVistoria?: string;
  horaInicio?: string;
  horaTermino?: string;
  tecnicoPresente?: string;
  causaIdentificada?: string;
  parecerTecnico?: string;
}

export interface MaterialInput {
  nome: string;
  quantidade: number;
  valorUnitario: number;
}

export interface EmpreendimentoInput {
  nome: string;
  endereco: string;
}

export interface UserInput {
  nome: string;
  email: string;
  senha?: string;
  role: UserRole;
}

// Kanban
export interface KanbanData {
  ABERTO: Chamado[];
  EM_ANDAMENTO: Chamado[];
  AGUARDANDO: Chamado[];
  FINALIZADO: Chamado[];
}

// Constantes
export const STATUS_LABELS: Record<ChamadoStatus, string> = {
  ABERTO: 'Em Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO: 'Aguardando',
  FINALIZADO: 'Finalizado',
};

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  HIDRAULICA: 'Hidráulica',
  ELETRICA: 'Elétrica',
  PINTURA: 'Pintura',
  ESQUADRIAS: 'Esquadrias',
  IMPERMEABILIZACAO: 'Impermeabilização',
  ESTRUTURAL: 'Estrutural',
  OUTROS: 'Outros',
};

export const TIPO_LABELS: Record<TipoImovel, string> = {
  RESIDENCIAL: 'Residencial',
  COMERCIAL: 'Comercial',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  COORDENADOR: 'Coordenador',
  TECNICO: 'Técnico',
};

export const SLA_STATUS_LABELS: Record<SLAStatus, string> = {
  NO_PRAZO: 'No Prazo',
  PROXIMO_VENCIMENTO: 'Próximo do Vencimento',
  VENCIDO: 'Vencido',
};
