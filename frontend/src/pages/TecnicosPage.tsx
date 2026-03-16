import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { usersService } from '@/services/users.service'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { User as UserType, ROLE_LABELS, UserRole } from '@/types'

export default function TecnicosPage() {
  const queryClient = useQueryClient()
  const { isAdmin } = usePermissions()
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'TECNICO' as UserRole,
  })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
    enabled: isAdmin(),
  })

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: usersService.getTecnicos,
    enabled: !isAdmin(),
  })

  const displayUsers = isAdmin() ? users : tecnicos

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      toast.success('Usuario criado com sucesso')
      handleClose()
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Erro ao criar usuario'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserType> }) =>
      usersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      toast.success('Usuario atualizado')
      handleClose()
    },
    onError: () => toast.error('Erro ao atualizar usuario'),
  })

  const deleteMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      toast.success('Usuario desativado')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao desativar usuario'),
  })

  const handleOpen = (user?: UserType) => {
    if (user) {
      setEditingId(user.id)
      setFormData({ nome: user.nome, email: user.email, senha: '', role: user.role })
    } else {
      setEditingId(null)
      setFormData({ nome: '', email: '', senha: '', role: 'TECNICO' })
    }
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setEditingId(null)
    setFormData({ nome: '', email: '', senha: '', role: 'TECNICO' })
  }

  const handleSubmit = () => {
    if (!formData.nome || !formData.email) {
      toast.error('Preencha nome e email')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Email invalido')
      return
    }
    if (!editingId && !formData.senha) {
      toast.error('Senha e obrigatoria para novos usuarios')
      return
    }
    if (formData.senha && formData.senha.length < 6) {
      toast.error('Senha deve ter no minimo 6 caracteres')
      return
    }

    const data: any = {
      nome: formData.nome,
      email: formData.email,
      role: formData.role,
    }
    if (formData.senha) {
      data.senha = formData.senha
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'COORDENADOR':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin() ? 'Usuarios' : 'Tecnicos'}</h1>
          <p className="text-muted-foreground">
            {isAdmin() ? 'Gerencie todos os usuarios do sistema' : 'Lista de tecnicos disponiveis'}
          </p>
        </div>
        {isAdmin() && (
          <Button onClick={() => handleOpen()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuario
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : displayUsers && displayUsers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{user.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                {isAdmin() && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(user.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Badge variant={getRoleColor(user.role) as any}>
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nenhum usuario encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Usuario' : 'Novo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{editingId ? 'Nova Senha (opcional)' : 'Senha'}</Label>
              <Input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder={editingId ? 'Deixe em branco para manter' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="COORDENADOR">Coordenador</SelectItem>
                  <SelectItem value="TECNICO">Tecnico</SelectItem>
                </SelectContent>
              </Select>
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
            <AlertDialogTitle>Desativar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuario sera desativado e nao podera mais acessar o sistema.
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
