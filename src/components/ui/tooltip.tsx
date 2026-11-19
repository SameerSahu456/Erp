import { useEffect, useState } from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: TooltipPrimitive.Root.Props) {
  const [openState, setOpenState] = useState(defaultOpen)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : openState

  // A tooltip is portalled out of every scroll container, so when the page or a
  // board (kanban, tables) scrolls under a still-hovered pointer it stays put or
  // trails its anchor across neighbouring UI such as the sidebar. Close it on any
  // scroll; it reopens on the next hover. Controlled tooltips are left to their owner.
  useEffect(() => {
    if (controlled || !open) return
    const close = () => setOpenState(false)
    window.addEventListener("scroll", close, { capture: true, passive: true })
    return () => window.removeEventListener("scroll", close, { capture: true })
  }, [controlled, open])

  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      open={open}
      onOpenChange={(next, details) => {
        if (!controlled) setOpenState(next)
        onOpenChange?.(next, details)
      }}
      {...props}
    />
  )
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        // The tooltip is portalled out of any scroll container, so it keeps following
        // its anchor after the anchor scrolls under a clipping edge (kanban board
        // scrolled sideways) and would float over the sidebar. Base UI flags that
        // state; hide the tooltip while it holds.
        className="isolate z-50 data-anchor-hidden:invisible"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 inline-flex w-fit max-w-[min(20rem,calc(100vw-1rem))] origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background [overflow-wrap:anywhere] has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
