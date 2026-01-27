import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empreendimento } from '@/types'

export default function EmpreendimentosPage() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nome: '', endereco: '' })

  const { data: empreendimentos, isLoading } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: empreendimentosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empreendimentos'] })
      toast.success('Empreendimento criado com sucesso')
      handleClose()
    },
    onError: () => toast.error('Erro ao criar empreendimento'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Empreendimento> }) =>
      empreendimentosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empreendimentos'] })
      toast.success('Empreendimento atualizado')
      handleClose()
    },
    onError: () => toast.error('Erro ao atualizar empreendimento'),
  })

  const deleteMutation = useMutation({
    mutationFn: empreendimentosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empreendimentos'] })
      toast.success('Empreendimento desativado')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao desativar empreendimento'),
  })

  const handleOpen = (empreendimento?: Empreendimento) => {
    if (empreendimento) {
      setEditingId(empreendimento.id)
      setFormData({ nome: empreendimento.nome, endereco: empreendimento.endereco })
    } else {
      setEditingId(null)
      setFormData({ nome: '', endereco: '' })
    }
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setEditingId(null)
    setFormData({ nome: '', endereco: '' })
  }

  const handleSubmit = () => {
    if (!formData.nome || !formData.endereco) {
      toast.error('Preencha todos os campos')
      return
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empreendimentos</h1>
          <p className="text-muted-foreground">
            Gerencie os empreendimentos cadastrados
          </p>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Empreendimento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : empreendimentos && empreendimentos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empreendimentos.map((emp) => (
            <Card key={emp.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{emp.nome}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(emp)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(emp.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{emp.endereco}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nenhum empreendimento cadastrado</p>
            <Button className="mt-4" onClick={() => handleOpen()}>
              Criar primeiro empreendimento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Empreendimento' : 'Novo Empreendimento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do empreendimento"
              />
            </div>
            <div className="space-y-2">
              <Label>Endereco</Label>
              <Input
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Endereco completo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar empreendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              O empreendimento sera desativado e nao aparecera mais nas listagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
