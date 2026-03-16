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
  useDroppable,
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
import {
  Search,
  Eye,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Building2,
  Tag,
  Ticket,
  Clock,
  AlertCircle,
  CheckCircle,
  HourglassIcon,
  ArrowUp,
  MapPin,
  GripVertical,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'
import { chamadosService } from '@/services/chamados.service'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { dashboardService } from '@/services/dashboard.service'
import { exportChamadosListPDF, exportChamadosExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Chamado,
  ChamadoStatus,
  Categoria,
  CATEGORIA_LABELS,
  PRIORIDADE_LABELS,
  TIPO_LABELS,
} from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/hooks/usePermissions'
import { ChamadoModal } from '@/components/chamados/ChamadoModal'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type ViewMode = 'kanban' | 'lista' | 'calendario'

const COLUMNS: { id: ChamadoStatus; title: string; dotClass: string }[] = [
  { id: 'ABERTO', title: 'Em Aberto', dotClass: 'bg-red-500' },
  { id: 'EM_ANDAMENTO', title: 'Em Andamento', dotClass: 'bg-amber-500' },
  { id: 'AGUARDANDO', title: 'Aguardando', dotClass: 'bg-blue-500' },
  { id: 'FINALIZADO', title: 'Finalizado', dotClass: 'bg-emerald-500' },
]

// ============ STAT CARD ============
interface StatCardProps {
  icon: React.ReactNode
  iconClass: string
  value: number
  label: string
  trend?: { value: string; up: boolean }
  highlight?: boolean
}

function StatCard({ icon, iconClass, value, label, trend, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'flex-1 min-w-[180px] rounded-xl p-5 border transition-all hover:-translate-y-0.5 hover:shadow-md',
      highlight
        ? 'stat-highlight text-white border-transparent'
        : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-border'
    )}>
      <div className={cn(
        'w-11 h-11 rounded-lg flex items-center justify-center mb-3 text-lg',
        highlight ? 'bg-white/15' : iconClass
      )}>
        {icon}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className={cn('text-xs font-medium', highlight ? 'text-white/70' : 'text-muted-foreground')}>
        {label}
      </div>
      {trend && (
        <div className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold mt-2 px-2 py-0.5 rounded',
          trend.up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700'
        )}>
          <ArrowUp className={cn('h-3 w-3', !trend.up && 'rotate-180')} />
          {trend.value}
        </div>
      )}
    </div>
  )
}

// ============ KANBAN CARD ============
interface KanbanCardProps {
  chamado: Chamado & { slaInfo?: any }
  isDragging?: boolean
  onClick?: () => void
}

