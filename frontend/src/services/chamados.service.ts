import api from './api'
import { Chamado, ChamadoInput, ChamadoFilters, KanbanData, Comentario, Vistoria, VistoriaInput, Material, MaterialInput, Anexo } from '@/types'

export const chamadosService = {
  async getAll(filters?: ChamadoFilters): Promise<{ data: Chamado[]; total: number }> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.empreendimentoId) params.append('empreendimentoId', filters.empreendimentoId)
      if (filters.categoria) params.append('categoria', filters.categoria)
      if (filters.responsavelId) params.append('responsavelId', filters.responsavelId)
      if (filters.prioridade) params.append('prioridade', filters.prioridade)
      if (filters.busca) params.append('busca', filters.busca)
      if (filters.dataInicio) params.append('dataInicio', filters.dataInicio)
      if (filters.dataFim) params.append('dataFim', filters.dataFim)
      if (filters.slaStatus) params.append('slaStatus', filters.slaStatus)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
    }
    const response = await api.get<Chamado[]>(`/chamados?${params.toString()}`)
    const total = parseInt(response.headers['x-total-count'] || '0')
    return { data: response.data, total }
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

  // Vistoria
  async getVistoria(chamadoId: string): Promise<Vistoria | null> {
    try {
      const response = await api.get<Vistoria>(`/chamados/${chamadoId}/vistoria`)
      return response.data
    } catch {
      return null
    }
  },

  async saveVistoria(chamadoId: string, data: VistoriaInput): Promise<Vistoria> {
    const response = await api.post<Vistoria>(`/chamados/${chamadoId}/vistoria`, data)
    return response.data
  },

  async updateVistoria(chamadoId: string, data: VistoriaInput): Promise<Vistoria> {
    const response = await api.put<Vistoria>(`/chamados/${chamadoId}/vistoria`, data)
    return response.data
  },

  async deleteVistoria(chamadoId: string): Promise<void> {
    await api.delete(`/chamados/${chamadoId}/vistoria`)
  },

  // Materiais
  async getMateriais(chamadoId: string): Promise<Material[]> {
    const response = await api.get<Material[]>(`/chamados/${chamadoId}/materiais`)
    return response.data
  },

  async addMaterial(chamadoId: string, data: MaterialInput): Promise<Material> {
    const response = await api.post<Material>(`/chamados/${chamadoId}/materiais`, data)
    return response.data
  },

  async updateMaterial(chamadoId: string, materialId: string, data: Partial<MaterialInput>): Promise<Material> {
    const response = await api.put<Material>(`/chamados/${chamadoId}/materiais/${materialId}`, data)
    return response.data
  },

  async toggleMaterialAprovado(chamadoId: string, materialId: string, aprovado: boolean): Promise<Material> {
    const response = await api.patch<Material>(`/chamados/${chamadoId}/materiais/${materialId}/aprovado`, { aprovado })
    return response.data
  },

  async deleteMaterial(chamadoId: string, materialId: string): Promise<void> {
    await api.delete(`/chamados/${chamadoId}/materiais/${materialId}`)
  },

  // Anexos
  async getAnexos(chamadoId: string): Promise<Anexo[]> {
    const response = await api.get<Anexo[]>(`/chamados/${chamadoId}/anexos`)
    return response.data
  },

  async uploadAnexo(chamadoId: string, file: File): Promise<Anexo> {
    const formData = new FormData()
    formData.append('arquivo', file)
    const response = await api.post<Anexo>(`/chamados/${chamadoId}/anexos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async downloadAnexo(chamadoId: string, anexoId: string, nomeOriginal: string): Promise<void> {
    const response = await api.get(`/chamados/${chamadoId}/anexos/${anexoId}/download`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', nomeOriginal)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  async deleteAnexo(chamadoId: string, anexoId: string): Promise<void> {
    await api.delete(`/chamados/${chamadoId}/anexos/${anexoId}`)
  },
}
