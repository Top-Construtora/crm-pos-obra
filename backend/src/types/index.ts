import { Request } from 'express';
import { User } from '../entities/User.js';

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

export interface AuthRequest extends Request {
  user?: User;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
