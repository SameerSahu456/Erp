import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Comprint ERP button variants — matches cpt-btn from design prototype.
 * All colour decisions route through Tier 2 semantic tokens
 * (`bg-primary`, `text-success`, `bg-destructive-soft`, …).  Never use
 * arbitrary `bg-[#hex]` here — see DESIGN-SYSTEM.md § "Token reference". */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[7px] border border-transparent text-[13px] font-[550] whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary hover:bg-primary-hover",
        outline:
          "border-input bg-card text-foreground hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-muted dark:hover:bg-white/8",
        destructive:
          "text-destructive border-input bg-card hover:bg-destructive-soft",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground hover:bg-success-hover",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning-hover",
        info:
          "bg-info text-info-foreground hover:bg-info-hover",
        "primary-light":
          "bg-accent text-accent-foreground hover:bg-border",
        "success-light":
          "bg-success-soft text-success hover:bg-[var(--color-green-100)]",
        "danger-light":
          "bg-destructive-soft text-destructive hover:bg-[var(--color-red-100)]",
        "warning-light":
          "bg-warning-soft text-warning hover:bg-[var(--color-amber-100)]",
        "info-light":
          "bg-info-soft text-info hover:bg-[var(--color-blue-100)]",
        "primary-tertiary":
          "text-foreground hover:bg-accent",
        "success-tertiary":
          "text-success hover:bg-success-soft",
        "danger-tertiary":
          "text-destructive hover:bg-destructive-soft",
        "warning-tertiary":
          "text-warning hover:bg-warning-soft",
        "info-tertiary":
          "text-info hover:bg-info-soft",
      },
      size: {
        default:
          "h-9 gap-[7px] px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[4px] px-2 text-[12px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[5px] px-2.5 text-[12.5px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-[14px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-[34px] rounded-[7px]",
        "icon-xs":
          "size-6 rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[5px]",
        "icon-lg": "size-12",
      },
      shape: {
        default: "",
        rounded: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Leading-edge throttle window (ms) for onClick. The first click fires
     *  immediately; further clicks within `throttleMs` are silently ignored.
     *  Use on action buttons (Save / Create / Delete / Confirm) to suppress
     *  accidental double-clicks before the mutation flips `isPending`. Not
     *  applied to form submits — those should set `disabled={isPending}`. */
    throttleMs?: number
  }

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "default",
  throttleMs,
  onClick,
  ...props
}: ButtonProps) {
  // Base UI's <Button> defaults `nativeButton: true` so it forces a real
  // <button> element. The moment a caller passes `render={<Link>}` (or any
  // non-button element) Base UI logs:
  //   "A component that acts as a button expected a native <button> because
  //    the `nativeButton` prop is true."
  //
  // Every router-link button in the app needs `nativeButton: false`. Doing
  // it once here means every call site stays clean — `<Button render={<Link/>}>`
  // just works. Callers that explicitly pass `nativeButton` keep their
  // override.
  const nativeButton =
    props.nativeButton !== undefined
      ? props.nativeButton
      : props.render === undefined
        ? true
        : false

  // Leading-edge click throttle. First click fires the handler immediately
  // and (for type=submit buttons) lets the form submit normally; subsequent
  // clicks within `throttleMs` get preventDefault + stopPropagation so the
  // browser's form-submit pipeline doesn't fire a duplicate request.
  const lockedUntil = React.useRef(0)
  const handleClick: NonNullable<ButtonPrimitive.Props["onClick"]> = (event) => {
    if (throttleMs && throttleMs > 0) {
      const now = Date.now()
      if (now < lockedUntil.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      lockedUntil.current = now + throttleMs
    }
    onClick?.(event)
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
      nativeButton={nativeButton}
      onClick={handleClick}
    />
  )
}

export { Button, buttonVariants, type ButtonProps }
