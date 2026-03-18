import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function NotificacoesDropdown() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { notificacoes, unreadCount, markAsRead, markAllAsRead } = useNotificacoes()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'NOVO_CHAMADO': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      case 'STATUS_ALTERADO': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
      case 'ATRIBUICAO': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
      case 'COMENTARIO': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'SLA_ALERTA': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-muted"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-bold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-sidebar-accent hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.lida) markAsRead(n.id)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors',
                    !n.lida && 'bg-sidebar-accent/5'
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold', getTipoIcon(n.tipo))}>
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-semibold truncate', !n.lida && 'text-foreground')}>
                          {n.titulo}
                        </p>
                        {!n.lida && (
                          <span className="w-2 h-2 rounded-full bg-sidebar-accent flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.mensagem}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.criadoEm), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
