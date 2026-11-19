import * as React from "react"

import { cn } from "@/lib/utils"

interface LabelProps extends React.ComponentProps<"label"> {
  /**
   * Append a red asterisk to mark the field as required. The
   * asterisk is `aria-hidden` because the input itself should carry
   * `required` / `aria-required` for assistive tech — the asterisk
   * is purely visual.
   *
   * Prefer this over hand-writing `<Label>Name *</Label>` or
   * `<Label>Name <span className="text-destructive">*</span></Label>`
   * so the colour, spacing, and a11y treatment stay uniform across
   * every form.
   */
  required?: boolean
}

/**
 * The red required asterisk on its own — for places that mark a mandatory
 * field but are not a `<label>` (e.g. a data-grid column header). Keep the
 * colour and a11y treatment here so every marker in the app matches.
 */
function RequiredMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("text-destructive", className)}>
      *
    </span>
  )
}

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && <RequiredMark className="-ml-1" />}
    </label>
  )
}

export { Label, RequiredMark }
