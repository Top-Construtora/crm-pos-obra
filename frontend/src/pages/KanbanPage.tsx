import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Filter, GripVertical, Eye } from 'lucide-react'
import { chamadosService } from '@/services/chamados.service'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { usersService } from '@/services/users.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Chamado,
  ChamadoStatus,
  CATEGORIA_LABELS,
  PRIORIDADE_LABELS,
} from '@/types'

const COLUMNS: { id: ChamadoStatus; title: string; color: string }[] = [
  { id: 'ABERTO', title: 'Em Aberto', color: 'bg-blue-500' },
  { id: 'EM_ANDAMENTO', title: 'Em Andamento', color: 'bg-yellow-500' },
  { id: 'AGUARDANDO', title: 'Aguardando', color: 'bg-gray-500' },
  { id: 'FINALIZADO', title: 'Finalizado', color: 'bg-green-500' },
]

interface KanbanCardProps {
  chamado: Chamado & { slaInfo?: any }
  isDragging?: boolean
}

function KanbanCard({ chamado, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chamado.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getSlaColor = (status: string) => {
    switch (status) {
      case 'VENCIDO':
        return 'destructive'
      case 'PROXIMO_VENCIMENTO':
        return 'warning'
      default:
        return 'success'
    }
  }

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'URGENTE':
        return 'destructive'
      case 'ALTA':
        return 'warning'
      case 'MEDIA':
        return 'info'
      default:
        return 'secondary'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 shadow-sm ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">#{chamado.numero}</span>
            <Link to={`/chamados/${chamado.id}`}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Eye className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <p className="text-sm font-medium truncate mt-1">{chamado.clienteNome}</p>
          <p className="text-xs text-muted-foreground truncate">
            {chamado.empreendimento?.nome} - {chamado.unidade}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant={getPrioridadeColor(chamado.prioridade)} className="text-xs">
              {PRIORIDADE_LABELS[chamado.prioridade as keyof typeof PRIORIDADE_LABELS]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORIA_LABELS[chamado.categoria as keyof typeof CATEGORIA_LABELS]}
            </Badge>
          </div>
          {chamado.slaInfo && chamado.status !== 'FINALIZADO' && (
            <div className="mt-2">
              <Badge variant={getSlaColor(chamado.slaInfo.status)} className="text-xs">
                {chamado.slaInfo.status === 'VENCIDO'
                  ? 'SLA Vencido'
                  : chamado.slaInfo.status === 'PROXIMO_VENCIMENTO'
                  ? 'SLA Proximo'
                  : 'No Prazo'}
              </Badge>
            </div>
          )}
          {chamado.responsavel && (
            <p className="text-xs text-muted-foreground mt-2">
              {chamado.responsavel.nome}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: { id: ChamadoStatus; title: string; color: string }
  chamados: (Chamado & { slaInfo?: any })[]
}

function KanbanColumn({ column, chamados }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[280px] w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-3 w-3 rounded-full ${column.color}`} />
        <h3 className="font-semibold">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {chamados.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SortableContext
          items={chamados.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[200px] p-1">
            {chamados.map((chamado) => (
              <KanbanCard key={chamado.id} chamado={chamado} />
            ))}
            {chamados.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground text-sm">
                Arraste chamados aqui
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filters, setFilters] = useState<{
    empreendimentoId?: string
    responsavelId?: string
  }>({})
  const [showFilters, setShowFilters] = useState(false)

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: ['chamados', 'kanban', filters],
    queryFn: () => chamadosService.getKanban(filters),
  })

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
  })

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: usersService.getTecnicos,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      chamadosService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados', 'kanban'] })
      toast.success('Status atualizado')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const findChamado = (id: string) => {
    if (!kanbanData) return null
    for (const status of Object.keys(kanbanData)) {
      const chamado = kanbanData[status as ChamadoStatus].find((c: any) => c.id === id)
      if (chamado) return chamado
    }
    return null
  }

  const findColumnByCardId = (id: string): ChamadoStatus | null => {
    if (!kanbanData) return null
    for (const status of Object.keys(kanbanData)) {
      const found = kanbanData[status as ChamadoStatus].find((c: any) => c.id === id)
      if (found) return status as ChamadoStatus
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnByCardId(activeId)
    let overColumn: ChamadoStatus | null = null

    // Check if dropped over a column directly
    if (COLUMNS.some((c) => c.id === overId)) {
      overColumn = overId as ChamadoStatus
    } else {
      // Dropped over another card
      overColumn = findColumnByCardId(overId)
    }

    if (!activeColumn || !overColumn) return

    if (activeColumn !== overColumn) {
      updateStatusMutation.mutate({ id: activeId, status: overColumn })
    }
  }

  const activeChamado = activeId ? findChamado(activeId) : null

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban</h1>
          <p className="text-muted-foreground">
            Arraste os chamados para atualizar o status
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Select
                  value={filters.empreendimentoId || 'all'}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      empreendimentoId: v === 'all' ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {empreendimentos?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={filters.responsavelId || 'all'}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      responsavelId: v === 'all' ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Responsavel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tecnicos?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                chamados={kanbanData?.[column.id] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeChamado ? (
              <div className="w-[260px]">
                <KanbanCard chamado={activeChamado} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
