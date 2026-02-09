import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, MapPin, User, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { portalClienteService, ChamadoCliente } from '@/services/portal-cliente.service';
import {
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  CATEGORIA_LABELS,
} from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PortalClientePage() {
  const [modo, setModo] = useState<'rastrear' | 'meus-chamados'>('rastrear');
  const [numero, setNumero] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [buscar, setBuscar] = useState(false);

  const { data: chamado, isLoading: loadingRastrear, error: errorRastrear } = useQuery({
    queryKey: ['rastrear-chamado', numero, identificador],
    queryFn: () => portalClienteService.rastrear(parseInt(numero), identificador),
    enabled: buscar && modo === 'rastrear' && !!numero && !!identificador,
    retry: false,
  });

  const { data: meusChamados, isLoading: loadingMeus, error: errorMeus } = useQuery({
    queryKey: ['meus-chamados', identificador],
    queryFn: () => portalClienteService.meusChamados(identificador),
    enabled: buscar && modo === 'meus-chamados' && !!identificador,
    retry: false,
  });

  const handleRastrear = () => {
    setBuscar(true);
  };

  const resetBusca = () => {
    setBuscar(false);
    setNumero('');
    setIdentificador('');
  };

  const getSLABadge = (slaStatus: string) => {
    switch (slaStatus) {
      case 'NO_PRAZO':
        return <Badge className="bg-green-500">No Prazo</Badge>;
      case 'PROXIMO_VENCIMENTO':
        return <Badge className="bg-yellow-500">Próximo ao Vencimento</Badge>;
      case 'VENCIDO':
        return <Badge className="bg-red-500">Vencido</Badge>;
      default:
        return <Badge variant="outline">{slaStatus}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ABERTO: 'bg-blue-500',
      EM_ANDAMENTO: 'bg-purple-500',
      AGUARDANDO: 'bg-orange-500',
      FINALIZADO: 'bg-green-500',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-500'}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </Badge>
    );
  };

  const renderChamadoDetalhes = (chamado: ChamadoCliente) => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Chamado #{chamado.numero}</CardTitle>
              <CardDescription>
                Criado em {format(new Date(chamado.criadoEm), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(chamado.status)}
              {getSLABadge(chamado.slaInfo.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{chamado.empreendimento.nome}</div>
                  {chamado.empreendimento.endereco && (
                    <div className="text-muted-foreground text-xs">{chamado.empreendimento.endereco}</div>
                  )}
                  <div className="text-muted-foreground">Unidade: {chamado.unidade}</div>
                </div>
              </div>
            </div>

            {chamado.responsavel && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Responsável</div>
                    <div className="text-muted-foreground">{chamado.responsavel.nome}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="font-medium">Categoria</div>
            <Badge variant="outline">
              {CATEGORIA_LABELS[chamado.categoria as keyof typeof CATEGORIA_LABELS] || chamado.categoria}
            </Badge>
            <Badge variant="outline" className="ml-2">
              {PRIORIDADE_LABELS[chamado.prioridade as keyof typeof PRIORIDADE_LABELS] || chamado.prioridade}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Descrição do Problema</div>
            <p className="text-sm text-muted-foreground">{chamado.descricao}</p>
          </div>

          {chamado.finalizadoEm && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Chamado finalizado em {format(new Date(chamado.finalizadoEm), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {chamado.historico && chamado.historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chamado.historico.map((h, idx) => (
                <div key={idx} className="flex gap-4 border-l-2 border-muted pl-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{h.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(h.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      <span>• {h.usuario}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Portal do Cliente</h1>
          <p className="text-muted-foreground">Acompanhe seus chamados de assistência técnica</p>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={modo} onValueChange={(v) => setModo(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rastrear">Rastrear Chamado</TabsTrigger>
                <TabsTrigger value="meus-chamados">Meus Chamados</TabsTrigger>
              </TabsList>

              <TabsContent value="rastrear" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número do Chamado</Label>
                    <Input
                      id="numero"
                      type="number"
                      placeholder="Ex: 1001"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identificador">Telefone ou Email</Label>
                    <Input
                      id="identificador"
                      placeholder="(00) 00000-0000 ou email@exemplo.com"
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleRastrear}
                    className="w-full"
                    disabled={!numero || !identificador}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Rastrear Chamado
                  </Button>
                </div>

                {loadingRastrear && (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}

                {errorRastrear && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {(errorRastrear as any)?.response?.data?.error || 'Erro ao buscar chamado'}
                    </AlertDescription>
                  </Alert>
                )}

                {buscar && chamado && renderChamadoDetalhes(chamado)}
              </TabsContent>

              <TabsContent value="meus-chamados" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identificador-meus">Telefone ou Email</Label>
                    <Input
                      id="identificador-meus"
                      placeholder="(00) 00000-0000 ou email@exemplo.com"
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleRastrear}
                    className="w-full"
                    disabled={!identificador}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Meus Chamados
                  </Button>
                </div>

                {loadingMeus && (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}

                {errorMeus && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {(errorMeus as any)?.response?.data?.error || 'Erro ao buscar chamados'}
                    </AlertDescription>
                  </Alert>
                )}

                {buscar && meusChamados && (
                  <div className="space-y-4">
                    {meusChamados.length === 0 ? (
                      <Alert>
                        <AlertDescription>Nenhum chamado encontrado.</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-3">
                        {meusChamados.map((c) => (
                          <Card key={c.numero} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">#{c.numero}</span>
                                    {getStatusBadge(c.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {c.descricao}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>{c.empreendimento.nome}</span>
                                    <span>•</span>
                                    <span>Unidade {c.unidade}</span>
                                    <span>•</span>
                                    <span>{format(new Date(c.criadoEm), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                  </div>
                                </div>
                                <div>
                                  {getSLABadge(c.slaInfo.status)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {buscar && (
          <div className="text-center">
            <Button variant="outline" onClick={resetBusca}>
              Nova Busca
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
