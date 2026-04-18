import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Comprint ERP button variants — matches cpt-btn from design prototype */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[7px] border border-transparent text-[13px] font-[550] whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#0F1B2D] text-white border-[#0F1B2D] hover:bg-[#1E2A3D]",
        outline:
          "border-[#D0D5DD] bg-[var(--card,#fff)] text-[var(--foreground,#0F1B2D)] hover:bg-[#EEF0F3]",
        secondary:
          "bg-[#EEF0F3] text-[#344054] hover:bg-[#E4E7EC]",
        ghost:
          "border-transparent bg-transparent hover:bg-[#EEF0F3] text-[var(--foreground,#0F1B2D)]",
        destructive:
          "text-[#B42318] border-[#D0D5DD] bg-[var(--card,#fff)] hover:bg-[#FEF3F2]",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-[#067647] text-white hover:bg-[#055C38]",
        warning:
          "bg-[#B54708] text-white hover:bg-[#9A3B06]",
        info:
          "bg-[#175CD3] text-white hover:bg-[#1349A8]",
        "primary-light":
          "bg-[#EEF1F6] text-[#0F1B2D] hover:bg-[#E4E7EC]",
        "success-light":
          "bg-[#ECFDF3] text-[#067647] hover:bg-[#D1FAE5]",
        "danger-light":
          "bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE2E2]",
        "warning-light":
          "bg-[#FFFAEB] text-[#B54708] hover:bg-[#FEF3C7]",
        "info-light":
          "bg-[#EFF4FF] text-[#175CD3] hover:bg-[#DBEAFE]",
        "primary-tertiary":
          "text-[#0F1B2D] hover:bg-[#EEF1F6]",
        "success-tertiary":
          "text-[#067647] hover:bg-[#ECFDF3]",
        "danger-tertiary":
          "text-[#B42318] hover:bg-[#FEF3F2]",
        "warning-tertiary":
          "text-[#B54708] hover:bg-[#FFFAEB]",
        "info-tertiary":
          "text-[#175CD3] hover:bg-[#EFF4FF]",
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
