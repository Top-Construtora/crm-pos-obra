import api from './api'
import { Empreendimento, EmpreendimentoInput } from '@/types'

export const empreendimentosService = {
  async getAll(): Promise<Empreendimento[]> {
    const response = await api.get<Empreendimento[]>('/empreendimentos')
    return response.data
  },

  async getById(id: string): Promise<Empreendimento> {
    const response = await api.get<Empreendimento>(`/empreendimentos/${id}`)
    return response.data
  },

  async create(data: EmpreendimentoInput): Promise<Empreendimento> {
    const response = await api.post<Empreendimento>('/empreendimentos', data)
    return response.data
  },

  async update(id: string, data: Partial<EmpreendimentoInput>): Promise<Empreendimento> {
    const response = await api.put<Empreendimento>(`/empreendimentos/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/empreendimentos/${id}`)
  },
}
