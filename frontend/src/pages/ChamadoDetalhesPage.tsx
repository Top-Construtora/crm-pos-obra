import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Pencil,
  User,
  Building2,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  History,
  Send,
} from 'lucide-react'
import { chamadosService } from '@/services/chamados.service'
import { usersService } from '@/services/users.service'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  STATUS_LABELS,
  CATEGORIA_LABELS,
  PRIORIDADE_LABELS,
  TIPO_LABELS,
} from '@/types'

export default function ChamadoDetalhesPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { canEditChamado, canAssignResponsavel, isTecnico, user } = usePermissions()
  const [comentario, setComentario] = useState('')

  const { data: chamado, isLoading } = useQuery({
    queryKey: ['chamado', id],
    queryFn: () => chamadosService.getById(id!),
  })

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: usersService.getTecnicos,
    enabled: canAssignResponsavel(),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => chamadosService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamado', id] })
      toast.success('Status atualizado')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const updateResponsavelMutation = useMutation({
    mutationFn: (responsavelId: string | undefined) =>
      chamadosService.update(id!, { responsavelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamado', id] })
      toast.success('Responsavel atualizado')
    },
    onError: () => toast.error('Erro ao atualizar responsavel'),
  })

  const addComentarioMutation = useMutation({
    mutationFn: (texto: string) => chamadosService.addComentario(id!, texto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamado', id] })
      setComentario('')
      toast.success('Comentario adicionado')
    },
    onError: () => toast.error('Erro ao adicionar comentario'),
  })

  const getSlaStatusColor = (status: string) => {
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

  const canChangeStatus = () => {
    if (canEditChamado()) return true
    if (isTecnico() && chamado?.responsavelId === user?.id) return true
    return false
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chamado nao encontrado</p>
        <Button className="mt-4" onClick={() => navigate('/chamados')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Chamado #{chamado.numero}</h1>
              <Badge variant={getPrioridadeColor(chamado.prioridade)}>
                {PRIORIDADE_LABELS[chamado.prioridade as keyof typeof PRIORIDADE_LABELS]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {CATEGORIA_LABELS[chamado.categoria as keyof typeof CATEGORIA_LABELS]} -{' '}
              {TIPO_LABELS[chamado.tipo as keyof typeof TIPO_LABELS]}
            </p>
          </div>
        </div>
        {canEditChamado() && (
          <Button asChild>
            <Link to={`/chamados/${id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Descricao */}
          <Card>
            <CardHeader>
              <CardTitle>Descricao</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{chamado.descricao}</p>
            </CardContent>
          </Card>

          {/* Timeline / Historico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chamado.historico && chamado.historico.length > 0 ? (
                <div className="space-y-4">
                  {chamado.historico.map((item: any) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.usuario?.nome || 'Sistema'} -{' '}
                          {format(new Date(item.criadoEm), "dd/MM/yyyy 'as' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum registro no historico
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chamado.comentarios && chamado.comentarios.length > 0 ? (
                <div className="space-y-4">
                  {chamado.comentarios.map((item: any) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{item.usuario?.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.criadoEm), "dd/MM/yyyy 'as' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <p className="mt-2 text-sm">{item.texto}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum comentario ainda
                </p>
              )}

              <Separator />

              <div className="space-y-2">
                <Textarea
                  placeholder="Adicione um comentario..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => comentario && addComentarioMutation.mutate(comentario)}
                    disabled={!comentario || addComentarioMutation.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status e SLA */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canChangeStatus() ? (
                <Select
                  value={chamado.status}
                  onValueChange={(v) => updateStatusMutation.mutate(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="w-full justify-center py-2">
                  {STATUS_LABELS[chamado.status as keyof typeof STATUS_LABELS]}
                </Badge>
              )}

              {chamado.slaInfo && chamado.status !== 'FINALIZADO' && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SLA</span>
                    <Badge variant={getSlaStatusColor(chamado.slaInfo.status)}>
                      {chamado.slaInfo.status === 'VENCIDO'
                        ? 'Vencido'
                        : chamado.slaInfo.status === 'PROXIMO_VENCIMENTO'
                        ? 'Proximo do Vencimento'
                        : 'No Prazo'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    Prazo: {chamado.slaHoras} horas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Limite:{' '}
                    {format(new Date(chamado.slaInfo.dataLimite), "dd/MM/yyyy 'as' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsavel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Responsavel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canAssignResponsavel() ? (
                <Select
                  value={chamado.responsavelId || 'none'}
                  onValueChange={(v) =>
                    updateResponsavelMutation.mutate(v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nao atribuido</SelectItem>
                    {tecnicos?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">
                  {chamado.responsavel?.nome || 'Nao atribuido'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{chamado.clienteNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{chamado.clienteTelefone}</span>
              </div>
              {chamado.clienteEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{chamado.clienteEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Local
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{chamado.empreendimento?.nome}</p>
              <p className="text-sm text-muted-foreground">
                {chamado.empreendimento?.endereco}
              </p>
              <Badge variant="outline">{chamado.unidade}</Badge>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span>
                  {format(new Date(chamado.criadoEm), 'dd/MM/yyyy HH:mm', {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em:</span>
                <span>
                  {format(new Date(chamado.atualizadoEm), 'dd/MM/yyyy HH:mm', {
                    locale: ptBR,
                  })}
                </span>
              </div>
              {chamado.finalizadoEm && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finalizado em:</span>
                  <span>
                    {format(new Date(chamado.finalizadoEm), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado por:</span>
                <span>{chamado.criadoPor?.nome}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
