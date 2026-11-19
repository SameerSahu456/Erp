/**
 * Printing labels from the browser.
 *
 * Two constraints, and they pull against each other:
 *
 * 1. **You cannot navigate to the label URL.** The auth token is an
 *    Authorization HEADER, not a cookie, so a link, a new tab or an iframe
 *    `src` pointed at the endpoint arrives unauthenticated and renders a 401.
 *    The PDF has to be fetched as a blob through the authenticated client.
 *
 * 2. **You cannot `contentWindow.print()` a PDF in a hidden iframe.** Chrome
 *    hands PDFs to its built-in viewer plugin, which does not expose the
 *    frame's print machinery — the call silently does nothing. `BarcodeText`
 *    gets away with that shape only because it prints *HTML*; copying it for a
 *    PDF is why this was broken.
 *
 * So: fetch the blob (constraint 1) and hand back an object URL for the caller
 * to EMBED (constraint 2).
 *
 * Three delivery mechanisms were tried and all three are at the browser's
 * discretion, each failing silently:
 *   - a hidden iframe — Chrome's PDF viewer ignores contentWindow.print();
 *   - a popup tab — blocked, and the blank tab reads as the page refreshing;
 *   - a programmatic download — blocked as an "automatic download" once the
 *     click's user gesture has expired across the await.
 *
 * Embedding cannot be blocked, and it is the only one where the operator can
 * SEE that something happened. The dialog's own Download button is a direct
 * anchor click, which is a live gesture and therefore always allowed.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  printAssignmentLabels,
  type LabelPrintResult,
} from '../../api/work-assignments'
import { USE_PRINT_LABELS_STRINGS as S } from './use-print-labels.strings'

/** The generated PDF, ready to embed. Null until a run produces one. */
export interface LabelPreview {
  url: string
  count: number
  filename: string
}

export interface PrintLabelsApi {
  isPrinting: boolean
  /** Non-null when there is a PDF to show. */
  preview: LabelPreview | null
  dismissPreview: () => void
  printAssignment: (
    id: string,
    opts?: { includeLabelled?: boolean; lineIds?: string[] },
  ) => Promise<void>
}

export function usePrintLabels(): PrintLabelsApi {
  const [isPrinting, setIsPrinting] = useState(false)
  const [preview, setPreview] = useState<LabelPreview | null>(null)

  // Kept in a ref, not state: creating/revoking a URL is a side effect (StrictMode double-runs updaters).
  const urlRef = useRef<string | null>(null)
  const release = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])
  // Leaving the page with a preview open must not strand its blob.
  useEffect(() => release, [release])

  const show = useCallback(
    (blob: Blob, filename: string, count: number) => {
      // Release the previous PDF before replacing it, or every reprint leaks
      // a blob for the lifetime of the tab.
      release()
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setPreview({ url, count, filename })
    },
    [release],
  )

  const dismissPreview = useCallback(() => {
    release()
    setPreview(null)
  }, [release])

  const run = useCallback(
    async (
      fn: (includeLabelled: boolean) => Promise<LabelPrintResult>,
      filename: string,
    ) => {
      setIsPrinting(true)
      try {
        // Skip devices that already carry a label.
        //
        // This flipped with the unification work. Printing everything was right
        // while a lot WAS one issue — clicking the button meant "label the 100
        // machines I just handed over", and a second sticker was the operator's
        // call. A lot now accumulates: a second batch to the same engineer joins
        // their open lot (spec §5.2), so printing everything would spit 140
        // labels when 40 devices were added, and stick duplicates on machines
        // already labelled. Two identical serials on a floor makes the device
        // history fiction, which is the exact failure D22 exists to prevent.
        //
        // A deliberate reprint still works — it goes through the per-line
        // selection, which passes its own intent.
        const result = await fn(false)
        if (result.printed > 0) show(result.blob, filename, result.printed)
        // Zero printed means every device in scope is already labelled, or the
        // lot has none to label (empty / all withdrawn). Either way there is
        // nothing to print — a plain note, no reprint affordance.
        else toast.info(S.nothingToPrint)
      } catch {
        toast.error(S.failed)
      } finally {
        setIsPrinting(false)
      }
    },
    [show],
  )

  return {
    isPrinting,
    preview,
    dismissPreview,
    printAssignment: (id, opts) =>
      run(
        (includeLabelled) =>
          printAssignmentLabels(id, {
            // A per-line selection IS a deliberate reprint: lines the operator
            // ticked print even when already labelled.
            includeLabelled: opts?.includeLabelled ?? (opts?.lineIds ? true : includeLabelled),
            lineIds: opts?.lineIds,
          }),
        S.fileName.lot(id),
      ),
  }
}
