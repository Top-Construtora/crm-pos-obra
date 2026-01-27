import api from './api'
import { DashboardStats, Chamado } from '@/types'

interface CategoriaCount {
  categoria: string
  total: string
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats')
    return response.data
  },

  async getSlaProximos(): Promise<Chamado[]> {
    const response = await api.get<Chamado[]>('/dashboard/sla-proximos')
    return response.data
  },

  async getRecentes(): Promise<Chamado[]> {
    const response = await api.get<Chamado[]>('/dashboard/recentes')
    return response.data
  },

  async getPorCategoria(): Promise<CategoriaCount[]> {
    const response = await api.get<CategoriaCount[]>('/dashboard/por-categoria')
    return response.data
  },
}
