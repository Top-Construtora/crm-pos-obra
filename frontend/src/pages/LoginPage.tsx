import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wrench, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  senha: z.string().min(1, 'Senha e obrigatoria'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal to-teal-light relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Wrench className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">ASSISTENCIA</h1>
              <p className="text-sm tracking-[0.3em] opacity-80">TECNICA</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-6">
            Sistema de Controle<br />de Chamados
          </h2>

          <p className="text-lg opacity-90 max-w-md">
            Gerencie chamados de assistencia tecnica com eficiencia.
            Acompanhe SLAs, atribua tecnicos e mantenha seus clientes satisfeitos.
          </p>

          <div className="mt-12 flex gap-8">
            <div>
              <p className="text-4xl font-bold">15+</p>
              <p className="text-sm opacity-80">Chamados Ativos</p>
            </div>
            <div>
              <p className="text-4xl font-bold">5</p>
              <p className="text-sm opacity-80">Empreendimentos</p>
            </div>
            <div>
              <p className="text-4xl font-bold">98%</p>
              <p className="text-sm opacity-80">SLA no Prazo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="absolute top-4 right-4"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Sun className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>

        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-foreground">ASSISTENCIA</h1>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground">TECNICA</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-1">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="bg-card"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  className="bg-card pr-12"
                  {...register('senha')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.senha && (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Test Users */}
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Usuarios de teste:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Admin:</span>
                <code className="bg-card px-2 py-0.5 rounded text-foreground">admin@empresa.com / admin123</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coordenador:</span>
                <code className="bg-card px-2 py-0.5 rounded text-foreground">coord@empresa.com / coord123</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tecnico:</span>
                <code className="bg-card px-2 py-0.5 rounded text-foreground">joao@empresa.com / tecnico123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
