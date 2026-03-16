import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Ticket,
  Calendar,
  Info,
  ClipboardCheck,
  Package,
  Clock,
  Paperclip,
  Trash2,
  Copy,
  Printer,
  Check,
  Phone,
  Mail,
  MapPin,
  User,
  AlertTriangle,
  FileText,
  ChevronDown,
  X,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { chamadosService } from '@/services/chamados.service'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { usersService } from '@/services/users.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChamadoInput,
  CATEGORIA_LABELS,
  PRIORIDADE_LABELS,
  STATUS_LABELS,
  Categoria,
  Prioridade,
  ChamadoStatus,
} from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { VistoriaTab } from './tabs/VistoriaTab'
import { MateriaisTab } from './tabs/MateriaisTab'
import { AnexosTab } from './tabs/AnexosTab'
import { HistoricoTab } from './tabs/HistoricoTab'
import { exportChamadoDetailPDF } from '@/lib/export'

const chamadoSchema = z.object({
  empreendimentoId: z.string().min(1, 'Selecione o empreendimento'),
  unidade: z.string().min(1, 'Informe a unidade'),
  clienteNome: z.string().min(1, 'Informe o nome do cliente'),
  clienteTelefone: z.string().min(1, 'Informe o telefone'),
  clienteEmail: z.string().email('Email invalido').optional().or(z.literal('')),
  tipo: z.enum(['RESIDENCIAL', 'COMERCIAL']),
  categoria: z.enum(['HIDRAULICA', 'ELETRICA', 'PINTURA', 'ESQUADRIAS', 'IMPERMEABILIZACAO', 'ESTRUTURAL', 'OUTROS']),
  descricao: z.string().min(10, 'Descreva o problema com mais detalhes'),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']),
  slaHoras: z.number().min(1).max(720),
  responsavelId: z.string().optional(),
})

type ChamadoForm = z.infer<typeof chamadoSchema>

interface ChamadoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chamadoId?: string
  onSuccess?: () => void
}

type TabType = 'detalhes' | 'vistoria' | 'materiais' | 'historico' | 'anexos'

