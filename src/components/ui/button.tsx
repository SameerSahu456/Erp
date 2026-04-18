import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#e0e2e9] hover:text-[#3f4254] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-[#f1416c] text-white hover:bg-[#fff5f8] hover:text-[#f1416c] focus-visible:border-[#f1416c]/40 focus-visible:ring-[#f1416c]/20",
        link: "text-primary underline-offset-4 hover:underline",
        // ITASM Figma color variants — Solid (hover to light)
        success:
          "bg-[#50cd89] text-white hover:bg-[#e8fff3] hover:text-[#0b5c22] focus-visible:ring-[#50cd89]/30",
        warning:
          "bg-[#f6c000] text-white hover:bg-[#fff8dd] hover:text-[#b88800] focus-visible:ring-[#f6c000]/30",
        info:
          "bg-[#7239ea] text-white hover:bg-[#f8f5ff] hover:text-[#7239ea] focus-visible:ring-[#7239ea]/30",
        // ITASM Figma — Light variants (hover slightly deeper)
        "primary-light":
          "bg-[#eef5ff] text-[#1379f0] hover:bg-[#dceafc] focus-visible:ring-[#1379f0]/20",
        "success-light":
          "bg-[#e8fff3] text-[#0b5c22] hover:bg-[#d5f5e6] focus-visible:ring-[#50cd89]/20",
        "danger-light":
          "bg-[#fff5f8] text-[#f1416c] hover:bg-[#ffe8ee] focus-visible:ring-[#f1416c]/20",
        "warning-light":
          "bg-[#fff8dd] text-[#b88800] hover:bg-[#fff2c4] focus-visible:ring-[#f6c000]/20",
        "info-light":
          "bg-[#f8f5ff] text-[#7239ea] hover:bg-[#efe8ff] focus-visible:ring-[#7239ea]/20",
        // ITASM Figma — Tertiary (text-only, hover to light bg)
        "primary-tertiary":
          "text-[#1379f0] hover:bg-[#eef5ff] focus-visible:ring-[#1379f0]/20",
        "success-tertiary":
          "text-[#50cd89] hover:bg-[#e8fff3] focus-visible:ring-[#50cd89]/20",
        "danger-tertiary":
          "text-[#f1416c] hover:bg-[#fff5f8] focus-visible:ring-[#f1416c]/20",
        "warning-tertiary":
          "text-[#f6c000] hover:bg-[#fff8dd] focus-visible:ring-[#f6c000]/20",
        "info-tertiary":
          "text-[#7239ea] hover:bg-[#f8f5ff] focus-visible:ring-[#7239ea]/20",
      },
      size: {
        default:
          "h-9 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[4px] px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[5px] px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
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

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
