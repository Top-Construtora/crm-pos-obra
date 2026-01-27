import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  ArrowRight,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { dashboardService } from '@/services/dashboard.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CATEGORIA_LABELS, STATUS_LABELS, PRIORIDADE_LABELS } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'
import { ChamadoModal } from '@/components/chamados/ChamadoModal'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { canCreateChamado } = usePermissions()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
  })

  const { data: slaProximos, isLoading: loadingSla } = useQuery({
    queryKey: ['dashboard', 'sla-proximos'],
    queryFn: dashboardService.getSlaProximos,
  })

  const { data: recentes } = useQuery({
    queryKey: ['dashboard', 'recentes'],
    queryFn: dashboardService.getRecentes,
  })

  const { data: porCategoria } = useQuery({
    queryKey: ['dashboard', 'por-categoria'],
    queryFn: dashboardService.getPorCategoria,
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

  if (loadingStats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total de Chamados',
      value: stats?.total || 0,
      subtitle: 'chamados cadastrados',
      icon: ClipboardList,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Em Aberto',
      value: stats?.abertos || 0,
      subtitle: `${stats?.emAndamento || 0} em andamento`,
      icon: Clock,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'SLA Vencido',
      value: stats?.vencidos || 0,
      subtitle: `${stats?.proximosVencimento || 0} proximos`,
      icon: AlertTriangle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
    },
    {
      title: 'Finalizados',
      value: stats?.finalizados || 0,
      subtitle: 'chamados resolvidos',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards - First one highlighted */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className={cn(
              'relative overflow-hidden card-hover border',
              index === 0 && 'stat-highlight text-white border-transparent'
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center mb-2',
                    index === 0 ? 'bg-white/15' : stat.iconBg
                  )}>
                    <stat.icon className={cn('h-5 w-5', index === 0 ? 'text-white' : stat.iconColor)} />
                  </div>
                  <p className={cn(
                    'text-3xl font-bold',
                    index === 0 ? 'text-white' : stat.valueColor
                  )}>
                    {stat.value}
                  </p>
                  <p className={cn(
                    'text-xs font-medium',
                    index === 0 ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    {stat.title}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header with action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Visao geral dos chamados de assistencia tecnica
          </p>
        </div>
        {canCreateChamado() && (
          <Button size="lg" className="btn-gradient" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SLA Criticos */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Timer className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-base">SLA Critico</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
              <Link to="/chamados">
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingSla ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : slaProximos && slaProximos.length > 0 ? (
              <div className="space-y-2">
                {slaProximos.slice(0, 5).map((chamado: any) => (
                  <Link
                    key={chamado.id}
                    to={`/chamados/${chamado.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-all duration-200 hover:border-primary/30"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm">#{chamado.numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {chamado.clienteNome} - {chamado.empreendimento?.nome}
                      </p>
                    </div>
                    <Badge variant={getSlaStatusColor(chamado.slaInfo?.status)}>
                      {chamado.slaInfo?.status === 'VENCIDO'
                        ? 'Vencido'
                        : 'Proximo'}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhum chamado com SLA critico
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chamados por Categoria */}
        <Card className="card-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Por Categoria</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {porCategoria && porCategoria.length > 0 ? (
              <div className="space-y-4">
                {porCategoria.map((item: any) => (
                  <div key={item.categoria} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {CATEGORIA_LABELS[item.categoria as keyof typeof CATEGORIA_LABELS] ||
                          item.categoria}
                      </span>
                      <span className="text-muted-foreground font-semibold">
                        {item.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (parseInt(item.total) / (stats?.total || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum dado disponivel
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chamados Recentes */}
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ClipboardList className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-base">Chamados Recentes</CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
            <Link to="/chamados">
              Ver todos <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {recentes && recentes.length > 0 ? (
            <div className="space-y-2">
              {recentes.map((chamado: any) => (
                <Link
                  key={chamado.id}
                  to={`/chamados/${chamado.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-all duration-200 hover:border-primary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">
                        #{chamado.numero}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{chamado.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {chamado.empreendimento?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPrioridadeColor(chamado.prioridade)}>
                      {PRIORIDADE_LABELS[chamado.prioridade as keyof typeof PRIORIDADE_LABELS]}
                    </Badge>
                    <Badge variant="outline">
                      {STATUS_LABELS[chamado.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatDistanceToNow(new Date(chamado.criadoEm), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum chamado encontrado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <ChamadoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['chamados'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />
    </div>
  )
}
