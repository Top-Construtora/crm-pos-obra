import api from './api';
import { Categoria, Prioridade } from '../types';

export interface ClassificacaoResult {
  categoria: Categoria;
  prioridade: Prioridade;
  slaHoras: number;
  confianca: number;
}

export const classificacaoService = {
  analisar: async (descricao: string): Promise<ClassificacaoResult> => {
    const { data } = await api.post<ClassificacaoResult>('/classificacao/analisar', { descricao });
    return data;
  },
};
