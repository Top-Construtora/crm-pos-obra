import { Palette, Sun, Moon } from 'lucide-react'
import { useTheme, AccentColor, ACCENT_PRESETS } from '@/contexts/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const COLOR_LABELS: Record<AccentColor, string> = {
  teal: 'Teal',
  blue: 'Azul',
  purple: 'Roxo',
  orange: 'Laranja',
}

const COLOR_HEX: Record<AccentColor, string> = {
  teal: '#12b0a0',
  blue: '#2563eb',
  purple: '#8b5cf6',
  orange: '#f97316',
}

export function ThemeCustomizer() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme()

  return (
    <Card className="card-hover">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-base">Aparencia</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* Theme Mode */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Modo</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                theme === 'light'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              <Sun className={cn('h-5 w-5', theme === 'light' ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium', theme === 'light' ? 'text-primary' : 'text-muted-foreground')}>
                Claro
              </span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                theme === 'dark'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              <Moon className={cn('h-5 w-5', theme === 'dark' ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-primary' : 'text-muted-foreground')}>
                Escuro
              </span>
            </button>
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Cor de destaque</p>
          <div className="grid grid-cols-4 gap-3">
            {(Object.keys(ACCENT_PRESETS) as AccentColor[]).map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                  accentColor === color
                    ? 'border-current bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                )}
                style={accentColor === color ? { borderColor: COLOR_HEX[color] } : undefined}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    accentColor === color && 'ring-2 ring-offset-2 ring-offset-background scale-110'
                  )}
                  style={{
                    background: COLOR_HEX[color],
                    ['--tw-ring-color' as string]: accentColor === color ? COLOR_HEX[color] : undefined,
                  }}
                />
                <span className={cn(
                  'text-xs font-medium',
                  accentColor === color ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {COLOR_LABELS[color]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Preview</p>
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ background: COLOR_HEX[accentColor] }}
            >
              AB
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-2.5 rounded-full w-3/4" style={{ background: COLOR_HEX[accentColor] }} />
              <div className="h-2 rounded-full bg-muted-foreground/20 w-1/2" />
            </div>
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
              style={{ background: COLOR_HEX[accentColor] }}
            >
              Botao
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