function KanbanCard({ chamado, isDragging, onClick }: KanbanCardProps) {
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

  const getPriorityClass = (prioridade: string) => {
    switch (prioridade) {
      case 'URGENTE': return 'priority-high'
      case 'ALTA': return 'priority-high'
      case 'MEDIA': return 'priority-medium'
      default: return 'priority-low'
    }
  }

  const getSlaClass = (status?: string) => {
    switch (status) {
      case 'VENCIDO': return 'sla-danger'
      case 'PROXIMO_VENCIMENTO': return 'sla-warning'
      default: return 'sla-ok'
    }
  }

  const getSlaLabel = (slaInfo?: any) => {
    if (!slaInfo) return null
    if (slaInfo.status === 'VENCIDO') return 'SLA Vencido'
    if (slaInfo.status === 'PROXIMO_VENCIMENTO') {
      const days = Math.ceil(slaInfo.tempoRestante / (60 * 24))
      return `${days}d restantes`
    }
    const days = Math.ceil(slaInfo.tempoRestante / (60 * 24))
    return `${days}d restantes`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'relative bg-card rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50',
        isDragging && 'opacity-40 scale-[1.02] rotate-1 shadow-xl ring-2 ring-primary/30',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Priority indicator */}
      <span className={cn('priority-indicator', getPriorityClass(chamado.prioridade))} />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn(
              'text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide',
              chamado.tipo === 'COMERCIAL' ? 'tag-comercial' : 'tag-residencial'
            )}>
              {TIPO_LABELS[chamado.tipo]}
            </span>
            {chamado.prioridade === 'URGENTE' && (
              <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide tag-urgente">
                Urgente
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-semibold">#{chamado.numero}</span>
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="font-semibold text-sm mb-1">{chamado.empreendimento?.nome}</div>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {chamado.descricao}
        </p>

        {/* Meta */}
        <div className="flex gap-3 mb-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {chamado.unidade}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Tag className="h-3 w-3" />
            {CATEGORIA_LABELS[chamado.categoria]}
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t">
          {chamado.slaInfo && chamado.status !== 'FINALIZADO' ? (
            <span className={cn(
              'text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5',
              getSlaClass(chamado.slaInfo.status)
            )}>
              <Clock className="h-3 w-3" />
              {getSlaLabel(chamado.slaInfo)}
            </span>
          ) : chamado.status === 'FINALIZADO' ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 sla-ok">
              <CheckCircle className="h-3 w-3" />
              Concluido
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Link to={`/chamados/${chamado.id}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
            {chamado.responsavel && (
              <div
                className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                title={chamado.responsavel.nome}
              >
                {chamado.responsavel.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ KANBAN COLUMN ============
interface KanbanColumnProps {
  column: { id: ChamadoStatus; title: string; dotClass: string }
  chamados: (Chamado & { slaInfo?: any })[]
  onAddClick: () => void
  onCardClick: (chamadoId: string) => void
}

function KanbanColumn({ column, chamados, onAddClick, onCardClick }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[340px] max-w-[340px] bg-slate-50 dark:bg-slate-900/50 rounded-xl border max-h-full transition-all duration-200',
        isOver && 'border-primary/50 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-4 bg-card border-b rounded-t-xl transition-colors duration-200',
        isOver && 'bg-primary/10'
      )}>
        <div className="flex items-center gap-2.5">
          <span className={cn('w-2.5 h-2.5 rounded-full transition-transform duration-200', column.dotClass, isOver && 'scale-150')} />
          <span className="font-bold text-sm">{column.title}</span>
          <span className="bg-muted px-2.5 py-0.5 rounded-md text-xs font-bold text-muted-foreground">
            {chamados.length}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 overflow-y-auto">
        <SortableContext
          items={chamados.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn(
            'space-y-3 min-h-[200px] transition-all duration-200 rounded-lg',
            isOver && 'bg-primary/5 p-2 -m-2'
          )}>
            {chamados.map((chamado) => (
              <KanbanCard key={chamado.id} chamado={chamado} onClick={() => onCardClick(chamado.id)} />
            ))}
          </div>
        </SortableContext>

        <button
          onClick={onAddClick}
          className="w-full mt-3 p-3 border-2 border-dashed rounded-lg text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="h-4 w-4" />
          Adicionar chamado
        </button>
      </div>
    </div>
  )
}

// ============ LIST VIEW ============
function ListView({ chamados }: { chamados: (Chamado & { slaInfo?: any })[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">#</th>
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Cliente</th>
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Empreendimento</th>
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Categoria</th>
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Prioridade</th>
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">SLA</th>
                <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Responsavel</th>
                <th className="text-right p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {chamados.map((chamado) => (
                <tr key={chamado.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-semibold">{chamado.numero}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-sm">{chamado.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{chamado.unidade}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{chamado.empreendimento?.nome}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIA_LABELS[chamado.categoria]}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={chamado.prioridade === 'URGENTE' || chamado.prioridade === 'ALTA' ? 'destructive' : chamado.prioridade === 'MEDIA' ? 'warning' : 'secondary'}
                      className="text-xs"
                    >
                      {PRIORIDADE_LABELS[chamado.prioridade]}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {chamado.slaInfo && chamado.status !== 'FINALIZADO' && (
                      <span className={cn(
                        'text-[11px] font-semibold px-2 py-1 rounded',
                        chamado.slaInfo.status === 'VENCIDO' ? 'sla-danger' :
                        chamado.slaInfo.status === 'PROXIMO_VENCIMENTO' ? 'sla-warning' : 'sla-ok'
                      )}>
                        {chamado.slaInfo.status === 'VENCIDO' ? 'Vencido' : 'OK'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm">{chamado.responsavel?.nome || '-'}</td>
                  <td className="p-4 text-right">
                    <Link to={`/chamados/${chamado.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ CALENDAR VIEW ============
function CalendarView({ chamados }: { chamados: (Chamado & { slaInfo?: any })[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getChamadosForDay = (day: Date) => {
    return chamados.filter((c) => isSameDay(new Date(c.criadoEm), day))
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-lg capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
            <div key={day} className="text-center p-2 text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}

          {days.map((day) => {
            const dayChamados = getChamadosForDay(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[80px] p-1.5 border rounded-lg',
                  !isSameMonth(day, currentMonth) && 'bg-muted/30',
                  isToday && 'border-primary'
                )}
              >
                <div className={cn('text-xs font-medium mb-1 text-center', isToday && 'text-primary')}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayChamados.slice(0, 3).map((chamado) => (
                    <Link
                      key={chamado.id}
                      to={`/chamados/${chamado.id}`}
                      className={cn(
                        'block text-[10px] px-1 py-0.5 rounded text-white truncate',
                        chamado.status === 'ABERTO' && 'bg-red-500',
                        chamado.status === 'EM_ANDAMENTO' && 'bg-amber-500',
                        chamado.status === 'AGUARDANDO' && 'bg-blue-500',
                        chamado.status === 'FINALIZADO' && 'bg-emerald-500'
                      )}
                    >
                      #{chamado.numero}
                    </Link>
                  ))}
                  {dayChamados.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{dayChamados.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ MAIN COMPONENT ============
export default function AssistenciaTecnicaPage() {
  const queryClient = useQueryClient()
  const { canCreateChamado } = usePermissions()
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{
    empreendimentoId?: string
    categoria?: Categoria
  }>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedChamadoId, setSelectedChamadoId] = useState<string | undefined>()

  const handleOpenModal = (chamadoId?: string) => {
    setSelectedChamadoId(chamadoId)
    setModalOpen(true)
  }

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
  })

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: ['chamados', 'kanban', filters],
    queryFn: () => chamadosService.getKanban(filters),
  })

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      chamadosService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Status atualizado')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  // Get all chamados
  const allChamados = kanbanData
    ? Object.values(kanbanData).flat() as (Chamado & { slaInfo?: any })[]
    : []

  // Filter by search
  const filteredChamados = searchTerm
    ? allChamados.filter(c =>
        c.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.numero.toString().includes(searchTerm) ||
        c.empreendimento?.nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allChamados

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

    if (COLUMNS.some((c) => c.id === overId)) {
      overColumn = overId as ChamadoStatus
    } else {
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Dashboard Strip */}
      <div className="flex gap-4 p-5 bg-card border-b overflow-x-auto -mx-4 lg:-mx-6 px-4 lg:px-6">
        <StatCard
          icon={<Ticket className="h-5 w-5" />}
          iconClass=""
          value={stats?.total || 0}
          label="Total de Chamados"
          highlight
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          iconClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          value={stats?.abertos || 0}
          label="Em Aberto"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          value={stats?.emAndamento || 0}
          label="Em Andamento"
        />
        <StatCard
          icon={<HourglassIcon className="h-5 w-5" />}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          value={stats?.aguardando || 0}
          label="Aguardando"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          value={stats?.finalizados || 0}
          label="Finalizados"
          trend={{ value: `${stats?.total ? Math.round((stats.finalizados / stats.total) * 100) : 0}% resolucao`, up: true }}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 p-4 bg-card border-b flex-wrap -mx-4 lg:-mx-6 px-4 lg:px-6">
        {/* Search */}
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por protocolo, cliente..."
            className="bg-transparent border-none outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <select
            className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer"
            value={filters.empreendimentoId || ''}
            onChange={(e) => setFilters({ ...filters, empreendimentoId: e.target.value || undefined })}
          >
            <option value="">Empreendimento</option>
            {empreendimentos?.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <select
            className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer"
            value={filters.categoria || ''}
            onChange={(e) => setFilters({ ...filters, categoria: (e.target.value || undefined) as Categoria | undefined })}
          >
            <option value="">Categoria</option>
            {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              viewMode === 'kanban' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4 inline mr-2" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('lista')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              viewMode === 'lista' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            )}
          >
            <List className="h-4 w-4 inline mr-2" />
            Lista
          </button>
          <button
            onClick={() => setViewMode('calendario')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              viewMode === 'calendario' ? 'bg-card shadow-sm' : 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Calendario
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportChamadosListPDF(allChamados)}>
              <FileText className="h-4 w-4 mr-2 text-red-500" />
              Exportar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChamadosExcel(allChamados)}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />
              Exportar Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canCreateChamado() && (
          <Button className="btn-gradient" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 -mx-4 lg:-mx-6">
        {viewMode === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-5 min-w-max">
                {COLUMNS.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    chamados={kanbanData?.[column.id] || []}
                    onAddClick={() => handleOpenModal()}
                    onCardClick={(chamadoId) => handleOpenModal(chamadoId)}
                  />
                ))}
              </div>

              <DragOverlay dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}>
                {activeChamado ? (
                  <div className="w-[320px] scale-105 rotate-2 shadow-2xl opacity-95">
                    <KanbanCard chamado={activeChamado} isDragging />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {viewMode === 'lista' && <ListView chamados={filteredChamados} />}
        {viewMode === 'calendario' && <CalendarView chamados={filteredChamados} />}
      </div>

      {/* Modal */}
      <ChamadoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        chamadoId={selectedChamadoId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['chamados'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />
    </div>
  )
}
