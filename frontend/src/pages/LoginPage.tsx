import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GIO_FONT } from '@/config/gioBrand'
import AuthBackdrop from '@/components/auth/AuthBackdrop'
import BlurText from '@/components/auth/BlurText'
import RotatingText from '@/components/auth/RotatingText'

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu email').email('Formato de email invalido'),
  senha: z.string().min(1, 'Informe sua senha'),
})

type LoginForm = z.infer<typeof loginSchema>

// GIO v4.0: mesmo layout do login do Portal de Gente (avaliacao-performance-top).
// Marca e headline à esquerda, card com o SSO Microsoft como caminho principal
// e o email/senha recolhido; rodapé de tela inteira ancora as duas colunas.
const INVERT_TO_WHITE = 'invert(1) brightness(1.1)'

const DESTAQUES = [
  { title: 'Chamados com SLA', desc: 'Abertura, triagem e prazos num fluxo só.' },
  { title: 'Agenda técnica', desc: 'Visitas e equipes organizadas por empreendimento.' },
  { title: 'Relatórios', desc: 'Indicadores de atendimento para decidir rápido.' },
]

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMsLoading, setIsMsLoading] = useState(false)
  const { login, loginWithMicrosoft } = useAuth()

  // Telas baixas (notebook 768p): o card expandido precisa de cada pixel, então
  // o spacer de alinhamento encolhe quase a zero e o card fica compacto.
  const [isShortViewport, setIsShortViewport] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 820px)')
    const update = () => setIsShortViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Em telas baixas o card expandido rola dentro da coluna: ao abrir o
  // formulário, garante que ele apareça na vista.
  const emailFormRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showEmailLogin) return
    const id = window.setTimeout(() => {
      emailFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 350)
    return () => window.clearTimeout(id)
  }, [showEmailLogin])

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

  const onMicrosoft = async () => {
    setIsMsLoading(true)
    try {
      // Redireciona para a Microsoft; em caso de erro, reabilita o botao.
      await loginWithMicrosoft()
    } catch {
      setIsMsLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-[#1A1A1A] text-white"
      style={{ fontFamily: GIO_FONT }}
    >
      <AuthBackdrop />

      {/* Overlay enquanto o redirect para a Microsoft acontece (sem tela "morta") */}
      <AnimatePresence>
        {isMsLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-[#1A1A1A]/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#D2FF00]" />
              <p className="text-[14px] text-white/70">Conectando à Microsoft…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-screen flex-col lg:h-screen">
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ═══ ESQUERDA: PAINEL DE MARCA ═══ */}
          <aside className="relative hidden flex-col overflow-hidden px-16 pt-14 lg:flex xl:px-24">
            <div className="relative z-[1] w-[240px] max-w-full text-center">
              <img src="/assets/gioWordmark.png" alt="GIO" className="w-full" style={{ filter: INVERT_TO_WHITE }} />
              <span className="mt-3 block whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.18em] text-white/35">
                Gestão Inteligente de Obras
              </span>
            </div>

            {/* Headline grande ao centro, ancorada pela linha lime */}
            <div className="relative z-[1] flex flex-1 items-center">
              <div className="flex gap-[18px]">
                <div className="mt-3 w-[3px] shrink-0 self-stretch rounded-full bg-gradient-to-b from-[#D2FF00] via-[#D2FF00]/40 to-transparent" />
                <h1 className="text-[clamp(30px,3.4vw,64px)] font-semibold leading-[1.1] tracking-[-0.035em] text-white">
                  <BlurText text="Pós-obra sob controle," />
                  <br />
                  <RotatingText
                    className="text-[#D2FF00]"
                    items={['do chamado à entrega.', 'SLAs sempre à vista.', 'equipes em sintonia.']}
                  />
                </h1>
              </div>
            </div>
          </aside>

          {/* ═══ DIREITA: FORMULÁRIO ═══
              No desktop, um spacer espelha o bloco da logo do painel esquerdo
              para o card centrar no mesmo espaço vertical da headline. */}
          <main className="relative flex flex-col p-6 lg:min-h-0 lg:overflow-y-auto lg:px-16 lg:pb-0 lg:pt-14 lg:[@media(max-height:820px)]:pt-6">
            {/* Marca no mobile (o painel esquerdo some abaixo de lg) */}
            <div className="mt-6 text-center lg:hidden">
              <img
                src="/assets/gioWordmark.png"
                alt="GIO"
                className="mx-auto h-[44px] w-auto"
                style={{ filter: INVERT_TO_WHITE }}
              />
              <span className="mt-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
                Gestão Inteligente de Obras
              </span>
            </div>

            <motion.div
              aria-hidden
              className="hidden w-full flex-shrink-0 lg:block"
              initial={false}
              animate={{ height: showEmailLogin ? (isShortViewport ? 8 : 40) : 202 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div className="flex w-full flex-1 items-center justify-center lg:min-h-0 lg:py-5 lg:[@media(max-height:820px)]:py-3">
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 170, damping: 22 }}
                className="w-[460px] max-w-[calc(100%-48px)] sm:max-w-[calc(100%-80px)]"
              >
                <div
                  className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(0,0,0,0.18)] px-10 pb-10 pt-11 shadow-[0_32px_64px_rgba(0,0,0,0.35)] lg:[@media(max-height:820px)]:px-8 lg:[@media(max-height:820px)]:pb-6 lg:[@media(max-height:820px)]:pt-7"
                  style={{
                    backdropFilter: 'blur(28px) saturate(1.4)',
                    WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
                  }}
                >
                  {/* Barra de destaque lime (assinatura do card de autenticação) */}
                  <div className="absolute -top-px left-10 right-10 h-0.5 rounded-b-[4px] bg-[#D2FF00] opacity-90" />

                  {/* Assinatura do produto (a marca grande já vive no painel esquerdo) */}
                  <div className="mb-7 text-center lg:[@media(max-height:820px)]:mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B8B95]">
                      Assistência Técnica
                    </span>
                  </div>

                  <div className="mb-[26px] h-px w-full bg-white/[0.09] lg:[@media(max-height:820px)]:mb-4" />

                  <h2 className="mb-1.5 text-center text-[22px] font-semibold tracking-[-0.03em] text-white">
                    Entre na sua conta
                  </h2>
                  <p className="mb-8 text-center text-[14px] text-[#8B8B95] lg:[@media(max-height:820px)]:mb-5">
                    Use sua conta corporativa para acessar a GIO.
                  </p>

                  {/* Botão principal: login com Microsoft (SSO Entra/Azure via GIO) */}
                  <button
                    type="button"
                    onClick={onMicrosoft}
                    disabled={isLoading || isMsLoading}
                    className="group relative flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-[10px] border border-white/[0.14] bg-white/[0.08] text-[14.5px] font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition hover:border-[#D2FF00]/40 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2FF00]/50 disabled:cursor-not-allowed disabled:opacity-60 lg:[@media(max-height:820px)]:h-[46px]"
                  >
                    {isMsLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Conectando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 21 21" aria-hidden>
                          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                        </svg>
                        <span>Entrar com Microsoft</span>
                      </>
                    )}
                  </button>

                  {/* Login alternativo fica recolhido: o Microsoft é o caminho oficial */}
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setShowEmailLogin((v) => !v)}
                      aria-expanded={showEmailLogin}
                      className="cursor-pointer rounded border-0 bg-transparent px-1 text-[13px] text-[#8B8B95] transition-colors hover:text-[#D2FF00] focus-visible:text-[#D2FF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2FF00]/50"
                    >
                      {showEmailLogin ? 'Ocultar login com email' : 'Entrar com email e senha'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showEmailLogin && (
                      <motion.div
                        ref={emailFormRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 border-t border-white/[0.09] pt-5 lg:[@media(max-height:820px)]:mt-4 lg:[@media(max-height:820px)]:pt-4">
                          <form onSubmit={handleSubmit(onSubmit)}>
                            {/* E-mail */}
                            <div className="mb-4 flex flex-col gap-1.5">
                              <label
                                htmlFor="email"
                                className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#8B8B95]"
                              >
                                E-mail
                              </label>
                              <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="seu@email.com.br"
                                disabled={isLoading}
                                {...register('email')}
                                className="h-12 w-full rounded-[10px] border border-white/10 bg-white/[0.06] px-4 text-[14.5px] text-white outline-none transition placeholder:text-[#8B8B95] placeholder:opacity-55 hover:border-white/[0.14] focus:border-[#D2FF00] focus:shadow-[0_0_0_3px_rgba(210,255,0,0.18)] lg:[@media(max-height:820px)]:h-11"
                              />
                              {errors.email && <span className="text-[12px] text-[#ff9090]">{errors.email.message}</span>}
                            </div>

                            {/* Senha */}
                            <div className="mb-6 flex flex-col gap-1.5 lg:[@media(max-height:820px)]:mb-4">
                              <label
                                htmlFor="senha"
                                className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#8B8B95]"
                              >
                                Senha
                              </label>
                              <div className="relative">
                                <input
                                  id="senha"
                                  type={showPassword ? 'text' : 'password'}
                                  autoComplete="current-password"
                                  placeholder="••••••••"
                                  disabled={isLoading}
                                  {...register('senha')}
                                  className="h-12 w-full rounded-[10px] border border-white/10 bg-white/[0.06] pl-4 pr-12 text-[14.5px] text-white outline-none transition placeholder:text-[#8B8B95] placeholder:opacity-55 hover:border-white/[0.14] focus:border-[#D2FF00] focus:shadow-[0_0_0_3px_rgba(210,255,0,0.18)] lg:[@media(max-height:820px)]:h-11"
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

                            {/* Entrar: CTA primário em lime */}
                            <button
                              type="submit"
                              disabled={isLoading || isMsLoading}
                              className="relative flex h-[50px] w-full cursor-pointer items-center justify-center rounded-[10px] bg-[#D2FF00] text-[15px] font-bold tracking-[0.02em] text-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:-translate-y-px hover:bg-[#C2EE00] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 lg:[@media(max-height:820px)]:h-[46px]"
                            >
                              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* No desktop o © vive no rodapé de tela inteira; aqui só no mobile */}
                  <div className="mt-[26px] text-center text-[11px] tracking-[0.03em] text-[#8B8B95] opacity-55 lg:hidden">
                    © 2026 GIO · Sistema protegido por autenticação segura
                  </div>
                </div>
              </motion.div>
            </div>
          </main>
        </div>

        {/* ═══ RODAPÉ DE TELA INTEIRA: ancora as duas colunas ═══
            Altura de 2 células do grid (140px): com a malha ancorada na base,
            a divisória do rodapé cai exatamente numa linha do grid. */}
        <footer className="relative z-10 hidden h-[140px] border-t border-white/[0.08] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid grid-cols-3 content-center gap-8 px-16 xl:px-24">
            {DESTAQUES.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.55 + index * 0.13, ease: 'easeOut' }}
              >
                <span className="block text-[14px] font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-[13px] leading-[1.55] text-white/45">{item.desc}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-end px-16">
            <span className="text-right text-[11px] tracking-[0.03em] text-white/30">
              © 2026 GIO · Sistema protegido por autenticação segura
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
