import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LoginCredentials, AuthResponse } from '@/types'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token')
      if (token) {
        try {
          const response = await authService.me()
          setUser(response.user)
        } catch {
          sessionStorage.removeItem('token')
          setUser(null)
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  // Escuta eventos de 401 do interceptor para deslogar via React Router
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null)
      navigate('/login')
    }
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [navigate])

  const login = async (credentials: LoginCredentials) => {
    try {
      const response: AuthResponse = await authService.login(credentials)
      sessionStorage.setItem('token', response.token)
      setUser(response.user)
      toast.success(`Bem-vindo, ${response.user.nome}!`)
      navigate('/')
    } catch (error: any) {
      const rawError = error.response?.data?.error
      const message = typeof rawError === 'string' ? rawError : 'Erro ao fazer login'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    sessionStorage.removeItem('token')
    setUser(null)
    toast.info('Logout realizado com sucesso')
    navigate('/login')
  }

  const refreshUser = async () => {
    try {
      const response = await authService.me()
      setUser(response.user)
    } catch {
      // silently fail
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
