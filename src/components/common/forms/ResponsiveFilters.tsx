import { useEffect, useState, type ReactNode } from "react"
import { X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface ResponsiveFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}

export function ResponsiveFilters({
  open,
  onOpenChange,
  title,
  children,
  className,
}: ResponsiveFiltersProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false,
  )

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)")
    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
      onOpenChange(false)
    }
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [onOpenChange])

  return (
    <>
      {!isMobile && (
        <div
          className={cn(
            "flex-shrink-0 overflow-hidden self-stretch transition-all duration-300 ease-in-out",
            open ? "w-72 opacity-100" : "w-0 opacity-0",
            className,
          )}
        >
          <div className="w-72">
            <div className="h-full rounded-2xl border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{title}</h3>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Close ${title}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
