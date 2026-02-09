import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, AlertTriangle, Clock, Target, PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardService } from '@/services/dashboard.service';
import api from '@/services/api';
import { CATEGORIA_LABELS, PRIORIDADE_LABELS } from '@/types';

export default function RelatoriosPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  const { data: reincidencia } = useQuery({
    queryKey: ['dashboard-reincidencia'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/reincidencia?dias=90');
      return data;
    },
  });

  const { data: tempoMedioCategoria } = useQuery({
    queryKey: ['dashboard-tempo-medio-categoria'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/tempo-medio-categoria');
      return data;
    },
  });

  const { data: taxaPrimeiraVez } = useQuery({
    queryKey: ['dashboard-taxa-primeira-vez'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/taxa-primeira-vez?dias=30');
      return data;
    },
  });

  const { data: prioridadeDistribuicao } = useQuery({
    queryKey: ['dashboard-prioridade-distribuicao'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/prioridade-distribuicao');
      return data;
    },
  });

  const { data: porCategoria } = useQuery({
    queryKey: ['dashboard-por-categoria'],
    queryFn: dashboardService.getPorCategoria,
  });

  const { data: slaCompliance } = useQuery({
    queryKey: ['dashboard-sla-compliance'],
    queryFn: () => dashboardService.getSlaCompliance(30),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios e KPIs</h1>
        <p className="text-muted-foreground">
          Indicadores de desempenho e análises detalhadas
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Chamados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.finalizados || 0} finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Primeira Vez</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaPrimeiraVez?.taxa || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {taxaPrimeiraVez?.primeiraVez || 0} de {taxaPrimeiraVez?.total || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.vencidos || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.proximosVencimento || 0} próximos ao vencimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reincidências</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reincidencia?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 90 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tempo Médio por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tempo Médio por Categoria
            </CardTitle>
            <CardDescription>Tempo de resolução em horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tempoMedioCategoria?.map((item: any) => (
                <div key={item.categoria} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {CATEGORIA_LABELS[item.categoria as keyof typeof CATEGORIA_LABELS] || item.categoria}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({item.total} chamados)
                      </span>
                    </div>
                    <span className="text-sm font-bold">{item.mediaHoras}h</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min((parseFloat(item.mediaHoras) / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Chamados por Categoria
            </CardTitle>
            <CardDescription>Distribuição de tipos de chamado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {porCategoria?.map((item: any) => {
                const total = porCategoria.reduce((acc: number, curr: any) => acc + parseInt(curr.total), 0);
                const percentual = Math.round((parseInt(item.total) / total) * 100);

                return (
                  <div key={item.categoria} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {CATEGORIA_LABELS[item.categoria as keyof typeof CATEGORIA_LABELS] || item.categoria}
                      </span>
                      <span className="text-sm font-bold">{item.total} ({percentual}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Distribuição por Prioridade
            </CardTitle>
            <CardDescription>Priorização dos chamados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prioridadeDistribuicao?.map((item: any) => {
                const total = prioridadeDistribuicao.reduce((acc: number, curr: any) => acc + parseInt(curr.total), 0);
                const percentual = Math.round((parseInt(item.total) / total) * 100);

                const colors: Record<string, string> = {
                  URGENTE: 'bg-red-500',
                  ALTA: 'bg-orange-500',
                  MEDIA: 'bg-yellow-500',
                  BAIXA: 'bg-green-500',
                };

                return (
                  <div key={item.prioridade} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {PRIORIDADE_LABELS[item.prioridade as keyof typeof PRIORIDADE_LABELS] || item.prioridade}
                      </span>
                      <span className="text-sm font-bold">{item.total} ({percentual}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[item.prioridade] || 'bg-gray-500'}`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Reincidências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reincidências Detectadas
            </CardTitle>
            <CardDescription>Chamados recorrentes (últimos 90 dias)</CardDescription>
          </CardHeader>
          <CardContent>
            {!reincidencia || reincidencia.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma reincidência detectada
              </p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {reincidencia?.slice(0, 10).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">{item.empreendimento}</span>
                      </div>
                      <span className="text-xs font-bold text-orange-600">
                        {item.total}x
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Unidade {item.unidade} • {CATEGORIA_LABELS[item.categoria as keyof typeof CATEGORIA_LABELS] || item.categoria}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SLA Compliance */}
      {slaCompliance && slaCompliance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Compliance de SLA (Últimas 4 Semanas)
            </CardTitle>
            <CardDescription>Porcentagem de chamados resolvidos dentro do SLA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slaCompliance.map((item: any) => (
                <div key={item.semana} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Semana de {new Date(item.semana).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-sm font-bold">
                      {item.percentual}% ({item.dentro}/{item.total})
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.percentual >= 80 ? 'bg-green-500' : item.percentual >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${item.percentual}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
