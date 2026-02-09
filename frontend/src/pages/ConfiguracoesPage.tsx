import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Settings, Save, Mail, Clock, Tag } from 'lucide-react'
import { settingsService } from '@/services/settings.service'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CATEGORIA_LABELS } from '@/types'
import { Navigate } from 'react-router-dom'

const SLA_OPTIONS = [
  { value: '4', label: '4 horas' },
  { value: '8', label: '8 horas' },
  { value: '24', label: '24 horas (1 dia)' },
  { value: '48', label: '48 horas (2 dias)' },
  { value: '72', label: '72 horas (3 dias)' },
  { value: '168', label: '168 horas (7 dias)' },
]

export default function ConfiguracoesPage() {
  const { isAdmin } = usePermissions()
  const queryClient = useQueryClient()

  const [nomeSistema, setNomeSistema] = useState('CRM Pos-Obra')
  const [slaPadrao, setSlaPadrao] = useState('48')
  const [emailHabilitado, setEmailHabilitado] = useState(false)
  const [categoriasAtivas, setCategoriasAtivas] = useState<string[]>([])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getAll,
    enabled: isAdmin(),
  })

  useEffect(() => {
    if (settings) {
      setNomeSistema(settings.nome_sistema?.valor || 'CRM Pos-Obra')
      setSlaPadrao(settings.sla_padrao?.valor || '48')
      setEmailHabilitado(settings.email_habilitado?.valor === 'true')
      setCategoriasAtivas(
        (settings.categorias_ativas?.valor || '').split(',').filter(Boolean)
      )
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: ({ chave, valor }: { chave: string; valor: string }) =>
      settingsService.update(chave, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const handleSaveGeral = async () => {
    try {
      await updateMutation.mutateAsync({ chave: 'nome_sistema', valor: nomeSistema })
      await updateMutation.mutateAsync({ chave: 'sla_padrao', valor: slaPadrao })
      toast.success('Configuracoes gerais salvas')
    } catch {
      toast.error('Erro ao salvar configuracoes')
    }
  }

  const handleToggleCategoria = async (cat: string) => {
    const novas = categoriasAtivas.includes(cat)
      ? categoriasAtivas.filter((c) => c !== cat)
      : [...categoriasAtivas, cat]
    setCategoriasAtivas(novas)
    try {
      await updateMutation.mutateAsync({ chave: 'categorias_ativas', valor: novas.join(',') })
      toast.success('Categorias atualizadas')
    } catch {
      toast.error('Erro ao atualizar categorias')
    }
  }

  const handleToggleEmail = async () => {
    const novo = !emailHabilitado
    setEmailHabilitado(novo)
    try {
      await updateMutation.mutateAsync({ chave: 'email_habilitado', valor: String(novo) })
      toast.success(`Notificacoes por email ${novo ? 'habilitadas' : 'desabilitadas'}`)
    } catch {
      toast.error('Erro ao atualizar configuracao de email')
    }
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configuracoes do Sistema
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configuracoes gerais do sistema
        </p>
      </div>

      {/* Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Geral
          </CardTitle>
          <CardDescription>Configuracoes gerais do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Sistema</Label>
            <Input
              value={nomeSistema}
              onChange={(e) => setNomeSistema(e.target.value)}
              placeholder="CRM Pos-Obra"
            />
          </div>

          <div className="space-y-2">
            <Label>SLA Padrao (horas)</Label>
            <select
              value={slaPadrao}
              onChange={(e) => setSlaPadrao(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SLA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleSaveGeral} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuracoes Gerais
          </Button>
        </CardContent>
      </Card>

      {/* Categorias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Categorias
          </CardTitle>
          <CardDescription>Ative ou desative categorias de chamados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleToggleCategoria(key)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  categoriasAtivas.includes(key)
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      categoriasAtivas.includes(key)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}
                  />
                  {label}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notificacoes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Notificacoes por Email
          </CardTitle>
          <CardDescription>Configure envio de emails automaticos</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleToggleEmail}
            className={`flex items-center gap-3 p-4 rounded-lg border transition-all w-full text-left ${
              emailHabilitado
                ? 'bg-primary/10 border-primary'
                : 'bg-muted/50 border-border'
            }`}
          >
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                emailHabilitado ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  emailHabilitado ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <div>
              <p className="font-medium text-sm">
                {emailHabilitado ? 'Emails habilitados' : 'Emails desabilitados'}
              </p>
              <p className="text-xs text-muted-foreground">
                {emailHabilitado
                  ? 'Notificacoes por email estao ativas. Configure SMTP no .env.'
                  : 'Ative para enviar notificacoes por email.'}
              </p>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
