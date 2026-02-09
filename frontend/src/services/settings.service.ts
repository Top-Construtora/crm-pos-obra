import api from './api'

export interface SettingsMap {
  [key: string]: { valor: string; atualizadoEm?: string }
}

export const settingsService = {
  async getAll(): Promise<SettingsMap> {
    const response = await api.get<SettingsMap>('/settings')
    return response.data
  },

  async update(chave: string, valor: string): Promise<void> {
    await api.put(`/settings/${chave}`, { valor })
  },
}
