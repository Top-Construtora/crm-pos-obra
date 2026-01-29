import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { usePermissions } from '@/hooks/usePermissions'
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
      ],
    },
    {
      label: 'Pos-Obra',
      items: [
        { name: 'Assistência Técnica', href: '/assistencia', icon: Wrench, badge: openChamados || undefined },
        { name: 'Chamados', href: '/chamados', icon: ClipboardList },
      ],
    },
    {
      label: 'Cadastros',
      items: [
        { name: 'Empreendimentos', href: '/empreendimentos', icon: Building2, adminOnly: true },
        { name: 'Equipe Técnica', href: '/tecnicos', icon: Users, roles: ['ADMIN', 'COORDENADOR'] },
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
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'lg:w-[80px]' : 'lg:w-[280px]',
          'w-[280px]'
        )}
        style={{
          background: 'linear-gradient(180deg, #1a2332 0%, #0f1419 100%)',
        }}
      >
        {/* Logo Section */}
        <div className={cn("pt-6 pb-4", sidebarCollapsed ? "px-3" : "px-5")}>
          <Link to="/" className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "gap-3")}>
            <img
              src="/assets/logoGIO.png"
              alt="Logo GIO"
              className="h-11 w-11 object-contain flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="logo-text text-lg text-white tracking-wider">
                  CRM <span style={{ color: '#12b0a0' }}>POS-OBRA</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  Sistema de Gestão Integrada
                </span>
              </div>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 lg:hidden text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Collapse Toggle Button - Desktop Only */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 -right-3 hidden lg:flex h-6 w-6 rounded-full border border-white/20 bg-[#1a2332] text-gray-400 hover:text-white hover:bg-[#1a2332] z-50"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Divider */}
        <div className={cn("h-px bg-white/10", sidebarCollapsed ? "mx-3" : "mx-5")} />

        {/* Navigation */}
        <nav className={cn("flex flex-col gap-1 py-5 sidebar-scroll overflow-y-auto h-[calc(100vh-200px)]", sidebarCollapsed ? "px-2" : "px-3")}>
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
                        title={sidebarCollapsed ? item.name : undefined}
                        className={cn(
                          'group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200',
                          sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                          isActive
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                        style={isActive ? {
                          background: sidebarCollapsed
                            ? 'rgba(18, 176, 160, 0.2)'
                            : 'linear-gradient(90deg, rgba(18, 176, 160, 0.2) 0%, transparent 100%)',
                          borderLeft: sidebarCollapsed ? undefined : '3px solid #12b0a0',
                        } : undefined}
                      >
                        <item.icon className={cn(
                          'h-5 w-5 transition-colors flex-shrink-0',
                          isActive ? 'text-[#12b0a0]' : 'text-gray-500 group-hover:text-gray-300'
                        )} />
                        {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
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
            "absolute bottom-0 left-0 right-0 mb-3 rounded-xl",
            sidebarCollapsed ? "mx-2 p-2" : "mx-3 p-4"
          )}
          style={{ background: 'rgba(255,255,255,0.05)' }}
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
              <DropdownMenuContent align={sidebarCollapsed ? "center" : "end"} side="top" className="w-48">
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
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[280px]")}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-card px-4 lg:px-8 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
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
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-muted"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {openChamados > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>

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
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
