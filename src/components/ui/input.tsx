import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 bg-transparent transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        outline:
          "rounded-md border border-input bg-transparent px-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        solid:
          "rounded-md border border-transparent bg-[#f1f1f2] px-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-[#2d2d3f]",
        tertiary:
          "rounded-md border border-transparent bg-transparent px-3 focus-visible:bg-[#f1f1f2] focus-visible:border-ring dark:focus-visible:bg-[#2d2d3f]",
        white:
          "rounded-md border border-input bg-white px-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-[#1e1e2d]",
      },
      inputSize: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "outline",
      inputSize: "default",
    },
  }
)

function Input({
  className,
  type,
  variant = "outline",
  inputSize = "default",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, inputSize, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
