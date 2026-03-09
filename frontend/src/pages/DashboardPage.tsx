import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { dashboardService } from '@/services/dashboard.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CATEGORIA_LABELS, STATUS_LABELS, PRIORIDADE_LABELS, ROLE_LABELS } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'
import { ChamadoModal } from '@/components/chamados/ChamadoModal'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const PERIODO_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: '12 meses', value: 365 },
]

const STATUS_COLORS: Record<string, string> = {
  ABERTO: '#6b7280',
  EM_ANDAMENTO: '#9ca3af',
  AGUARDANDO: '#d1d5db',
  FINALIZADO: '#374151',
}

const CHART_COLORS = ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb']

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { canCreateChamado, isAdmin } = usePermissions()
  const [modalOpen, setModalOpen] = useState(false)
  const [periodo, setPeriodo] = useState(30)

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

  const { data: porPeriodo } = useQuery({
    queryKey: ['dashboard', 'por-periodo', periodo],
    queryFn: () => dashboardService.getPorPeriodo(periodo),
  })

  const { data: porStatus } = useQuery({
    queryKey: ['dashboard', 'por-status'],
    queryFn: dashboardService.getPorStatus,
  })

  const { data: slaCompliance } = useQuery({
    queryKey: ['dashboard', 'sla-compliance', periodo],
    queryFn: () => dashboardService.getSlaCompliance(periodo),
  })

  const { data: porTecnico } = useQuery({
    queryKey: ['dashboard', 'por-tecnico'],
    queryFn: dashboardService.getPorTecnico,
    enabled: isAdmin(),
  })

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
      icon: ClipboardList,
      iconBg: 'bg-muted',
      iconColor: 'text-foreground',
    },
    {
      title: 'Em Aberto',
      value: stats?.abertos || 0,
      subtitle: `${stats?.emAndamento || 0} em andamento`,
      icon: Clock,
      iconBg: 'bg-muted',
      iconColor: 'text-foreground',
    },
    {
      title: 'SLA Vencido',
      value: stats?.vencidos || 0,
      subtitle: `${stats?.proximosVencimento || 0} proximos`,
      icon: AlertTriangle,
      iconBg: 'bg-muted',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
    },
    {
      title: 'Finalizados',
      value: stats?.finalizados || 0,
      icon: CheckCircle2,
      iconBg: 'bg-muted',
      iconColor: 'text-foreground',
    },
  ]

  // Prepare chart data
  const lineChartData = (porPeriodo || []).map((item) => ({
    data: format(parseISO(item.data), 'dd/MM', { locale: ptBR }),
    chamados: parseInt(item.total),
  }))

  const pieChartData = (porStatus || []).map((item) => ({
    name: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    value: parseInt(item.total),
    fill: STATUS_COLORS[item.status] || '#94a3b8',
  }))

  const barChartData = (porCategoria || []).map((item) => ({
    categoria: CATEGORIA_LABELS[item.categoria as keyof typeof CATEGORIA_LABELS] || item.categoria,
    total: parseInt(item.total),
  }))

  const areaChartData = (slaCompliance || []).map((item) => ({
    semana: format(parseISO(item.semana), 'dd/MM', { locale: ptBR }),
    percentual: item.percentual,
    dentro: item.dentro,
    fora: item.fora,
  }))

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Visao geral dos chamados de assistencia tecnica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {PERIODO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriodo(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  periodo === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {canCreateChamado() && (
            <Button size="lg" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Chamado
            </Button>
          )}
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.iconBg)}>
                      <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                  </div>
                  <div>
                    <p className={cn('text-3xl font-semibold', stat.valueColor)}>
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Line Chart + Pie Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Chamados por Periodo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="chamados"
                    stroke="#374151"
                    strokeWidth={2}
                    dot={{ fill: '#374151', r: 3 }}
                    activeDot={{ r: 5, fill: '#374151' }}
                    name="Chamados"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">Nenhum dado no periodo selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Por Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pieChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.fill }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">Nenhum dado disponivel</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Bar Chart (categorias) + Area Chart (SLA compliance) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} name="Chamados">
                    {barChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">Nenhum dado disponivel</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {areaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={areaChartData}>
                  <defs>
                    <linearGradient id="gradientSla" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#374151" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="semana"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value}%`, 'Dentro do SLA']}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentual"
                    stroke="#374151"
                    strokeWidth={2}
                    fill="url(#gradientSla)"
                    name="% dentro do SLA"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">Nenhum dado de SLA no periodo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Technician Ranking (admin only) */}
      {isAdmin() && porTecnico && porTecnico.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Ranking da Equipe</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs">#</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs">Tecnico</th>
                    <th className="text-center py-3 px-2 font-semibold text-muted-foreground text-xs">Atribuidos</th>
                    <th className="text-center py-3 px-2 font-semibold text-muted-foreground text-xs">Finalizados</th>
                    <th className="text-center py-3 px-2 font-semibold text-muted-foreground text-xs">Em Aberto</th>
                    <th className="text-center py-3 px-2 font-semibold text-muted-foreground text-xs">Tempo Medio</th>
                    <th className="text-center py-3 px-2 font-semibold text-muted-foreground text-xs">Taxa Resolucao</th>
                  </tr>
                </thead>
                <tbody>
                  {porTecnico.map((tecnico, index) => (
                    <tr key={tecnico.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <span className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          index === 1 ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{tecnico.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_LABELS[tecnico.role as keyof typeof ROLE_LABELS] || tecnico.role}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-medium">{tecnico.atribuidos}</td>
                      <td className="py-3 px-2 text-center font-medium text-emerald-600 dark:text-emerald-400">{tecnico.finalizados}</td>
                      <td className="py-3 px-2 text-center font-medium">{tecnico.emAberto}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-muted-foreground">
                          {tecnico.mediaHoras > 0 ? `${tecnico.mediaHoras}h` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                tecnico.taxaResolucao >= 80 ? 'bg-emerald-500' :
                                tecnico.taxaResolucao >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              )}
                              style={{ width: `${tecnico.taxaResolucao}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{tecnico.taxaResolucao}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 5: SLA Criticos + Chamados Recentes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SLA Criticos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">SLA Critico</CardTitle>
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
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm">#{chamado.numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {chamado.clienteNome} - {chamado.empreendimento?.nome}
                      </p>
                    </div>
                    <Badge variant={getSlaStatusColor(chamado.slaInfo?.status)}>
                      {chamado.slaInfo?.status === 'VENCIDO' ? 'Vencido' : 'Proximo'}
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

        {/* Chamados Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Chamados Recentes</CardTitle>
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
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-muted-foreground">
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
      </div>

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
