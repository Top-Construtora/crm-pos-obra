import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GIO_FONT } from '@/config/gioBrand'

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu email').email('Formato de email invalido'),
  senha: z.string().min(1, 'Informe sua senha'),
})

type LoginForm = z.infer<typeof loginSchema>

const INVERT_TO_WHITE = 'invert(1) brightness(1.1)'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-[#1A1A1A] text-white"
      style={{ fontFamily: GIO_FONT }}
    >
      {/* Grade blueprint — pano de fundo técnico (lime translúcido sobre obsidian) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(210,255,0,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(210,255,0,.05) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)`,
          backgroundSize: '90px 90px, 90px 90px, 22.5px 22.5px, 22.5px 22.5px',
          maskImage: 'radial-gradient(ellipse 100% 100% at 45% 45%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 45% 45%, black 30%, transparent 100%)',
        }}
      />

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* ═══ ESQUERDA — PAINEL DE MARCA ═══ */}
        <aside className="relative hidden flex-col justify-center overflow-hidden px-16 py-16 lg:flex xl:px-24">
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            viewBox="0 0 780 900"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <line x1="0" y1="900" x2="420" y2="0" stroke="#D2FF00" strokeWidth="1" opacity=".08" />
              <circle cx="420" cy="0" r="3.5" fill="#D2FF00" opacity=".2" />
              <circle cx="0" cy="900" r="3.5" fill="#D2FF00" opacity=".2" />
            </g>
            <g>
              <line x1="160" y1="900" x2="580" y2="0" stroke="#D2FF00" strokeWidth=".5" opacity=".05" />
              <circle cx="580" cy="0" r="2" fill="#D2FF00" opacity=".12" />
              <circle cx="160" cy="900" r="2" fill="#D2FF00" opacity=".12" />
            </g>
            <g>
              <line x1="0" y1="260" x2="300" y2="260" stroke="#D2FF00" strokeWidth=".8" opacity=".12" />
              <circle cx="300" cy="260" r="3" fill="#D2FF00" opacity=".25" />
            </g>
            <g>
              <line x1="480" y1="640" x2="780" y2="640" stroke="#D2FF00" strokeWidth=".8" opacity=".12" />
              <circle cx="480" cy="640" r="3" fill="#D2FF00" opacity=".25" />
            </g>
            <g>
              <path d="M36 36 L36 96 L96 96" fill="none" stroke="#D2FF00" strokeWidth="1.4" opacity=".25" />
              <circle cx="96" cy="96" r="3" fill="#D2FF00" opacity=".3" />
            </g>
            <g>
              <path d="M36 864 L36 804 L96 804" fill="none" stroke="#D2FF00" strokeWidth="1.4" opacity=".25" />
              <circle cx="96" cy="804" r="3" fill="#D2FF00" opacity=".3" />
            </g>
          </svg>

          <div className="relative z-[1] max-w-[560px]">
            <div className="mb-12">
              <img
                src="/assets/gioWordmark.png"
                alt="GIO"
                className="w-[240px] max-w-full"
                style={{ filter: INVERT_TO_WHITE }}
              />
              <span className="mt-3 block text-[12px] font-medium uppercase tracking-[0.18em] text-white/35">
                Gestão Inteligente de Obras
              </span>
            </div>

            <div className="flex gap-[14px]">
              <div className="mt-2 w-[3px] shrink-0 self-stretch rounded-full bg-gradient-to-b from-[#D2FF00] via-[#D2FF00]/40 to-transparent" />
              <div>
                <h1 className="mb-6 text-[48px] font-semibold leading-[1.08] tracking-[-0.035em] text-white">
                  Assistência técnica sob controle,{' '}
                  <em className="not-italic text-[#D2FF00]">do chamado à entrega</em>.
                </h1>
                <p className="max-w-[460px] text-[17px] leading-[1.6] text-white/55">
                  Chamados, SLAs e equipes técnicas em um só lugar — com a visibilidade que sua
                  operação de pós-obra precisa para resolver rápido.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ═══ DIREITA — FORMULÁRIO ═══ */}
        <main className="relative flex items-center justify-center p-6 lg:px-16">
          <div className="w-[430px] max-w-[calc(100%-48px)] sm:max-w-[calc(100%-80px)]">
            <div
              className="relative rounded-[20px] border border-white/10 bg-[rgba(0,0,0,0.18)] px-10 pb-10 pt-11 shadow-[0_32px_64px_rgba(0,0,0,0.35)]"
              style={{
                backdropFilter: 'blur(28px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
              }}
            >
              {/* Barra de destaque lime */}
              <div className="absolute -top-px left-10 right-10 h-0.5 rounded-b-[4px] bg-[#D2FF00] opacity-90" />

              <div className="mb-7 flex flex-col items-center gap-2.5 text-center">
                <img
                  src="/assets/gioWordmark.png"
                  alt="GIO"
                  className="block h-[40px] w-auto"
                  style={{ filter: INVERT_TO_WHITE }}
                />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.13em] text-[#8B8B95]">
                  Gestão Inteligente de Obras
                </span>
              </div>

              <div className="mb-[26px] h-px w-full bg-white/[0.09]" />

              <h2 className="mb-1.5 text-center text-[22px] font-semibold tracking-[-0.03em] text-white">
                Bem-vindo de volta
              </h2>
              <p className="mb-8 text-center text-[14px] text-[#8B8B95]">
                Acesse sua conta para continuar.
              </p>

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* E-mail */}
                <div className="mb-4 flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#8B8B95]">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com.br"
                    {...register('email')}
                    className="h-12 w-full rounded-[10px] border border-white/10 bg-white/[0.06] px-4 text-[14.5px] text-white outline-none transition placeholder:text-[#8B8B95] placeholder:opacity-55 hover:border-white/[0.14] focus:border-[#D2FF00] focus:shadow-[0_0_0_3px_rgba(210,255,0,0.18)]"
                  />
                  {errors.email && <span className="text-[12px] text-[#ff9090]">{errors.email.message}</span>}
                </div>

                {/* Senha */}
                <div className="mb-6 flex flex-col gap-1.5">
                  <label htmlFor="senha" className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#8B8B95]">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="senha"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...register('senha')}
                      className="h-12 w-full rounded-[10px] border border-white/10 bg-white/[0.06] pl-4 pr-12 text-[14.5px] text-white outline-none transition placeholder:text-[#8B8B95] placeholder:opacity-55 hover:border-white/[0.14] focus:border-[#D2FF00] focus:shadow-[0_0_0_3px_rgba(210,255,0,0.18)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-[#8B8B95] opacity-70 transition hover:opacity-100"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.senha && <span className="text-[12px] text-[#ff9090]">{errors.senha.message}</span>}
                </div>

                {/* Entrar — CTA primário em lime */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative flex h-[50px] w-full items-center justify-center rounded-[10px] bg-[#D2FF00] text-[15px] font-bold tracking-[0.02em] text-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition cursor-pointer hover:-translate-y-px hover:bg-[#C2EE00] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
                </button>
              </form>

              {/* Usuarios de teste — apenas em desenvolvimento */}
              {import.meta.env.DEV && (
                <div className="mt-6 rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-3.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B8B95]">
                    Usuarios de teste
                  </p>
                  <div className="space-y-1 text-[11.5px] text-white/60">
                    <div className="flex justify-between gap-2">
                      <span>Admin</span>
                      <code className="text-white/80">admin@empresa.com / admin123</code>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Coordenador</span>
                      <code className="text-white/80">coord@empresa.com / coord123</code>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Tecnico</span>
                      <code className="text-white/80">joao@empresa.com / tecnico123</code>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-[26px] text-center text-[11px] tracking-[0.03em] text-[#8B8B95] opacity-55">
                © 2026 GIO · Todos os direitos reservados
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
