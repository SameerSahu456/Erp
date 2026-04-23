import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BarcodeTextProps {
  children: React.ReactNode
  model?: string
  serial?: string
  className?: string
}

function printBarcodeLabel(barcode: string, model?: string, serial?: string) {
  const win = window.open('', '_blank', 'width=400,height=300')
  if (!win) {
    toast.error('Please allow popups to print barcodes.')
    return
  }
  win.document.write(`
    <html>
      <head><title>Print Barcode</title></head>
      <body style="font-family: monospace; text-align: center; padding: 40px;">
        <div style="border: 2px solid #000; padding: 20px; display: inline-block;">
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${barcode}</div>
          ${model ? `<div style="font-size: 12px; margin-top: 8px; color: #555;">${model}</div>` : ''}
          ${serial ? `<div style="font-size: 11px; margin-top: 4px; color: #777;">S/N: ${serial}</div>` : ''}
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `)
  win.document.close()
}

export function BarcodeText({ children, model, serial, className }: BarcodeTextProps) {
  const barcode = typeof children === 'string' ? children : String(children)
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-xs font-medium">{children}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          printBarcodeLabel(barcode, model, serial)
        }}
        className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Print barcode"
        aria-label="Print barcode"
      >
        <Printer className="size-3.5" />
      </button>
    </span>
  )
}
