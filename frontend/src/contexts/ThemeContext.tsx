import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'
export type AccentColor = 'teal' | 'blue' | 'purple' | 'orange'

const ACCENT_PRESETS: Record<AccentColor, { primary: string; secondary: string; ring: string }> = {
  teal: {
    primary: '193 60% 29%',
    secondary: '174 82% 38%',
    ring: '193 60% 29%',
  },
  blue: {
    primary: '217 91% 50%',
    secondary: '210 80% 55%',
    ring: '217 91% 50%',
  },
  purple: {
    primary: '271 81% 56%',
    secondary: '280 70% 50%',
    ring: '271 81% 56%',
  },
  orange: {
    primary: '25 95% 53%',
    secondary: '30 90% 48%',
    ring: '25 95% 53%',
  },
}

interface ThemeContextType {
  theme: Theme
  accentColor: AccentColor
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  setAccentColor: (color: AccentColor) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('accentColor')
    if (stored && stored in ACCENT_PRESETS) return stored as AccentColor
    return 'teal'
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    const preset = ACCENT_PRESETS[accentColor]
    root.style.setProperty('--primary', preset.primary)
    root.style.setProperty('--ring', preset.ring)
    root.style.setProperty('--accent', preset.secondary)

    // Update dark mode primary too
    if (theme === 'dark') {
      root.style.setProperty('--primary', preset.secondary)
    }

    localStorage.setItem('accentColor', accentColor)
  }, [accentColor, theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color)
  }

  return (
    <ThemeContext.Provider value={{ theme, accentColor, toggleTheme, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export { ACCENT_PRESETS }
