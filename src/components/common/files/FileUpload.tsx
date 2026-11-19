import { useCallback, useRef, useState } from "react"
import { Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"

import { FILE_UPLOAD_STRINGS as S } from './file-upload.strings'

interface FileUploadProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  value: File[]
  onChange: (files: File[]) => void
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// The `accept` prop is a comma-separated MIME list (e.g.
// "application/pdf,image/jpeg,image/png"). Turn it into a friendly, deduped
// label like "PDF, JPG, PNG" for hints and error messages.
function humanizeAccept(accept: string): string {
  const labels = accept
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((mime) => {
      if (mime === "image/jpeg") return "JPG"
      const sub = mime.split("/")[1] ?? mime
      if (sub === "*") return (mime.split("/")[0] ?? mime).toUpperCase()
      return sub.toUpperCase()
    })
  return [...new Set(labels)].join(", ")
}

// Does a file satisfy the `accept` allow-list? Mirrors the browser's own
// picker filtering so drag-and-drop is validated too (the native input only
// filters the click-to-pick dialog, not dropped files).
function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true
  const patterns = accept
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (patterns.length === 0) return true
  return patterns.some((p) => {
    if (p.endsWith("/*")) return file.type.startsWith(p.slice(0, -1))
    if (p.startsWith(".")) return file.name.toLowerCase().endsWith(p.toLowerCase())
    return file.type === p
  })
}

function FileUpload({
  accept,
  maxSize,
  multiple = false,
  value,
  onChange,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  // Client-side rejection messages (wrong type / too big), cleared on the next
  // selection. Surfaced inline below the drop zone.
  const [errors, setErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const accepted: File[] = []
      const rejected: string[] = []
      const acceptLabel = accept ? humanizeAccept(accept) : ""

      for (const file of Array.from(fileList)) {
        if (!matchesAccept(file, accept)) {
          rejected.push(S.errors.badType(file.name, acceptLabel))
        } else if (maxSize && file.size > maxSize) {
          rejected.push(
            S.errors.tooBig(file.name, formatFileSize(file.size), formatFileSize(maxSize)),
          )
        } else {
          accepted.push(file)
        }
      }

      setErrors(rejected)
      if (accepted.length === 0) return

      if (multiple) {
        onChange([...value, ...accepted])
      } else {
        onChange(accepted.slice(0, 1))
      }
    },
    [accept, maxSize, multiple, onChange, value]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!isDragOver) setIsDragOver(true)
    },
    [isDragOver]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [onChange, value]
  )

  const isImage = (file: File) => file.type.startsWith("image/")

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <Typography variant="body-strong">
          {S.dropzone.prompt}
        </Typography>
        <Typography variant="helper" asChild><p className="mt-1">
          {accept && S.dropzone.accepted(humanizeAccept(accept))}
          {accept && maxSize && " · "}
          {maxSize && S.dropzone.maxSize(formatFileSize(maxSize))}
        </p></Typography>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((msg, i) => (
            <li key={i}>
              <Typography variant="helper" tone="danger" asChild>
                <p>{msg}</p>
              </Typography>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border p-2"
            >
              {isImage(file) && (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="size-10 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <Typography variant="body-strong" truncate>{file.name}</Typography>
                <Typography variant="helper" asChild><p>
                  {formatFileSize(file.size)}
                </p></Typography>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { FileUpload, type FileUploadProps }
