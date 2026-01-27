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
  Camera,
  Upload,
  Download,
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
              <button className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2',
                getStatusBgColor(chamado.status)
              )}>
                <span className="w-2 h-2 rounded-full bg-white" />
                {STATUS_LABELS[chamado.status]}
                <ChevronDown className="h-4 w-4" />
              </button>
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
            {activeTab === 'vistoria' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
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
                        <Input type="date" className="mt-1.5" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Hora de Inicio
                        </label>
                        <Input type="time" className="mt-1.5" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Hora de Termino
                        </label>
                        <Input type="time" className="mt-1.5" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tecnico Presente
                        </label>
                        <Input className="mt-1.5" placeholder="Nome do tecnico" />
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
                        <Textarea className="mt-1.5 min-h-[80px]" placeholder="Descreva a causa do problema..." />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Parecer Tecnico / Solucao Proposta
                        </label>
                        <Textarea className="mt-1.5 min-h-[100px]" placeholder="Descreva a solucao proposta..." />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-sidebar-accent" />
                      Registros Fotograficos
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <button type="button" className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-sidebar-accent hover:text-sidebar-accent transition-colors">
                        <Upload className="h-5 w-5 mb-1" />
                        <span className="text-xs">Adicionar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sidebar-accent" />
                      Aceite do Cliente
                    </h3>
                    <div className="h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-sidebar-accent hover:text-sidebar-accent transition-colors cursor-pointer">
                      <FileText className="h-6 w-6 mb-2" />
                      <span className="text-sm">Clique para coletar assinatura</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Materiais */}
            {activeTab === 'materiais' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4 text-sidebar-accent" />
                    Levantamento de Materiais
                  </h3>
                  <div className="space-y-2">
                    {[
                      { nome: '1 Rolo Manta Asfaltica 3mm (10m2)', valor: 'R$ 289,00', checked: true },
                      { nome: '1 Lata Impermeabilizante Acrilico 18L', valor: 'R$ 320,00', checked: true },
                      { nome: '1 Galao Tinta Acrilica Premium', valor: 'R$ 185,00', checked: true },
                      { nome: 'Kit Lixa + Rolos de Pintura', valor: 'R$ 75,00', checked: false },
                      { nome: '1 Galao Selador Acrilico 18L', valor: 'R$ 120,00', checked: false },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-sidebar-accent/50 transition-colors">
                        <input type="checkbox" defaultChecked={item.checked} className="w-4 h-4 accent-sidebar-accent rounded" />
                        <span className={cn('flex-1 text-sm', item.checked && 'line-through text-muted-foreground')}>
                          {item.nome}
                        </span>
                        <span className={cn('font-semibold text-sm', item.checked ? 'text-emerald-600' : 'text-muted-foreground')}>
                          {item.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                    <span className="font-semibold">Total Estimado</span>
                    <span className="text-xl font-bold text-primary">R$ 989,00</span>
                  </div>
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
                      <Input type="number" className="mt-1.5" placeholder="16" defaultValue={16} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Equipe Necessaria
                      </label>
                      <Input className="mt-1.5" placeholder="2 profissionais" defaultValue="2 profissionais" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Historico */}
            {activeTab === 'historico' && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sidebar-accent" />
                  Timeline de Atividades
                </h3>
                {isEditing && chamado?.historico && chamado.historico.length > 0 ? (
                  <div className="relative pl-7">
                    <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-border" />
                    <div className="space-y-6">
                      {chamado.historico.map((item, index) => (
                        <div key={item.id} className="relative">
                          <div className={cn(
                            'absolute -left-[21px] w-3.5 h-3.5 rounded-full border-[3px]',
                            index === 0
                              ? 'bg-sidebar-accent border-sidebar-accent'
                              : 'bg-emerald-500 border-emerald-500'
                          )} />
                          <div className="bg-card border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-sm">{item.descricao}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(item.criadoEm), "dd/MM/yyyy, HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Por {item.usuario?.nome}
                            </p>
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
            )}

            {/* Tab: Anexos */}
            {activeTab === 'anexos' && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-sidebar-accent" />
                  Documentos Anexados
                </h3>
                <div className="space-y-2">
                  {[
                    { nome: 'Laudo_Tecnico_276.pdf', tamanho: '245 KB', tipo: 'pdf' },
                    { nome: 'Fotos_Vistoria.zip', tamanho: '3.2 MB', tipo: 'zip' },
                    { nome: 'Orcamento_Materiais.xlsx', tamanho: '28 KB', tipo: 'excel' },
                  ].map((arquivo, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-sidebar-accent/50 transition-colors">
                      <FileText className={cn(
                        'h-5 w-5',
                        arquivo.tipo === 'pdf' && 'text-red-500',
                        arquivo.tipo === 'zip' && 'text-blue-500',
                        arquivo.tipo === 'excel' && 'text-emerald-500'
                      )} />
                      <span className="flex-1 text-sm">{arquivo.nome}</span>
                      <span className="text-sm text-muted-foreground">{arquivo.tamanho}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <button type="button" className="w-full mt-4 py-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-sidebar-accent hover:text-sidebar-accent transition-colors flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />
                  Adicionar anexo
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
            <div className="flex gap-2">
              {isEditing && (
                <>
                  <Button type="button" variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                  <Button type="button" variant="ghost" className="text-muted-foreground">
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
              {isEditing && (
                <Button type="button" variant="outline">
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
    </div>
  )
}
