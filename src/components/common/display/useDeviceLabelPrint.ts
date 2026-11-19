/**
 * Fetch a device's barcode label as a PDF and show it to print.
 *
 * Printing the label as HTML/SVG straight to the printer came out BLANK on the
 * floor's Zebra, so the button now fetches the backend's print-ready PDF (the
 * 50x25mm label) and hands back an object URL to EMBED. Chrome's PDF viewer
 * carries its own Print / Save buttons, and embedding is the one delivery the
 * browser never blocks (a popup, an auto-download and a hidden-iframe PDF print
 * all fail silently). For a 1:1 label, print at Actual size (100%) with the
 * paper set to the label size in the printer driver.
 *
 * The PDF has to be fetched as a blob through the authenticated client: the
 * token is an Authorization header, so a plain link / new tab to the endpoint
 * would arrive unauthenticated and 401.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { apiClient } from '@shared/api/client'
import { endpoints } from '@shared/api/endpoints'

import { BARCODE_TEXT_STRINGS as S } from './barcode-text.strings'

export interface DeviceLabelPrintApi {
  isPrinting: boolean
  /** Object URL of the generated PDF; null when no preview is open. */
  previewUrl: string | null
  dismissPreview: () => void
  print: (stockItemId: string) => Promise<void>
}

export function useDeviceLabelPrint(): DeviceLabelPrintApi {
  const [isPrinting, setIsPrinting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Creating / revoking an object URL is a side effect; keep it in a ref so
  // StrictMode's double-run can't leak one or revoke the live one.
  const urlRef = useRef<string | null>(null)
  const release = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])
  // Leaving the page with a preview open must not strand its blob.
  useEffect(() => release, [release])

  const dismissPreview = useCallback(() => {
    release()
    setPreviewUrl(null)
  }, [release])

  const print = useCallback(
    async (stockItemId: string) => {
      setIsPrinting(true)
      try {
        const { blob } = await apiClient.postBlob(endpoints.wms.deviceLabel(stockItemId), {})
        release() // drop the previous label's blob before replacing it
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setPreviewUrl(url)
      } catch {
        toast.error(S.printFailed)
      } finally {
        setIsPrinting(false)
      }
    },
    [release],
  )

  return { isPrinting, previewUrl, dismissPreview, print }
}
