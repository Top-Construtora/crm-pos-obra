import api from './api'
import { User, UserInput } from '@/types'

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users')
    return response.data
  },

  async getTecnicos(): Promise<User[]> {
    const response = await api.get<User[]>('/users/tecnicos')
    return response.data
  },

  async getById(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  },

  async create(data: UserInput): Promise<User> {
    const response = await api.post<User>('/users', data)
    return response.data
  },

  async update(id: string, data: Partial<UserInput>): Promise<User> {
    const response = await api.put<User>(`/users/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  },
}
