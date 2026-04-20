import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Comprint ERP badge variants — matches cpt-badge from design prototype */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-[5px] overflow-hidden border border-transparent font-[550] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#0F1B2D] text-white",
        secondary: "bg-[#EEF0F3] text-[#344054]",
        destructive: "bg-[#FEF3F2] text-[#B42318]",
        outline: "border-[#D0D5DD] text-[var(--foreground,#0F1B2D)]",
        ghost: "hover:bg-[#EEF0F3] hover:text-[#344054]",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-[#ECFDF3] text-[#067647]",
        warning: "bg-[#FFFAEB] text-[#B54708]",
        info: "bg-[#EFF4FF] text-[#175CD3]",
        grey: "bg-[#EEF0F3] text-[#344054]",
        "primary-soft": "bg-[#EEF1F6] text-[#0F1B2D]",
        "success-soft": "bg-[#ECFDF3] text-[#067647]",
        "danger-soft": "bg-[#FEF3F2] text-[#B42318]",
        "warning-soft": "bg-[#FFFAEB] text-[#B54708]",
        "info-soft": "bg-[#EFF4FF] text-[#175CD3]",
        "grey-soft": "bg-[#FAFBFC] text-muted-foreground",
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
