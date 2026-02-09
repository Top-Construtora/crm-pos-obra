import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3333';

const api = axios.create({
  baseURL: `${API_URL}/api/portal-cliente`,
});

export interface ChamadoCliente {
  numero: number;
  empreendimento: {
    nome: string;
    endereco?: string;
  };
  unidade: string;
  clienteNome?: string;
  tipo: string;
  categoria: string;
  descricao: string;
  prioridade: string;
  status: string;
  responsavel: {
    nome: string;
  } | null;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  slaInfo: {
    status: string;
    tempoRestante: number;
    percentualUsado: number;
    dataLimite: string;
  };
  historico?: Array<{
    tipo: string;
    descricao: string;
    usuario: string;
    criadoEm: string;
  }>;
}

export const portalClienteService = {
  rastrear: async (numero: number, identificador: string): Promise<ChamadoCliente> => {
    const { data } = await api.get<ChamadoCliente>(`/rastrear/${numero}`, {
      params: { identificador },
    });
    return data;
  },

  meusChamados: async (identificador: string): Promise<ChamadoCliente[]> => {
    const { data } = await api.get<ChamadoCliente[]>('/meus-chamados', {
      params: { identificador },
    });
    return data;
  },
};
