import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export const THEMES = [
  { id: 'shadcn-default', label: 'Shadcn Default' },
  { id: 'comprint-crm', label: 'Comprint CRM' },
  { id: 'corporate-slate', label: 'Corporate Slate' },
  { id: 'modern-minimalist', label: 'Modern Minimalist' },
  { id: 'high-contrast', label: 'High-Contrast Professional' },
  { id: 'ocean-blue', label: 'Ocean Blue' },
  { id: 'forest-green', label: 'Forest Green' },
  { id: 'amber-warm', label: 'Amber Warm' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ColorMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: ThemeId
  colorMode: ColorMode
  isDark: boolean
  setTheme: (theme: ThemeId) => void
  setColorMode: (mode: ColorMode) => void
  themes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY_THEME = 'comprint-theme'
const STORAGE_KEY_MODE = 'comprint-color-mode'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_THEME)
    return (stored as ThemeId) || 'corporate-slate'
  })

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_MODE)
    return (stored as ColorMode) || 'light'
  })

  const [systemDark, setSystemDark] = useState(getSystemDark)

  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme, isDark])

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY_THEME, newTheme)
  }, [])

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode)
    localStorage.setItem(STORAGE_KEY_MODE, mode)
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, colorMode, isDark, setTheme, setColorMode, themes: THEMES }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
