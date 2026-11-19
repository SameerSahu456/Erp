import { Monitor, Moon, Palette, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ColorMode } from "@/contexts/ThemeContext";
import { useTheme } from "@/contexts/use-theme";
import { cn } from "@/lib/utils";

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher() {
  const { colorMode, setColorMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9" />}
      >
        <Palette className="h-4 w-4" />
        <span className="sr-only">Toggle color mode</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          {COLOR_MODE_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setColorMode(opt.value)}
              className={cn(colorMode === opt.value && "bg-accent")}
            >
              <opt.icon className="h-4 w-4 mr-2" />
              <span className="flex-1">{opt.label}</span>
              {colorMode === opt.value && <span className="text-primary">&#10003;</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
