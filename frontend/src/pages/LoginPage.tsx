import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Headset, Clock, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu email').email('Formato de email invalido'),
  senha: z.string().min(1, 'Informe sua senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

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
    <div className="min-h-screen bg-gradient-to-br from-[#1e2938] via-[#1e6076] to-[#12b0a0] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-y-12 scale-150"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform skew-y-12 scale-150"></div>
      </div>

      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding & Info */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 text-white">
          <div className="space-y-6">
            <img
              src="/assets/logoGIO.png"
              alt="GIO Logo"
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-5xl font-bold leading-tight mb-4">
                Sistema de<br />
                <span className="text-[#12b0a0]">Assistência</span><br />
                Técnica
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                Gerencie chamados de assistência técnica com eficiência.
                Acompanhe SLAs, atribua técnicos e mantenha seus clientes satisfeitos.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="p-3 bg-[#12b0a0] rounded-xl">
                <Headset className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Controle de Chamados</h3>
                <p className="text-white/70 text-sm">Gerencie chamados do início ao fim</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="p-3 bg-[#1e6076] rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Monitoramento de SLA</h3>
                <p className="text-white/70 text-sm">Acompanhe prazos e performance em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="p-3 bg-[#baa673] rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gestão de Técnicos</h3>
                <p className="text-white/70 text-sm">Atribua e acompanhe sua equipe técnica</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-0">
            <CardHeader className="space-y-4 text-center pb-8">
              <div className="p-3 bg-gradient-to-br from-[#12b0a0] to-[#1e6076] rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
                <img
                  src="/assets/logoGIO.png"
                  alt="GIO Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Bem-vindo(a)!
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  Faça login para acessar o sistema de assistência técnica
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      {...register('email')}
                      className={`mt-1 h-12 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#12b0a0]'}`}
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="senha" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Senha
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="senha"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...register('senha')}
                        className={`h-12 pr-12 ${errors.senha ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#12b0a0]'}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {errors.senha && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        {errors.senha.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#12b0a0] to-[#1e6076] hover:from-[#0f9d8a] hover:to-[#1a5a6b] text-white font-semibold text-base shadow-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar no Sistema'
                  )}
                </Button>
              </form>

              {/* Test Users - only in development */}
              {import.meta.env.DEV && (
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Usuarios de teste:
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Admin:</span>
                      <code className="bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">admin@empresa.com / admin123</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Coordenador:</span>
                      <code className="bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">coord@empresa.com / coord123</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Tecnico:</span>
                      <code className="bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">joao@empresa.com / tecnico123</code>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sistema protegido por autenticação segura
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
