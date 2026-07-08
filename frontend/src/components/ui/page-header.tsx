import { ReactNode } from 'react'

interface PageHeaderProps {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Elemento no início da linha (ex.: botão Voltar). */
  leading?: ReactNode
}

/**
 * Cabeçalho de página no padrão do GIO (AdminPageHeader): card com avatar de
 * ícone (accent teal) + título + subtítulo + slot de ações.
 */
export function PageHeader({ icon, title, subtitle, actions, leading }: PageHeaderProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center gap-5">
        {leading}
        {icon && (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            {icon}
          </div>
        )}
        <div className="min-w-[200px] flex-1">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
