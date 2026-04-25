import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageOff, Upload, Video, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface MediaItem {
  id: string
  type: 'image' | 'video'
  src: string
  name: string
}

interface MediaGalleryProps {
  items: MediaItem[]
  onChange: (items: MediaItem[]) => void
  className?: string
  /** Hide the upload dropzone (read-only gallery). */
  disableUpload?: boolean
}

const isPreviewable = (src: string): boolean =>
  src.startsWith('blob:') || src.startsWith('data:') || /^https?:\/\//i.test(src)

let nextId = 0
const genId = () => `media-${Date.now()}-${nextId++}`

function MediaGallery({ items, onChange, className, disableUpload }: MediaGalleryProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ownedUrls = useRef<Set<string>>(new Set())

  // Revoke any object URLs we created when the component unmounts.
  useEffect(() => {
    const owned = ownedUrls.current
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url))
      owned.clear()
    }
  }, [])

  const addFiles = useCallback(
    (fileList: FileList) => {
      const additions: MediaItem[] = []
      Array.from(fileList).forEach((file) => {
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        if (!isImage && !isVideo) return
        const src = URL.createObjectURL(file)
        ownedUrls.current.add(src)
        additions.push({
          id: genId(),
          type: isImage ? 'image' : 'video',
          src,
          name: file.name,
        })
      })
      if (additions.length > 0) onChange([...items, ...additions])
    },
    [items, onChange],
  )

  const handleRemove = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id)
      if (target && ownedUrls.current.has(target.src)) {
        URL.revokeObjectURL(target.src)
        ownedUrls.current.delete(target.src)
      }
      onChange(items.filter((i) => i.id !== id))
    },
    [items, onChange],
  )

  const handleDragOver = (e: React.DragEvent) => {
    if (disableUpload) return
    e.preventDefault()
    if (!isDragOver) setIsDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    if (disableUpload) return
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted"
              title={item.name}
            >
              {item.type === 'image' && isPreviewable(item.src) ? (
                <img
                  src={item.src}
                  alt={item.name}
                  className="size-full object-cover"
                />
              ) : item.type === 'video' && isPreviewable(item.src) ? (
                <video src={item.src} className="size-full object-cover" muted />
              ) : item.type === 'video' ? (
                <Video className="size-7 text-muted-foreground" />
              ) : (
                <ImageOff className="size-7 text-muted-foreground" />
              )}
              {!disableUpload && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disableUpload && (
        <>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
          >
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Drop images or videos, or click to upload</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, MP4, WebM</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFiles(e.target.files)
                e.target.value = ''
              }
            }}
          />
        </>
      )}

      {items.length === 0 && disableUpload && (
        <p className="text-xs text-muted-foreground">No media</p>
      )}
    </div>
  )
}

export { MediaGallery }
