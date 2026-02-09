import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

export function useSocket() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token || !user) return

    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    // Chamado events — invalidate relevant queries
    socket.on('chamado:created', () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('chamado:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('chamado:statusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    // Notification events
    socket.on('notificacao:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, queryClient])

  return socketRef.current
}
