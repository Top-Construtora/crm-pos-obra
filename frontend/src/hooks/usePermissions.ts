import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'

export function usePermissions() {
  const { user } = useAuth()

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const isAdmin = () => hasRole('ADMIN')
  const isCoordenador = () => hasRole('COORDENADOR')
  const isTecnico = () => hasRole('TECNICO')

  const canCreateChamado = () => hasRole('ADMIN', 'COORDENADOR')
  const canEditChamado = () => hasRole('ADMIN', 'COORDENADOR')
  const canDeleteChamado = () => hasRole('ADMIN')
  const canAssignResponsavel = () => hasRole('ADMIN', 'COORDENADOR')
  const canManageEmpreendimentos = () => hasRole('ADMIN')
  const canManageUsers = () => hasRole('ADMIN')
  const canViewAllChamados = () => hasRole('ADMIN', 'COORDENADOR')

  return {
    user,
    hasRole,
    isAdmin,
    isCoordenador,
    isTecnico,
    canCreateChamado,
    canEditChamado,
    canDeleteChamado,
    canAssignResponsavel,
    canManageEmpreendimentos,
    canManageUsers,
    canViewAllChamados,
  }
}
