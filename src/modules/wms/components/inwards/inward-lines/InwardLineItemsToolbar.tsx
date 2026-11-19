import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { INWARDS_STRINGS } from '../inwards.strings'

interface InwardLineItemsToolbarProps {
  /** No pending PO lines → nothing to template or import against (§0.9 tooltip). */
  noPendingLines: boolean
  onDownloadTemplate: () => void
  onBulkFile: (file: File) => Promise<unknown> | void
}

/** Top bar: offline template + bulk import. */
export function InwardLineItemsToolbar({
  noPendingLines,
  onDownloadTemplate,
  onBulkFile,
}: InwardLineItemsToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center justify-end gap-2 border-b bg-muted/20 px-3 py-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onBulkFile(f)
          e.target.value = ''
        }}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button type="button" variant="outline" size="sm" onClick={onDownloadTemplate} disabled={noPendingLines}>
              <Download className="size-4" data-icon="inline-start" />
              {INWARDS_STRINGS.inwardLineItems.template}
            </Button>
          </TooltipTrigger>
          {noPendingLines && (
            <TooltipContent>{INWARDS_STRINGS.inwardLineItems.templateEmptyHint}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={noPendingLines}>
              <Upload className="size-4" data-icon="inline-start" />
              {INWARDS_STRINGS.inwardLineItems.bulkUpload}
            </Button>
          </TooltipTrigger>
          {noPendingLines && (
            <TooltipContent>{INWARDS_STRINGS.inwardLineItems.bulkUploadEmptyHint}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