export function ChamadoModal({ open, onOpenChange, chamadoId, onSuccess }: ChamadoModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('detalhes')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const queryClient = useQueryClient()
  const isEditing = !!chamadoId

  const { data: chamado } = useQuery({
    queryKey: ['chamado', chamadoId],
    queryFn: () => chamadosService.getById(chamadoId!),
    enabled: !!chamadoId && open,
  })

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
    enabled: open,
  })

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: usersService.getTecnicos,
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChamadoForm>({
    resolver: zodResolver(chamadoSchema),
    defaultValues: {
      tipo: 'RESIDENCIAL',
      categoria: 'OUTROS',
      prioridade: 'MEDIA',
      slaHoras: 48,
    },
  })

  useEffect(() => {
    if (chamado && isEditing) {
      reset({
        empreendimentoId: chamado.empreendimentoId,
        unidade: chamado.unidade,
        clienteNome: chamado.clienteNome,
        clienteTelefone: chamado.clienteTelefone,
        clienteEmail: chamado.clienteEmail || '',
        tipo: chamado.tipo,
        categoria: chamado.categoria,
        descricao: chamado.descricao,
        prioridade: chamado.prioridade,
        slaHoras: chamado.slaHoras,
        responsavelId: chamado.responsavelId || undefined,
      })
    } else if (!isEditing && open) {
      reset({
        tipo: 'RESIDENCIAL',
        categoria: 'OUTROS',
        prioridade: 'MEDIA',
        slaHoras: 48,
        empreendimentoId: '',
        unidade: '',
        clienteNome: '',
        clienteTelefone: '',
        clienteEmail: '',
        descricao: '',
        responsavelId: undefined,
      })
      setActiveTab('detalhes')
    }
  }, [chamado, isEditing, reset, open])

  const createMutation = useMutation({
    mutationFn: chamadosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Chamado criado com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: () => toast.error('Erro ao criar chamado'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ChamadoInput>) =>
      chamadosService.update(chamadoId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['chamado', chamadoId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Chamado atualizado com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: () => toast.error('Erro ao atualizar chamado'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => chamadosService.delete(chamadoId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Chamado excluido com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: () => toast.error('Erro ao excluir chamado'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => chamadosService.updateStatus(chamadoId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['chamado', chamadoId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Status atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const handleDuplicate = () => {
    if (!chamado) return
    reset({
      empreendimentoId: chamado.empreendimentoId,
      unidade: chamado.unidade,
      clienteNome: chamado.clienteNome,
      clienteTelefone: chamado.clienteTelefone,
      clienteEmail: chamado.clienteEmail || '',
      tipo: chamado.tipo,
      categoria: chamado.categoria,
      descricao: chamado.descricao,
      prioridade: chamado.prioridade,
      slaHoras: chamado.slaHoras,
      responsavelId: chamado.responsavelId || undefined,
    })
    onOpenChange(false)
    setTimeout(() => {
      onOpenChange(true)
    }, 100)
    toast.info('Dados copiados para novo chamado')
  }

  const onSubmit = (data: ChamadoForm) => {
    const payload = {
      ...data,
      clienteEmail: data.clienteEmail || undefined,
      responsavelId: data.responsavelId || undefined,
    }
    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const getStatusBgColor = (status: ChamadoStatus) => {
    const colors = {
      ABERTO: 'bg-red-500',
      EM_ANDAMENTO: 'bg-amber-500',
      AGUARDANDO: 'bg-blue-500',
      FINALIZADO: 'bg-emerald-500',
    }
    return colors[status] || 'bg-sidebar-accent'
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const tabs = [
    { id: 'detalhes', label: 'Detalhes', icon: Info },
    { id: 'vistoria', label: 'Vistoria', icon: ClipboardCheck },
    { id: 'materiais', label: 'Materiais', icon: Package },
    { id: 'historico', label: 'Historico', icon: Clock },
    { id: 'anexos', label: 'Anexos', icon: Paperclip },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative bg-card w-[1000px] max-w-[95vw] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-muted/50 to-muted/30 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Ticket className="h-5 w-5 text-sidebar-accent" />
              {isEditing ? `Protocolo #${chamado?.numero} - ${chamado?.empreendimento?.nome}` : 'Novo Chamado'}
            </h2>
            {isEditing && chamado && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Aberto em {format(new Date(chamado.criadoEm), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                {' • '}Ultimo update: {formatDistanceToNow(new Date(chamado.atualizadoEm), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isEditing && chamado && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    'px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2',
                    getStatusBgColor(chamado.status)
                  )}>
                    <span className="w-2 h-2 rounded-full bg-white" />
                    {STATUS_LABELS[chamado.status]}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.keys(STATUS_LABELS) as ChamadoStatus[])
                    .filter((s) => s !== chamado.status)
                    .map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => statusMutation.mutate(s)}
                      >
                        <span className={cn('w-2 h-2 rounded-full mr-2', getStatusBgColor(s))} />
                        {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 rounded-lg border bg-card flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'px-5 py-3.5 text-sm font-semibold flex items-center gap-2 relative transition-colors',
                activeTab === tab.id
                  ? 'text-sidebar-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-sidebar-accent rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Tab: Detalhes */}
            {activeTab === 'detalhes' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Descricao do Problema */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sidebar-accent" />
                      Descricao do Problema
                    </h3>
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-foreground">Relato do Cliente</span>
                        {(isEditing && chamado) ? (
                          <span className={cn(
                            'text-xs font-semibold px-3 py-1 rounded flex items-center gap-1.5',
                            chamado.prioridade === 'URGENTE' || chamado.prioridade === 'ALTA'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          )}>
                            <AlertTriangle className="h-3 w-3" />
                            Prioridade {PRIORIDADE_LABELS[chamado.prioridade]}
                          </span>
                        ) : (
                          <Select
                            value={watch('prioridade')}
                            onValueChange={(v) => setValue('prioridade', v as Prioridade)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <Textarea
                        {...register('descricao')}
                        placeholder="Cliente relata..."
                        className="min-h-[100px] resize-none bg-card"
                      />
                      {errors.descricao && (
                        <p className="text-xs text-destructive mt-2">{errors.descricao.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Localizacao */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-sidebar-accent" />
                      Localizacao
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Empreendimento
                        </label>
                        <Select
                          value={watch('empreendimentoId')}
                          onValueChange={(v) => setValue('empreendimentoId', v)}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {empreendimentos?.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.empreendimentoId && (
                          <p className="text-xs text-destructive mt-1">{errors.empreendimentoId.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Local Especifico
                        </label>
                        <Input
                          {...register('unidade')}
                          placeholder="Showroom - Parede Norte"
                          className="mt-1.5"
                        />
                        {errors.unidade && (
                          <p className="text-xs text-destructive mt-1">{errors.unidade.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Categoria
                        </label>
                        <Select
                          value={watch('categoria')}
                          onValueChange={(v) => setValue('categoria', v as Categoria)}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Garantia
                        </label>
                        <Input
                          value={isEditing && chamado ? `Vigente ate ${format(new Date(new Date(chamado.criadoEm).getTime() + 5 * 365 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}` : ''}
                          readOnly
                          className="mt-1.5 text-emerald-600 font-medium"
                          placeholder="Sera calculada automaticamente"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Responsavel Tecnico */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <User className="h-4 w-4 text-sidebar-accent" />
                      Responsavel Tecnico
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tecnico Designado
                        </label>
                        <Select
                          value={watch('responsavelId') || 'none'}
                          onValueChange={(v) => setValue('responsavelId', v === 'none' ? undefined : v)}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nao atribuido</SelectItem>
                            {tecnicos?.map((tec) => (
                              <SelectItem key={tec.id} value={tec.id}>
                                {tec.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Data Prevista
                        </label>
                        <Input
                          type="date"
                          className="mt-1.5"
                          defaultValue={format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Client Sidebar */}
                <div>
                  <div className="bg-muted/30 rounded-lg p-5 border">
                    {/* Avatar and Name */}
                    <div className="text-center mb-5">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3"
                        style={{ background: 'linear-gradient(135deg, hsl(var(--sidebar-accent)), hsl(174, 82%, 28%))' }}
                      >
                        {getInitials(watch('clienteNome'))}
                      </div>
                      {isEditing ? (
                        <>
                          <div className="font-bold text-foreground">{chamado?.clienteNome}</div>
                          <div className="text-sm text-muted-foreground">
                            {chamado?.empreendimento?.nome} - Cliente
                          </div>
                        </>
                      ) : (
                        <Input
                          {...register('clienteNome')}
                          placeholder="Nome do Cliente"
                          className="text-center font-semibold mt-2"
                        />
                      )}
                      {errors.clienteNome && (
                        <p className="text-xs text-destructive mt-1">{errors.clienteNome.message}</p>
                      )}
                    </div>

                    {/* Info List */}
                    <div className="space-y-0 border-t pt-4">
                      {/* Telefone */}
                      <div className="flex items-center gap-3 py-3 border-b">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">Telefone</span>
                          {isEditing ? (
                            <div className="font-semibold text-sm">{chamado?.clienteTelefone}</div>
                          ) : (
                            <Input
                              {...register('clienteTelefone')}
                              placeholder="(00) 00000-0000"
                              className="h-7 mt-0.5 text-sm"
                            />
                          )}
                        </div>
                      </div>
                      {errors.clienteTelefone && (
                        <p className="text-xs text-destructive px-12">{errors.clienteTelefone.message}</p>
                      )}

                      {/* Email */}
                      <div className="flex items-center gap-3 py-3 border-b">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">E-mail</span>
                          {isEditing ? (
                            <div className="font-semibold text-sm truncate">{chamado?.clienteEmail || '-'}</div>
                          ) : (
                            <Input
                              {...register('clienteEmail')}
                              placeholder="email@exemplo.com"
                              className="h-7 mt-0.5 text-sm"
                            />
                          )}
                        </div>
                      </div>

                      {/* Horario Preferencial */}
                      <div className="flex items-center gap-3 py-3 border-b">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">Horario Preferencial</span>
                          <div className="font-semibold text-sm">Segunda a Sexta, 8h-18h</div>
                        </div>
                      </div>

                      {/* SLA Restante */}
                      <div className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">SLA Restante</span>
                          {isEditing && chamado?.slaInfo ? (
                            <div className={cn(
                              'font-semibold text-sm',
                              chamado.slaInfo.status === 'VENCIDO' && 'text-destructive',
                              chamado.slaInfo.status === 'PROXIMO_VENCIMENTO' && 'text-amber-600',
                              chamado.slaInfo.status === 'NO_PRAZO' && 'text-emerald-600'
                            )}>
                              {chamado.slaInfo.status === 'VENCIDO'
                                ? `Vencido ha ${Math.abs(Math.floor(chamado.slaInfo.tempoRestante / 60))} horas`
                                : `${Math.floor(chamado.slaInfo.tempoRestante / 60)}h restantes`}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                {...register('slaHoras', { valueAsNumber: true })}
                                className="h-7 w-20 text-sm"
                              />
                              <span className="text-sm text-muted-foreground">horas</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Vistoria */}
            {activeTab === 'vistoria' && isEditing && chamadoId && (
              <VistoriaTab chamadoId={chamadoId} />
            )}

            {/* Tab: Materiais */}
            {activeTab === 'materiais' && isEditing && chamadoId && (
              <MateriaisTab chamadoId={chamadoId} chamado={chamado} />
            )}

            {/* Tab: Historico */}
            {activeTab === 'historico' && isEditing && chamadoId && (
              <HistoricoTab chamadoId={chamadoId} chamado={chamado} />
            )}

            {/* Tab: Anexos */}
            {activeTab === 'anexos' && isEditing && chamadoId && (
              <AnexosTab chamadoId={chamadoId} />
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
            <div className="flex gap-2">
              {isEditing && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={handleDuplicate}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {isEditing && chamado && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => exportChamadoDetailPDF(chamado)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              )}
              <Button
                type="submit"
                className="bg-sidebar-accent hover:bg-sidebar-accent/90 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                {isEditing ? 'Salvar Alteracoes' : 'Criar Chamado'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O chamado #{chamado?.numero} e todos os dados relacionados serao removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
