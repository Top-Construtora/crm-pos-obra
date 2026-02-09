import api from './api'
import { DashboardStats, Chamado } from '@/types'

interface CategoriaCount {
  categoria: string
  total: string
}

interface PeriodoCount {
  data: string
  total: string
}

interface TempoResolucao {
  mes: string
  mediaHoras: string
  total: string
}

interface SlaCompliance {
  semana: string
  dentro: number
  fora: number
  total: number
  percentual: number
}

interface TecnicoRanking {
  id: string
  nome: string
  role: string
  atribuidos: number
  finalizados: number
  emAberto: number
  mediaHoras: number
  taxaResolucao: number
}

interface StatusCount {
  status: string
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

  async getPorPeriodo(dias: number = 30): Promise<PeriodoCount[]> {
    const response = await api.get<PeriodoCount[]>(`/dashboard/por-periodo?dias=${dias}`)
    return response.data
  },

  async getTempoResolucao(): Promise<TempoResolucao[]> {
    const response = await api.get<TempoResolucao[]>('/dashboard/tempo-resolucao')
    return response.data
  },

  async getSlaCompliance(dias: number = 30): Promise<SlaCompliance[]> {
    const response = await api.get<SlaCompliance[]>(`/dashboard/sla-compliance?dias=${dias}`)
    return response.data
  },

  async getPorTecnico(): Promise<TecnicoRanking[]> {
    const response = await api.get<TecnicoRanking[]>('/dashboard/por-tecnico')
    return response.data
  },

  async getPorStatus(): Promise<StatusCount[]> {
    const response = await api.get<StatusCount[]>('/dashboard/por-status')
    return response.data
  },
}
