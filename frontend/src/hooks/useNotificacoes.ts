import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificacoesService } from '@/services/notificacoes.service'

export function useNotificacoes() {
  const queryClient = useQueryClient()

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: notificacoesService.getAll,
    refetchInterval: 60000, // Fallback polling (socket handles real-time)
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificacoes', 'unread-count'],
    queryFn: notificacoesService.getUnreadCount,
    refetchInterval: 60000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: notificacoesService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: notificacoesService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })

  return {
    notificacoes,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  }
}
