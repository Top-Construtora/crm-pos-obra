import api from './api'
import { LoginCredentials, AuthResponse, User } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  async me(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
}
