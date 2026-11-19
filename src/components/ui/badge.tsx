import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Comprint ERP badge variants — matches cpt-badge from design prototype.
 * All colour decisions route through Tier 2 semantic tokens. Dark mode
 * is handled by the underlying token (e.g. `--destructive` flips to a
 * brighter red in dark mode), so `bg-destructive/18` automatically
 * adapts.  Never use arbitrary `bg-[#hex]` here — see DESIGN-SYSTEM.md. */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-[5px] overflow-hidden border border-transparent font-[550] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground dark:bg-white/10 dark:text-white",
        destructive: "bg-destructive-soft text-destructive dark:bg-destructive/18",
        outline: "border-input text-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/90",
        ghost: "hover:bg-muted hover:text-secondary-foreground dark:hover:bg-white/10 dark:hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success-soft text-success dark:bg-success/18",
        warning: "bg-warning-soft text-warning dark:bg-warning/18",
        info: "bg-info-soft text-info dark:bg-info/18",
        grey: "bg-secondary text-secondary-foreground dark:bg-white/10 dark:text-white/85",
        "primary-soft": "bg-accent text-accent-foreground dark:bg-white/10 dark:text-white",
        "success-soft": "bg-success-soft text-success dark:bg-success/18",
        "danger-soft": "bg-destructive-soft text-destructive dark:bg-destructive/18",
        "warning-soft": "bg-warning-soft text-warning dark:bg-warning/18",
        "info-soft": "bg-info-soft text-info dark:bg-info/18",
        "grey-soft": "bg-[var(--color-gray-50)] text-muted-foreground dark:bg-white/8 dark:text-white/75",
      },
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        default: "h-6 px-2 text-[11.5px]",
        lg: "h-7 px-2.5 text-[12.5px]",
      },
      shape: {
        rounded: "rounded-md",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "pill",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  shape = "pill",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size, shape }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
