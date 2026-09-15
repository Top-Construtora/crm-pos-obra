import api from './api'

export type PapelEquipe = 'GESTOR' | 'TECNICO'

export interface MembroEquipe {
  id: string
  nome: string
  roleGio: string
  papel: PapelEquipe
}

// Equipe do Pos-Obra: usuarios da GIO com acesso ao modulo (acesso_pos_obra).
// O papel (GESTOR/TECNICO) e definido aqui; usuarios/permissoes, na GIO.
export const equipeService = {
  async getEquipe(): Promise<MembroEquipe[]> {
    const response = await api.get<MembroEquipe[]>('/equipe')
    return response.data
  },

  async setPapel(profileId: string, papel: PapelEquipe): Promise<void> {
    await api.patch(`/equipe/${profileId}`, { papel })
  },
}
