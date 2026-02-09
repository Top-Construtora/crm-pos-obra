import api from './api';

export type StatusAtendimento = 'AGENDADO' | 'EM_ROTA' | 'NO_LOCAL' | 'CONCLUIDO' | 'CANCELADO';

export interface AgendaTecnica {
  id: string;
  chamadoId: string;
  chamado?: any;
  tecnicoId: string;
  tecnico?: any;
  dataAgendamento: string;
  horaInicio: string;
  horaFim?: string;
  status: StatusAtendimento;
  observacoes?: string;
  ordemRoteiro?: number;
  latitude?: number;
  longitude?: number;
  inicioAtendimento?: string;
  fimAtendimento?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AgendaInput {
  chamadoId: string;
  tecnicoId: string;
  dataAgendamento: string;
  horaInicio: string;
  horaFim?: string;
  observacoes?: string;
  latitude?: number;
  longitude?: number;
}

export const agendaService = {
  getAll: async (params?: {
    tecnicoId?: string;
    dataInicio?: string;
    dataFim?: string;
    status?: StatusAtendimento;
  }): Promise<AgendaTecnica[]> => {
    const { data } = await api.get<AgendaTecnica[]>('/agenda', { params });
    return data;
  },

  getCalendario: async (ano: number, mes: number, tecnicoId?: string): Promise<Record<string, AgendaTecnica[]>> => {
    const { data } = await api.get<Record<string, AgendaTecnica[]>>(
      `/agenda/calendario/${ano}/${mes}`,
      { params: { tecnicoId } }
    );
    return data;
  },

  getById: async (id: string): Promise<AgendaTecnica> => {
    const { data } = await api.get<AgendaTecnica>(`/agenda/${id}`);
    return data;
  },

  create: async (agenda: AgendaInput): Promise<AgendaTecnica> => {
    const { data } = await api.post<AgendaTecnica>('/agenda', agenda);
    return data;
  },

  update: async (id: string, agenda: Partial<AgendaTecnica>): Promise<AgendaTecnica> => {
    const { data } = await api.put<AgendaTecnica>(`/agenda/${id}`, agenda);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/agenda/${id}`);
  },

  roteirizar: async (tecnicoId: string, data: string): Promise<{ message: string; total: number }> => {
    const { data: result } = await api.post<{ message: string; total: number }>('/agenda/roteirizar', {
      tecnicoId,
      data,
    });
    return result;
  },
};
