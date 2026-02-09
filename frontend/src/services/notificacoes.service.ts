import api from './api'
import { Notificacao } from '@/types'

export const notificacoesService = {
  async getAll(): Promise<Notificacao[]> {
    const response = await api.get<Notificacao[]>('/notificacoes')
    return response.data
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/notificacoes/nao-lidas/count')
    return response.data.count
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notificacoes/${id}/lida`)
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notificacoes/marcar-todas-lidas')
  },
}
