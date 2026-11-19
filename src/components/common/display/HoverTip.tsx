import { useState, type ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Styled hover tooltip around a dropdown trigger (the app replacement for the native
// `title=`). It steps aside once the trigger is pressed — so it never sits on top of
// the dropdown that just opened — and comes back when the pointer leaves.
export function HoverTip({ text, children }: { text: string; children: ReactNode }) {
  const [pressed, setPressed] = useState(false)
  return (
    <TooltipProvider delay={150}>
      <Tooltip disabled={pressed}>
        <TooltipTrigger
          render={
            <span
              className="block w-full"
              onPointerDownCapture={() => setPressed(true)}
              onPointerLeave={() => setPressed(false)}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
