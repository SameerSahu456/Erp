import { Palette, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type ColorMode } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeSwitcher() {
  const { theme, colorMode, setTheme, setColorMode, themes } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9" />}
      >
        <Palette className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(theme === t.id && 'bg-accent')}
          >
            <span className="flex-1">{t.label}</span>
            {theme === t.id && <span className="text-primary">&#10003;</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {COLOR_MODE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setColorMode(opt.value)}
            className={cn(colorMode === opt.value && 'bg-accent')}
          >
            <opt.icon className="h-4 w-4 mr-2" />
            <span className="flex-1">{opt.label}</span>
            {colorMode === opt.value && <span className="text-primary">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
