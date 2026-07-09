import api from './api'
import { supabase } from '@/lib/supabaseClient'
import { LoginCredentials, AuthResponse, User } from '@/types'

export const authService = {
  async login({ email, senha }: LoginCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error || !data.session) {
      throw new Error(error?.message || 'Credenciais invalidas')
    }

    // Confirma o acesso ao modulo e obtem o perfil montado pelo backend.
    try {
      const me = await api.get<{ user: User }>('/auth/me')
      return { user: me.data.user, token: data.session.access_token }
    } catch (e) {
      // Autenticou no Supabase mas nao tem acesso ao Pos-Obra: encerra a sessao.
      await supabase.auth.signOut()
      throw e
    }
  },

  async me(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },
}
