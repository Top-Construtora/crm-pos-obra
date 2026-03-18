import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Save, Lock, User as UserIcon, Shield, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ThemeCustomizer } from '@/components/ThemeCustomizer'

const profileSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no minimo 3 caracteres'),
  email: z.string().email('Email invalido'),
})

const passwordSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string().min(6, 'Nova senha deve ter no minimo 6 caracteres'),
  confirmarSenha: z.string().min(1, 'Confirme a nova senha'),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user: authUser, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/users/me')
      return res.data
    },
  })

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: profile ? { nome: profile.nome, email: profile.email } : undefined,
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmarSenha: '' },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await api.put('/users/me', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      if (refreshUser) refreshUser()
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso' })
      setTimeout(() => setProfileMsg(null), 3000)
    },
    onError: (err: any) => {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao atualizar perfil' })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const res = await api.patch('/users/me/password', data)
      return res.data
    },
    onSuccess: () => {
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso' })
      passwordForm.reset()
      setTimeout(() => setPasswordMsg(null), 3000)
    },
    onError: (err: any) => {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao alterar senha' })
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      if (refreshUser) refreshUser()
    },
  })

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadAvatarMutation.mutate(file)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Avatar + Info */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <button
                onClick={handleAvatarClick}
                className="relative w-24 h-24 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center cursor-pointer group"
              >
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-2xl font-bold text-white w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #12b0a0 0%, #0d8a7c 100%)' }}
                  >
                    {profile?.nome ? getInitials(profile.nome) : 'U'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold">{profile?.nome || authUser?.nome}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email || authUser?.email}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <Shield className="h-3 w-3" />
                  {profile?.role ? ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] : ''}
                </span>
                {profile?.criadoEm && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Desde {format(new Date(profile.criadoEm), 'MMM yyyy', { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Profile */}
      <Card className="card-hover">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Alterar Dados</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" {...profileForm.register('nome')} />
                {profileForm.formState.errors.nome && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.nome.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            {profileMsg && (
              <p className={cn('text-sm', profileMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive')}>
                {profileMsg.text}
              </p>
            )}
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="card-hover">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <CardTitle className="text-base">Alterar Senha</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <Input id="senhaAtual" type="password" {...passwordForm.register('senhaAtual')} />
              {passwordForm.formState.errors.senhaAtual && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.senhaAtual.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input id="novaSenha" type="password" {...passwordForm.register('novaSenha')} />
                {passwordForm.formState.errors.novaSenha && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.novaSenha.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input id="confirmarSenha" type="password" {...passwordForm.register('confirmarSenha')} />
                {passwordForm.formState.errors.confirmarSenha && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmarSenha.message}</p>
                )}
              </div>
            </div>
            {passwordMsg && (
              <p className={cn('text-sm', passwordMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive')}>
                {passwordMsg.text}
              </p>
            )}
            <Button type="submit" variant="outline" disabled={changePasswordMutation.isPending}>
              <Lock className="mr-2 h-4 w-4" />
              {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Theme Customizer */}
      <ThemeCustomizer />
    </div>
  )
}
