import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { classificacaoService } from '@/services/classificacao.service';
import { CATEGORIA_LABELS, PRIORIDADE_LABELS, Categoria, Prioridade } from '@/types';
import { toast } from 'sonner';

interface ClassificacaoAutomaticaProps {
  descricao: string;
  onAplicar: (dados: {
    categoria: Categoria;
    prioridade: Prioridade;
    slaHoras: number;
  }) => void;
}

export function ClassificacaoAutomatica({ descricao, onAplicar }: ClassificacaoAutomaticaProps) {
  const [resultado, setResultado] = useState<{
    categoria: Categoria;
    prioridade: Prioridade;
    slaHoras: number;
    confianca: number;
  } | null>(null);

  const analisarMutation = useMutation({
    mutationFn: () => classificacaoService.analisar(descricao),
    onSuccess: (data) => {
      setResultado(data);
      if (data.confianca >= 60) {
        toast.success('Classificação sugerida com alta confiança!');
      } else if (data.confianca >= 30) {
        toast.info('Classificação sugerida. Verifique se está correto.');
      } else {
        toast.warning('Confiança baixa na classificação. Revise manualmente.');
      }
    },
    onError: () => {
      toast.error('Erro ao analisar descrição');
    },
  });

  const handleAnalisar = () => {
    if (!descricao || descricao.length < 10) {
      toast.error('Digite uma descrição com pelo menos 10 caracteres');
      return;
    }
    analisarMutation.mutate();
  };

  const handleAplicar = () => {
    if (resultado) {
      onAplicar({
        categoria: resultado.categoria,
        prioridade: resultado.prioridade,
        slaHoras: resultado.slaHoras,
      });
      toast.success('Classificação aplicada ao formulário!');
      setResultado(null);
    }
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 60) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confianca >= 30) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAnalisar}
          disabled={analisarMutation.isPending || !descricao || descricao.length < 10}
        >
          {analisarMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Classificar Automaticamente
            </>
          )}
        </Button>
      </div>

      {resultado && (
        <Alert>
          <AlertDescription className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Sugestão Automática:</span>
              <Badge variant="outline" className={getConfiancaColor(resultado.confianca)}>
                Confiança: {resultado.confianca}%
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Categoria:</span>
                <div className="font-medium">{CATEGORIA_LABELS[resultado.categoria]}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridade:</span>
                <div className="font-medium">{PRIORIDADE_LABELS[resultado.prioridade]}</div>
              </div>
              <div>
                <span className="text-muted-foreground">SLA:</span>
                <div className="font-medium">{resultado.slaHoras}h</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAplicar}
              >
                Aplicar Sugestão
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setResultado(null)}
              >
                Descartar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
