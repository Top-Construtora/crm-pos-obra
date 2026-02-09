import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wrench,
  MoreVertical,
  UserCircle,
  Settings,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useSocket } from '@/hooks/useSocket'
import { dashboardService } from '@/services/dashboard.service'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/types'
import { NotificacoesDropdown } from '@/components/NotificacoesDropdown'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  roles?: string[]
  badge?: number
}

interface NavSection {
  label: string
  items: NavItem[]
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { hasRole, isAdmin } = usePermissions()

  // Initialize WebSocket connection for real-time updates
  useSocket()

  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
  })

  const openChamados = (stats?.abertos || 0) + (stats?.emAndamento || 0)

  const navSections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
      ],
    },
    {
      label: 'Pos-Obra',
      items: [
        { name: 'Assistência Técnica', href: '/assistencia', icon: Wrench, badge: openChamados || undefined },
        { name: 'Chamados', href: '/chamados', icon: ClipboardList },
        { name: 'Agenda Técnica', href: '/agenda', icon: Calendar },
      ],
    },
    {
      label: 'Cadastros',
      items: [
        { name: 'Empreendimentos', href: '/empreendimentos', icon: Building2, adminOnly: true },
        { name: 'Equipe Técnica', href: '/tecnicos', icon: Users, roles: ['ADMIN', 'COORDENADOR'] },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { name: 'Configuracoes', href: '/configuracoes', icon: Settings, adminOnly: true },
      ],
    },
  ]

  const filterNavItem = (item: NavItem) => {
    if (item.adminOnly) return isAdmin()
    if (item.roles) return hasRole(...(item.roles as any))
    return true
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const currentPageName = navSections
    .flatMap(s => s.items)
    .find((n) => n.href === location.pathname)?.name || 'Assistência Técnica'

  return (
    <div className="min-h-screen main-bg">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 280 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        className="fixed inset-y-0 left-0 z-50 hidden md:flex flex-col will-change-[width]"
        style={{
          background: 'linear-gradient(180deg, #1a2332 0%, #0f1419 100%)',
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
        {/* Logo Section */}
        <div className={cn("h-[77px] flex items-center gap-3 border-b border-white/10", sidebarCollapsed ? "justify-center px-2" : "pl-5 pr-4")}>
          <Link to="/" className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "gap-3 flex-1")}>
            <img
              src="/assets/logoGIO.png"
              alt="Logo GIO"
              className={cn("object-contain", sidebarCollapsed ? "h-10 w-auto" : "h-11 w-11")}
            />
            {!sidebarCollapsed && (
              <span className="logo-text text-lg text-white tracking-wider whitespace-nowrap">
                CRM <span style={{ color: '#12b0a0' }}>POS-OBRA</span>
              </span>
            )}
          </Link>

          {/* Botão de toggle - só aparece no modo expandido e desktop */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 transition-colors duration-200"
              title="Retrair sidebar"
            >
              <ChevronLeft className="h-5 w-5 text-white/80" />
            </button>
          )}

        </div>

        {/* Botão de toggle - aparece quando retraído */}
        {sidebarCollapsed && (
          <div className="hidden lg:block px-2 py-3 border-b border-white/10">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
              title="Expandir sidebar"
            >
              <ChevronRight className="h-5 w-5 text-white/80" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 py-4 overflow-y-auto overflow-x-hidden sidebar-scroll", sidebarCollapsed ? "px-2" : "px-3")}>
          {navSections.map((section) => {
            const visibleItems = section.items.filter(filterNavItem)
            if (visibleItems.length === 0) return null

            return (
              <div key={section.label} className="mb-4">
                {!sidebarCollapsed && (
                  <span className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                    {section.label}
                  </span>
                )}
                <div className={cn("space-y-1", !sidebarCollapsed && "mt-2")}>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'relative group flex items-center rounded-xl py-3 text-[15px] font-medium transition-all duration-200',
                          sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-4',
                          isActive
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                        style={isActive ? {
                          background: sidebarCollapsed
                            ? 'rgba(18, 176, 160, 0.15)'
                            : 'linear-gradient(90deg, rgba(18, 176, 160, 0.2) 0%, transparent 100%)',
                          borderLeft: sidebarCollapsed ? undefined : '3px solid #12b0a0',
                        } : undefined}
                      >
                        <item.icon className={cn(
                          'h-5 w-5 flex-shrink-0 transition-colors',
                          isActive ? 'text-[#12b0a0]' : 'text-gray-500 group-hover:text-gray-300'
                        )} />

                        {!sidebarCollapsed && (
                          <span className="flex-1 whitespace-nowrap">
                            {item.name}
                          </span>
                        )}

                        {/* Tooltip */}
                        {sidebarCollapsed && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                            {item.name}
                          </div>
                        )}

                        {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#ef4444' }}
                          >
                            {item.badge}
                          </span>
                        )}
                        {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className="absolute top-0 right-0 h-2 w-2 rounded-full"
                            style={{ background: '#ef4444' }}
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User Section at Bottom */}
        <div
          className={cn(
            "py-4 border-t border-white/10",
            sidebarCollapsed ? "px-2" : "px-3"
          )}
        >
          <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "gap-3")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg transition-colors hover:opacity-80",
                    sidebarCollapsed ? "h-10 w-10" : "h-10 w-10"
                  )}
                  style={{ background: 'linear-gradient(135deg, #12b0a0 0%, #0d8a7c 100%)' }}
                >
                  {user?.nome ? getInitials(user.nome) : 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{user?.nome}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Modo Escuro
                    </>
                  ) : (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Modo Claro
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.nome}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {user?.role ? ROLE_LABELS[user.role] : ''}
                  </p>
                </div>
                <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
        </div>
      </motion.aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar Mobile */}
          <aside
            className="md:hidden flex flex-col fixed h-full w-64 z-50"
            style={{
              background: 'linear-gradient(180deg, #1a2332 0%, #0f1419 100%)',
            }}
          >
            <div className="flex flex-col h-full overflow-hidden">
              {/* Logo Section Mobile */}
              <div className="h-[77px] flex items-center justify-between pl-5 pr-4 border-b border-white/10">
                <Link to="/" className="flex items-center gap-3">
                  <img
                    src="/assets/logoGIO.png"
                    alt="Logo GIO"
                    className="h-11 w-11 object-contain"
                  />
                  <span className="logo-text text-lg text-white tracking-wider">
                    CRM <span style={{ color: '#12b0a0' }}>POS-OBRA</span>
                  </span>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Mobile */}
              <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden sidebar-scroll px-3">
                {navSections.map((section) => {
                  const visibleItems = section.items.filter(filterNavItem)
                  if (visibleItems.length === 0) return null

                  return (
                    <div key={section.label} className="mb-4">
                      <span className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                        {section.label}
                      </span>
                      <div className="space-y-1 mt-2">
                        {visibleItems.map((item) => {
                          const isActive = location.pathname === item.href
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-xl transition-all duration-200',
                                isActive
                                  ? 'text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                              )}
                              style={isActive ? {
                                background: 'linear-gradient(90deg, rgba(18, 176, 160, 0.2) 0%, transparent 100%)',
                                borderLeft: '3px solid #12b0a0',
                              } : undefined}
                            >
                              <item.icon className={cn(
                                'h-5 w-5 transition-colors flex-shrink-0',
                                isActive ? 'text-[#12b0a0]' : 'text-gray-500'
                              )} />
                              <span className="flex-1">{item.name}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span
                                  className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: '#ef4444' }}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </nav>

              {/* User Section Mobile */}
              <div className="py-4 border-t border-white/10 px-3">
                <button
                  onClick={() => {
                    setSidebarOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-xl text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <motion.div
        initial={false}
        animate={{ paddingLeft: sidebarCollapsed ? 80 : 280 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        className="md:pl-[280px] will-change-[padding]"
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-card px-4 md:px-8 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="header-title text-xl text-primary">
                {currentPageName}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Gerencie chamados e solicitações de manutenção
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificacoesDropdown />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-muted"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-muted ml-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {user?.nome ? getInitials(user.nome) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium">{user?.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role ? ROLE_LABELS[user.role] : ''}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-muted-foreground cursor-default">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </motion.div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav md:hidden">
        {[
          { name: 'Dashboard', href: '/', icon: LayoutDashboard },
          { name: 'Chamados', href: '/chamados', icon: ClipboardList },
          { name: 'Agenda', href: '/agenda', icon: Calendar },
          { name: 'Perfil', href: '/perfil', icon: UserCircle },
        ].map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn('bottom-nav-item', location.pathname === item.href && 'active')}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
