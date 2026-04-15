import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-[#f1416c] text-white",
        outline:
          "border-border text-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // ITASM Figma — Solid color badges
        success: "bg-[#50cd89] text-white",
        warning: "bg-[#f6c000] text-white",
        info: "bg-[#7239ea] text-white",
        grey: "bg-[#f1f1f2] text-[#5e6278]",
        // ITASM Figma — Soft/Light color badges
        "primary-soft": "bg-[#eef5ff] text-[#1379f0]",
        "success-soft": "bg-[#e8fff3] text-[#0b5c22]",
        "danger-soft": "bg-[#fff5f8] text-[#f1416c]",
        "warning-soft": "bg-[#fff8dd] text-[#b88800]",
        "info-soft": "bg-[#f8f5ff] text-[#7239ea]",
        "grey-soft": "bg-[#f9f9f9] text-[#7e8299]",
      },
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        default: "h-6 px-2 text-xs",
        lg: "h-7 px-2.5 text-sm",
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
