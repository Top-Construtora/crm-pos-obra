import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Send, Loader2, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { chamadosService } from '@/services/chamados.service'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Chamado } from '@/types'

interface HistoricoTabProps {
  chamadoId: string
  chamado?: Chamado
}

export function HistoricoTab({ chamadoId, chamado }: HistoricoTabProps) {
  const queryClient = useQueryClient()
  const [comentario, setComentario] = useState('')

  const { data: comentarios = [] } = useQuery({
    queryKey: ['comentarios', chamadoId],
    queryFn: () => chamadosService.getComentarios(chamadoId),
  })

  const addComentarioMutation = useMutation({
    mutationFn: (texto: string) => chamadosService.addComentario(chamadoId, texto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comentarios', chamadoId] })
      queryClient.invalidateQueries({ queryKey: ['chamado', chamadoId] })
      setComentario('')
      toast.success('Comentario adicionado')
    },
    onError: () => toast.error('Erro ao adicionar comentario'),
  })

  const handleSubmitComentario = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comentario.trim()) return
    addComentarioMutation.mutate(comentario.trim())
  }

  const historico = chamado?.historico || []

  // Merge historico + comentarios in a single timeline, sorted by date
  const timelineItems = [
    ...historico.map((h) => ({
      id: h.id,
      type: 'historico' as const,
      descricao: h.descricao,
      usuario: h.usuario?.nome || 'Sistema',
      criadoEm: h.criadoEm,
      tipoHistorico: h.tipo,
    })),
    ...comentarios.map((c) => ({
      id: c.id,
      type: 'comentario' as const,
      descricao: c.texto,
      usuario: c.usuario?.nome || 'Usuario',
      criadoEm: c.criadoEm,
      tipoHistorico: 'COMENTARIO' as const,
    })),
  ].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())

  return (
    <div>
      {/* Add comment form */}
      <form onSubmit={handleSubmitComentario} className="mb-6">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-sidebar-accent" />
          Adicionar Comentario
        </h3>
        <div className="flex gap-2">
          <Input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Digite seu comentario..."
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            className="bg-sidebar-accent hover:bg-sidebar-accent/90 text-white px-4"
            disabled={!comentario.trim() || addComentarioMutation.isPending}
          >
            {addComentarioMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Timeline */}
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-sidebar-accent" />
        Timeline de Atividades
      </h3>

      {timelineItems.length > 0 ? (
        <div className="relative pl-7">
          <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-border" />
          <div className="space-y-6">
            {timelineItems.map((item, index) => (
              <div key={item.id} className="relative">
                <div
                  className={cn(
                    'absolute -left-[21px] w-3.5 h-3.5 rounded-full border-[3px]',
                    item.type === 'comentario'
                      ? 'bg-blue-500 border-blue-500'
                      : index === 0
                        ? 'bg-sidebar-accent border-sidebar-accent'
                        : 'bg-emerald-500 border-emerald-500'
                  )}
                />
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      {item.type === 'comentario' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Comentario
                        </span>
                      )}
                      <span className="font-semibold text-sm">{item.descricao}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(item.criadoEm), "dd/MM/yyyy, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Por {item.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum historico disponivel</p>
        </div>
      )}
    </div>
  )
}
