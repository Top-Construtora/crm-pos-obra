import { Request } from 'express';

export type UserRole = 'ADMIN' | 'COORDENADOR' | 'TECNICO';
export type ChamadoStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'FINALIZADO';
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TipoImovel = 'RESIDENCIAL' | 'COMERCIAL';
export type Categoria =
  | 'HIDRAULICA'
  | 'ELETRICA'
  | 'PINTURA'
  | 'ESQUADRIAS'
  | 'IMPERMEABILIZACAO'
  | 'ESTRUTURAL'
  | 'OUTROS';
export type HistoricoTipo = 'CRIACAO' | 'STATUS' | 'RESPONSAVEL' | 'EDICAO' | 'COMENTARIO';
export type NotificacaoTipo = 'NOVO_CHAMADO' | 'STATUS_ALTERADO' | 'ATRIBUICAO' | 'COMENTARIO' | 'SLA_ALERTA';
export type StatusAtendimento = 'AGENDADO' | 'EM_ROTA' | 'NO_LOCAL' | 'CONCLUIDO' | 'CANCELADO';

export interface UserData {
  id: string;
  nome: string;
  email: string;
  // role e derivado das permissoes da GIO: COORDENADOR (pode gerenciar) ou
  // TECNICO. Mantido para compatibilidade com o scoping existente.
  role: UserRole;
  podeGerenciar: boolean;
  ativo: boolean;
  avatar?: string;
}

export interface AuthRequest extends Request {
  user?: UserData;
}
