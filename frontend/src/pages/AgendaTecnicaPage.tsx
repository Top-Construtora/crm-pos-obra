import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Route, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { agendaService, StatusAtendimento } from '@/services/agenda.service';
import { CATEGORIA_LABELS } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_ATENDIMENTO_LABELS: Record<StatusAtendimento, string> = {
  AGENDADO: 'Agendado',
  EM_ROTA: 'Em Rota',
  NO_LOCAL: 'No Local',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const STATUS_ATENDIMENTO_COLORS: Record<StatusAtendimento, string> = {
  AGENDADO: 'bg-blue-500',
  EM_ROTA: 'bg-purple-500',
  NO_LOCAL: 'bg-orange-500',
  CONCLUIDO: 'bg-green-500',
  CANCELADO: 'bg-gray-500',
};

export default function AgendaTecnicaPage() {
  const queryClient = useQueryClient();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth() + 1;

  const { data: calendario, isLoading } = useQuery({
    queryKey: ['agenda-calendario', ano, mes],
    queryFn: () => agendaService.getCalendario(ano, mes),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAtendimento }) =>
      agendaService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const roteirizarMutation = useMutation({
    mutationFn: ({ tecnicoId, data }: { tecnicoId: string; data: string }) =>
      agendaService.roteirizar(tecnicoId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] });
      toast.success(`${data.message}. Total: ${data.total} agendamentos`);
    },
    onError: () => {
      toast.error('Erro ao roteirizar');
    },
  });

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(mesAtual),
    end: endOfMonth(mesAtual),
  });

  const agendamentosData = dataSelecionada
    ? calendario?.[format(dataSelecionada, 'yyyy-MM-dd')] || []
    : [];

  const handleMesAnterior = () => {
    setMesAtual(subMonths(mesAtual, 1));
    setDataSelecionada(null);
  };

  const handleProximoMes = () => {
    setMesAtual(addMonths(mesAtual, 1));
    setDataSelecionada(null);
  };

  const handleRoteirizar = () => {
    if (!dataSelecionada || agendamentosData.length === 0) {
      toast.error('Selecione uma data com agendamentos');
      return;
    }

    const tecnicoId = agendamentosData[0].tecnicoId;
    const data = format(dataSelecionada, 'yyyy-MM-dd');

    roteirizarMutation.mutate({ tecnicoId, data });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda Técnica</h1>
          <p className="text-muted-foreground">Gerencie agendamentos e roteiros de atendimento</p>
        </div>
        <Button onClick={() => setDataSelecionada(new Date())}>
          <Calendar className="h-4 w-4 mr-2" />
          Hoje
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleMesAnterior}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleProximoMes}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                <div key={dia} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {dia}
                </div>
              ))}

              {/* Espaços vazios antes do primeiro dia */}
              {Array.from({ length: startOfMonth(mesAtual).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Dias do mês */}
              {diasDoMes.map((dia) => {
                const dataStr = format(dia, 'yyyy-MM-dd');
                const agendamentosDia = calendario?.[dataStr] || [];
                const isSelecionado = dataSelecionada && isSameDay(dia, dataSelecionada);
                const isHoje = isSameDay(dia, new Date());

                return (
                  <button
                    key={dataStr}
                    onClick={() => setDataSelecionada(dia)}
                    className={cn(
                      'aspect-square p-2 rounded-lg border-2 hover:border-primary transition-colors',
                      isSelecionado && 'border-primary bg-primary/10',
                      !isSelecionado && 'border-transparent',
                      isHoje && 'bg-primary/5'
                    )}
                  >
                    <div className="h-full flex flex-col">
                      <span className={cn(
                        'text-sm font-medium',
                        isHoje && 'text-primary'
                      )}>
                        {format(dia, 'd')}
                      </span>
                      {agendamentosDia.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {agendamentosDia.slice(0, 3).map((ag, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                STATUS_ATENDIMENTO_COLORS[ag.status]
                              )}
                            />
                          ))}
                          {agendamentosDia.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{agendamentosDia.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do dia selecionado */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {dataSelecionada
                  ? format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR })
                  : 'Selecione uma data'}
              </CardTitle>
              {agendamentosData.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRoteirizar}
                  disabled={roteirizarMutation.isPending}
                >
                  <Route className="h-3 w-3 mr-1" />
                  Roteirizar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {agendamentosData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum agendamento para esta data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentosData.map((ag) => (
                  <Card key={ag.id} className="border-l-4" style={{ borderLeftColor: STATUS_ATENDIMENTO_COLORS[ag.status].replace('bg-', '#') }}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={STATUS_ATENDIMENTO_COLORS[ag.status]}>
                          {STATUS_ATENDIMENTO_LABELS[ag.status]}
                        </Badge>
                        {ag.ordemRoteiro && (
                          <Badge variant="outline">
                            #{ag.ordemRoteiro}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{ag.horaInicio}</span>
                          {ag.horaFim && <span>- {ag.horaFim}</span>}
                        </div>

                        <div className="font-medium">
                          Chamado #{ag.chamado?.numero}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {ag.chamado?.empreendimento?.nome}
                        </div>

                        <div className="text-sm">
                          {CATEGORIA_LABELS[ag.chamado?.categoria as keyof typeof CATEGORIA_LABELS]}
                        </div>
                      </div>

                      {ag.status !== 'CONCLUIDO' && ag.status !== 'CANCELADO' && (
                        <div className="flex gap-2 pt-2">
                          {ag.status === 'AGENDADO' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => updateStatusMutation.mutate({ id: ag.id, status: 'EM_ROTA' })}
                            >
                              <Route className="h-3 w-3 mr-1" />
                              Iniciar Rota
                            </Button>
                          )}
                          {ag.status === 'EM_ROTA' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => updateStatusMutation.mutate({ id: ag.id, status: 'NO_LOCAL' })}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Cheguei
                            </Button>
                          )}
                          {ag.status === 'NO_LOCAL' && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => updateStatusMutation.mutate({ id: ag.id, status: 'CONCLUIDO' })}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Concluir
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
