import { cn } from "@/lib/utils"

interface FieldErrorProps {
  message?: string | null
  id?: string
  className?: string
}

function FieldError({ message, id, className }: FieldErrorProps) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className={cn("mt-1 text-[12px] leading-snug text-destructive", className)}
    >
      {message}
    </p>
  )
}

export { FieldError, type FieldErrorProps }
