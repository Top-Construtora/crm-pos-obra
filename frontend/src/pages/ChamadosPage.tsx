import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { chamadosService } from '@/services/chamados.service'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { usersService } from '@/services/users.service'
import { usePermissions } from '@/hooks/usePermissions'
import { ChamadoModal } from '@/components/chamados/ChamadoModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ChamadoFilters,
  Categoria,
  STATUS_LABELS,
  CATEGORIA_LABELS,
  PRIORIDADE_LABELS,
} from '@/types'

const PAGE_SIZE = 20

export default function ChamadosPage() {
  const queryClient = useQueryClient()
  const { canCreateChamado, canEditChamado, canDeleteChamado } = usePermissions()
  const [filters, setFilters] = useState<ChamadoFilters>({ page: 1, limit: PAGE_SIZE })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedChamadoId, setSelectedChamadoId] = useState<string | undefined>()

  const handleOpenModal = (chamadoId?: string) => {
    setSelectedChamadoId(chamadoId)
    setModalOpen(true)
  }

  const { data: result, isLoading } = useQuery({
    queryKey: ['chamados', filters],
    queryFn: () => chamadosService.getAll(filters),
  })

  const chamados = result?.data || []
  const totalCount = result?.total || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = filters.page || 1

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
  })

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: usersService.getTecnicos,
  })

  const deleteMutation = useMutation({
    mutationFn: chamadosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      toast.success('Chamado excluido com sucesso')
      setDeleteId(null)
    },
    onError: () => {
      toast.error('Erro ao excluir chamado')
    },
  })

  const updateFilter = (key: keyof ChamadoFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const clearFilters = () => {
    setFilters({ page: 1, limit: PAGE_SIZE })
  }

  const hasActiveFilters = !!(
    filters.status || filters.empreendimentoId || filters.categoria ||
    filters.responsavelId || filters.prioridade || filters.busca ||
    filters.dataInicio || filters.dataFim || filters.slaStatus
  )

  const getSlaStatusColor = (status: string) => {
    switch (status) {
      case 'VENCIDO': return 'destructive'
      case 'PROXIMO_VENCIMENTO': return 'warning'
      default: return 'success'
    }
  }

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'URGENTE': return 'destructive'
      case 'ALTA': return 'warning'
      case 'MEDIA': return 'info'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABERTO': return 'info'
      case 'EM_ANDAMENTO': return 'warning'
      case 'AGUARDANDO': return 'secondary'
      case 'FINALIZADO': return 'success'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chamados</h1>
          <p className="text-muted-foreground">
            {totalCount} chamados encontrados
          </p>
        </div>
        {canCreateChamado() && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtros</CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Limpar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, número, email ou descrição..."
                className="pl-9"
                value={filters.busca || ''}
                onChange={(e) => updateFilter('busca', e.target.value || undefined)}
              />
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.empreendimentoId || 'all'}
                  onValueChange={(v) => updateFilter('empreendimentoId', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {empreendimentos?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.categoria || 'all'}
                  onValueChange={(v) => updateFilter('categoria', v === 'all' ? undefined : v as Categoria)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.responsavelId || 'all'}
                  onValueChange={(v) => updateFilter('responsavelId', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tecnicos?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced: Date range + SLA filter */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Data inicio</label>
                  <Input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => updateFilter('dataInicio', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Data fim</label>
                  <Input
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) => updateFilter('dataFim', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">SLA</label>
                  <Select
                    value={filters.slaStatus || 'all'}
                    onValueChange={(v) => updateFilter('slaStatus', v === 'all' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="OK">No Prazo</SelectItem>
                      <SelectItem value="PROXIMO">Proximo do Vencimento</SelectItem>
                      <SelectItem value="VENCIDO">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : chamados.length > 0 ? (
        <div className="space-y-3">
          {chamados.map((chamado: any) => (
            <Card key={chamado.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">#{chamado.numero}</span>
                      <Badge variant={getStatusColor(chamado.status)}>
                        {STATUS_LABELS[chamado.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                      <Badge variant={getPrioridadeColor(chamado.prioridade)}>
                        {PRIORIDADE_LABELS[chamado.prioridade as keyof typeof PRIORIDADE_LABELS]}
                      </Badge>
                      {chamado.slaInfo && chamado.status !== 'FINALIZADO' && (
                        <Badge variant={getSlaStatusColor(chamado.slaInfo.status)}>
                          {chamado.slaInfo.status === 'VENCIDO'
                            ? 'SLA Vencido'
                            : chamado.slaInfo.status === 'PROXIMO_VENCIMENTO'
                            ? 'Proximo do SLA'
                            : 'No Prazo'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{chamado.clienteNome}</span>
                      {' - '}
                      {chamado.empreendimento?.nome} - {chamado.unidade}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {CATEGORIA_LABELS[chamado.categoria as keyof typeof CATEGORIA_LABELS]}
                      {' - '}
                      {chamado.descricao}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        Criado:{' '}
                        {format(new Date(chamado.criadoEm), "dd/MM/yyyy 'as' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                      {chamado.responsavel && (
                        <span>Responsável: {chamado.responsavel.nome}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/chamados/${chamado.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </Link>
                    </Button>
                    {canEditChamado() && (
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(chamado.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}
                    {canDeleteChamado() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(chamado.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number
                  if (totalPages <= 7) {
                    page = i + 1
                  } else if (currentPage <= 4) {
                    page = i + 1
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i
                  } else {
                    page = currentPage - 3 + i
                  }
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setFilters({ ...filters, page })}
                    >
                      {page}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum chamado encontrado</p>
            {canCreateChamado() && (
              <Button className="mt-4" onClick={() => handleOpenModal()}>
                Criar primeiro chamado
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chamado será permanentemente
              excluido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
