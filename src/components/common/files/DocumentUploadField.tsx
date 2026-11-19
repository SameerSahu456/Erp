import { useId, useRef, useState } from "react"
import { FileText, Paperclip, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"

import { DOCUMENT_UPLOAD_FIELD_STRINGS as S } from './document-upload-field.strings'

interface DocumentUploadFieldProps {
  label: string
  /** Description / helper line under the label — e.g. "PDF, JPG, PNG · max 20 MB" */
  helperText?: string
  /** Selected file. Undefined means nothing is picked. */
  value: File | undefined
  onChange: (file: File | undefined) => void
  /**
   * Allow-list of MIME types accepted by the field. Mirrors backend policy —
   * we pre-empt the 4xx with an inline error instead of letting the upload
   * fail server-side.
   */
  allowedMimes: readonly string[]
  /** Max byte size before the field rejects the pick. Default: 20 MB. */
  maxBytes?: number
  /**
   * Render an asterisk on the label. The field itself stays optional —
   * required-ness is enforced by the form's validate() since "required"
   * for a document is application-specific.
   */
  required?: boolean
  disabled?: boolean
  className?: string
  /**
   * Presentation only — file-handling behavior is identical across variants.
   * "row" (default) = horizontal field with the label above.
   * "card" = centered square drop zone with the label inside (legacy
   * Closed-Won look). Use inside a grid for the old card-grid layout.
   */
  variant?: "row" | "card"
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentUploadField({
  label,
  helperText,
  value,
  onChange,
  allowedMimes,
  maxBytes = 20 * 1024 * 1024,
  required = false,
  disabled = false,
  className,
  variant = "row",
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)

  function pick() {
    if (disabled) return
    inputRef.current?.click()
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file twice re-fires onChange.
    e.target.value = ""
    if (!file) return

    if (!allowedMimes.includes(file.type)) {
      setError(
        `Unsupported file type. Allowed: ${allowedMimes
          .map((m) => m.split("/")[1]?.toUpperCase() ?? m)
          .join(", ")}.`,
      )
      return
    }
    if (file.size > maxBytes) {
      setError(`File is ${formatBytes(file.size)} — must be ${formatBytes(maxBytes)} or less.`)
      return
    }
    setError(null)
    onChange(file)
  }

  function clear() {
    setError(null)
    onChange(undefined)
  }

  // Hidden file input — shared by both variants.
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={allowedMimes.join(",")}
      onChange={handleInput}
      className="hidden"
      disabled={disabled}
    />
  )

  if (variant === "card") {
    return (
      <div className={className}>
        <div
          className={cn(
            "rounded-xl border p-3 text-center transition-colors",
            value
              ? "border-primary/40 bg-primary/5"
              : "border-dashed hover:border-primary/30 hover:bg-muted/30",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {value ? (
            <div className="space-y-1.5">
              <FileText className="mx-auto size-5 text-primary" />
              <p className="truncate text-[12px] font-medium">
                {label}
                {required && (
                  <span className="text-destructive" aria-label={S.requiredAriaLabel}>
                    {" "}
                    *
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatBytes(value.size)}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive"
                onClick={clear}
                disabled={disabled}
                aria-label={`Remove ${value.name}`}
              >
                <X className="mr-1 size-3" /> {S.remove}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={pick}
              disabled={disabled}
              className="w-full space-y-1.5 py-1"
            >
              <Upload className="mx-auto size-5 text-muted-foreground" />
              <p className="text-[12px] font-medium">
                {label}
                {required && (
                  <span className="text-destructive" aria-label={S.requiredAriaLabel}>
                    {" "}
                    *
                  </span>
                )}
              </p>
            </button>
          )}
        </div>

        {fileInput}

        {error && (
          <Typography variant="helper" tone="danger" asChild>
            <p className="mt-1 text-center">{error}</p>
          </Typography>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={inputId}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive" aria-label={S.requiredAriaLabel}>*</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <Typography variant="body-strong" truncate>{value.name}</Typography>
            <Typography variant="helper" asChild><p>{formatBytes(value.size)}</p></Typography>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={clear}
            disabled={disabled}
            aria-label={`Remove ${value.name}`}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          id={inputId}
          onClick={pick}
          disabled={disabled}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors",
            !disabled && "hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Upload className="size-4" />
          <span>{S.chooseFile}</span>
        </button>
      )}

      {fileInput}

      {error ? (
        <Typography variant="helper" tone="danger" asChild><p>{error}</p></Typography>
      ) : helperText ? (
        <Typography variant="helper" asChild><p>{helperText}</p></Typography>
      ) : null}
    </div>
  )
}

export { DocumentUploadField, type DocumentUploadFieldProps }
