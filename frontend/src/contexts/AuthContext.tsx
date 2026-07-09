import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LoginCredentials } from '@/types'
import { authService } from '@/services/auth.service'
import { supabase } from '@/lib/supabaseClient'
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

  // Restaura a sessao do Supabase (se houver) e carrega o perfil do backend.
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        try {
          const response = await authService.me()
          setUser(response.user)
        } catch {
          await supabase.auth.signOut()
          setUser(null)
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  // Reage ao fim da sessao do Supabase (signOut / refresh falho).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })
    return () => sub.subscription.unsubscribe()
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
      const response = await authService.login(credentials)
      setUser(response.user)
      toast.success(`Bem-vindo, ${response.user.nome}!`)
      navigate('/')
    } catch (error: any) {
      const message =
        error.response?.data?.error || error.message || 'Erro ao fazer login'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    authService.logout().catch(() => {})
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
