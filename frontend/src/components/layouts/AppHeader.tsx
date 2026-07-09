import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu as MenuIco, Search, Sun, Moon, UserCircle, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ROLE_LABELS } from '@/types'
import { NotificacoesDropdown } from '@/components/NotificacoesDropdown'
import { GIO_FONT } from '@/config/gioBrand'

interface AppHeaderProps {
  pageTitle: string
  onMenuClick: () => void
  onLogout: () => void
}

const iconBtn =
  'flex items-center justify-center w-9 h-9 rounded-[6px] text-[#ECECEE] hover:bg-[#32323A] hover:text-white transition-colors'

export default function AppHeader({ pageTitle, onMenuClick, onLogout }: AppHeaderProps) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [agora, setAgora] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Relógio ao vivo (minutos bastam)
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const inicial = (user?.nome || 'U').charAt(0).toUpperCase()
  const dataFmt = format(agora, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase()
  const horaFmt = format(agora, 'HH:mm')

  return (
    <header
      className="relative z-20 flex items-center gap-4 shrink-0 px-4 md:px-[28px] bg-[#1A1A1A] border-b border-[rgba(255,255,255,0.08)]"
      style={{ height: 60, fontFamily: GIO_FONT }}
    >
      {/* Esquerda: hambúrguer (mobile) + título */}
      <button aria-label="abrir menu" onClick={onMenuClick} className={`${iconBtn} md:hidden`}>
        <MenuIco size={18} />
      </button>
      <div className="min-w-0 shrink-0">
        <h1 className="text-[15.5px] font-semibold tracking-[-0.015em] leading-[1.2] text-white truncate">
          {pageTitle || 'GIO'}
        </h1>
        <p className="text-[10.5px] font-medium tracking-[0.1em] uppercase text-[#8B8B95] truncate">
          GIO · Gestão Inteligente de Obras
        </p>
      </div>

      {/* Centro: relógio */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2.5 pointer-events-none whitespace-nowrap">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-[#8B8B95]">{dataFmt}</span>
        <span className="text-[13px] font-semibold text-[rgba(255,255,255,0.14)]">·</span>
        <span className="text-[13px] font-semibold tracking-[0.04em] text-white tabular-nums">{horaFmt}</span>
      </div>

      {/* Direita: ações */}
      <div className="ml-auto flex items-center gap-[6px]">
        <button
          aria-label="buscar"
          title="Buscar"
          onClick={() => document.getElementById('sidebar-search')?.focus()}
          className={`${iconBtn} hidden md:flex`}
        >
          <Search size={18} />
        </button>

        {/* Notificações (funcionalidade do crm, estilizada como o GIO) */}
        <NotificacoesDropdown />

        {/* Toggle claro/escuro — switch deslizante */}
        <button
          onClick={toggleTheme}
          aria-label="Alternar entre modo escuro e claro"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className="flex items-center justify-start shrink-0 w-[56px] h-[30px] p-[3px] rounded-full border transition-colors bg-[rgba(139,139,149,0.20)] hover:bg-[rgba(139,139,149,0.34)] border-[rgba(139,139,149,0.30)]"
        >
          <span
            className="grid place-items-center w-[22px] h-[22px] rounded-full bg-[#D2FF00] text-[#0A0E1A] shrink-0"
            style={{
              transform: theme === 'light' ? 'translateX(26px)' : 'translateX(0)',
              transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
          </span>
        </button>

        {/* Avatar + menu */}
        <div className="relative ml-0.5" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Perfil do Usuário"
            className="grid place-items-center w-[34px] h-[34px] rounded-full font-bold text-[13px] transition-all hover:scale-105 hover:shadow-[0_0_0_3px_rgba(210,255,0,0.22)]"
            style={{ background: 'linear-gradient(135deg, #A9BE2E, #D2FF00)', color: '#0A0E1A', fontFamily: GIO_FONT }}
          >
            {inicial}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2.5 min-w-[240px] rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[#232327] text-white overflow-hidden"
              style={{ boxShadow: '0 32px 64px rgba(0,0,0,.6)', fontFamily: GIO_FONT }}
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div
                  className="grid place-items-center w-[38px] h-[38px] rounded-full font-bold text-[14px]"
                  style={{ background: 'linear-gradient(135deg, #A9BE2E, #D2FF00)', color: '#0A0E1A' }}
                >
                  {inicial}
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-white truncate">{user?.nome}</p>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8B8B95] truncate">
                    {user?.role ? ROLE_LABELS[user.role] : ''}
                  </p>
                </div>
              </div>
              <div className="my-1.5 border-t border-[rgba(255,255,255,0.08)]" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/perfil')
                }}
                className="w-full flex items-center gap-2 mx-0 px-3 py-2 text-white hover:bg-[#2A2A2E] transition-colors"
              >
                <UserCircle size={16} className="text-[#ECECEE]" />
                <span className="text-[13px]">Meu Perfil</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#DC2626] hover:bg-[rgba(220,38,38,.10)] transition-colors"
              >
                <LogOut size={16} />
                <span className="text-[13px]">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
