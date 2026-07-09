import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Wrench, User, Info } from 'lucide-react'
import { toast } from 'sonner'
import { equipeService, MembroEquipe, PapelEquipe } from '@/services/equipe.service'
import { usePermissions } from '@/hooks/usePermissions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Equipe Tecnica: os usuarios vem da GIO (quem tem a permissao acesso_pos_obra).
// Aqui o gestor define apenas o PAPEL de cada um no Pos-Obra:
//  - GESTOR: ve tudo, cria/edita/atribui/finaliza e gerencia a equipe
//  - TECNICO: atende os chamados atribuidos a ele
// Admins da GIO sao gestores automaticos e nao aparecem na lista.
// Criar/desativar usuarios e conceder acesso = Admin da GIO.

const PAPEL_INFO: Record<PapelEquipe, { label: string; desc: string }> = {
  GESTOR: { label: 'Gestor', desc: 'Vê e gerencia todos os chamados' },
  TECNICO: { label: 'Técnico', desc: 'Atende os chamados atribuídos a ele' },
}

export default function TecnicosPage() {
  const queryClient = useQueryClient()
  const { user, hasRole } = usePermissions()
  const podeGerenciar = hasRole('ADMIN', 'COORDENADOR')

  const { data: equipe, isLoading, error } = useQuery({
    queryKey: ['equipe'],
    queryFn: equipeService.getEquipe,
    enabled: podeGerenciar,
  })

  const papelMutation = useMutation({
    mutationFn: ({ profileId, papel }: { profileId: string; papel: PapelEquipe }) =>
      equipeService.setPapel(profileId, papel),
    onSuccess: (_data, { papel }) => {
      queryClient.invalidateQueries({ queryKey: ['equipe'] })
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      toast.success(`Papel atualizado para ${PAPEL_INFO[papel].label}`)
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Erro ao atualizar papel'),
  })

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  if (!podeGerenciar) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Apenas gestores podem gerenciar a equipe.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Como funciona */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-accent" />
        <p className="text-muted-foreground">
          A lista mostra quem tem acesso ao Pós-Obra (permissão concedida na{' '}
          <span className="font-semibold text-foreground">GIO</span>). Aqui você define o{' '}
          <span className="font-semibold text-foreground">papel</span> de cada pessoa:{' '}
          <span className="font-semibold text-foreground">Gestor</span> vê e gerencia tudo;{' '}
          <span className="font-semibold text-foreground">Técnico</span> atende os chamados
          atribuídos a ele. Para incluir ou remover pessoas, ajuste as permissões na GIO.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              {(error as any)?.response?.data?.error || 'Erro ao carregar a equipe'}
            </p>
          </CardContent>
        </Card>
      ) : equipe && equipe.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipe.map((membro: MembroEquipe) => (
            <Card key={membro.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(membro.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{membro.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">
                      {membro.roleGio.replace(/_/g, ' ')} na GIO
                    </p>
                  </div>
                </div>
                <Badge variant={membro.papel === 'GESTOR' ? 'warning' : 'secondary'}>
                  {membro.papel === 'GESTOR' ? (
                    <ShieldCheck className="mr-1 h-3 w-3" />
                  ) : (
                    <Wrench className="mr-1 h-3 w-3" />
                  )}
                  {PAPEL_INFO[membro.papel].label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select
                  value={membro.papel}
                  onValueChange={(v) =>
                    papelMutation.mutate({ profileId: membro.id, papel: v as PapelEquipe })
                  }
                  disabled={papelMutation.isPending || membro.id === user?.id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PAPEL_INFO) as [PapelEquipe, typeof PAPEL_INFO.GESTOR][]).map(
                      ([papel, info]) => (
                        <SelectItem key={papel} value={papel}>
                          {info.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {PAPEL_INFO[membro.papel].desc}
                  {membro.id === user?.id && ' · (você)'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground text-center">
              Nenhum usuário com acesso ao Pós-Obra.
              <br />
              <span className="text-sm">
                Conceda a permissão <code className="text-foreground">acesso_pos_obra</code> na GIO
                (Admin → Cargos/Usuários).
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
