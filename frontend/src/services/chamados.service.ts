import api from './api'
import { Chamado, ChamadoInput, ChamadoFilters, KanbanData, Comentario } from '@/types'

export const chamadosService = {
  async getAll(filters?: ChamadoFilters): Promise<Chamado[]> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.empreendimentoId) params.append('empreendimentoId', filters.empreendimentoId)
      if (filters.categoria) params.append('categoria', filters.categoria)
      if (filters.responsavelId) params.append('responsavelId', filters.responsavelId)
      if (filters.prioridade) params.append('prioridade', filters.prioridade)
      if (filters.busca) params.append('busca', filters.busca)
    }
    const response = await api.get<Chamado[]>(`/chamados?${params.toString()}`)
    return response.data
  },

  async getById(id: string): Promise<Chamado> {
    const response = await api.get<Chamado>(`/chamados/${id}`)
    return response.data
  },

  async getKanban(filters?: Partial<ChamadoFilters>): Promise<KanbanData> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.empreendimentoId) params.append('empreendimentoId', filters.empreendimentoId)
      if (filters.categoria) params.append('categoria', filters.categoria)
      if (filters.responsavelId) params.append('responsavelId', filters.responsavelId)
    }
    const response = await api.get<KanbanData>(`/chamados/kanban?${params.toString()}`)
    return response.data
  },

  async create(data: ChamadoInput): Promise<Chamado> {
    const response = await api.post<Chamado>('/chamados', data)
    return response.data
  },

  async update(id: string, data: Partial<ChamadoInput & { status?: string }>): Promise<Chamado> {
    const response = await api.put<Chamado>(`/chamados/${id}`, data)
    return response.data
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await api.patch(`/chamados/${id}/status`, { status })
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/chamados/${id}`)
  },

  async addComentario(chamadoId: string, texto: string): Promise<Comentario> {
    const response = await api.post<Comentario>(`/chamados/${chamadoId}/comentarios`, { texto })
    return response.data
  },

  async getComentarios(chamadoId: string): Promise<Comentario[]> {
    const response = await api.get<Comentario[]>(`/chamados/${chamadoId}/comentarios`)
    return response.data
  },
}
