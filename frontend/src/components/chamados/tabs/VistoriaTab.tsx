import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ClipboardCheck, FileText, Save, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { chamadosService } from '@/services/chamados.service'
import type { VistoriaInput } from '@/types'

interface VistoriaTabProps {
  chamadoId: string
}

export function VistoriaTab({ chamadoId }: VistoriaTabProps) {
  const queryClient = useQueryClient()

  const { data: vistoria, isLoading } = useQuery({
    queryKey: ['vistoria', chamadoId],
    queryFn: () => chamadosService.getVistoria(chamadoId),
  })

  const [form, setForm] = useState<VistoriaInput>({
    dataVistoria: '',
    horaInicio: '',
    horaTermino: '',
    tecnicoPresente: '',
    causaIdentificada: '',
    parecerTecnico: '',
  })

  useEffect(() => {
    if (vistoria) {
      setForm({
        dataVistoria: vistoria.dataVistoria || '',
        horaInicio: vistoria.horaInicio || '',
        horaTermino: vistoria.horaTermino || '',
        tecnicoPresente: vistoria.tecnicoPresente || '',
        causaIdentificada: vistoria.causaIdentificada || '',
        parecerTecnico: vistoria.parecerTecnico || '',
      })
    }
  }, [vistoria])

  const saveMutation = useMutation({
    mutationFn: () =>
      vistoria
        ? chamadosService.updateVistoria(chamadoId, form)
        : chamadosService.saveVistoria(chamadoId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria', chamadoId] })
      queryClient.invalidateQueries({ queryKey: ['chamado', chamadoId] })
      toast.success('Vistoria salva com sucesso!')
    },
    onError: () => toast.error('Erro ao salvar vistoria'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => chamadosService.deleteVistoria(chamadoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria', chamadoId] })
      queryClient.invalidateQueries({ queryKey: ['chamado', chamadoId] })
      setForm({ dataVistoria: '', horaInicio: '', horaTermino: '', tecnicoPresente: '', causaIdentificada: '', parecerTecnico: '' })
      toast.success('Vistoria removida')
    },
    onError: () => toast.error('Erro ao remover vistoria'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-sidebar-accent" />
          Dados da Vistoria Tecnica
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Data da Vistoria
            </label>
            <Input
              type="date"
              className="mt-1.5"
              value={form.dataVistoria}
              onChange={(e) => setForm({ ...form, dataVistoria: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Hora de Inicio
            </label>
            <Input
              type="time"
              className="mt-1.5"
              value={form.horaInicio}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Hora de Termino
            </label>
            <Input
              type="time"
              className="mt-1.5"
              value={form.horaTermino}
              onChange={(e) => setForm({ ...form, horaTermino: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Tecnico Presente
            </label>
            <Input
              className="mt-1.5"
              placeholder="Nome do tecnico"
              value={form.tecnicoPresente}
              onChange={(e) => setForm({ ...form, tecnicoPresente: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-sidebar-accent" />
          Diagnostico Tecnico
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Causa Identificada
            </label>
            <Textarea
              className="mt-1.5 min-h-[80px]"
              placeholder="Descreva a causa do problema..."
              value={form.causaIdentificada}
              onChange={(e) => setForm({ ...form, causaIdentificada: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Parecer Tecnico / Solucao Proposta
            </label>
            <Textarea
              className="mt-1.5 min-h-[100px]"
              placeholder="Descreva a solucao proposta..."
              value={form.parecerTecnico}
              onChange={(e) => setForm({ ...form, parecerTecnico: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          className="bg-sidebar-accent hover:bg-sidebar-accent/90 text-white"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {vistoria ? 'Atualizar Vistoria' : 'Salvar Vistoria'}
        </Button>
        {vistoria && (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        )}
      </div>
    </div>
  )
}
