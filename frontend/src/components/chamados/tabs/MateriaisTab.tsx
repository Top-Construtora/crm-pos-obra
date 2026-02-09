import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Package, Plus, Trash2, User, Loader2, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { chamadosService } from '@/services/chamados.service'
import { cn } from '@/lib/utils'
import type { Chamado } from '@/types'

interface MateriaisTabProps {
  chamadoId: string
  chamado?: Chamado
}

export function MateriaisTab({ chamadoId, chamado }: MateriaisTabProps) {
  const queryClient = useQueryClient()
  const [newMaterial, setNewMaterial] = useState({ nome: '', quantidade: 1, valorUnitario: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [horasEstimadas, setHorasEstimadas] = useState(chamado?.horasEstimadas?.toString() || '')
  const [equipeNecessaria, setEquipeNecessaria] = useState(chamado?.equipeNecessaria || '')

  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ['materiais', chamadoId],
    queryFn: () => chamadosService.getMateriais(chamadoId),
  })

  const addMutation = useMutation({
    mutationFn: () => chamadosService.addMaterial(chamadoId, newMaterial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais', chamadoId] })
      setNewMaterial({ nome: '', quantidade: 1, valorUnitario: 0 })
      setShowAdd(false)
      toast.success('Material adicionado')
    },
    onError: () => toast.error('Erro ao adicionar material'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ materialId, aprovado }: { materialId: string; aprovado: boolean }) =>
      chamadosService.toggleMaterialAprovado(chamadoId, materialId, aprovado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais', chamadoId] })
    },
    onError: () => toast.error('Erro ao atualizar material'),
  })

  const deleteMutation = useMutation({
    mutationFn: (materialId: string) => chamadosService.deleteMaterial(chamadoId, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais', chamadoId] })
      toast.success('Material removido')
    },
    onError: () => toast.error('Erro ao remover material'),
  })

  const saveMaoDeObraMutation = useMutation({
    mutationFn: () =>
      chamadosService.update(chamadoId, {
        horasEstimadas: horasEstimadas ? Number(horasEstimadas) : undefined,
        equipeNecessaria: equipeNecessaria || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamado', chamadoId] })
      toast.success('Dados de mao de obra salvos')
    },
    onError: () => toast.error('Erro ao salvar dados'),
  })

  const totalAprovado = materiais
    .filter((m) => m.aprovado)
    .reduce((sum, m) => sum + m.quantidade * m.valorUnitario, 0)

  const totalGeral = materiais.reduce((sum, m) => sum + m.quantidade * m.valorUnitario, 0)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
          <Package className="h-4 w-4 text-sidebar-accent" />
          Levantamento de Materiais
        </h3>

        <div className="space-y-2">
          {materiais.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-sidebar-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={material.aprovado}
                onChange={() =>
                  toggleMutation.mutate({ materialId: material.id, aprovado: !material.aprovado })
                }
                className="w-4 h-4 accent-sidebar-accent rounded"
              />
              <span className={cn('flex-1 text-sm', material.aprovado && 'line-through text-muted-foreground')}>
                {material.quantidade}x {material.nome}
              </span>
              <span className={cn('font-semibold text-sm', material.aprovado ? 'text-emerald-600' : 'text-muted-foreground')}>
                {formatCurrency(material.quantidade * material.valorUnitario)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate(material.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {materiais.length === 0 && !showAdd && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum material adicionado
            </div>
          )}

          {showAdd && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <Input
                placeholder="Nome do material"
                value={newMaterial.nome}
                onChange={(e) => setNewMaterial({ ...newMaterial, nome: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={newMaterial.quantidade}
                    onChange={(e) => setNewMaterial({ ...newMaterial, quantidade: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Valor Unitario (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newMaterial.valorUnitario}
                    onChange={(e) => setNewMaterial({ ...newMaterial, valorUnitario: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-sidebar-accent hover:bg-sidebar-accent/90 text-white"
                  onClick={() => addMutation.mutate()}
                  disabled={!newMaterial.nome || addMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Adicionar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowAdd(false); setNewMaterial({ nome: '', quantidade: 1, valorUnitario: 0 }) }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {!showAdd && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full py-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-sidebar-accent hover:text-sidebar-accent transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar material
            </button>
          )}
        </div>

        {materiais.length > 0 && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border space-y-2">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Total Aprovado</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalAprovado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Geral</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalGeral)}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-sidebar-accent" />
          Mao de Obra
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Horas Estimadas
            </label>
            <Input
              type="number"
              className="mt-1.5"
              placeholder="16"
              value={horasEstimadas}
              onChange={(e) => setHorasEstimadas(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Equipe Necessaria
            </label>
            <Input
              className="mt-1.5"
              placeholder="2 profissionais"
              value={equipeNecessaria}
              onChange={(e) => setEquipeNecessaria(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3 bg-sidebar-accent hover:bg-sidebar-accent/90 text-white"
          onClick={() => saveMaoDeObraMutation.mutate()}
          disabled={saveMaoDeObraMutation.isPending}
        >
          {saveMaoDeObraMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : null}
          Salvar Mao de Obra
        </Button>
      </div>
    </div>
  )
}
