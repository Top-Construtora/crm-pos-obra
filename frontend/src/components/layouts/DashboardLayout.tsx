import { useEffect, useState } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { SHELL } from '@/config/gioBrand'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'

// Título da página a partir da rota atual.
function usePageTitle() {
  const { pathname } = useLocation()
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/relatorios')) return 'Relatórios'
  if (pathname.startsWith('/assistencia')) return 'Assistência Técnica'
  if (pathname === '/chamados/novo') return 'Novo Chamado'
  if (pathname.endsWith('/editar')) return 'Editar Chamado'
  if (pathname.startsWith('/chamados/')) return 'Detalhes do Chamado'
  if (pathname.startsWith('/chamados')) return 'Chamados'
  if (pathname.startsWith('/agenda')) return 'Agenda Técnica'
  if (pathname.startsWith('/empreendimentos')) return 'Empreendimentos'
  if (pathname.startsWith('/tecnicos')) return 'Equipe Técnica'
  if (pathname.startsWith('/perfil')) return 'Meu Perfil'
  if (pathname.startsWith('/configuracoes')) return 'Configurações'
  return 'GIO'
}

export function DashboardLayout() {
  const { logout } = useAuth()
  const pageTitle = usePageTitle()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('gio-sidebar-collapsed') === '1')

  useEffect(() => {
    localStorage.setItem('gio-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const sbW = collapsed ? SHELL.sidebarCollapsedW : SHELL.sidebarW

  return (
    <div
      className="h-screen md:grid transition-[grid-template-columns] duration-[600ms] ease-[cubic-bezier(.4,0,.2,1)] md:[grid-template-columns:var(--sb)_1fr]"
      style={{ ['--sb' as string]: `${sbW}px` }}
    >
      {/* Sidebar permanente (desktop) */}
      <aside className="hidden md:block h-screen overflow-hidden bg-[#1A1A1A] border-r border-[rgba(255,255,255,0.08)]">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} onLogout={logout} onClose={() => {}} />
      </aside>

      {/* Sidebar em drawer (mobile) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-[248px]"
              initial={{ x: -248 }}
              animate={{ x: 0 }}
              exit={{ x: -248 }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <Sidebar onLogout={logout} onClose={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Coluna principal */}
      <div className="flex flex-col min-w-0 h-screen bg-background">
        <AppHeader pageTitle={pageTitle} onMenuClick={() => setMobileOpen(true)} onLogout={logout} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
