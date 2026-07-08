import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  BarChart3,
  Wrench,
  ClipboardList,
  Calendar,
  Building2,
  Users,
  Settings,
  Search,
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { dashboardService } from '@/services/dashboard.service'
import { GIO_FONT } from '@/config/gioBrand'

interface NavItem {
  text: string
  icon: React.ReactNode
  path: string
  badge?: number
}
interface NavGroup {
  label: string
  items: NavItem[]
}

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onLogout: () => void
  onClose?: () => void
}

export default function Sidebar({ collapsed = false, onToggleCollapse, onLogout, onClose }: SidebarProps) {
  const { user } = useAuth()
  const { isAdmin, hasRole } = usePermissions()
  const location = useLocation()
  const [busca, setBusca] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
  })
  const openChamados = (stats?.abertos || 0) + (stats?.emAndamento || 0)

  const navGroups: NavGroup[] = useMemo(
    () =>
      [
        {
          label: 'Principal',
          items: [
            { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
            { text: 'Relatórios', icon: <BarChart3 size={20} />, path: '/relatorios' },
          ],
        },
        {
          label: 'Pós-Obra',
          items: [
            { text: 'Assistência Técnica', icon: <Wrench size={20} />, path: '/assistencia', badge: openChamados || undefined },
            { text: 'Chamados', icon: <ClipboardList size={20} />, path: '/chamados' },
            { text: 'Agenda Técnica', icon: <Calendar size={20} />, path: '/agenda' },
          ],
        },
        {
          label: 'Cadastros',
          items: [
            isAdmin() && { text: 'Empreendimentos', icon: <Building2 size={20} />, path: '/empreendimentos' },
            hasRole('ADMIN', 'COORDENADOR') && { text: 'Equipe Técnica', icon: <Users size={20} />, path: '/tecnicos' },
          ].filter(Boolean) as NavItem[],
        },
        {
          label: 'Sistema',
          items: [
            isAdmin() && { text: 'Configurações', icon: <Settings size={20} />, path: '/configuracoes' },
          ].filter(Boolean) as NavItem[],
        },
      ].filter((g) => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, openChamados],
  )

  const q = busca.trim().toLowerCase()
  const gruposFiltrados = useMemo(() => {
    if (!q) return navGroups
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.text.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0)
  }, [navGroups, q])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(path + '/')

  const inicial = (user?.nome || 'U').charAt(0).toUpperCase()

  return (
    <div className="h-full flex flex-col bg-[#1A1A1A] text-white" style={{ fontFamily: GIO_FONT }}>
      {/* Marca + toggle */}
      <div
        className={`flex items-center justify-center shrink-0 ${collapsed ? 'flex-col gap-2.5 px-2 py-2.5' : 'flex-row px-4'}`}
        style={{ minHeight: 60 }}
      >
        {!collapsed && <div className="w-8 shrink-0" />}

        <div className="grid place-items-center h-[30px]" style={{ flex: collapsed ? '0 0 auto' : 1 }}>
          <motion.img
            src="/assets/gioWordmark.png"
            alt="GIO"
            initial={false}
            animate={collapsed ? { opacity: 0, x: -28, scaleX: 0.35 } : { opacity: 1, x: 0, scaleX: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ gridArea: '1 / 1', height: 30, filter: 'invert(1)', transformOrigin: 'left center', zIndex: collapsed ? 1 : 2 }}
          />
          <motion.img
            src="/assets/gioMark.png"
            alt=""
            aria-hidden="true"
            initial={false}
            animate={collapsed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ gridArea: '1 / 1', height: 30, filter: 'invert(1)', zIndex: collapsed ? 2 : 1 }}
          />
        </div>

        {onToggleCollapse && (
          <motion.div layout transition={{ type: 'spring', stiffness: 240, damping: 28 }} style={{ flexShrink: 0 }}>
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'expandir menu lateral' : 'recolher menu lateral'}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className="flex items-center justify-center w-8 h-8 rounded-[8px] text-[#ECECEE] hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition-colors"
            >
              <ChevronLeft
                size={20}
                style={{ transition: 'transform .55s cubic-bezier(.22,1,.36,1)', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          </motion.div>
        )}
      </div>

      {/* Busca */}
      {!collapsed && (
        <div className="mx-2 mb-3 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] bg-[rgba(255,255,255,0.06)] border border-transparent transition-colors focus-within:border-[#D2FF00]">
            <Search size={15} color="rgba(255,255,255,0.35)" />
            <input
              id="sidebar-search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar…"
              className="flex-1 bg-transparent outline-none text-[13px] text-[#ECECEE] placeholder:text-[rgba(255,255,255,0.55)]"
              style={{ fontFamily: GIO_FONT }}
            />
          </div>
        </div>
      )}

      {/* Navegação agrupada */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
        {gruposFiltrados.map((grupo) => (
          <div key={grupo.label} className={collapsed ? 'mb-3' : 'mb-5'}>
            {!collapsed && (
              <span className="block px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.35)] whitespace-nowrap">
                {grupo.label}
              </span>
            )}
            {grupo.items.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.text}
                  to={item.path}
                  onClick={() => onClose?.()}
                  title={collapsed ? item.text : undefined}
                  className={[
                    'relative w-full flex items-center rounded-[6px] mb-[2px] py-[9px] px-[11px] transition-colors',
                    collapsed ? 'justify-center' : 'justify-start',
                    active
                      ? 'bg-[rgba(210,255,0,0.14)] text-[#D2FF00]'
                      : 'text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white',
                  ].join(' ')}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-[0_3px_3px_0] bg-[#D2FF00]" />
                  )}
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ marginRight: collapsed ? 0 : 12, color: active ? '#D2FF00' : 'inherit' }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="flex-1 text-left text-[13.5px] font-medium tracking-[-0.005em] whitespace-nowrap">
                      {item.text}
                    </span>
                  )}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto text-[10px] font-bold leading-none text-white px-1.5 py-0.5 rounded-full bg-[#DC2626]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé: usuário + sair */}
      <div className="shrink-0 p-3 border-t border-[rgba(255,255,255,0.08)]">
        <div className={`flex items-center gap-2.5 py-2 ${collapsed ? 'justify-center px-0' : 'justify-start px-2'}`}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-[6px] text-[13px] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #A9BE2E, #D2FF00)', color: '#0A0E1A' }}
          >
            {inicial}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-[13px] font-semibold text-white tracking-[-0.005em] truncate">{user?.nome}</p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          title={collapsed ? 'Sair do Sistema' : undefined}
          className={`w-full flex items-center rounded-[6px] py-2 px-2 text-[#FF9090] hover:bg-[rgba(220,38,38,0.10)] transition-colors ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <LogOut size={18} style={{ marginRight: collapsed ? 0 : 10 }} />
          {!collapsed && <span className="text-[13px] font-medium">Sair do Sistema</span>}
        </button>
      </div>
    </div>
  )
}
