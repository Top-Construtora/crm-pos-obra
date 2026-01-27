import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { chamadosService } from '@/services/chamados.service'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { usersService } from '@/services/users.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TipoImovel,
  Categoria,
  Prioridade,
  TIPO_LABELS,
  CATEGORIA_LABELS,
  PRIORIDADE_LABELS,
} from '@/types'

const chamadoSchema = z.object({
  empreendimentoId: z.string().min(1, 'Empreendimento e obrigatorio'),
  unidade: z.string().min(1, 'Unidade e obrigatoria'),
  clienteNome: z.string().min(1, 'Nome do cliente e obrigatorio'),
  clienteTelefone: z.string().min(1, 'Telefone e obrigatorio'),
  clienteEmail: z.string().email('Email invalido').optional().or(z.literal('')),
  tipo: z.enum(['RESIDENCIAL', 'COMERCIAL']),
  categoria: z.enum([
    'HIDRAULICA',
    'ELETRICA',
    'PINTURA',
    'ESQUADRIAS',
    'IMPERMEABILIZACAO',
    'ESTRUTURAL',
    'OUTROS',
  ]),
  descricao: z.string().min(10, 'Descricao deve ter pelo menos 10 caracteres'),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']),
  slaHoras: z.coerce.number().min(1, 'SLA deve ser maior que 0'),
  responsavelId: z.string().optional(),
})

type ChamadoForm = z.infer<typeof chamadoSchema>

const SLA_OPTIONS = [
  { value: 4, label: '4 horas' },
  { value: 8, label: '8 horas' },
  { value: 24, label: '24 horas (1 dia)' },
  { value: 48, label: '48 horas (2 dias)' },
  { value: 72, label: '72 horas (3 dias)' },
  { value: 168, label: '168 horas (7 dias)' },
]

export default function ChamadoFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const { data: chamado, isLoading: loadingChamado } = useQuery({
    queryKey: ['chamado', id],
    queryFn: () => chamadosService.getById(id!),
    enabled: isEditing,
  })

  const { data: empreendimentos } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
  })

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: usersService.getTecnicos,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChamadoForm>({
    resolver: zodResolver(chamadoSchema),
    defaultValues: {
      tipo: 'RESIDENCIAL',
      categoria: 'HIDRAULICA',
      prioridade: 'MEDIA',
      slaHoras: 48,
    },
  })

  useEffect(() => {
    if (chamado) {
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
    }
  }, [chamado, reset])

  const createMutation = useMutation({
    mutationFn: chamadosService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      toast.success(`Chamado #${data.numero} criado com sucesso`)
      navigate('/chamados')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar chamado')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ChamadoForm) => chamadosService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] })
      queryClient.invalidateQueries({ queryKey: ['chamado', id] })
      toast.success('Chamado atualizado com sucesso')
      navigate(`/chamados/${id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar chamado')
    },
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

  if (isEditing && loadingChamado) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? `Editar Chamado #${chamado?.numero}` : 'Novo Chamado'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize as informacoes do chamado' : 'Preencha os dados do novo chamado'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empreendimentoId">Empreendimento *</Label>
              <Select
                value={watch('empreendimentoId')}
                onValueChange={(v) => setValue('empreendimentoId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empreendimentos?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.empreendimentoId && (
                <p className="text-sm text-destructive">{errors.empreendimentoId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade (Apto/Casa) *</Label>
              <Input id="unidade" {...register('unidade')} placeholder="Ex: Apto 101" />
              {errors.unidade && (
                <p className="text-sm text-destructive">{errors.unidade.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clienteNome">Nome do Cliente *</Label>
              <Input id="clienteNome" {...register('clienteNome')} />
              {errors.clienteNome && (
                <p className="text-sm text-destructive">{errors.clienteNome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clienteTelefone">Telefone *</Label>
              <Input id="clienteTelefone" {...register('clienteTelefone')} placeholder="(00) 00000-0000" />
              {errors.clienteTelefone && (
                <p className="text-sm text-destructive">{errors.clienteTelefone.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clienteEmail">Email</Label>
              <Input id="clienteEmail" type="email" {...register('clienteEmail')} />
              {errors.clienteEmail && (
                <p className="text-sm text-destructive">{errors.clienteEmail.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Chamado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={watch('tipo')}
                onValueChange={(v) => setValue('tipo', v as TipoImovel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={watch('categoria')}
                onValueChange={(v) => setValue('categoria', v as Categoria)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade *</Label>
              <Select
                value={watch('prioridade')}
                onValueChange={(v) => setValue('prioridade', v as Prioridade)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SLA *</Label>
              <Select
                value={String(watch('slaHoras'))}
                onValueChange={(v) => setValue('slaHoras', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsavel</Label>
              <Select
                value={watch('responsavelId') || 'none'}
                onValueChange={(v) => setValue('responsavelId', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
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
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descricao">Descricao *</Label>
              <Textarea
                id="descricao"
                {...register('descricao')}
                rows={4}
                placeholder="Descreva o problema detalhadamente..."
              />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Criar Chamado'}
          </Button>
        </div>
      </form>
    </div>
  )
}
