import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { Attachment } from "@shared/api/attachments"
import {
  deleteAttachment as deleteAttachmentApi,
  uploadAttachment as uploadAttachmentApi,
} from "@shared/api/attachments"
import { useAttachments } from "@shared/hooks/useAttachments"

import type { SalesOrderAttachmentUpload } from "../../api/sales-orders"
import {
  SO_ATTACHMENT_LABELS,
  SO_ATTACHMENT_LABEL_MAX_LEN,
  SO_ATTACHMENT_MAX_BYTES,
  SO_ATTACHMENT_MAX_COUNT,
  SO_ATTACHMENT_OTHERS,
  type SoAttachmentType,
} from "../../constants/so-attachments"
import { SO_ATTACHMENT_STRINGS as S } from "../../components/sales-orders/form/so-attachments.strings"

// One row of the Attachments section: a type on the left, its files on the
// right. `files` are client-side picks not yet on the server; `uploaded` are
// rows that already exist (edit mode). A line can hold both — the user adds
// files to an existing type without losing what's there.
export interface SoAttachmentLine {
  tempKey: string
  /**
   * `null` until the user picks one. A blank line opens unset rather than
   * pre-filled: a default is right only by luck, and a wrong one is worse
   * than no answer — it has to be noticed before it can be corrected.
   */
  documentType: SoAttachmentType | null
  /** Free-text name; only meaningful when documentType === 'others'. */
  otherLabel: string
  files: File[]
  uploaded: Attachment[]
}

export interface SoAttachmentLineErrors {
  /** Keyed by tempKey → message. Rendered under the offending line. */
  lines: Record<string, string>
  /** Section-level message (e.g. over the total-count cap). */
  section?: string
}

function nextKey(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyAttachmentLine(): SoAttachmentLine {
  return {
    tempKey: nextKey(),
    documentType: null,
    otherLabel: "",
    files: [],
    uploaded: [],
  }
}

/**
 * Attachment line-item state for the SO form and the Closed Won wizard.
 *
 * Two modes, chosen by whether the SO exists yet:
 *
 * - **create** (`salesOrderId` undefined) — files are staged in memory and
 *   handed to `createSalesOrder` as multipart parts, so they commit inside the
 *   SO's own transaction. `buildUploads()` produces that list.
 * - **edit** (`salesOrderId` set) — the SO already exists, so picks upload
 *   immediately against it and removals delete immediately. `buildUploads()`
 *   returns [] because nothing is pending.
 *
 * Both the SO form (`useSalesOrderForm`) and Closed Won (`useClosedWonWizard`)
 * create sales orders independently; this hook is where that shared behaviour
 * lives so it isn't written — or fixed — twice.
 */
export function useSoAttachmentLines(salesOrderId?: string) {
  const isEdit = !!salesOrderId
  // Open on one blank line so attaching a file is a pick, not a click-then-pick.
  // Costs nothing if unused: `validate` ignores fileless lines and
  // `buildUploads` emits nothing for them.
  const [lines, setLines] = useState<SoAttachmentLine[]>(() => [
    emptyAttachmentLine(),
  ])
  const [errors, setErrors] = useState<SoAttachmentLineErrors>({ lines: {} })
  const [isUploading, setIsUploading] = useState(false)

  const existing = useAttachments("crm_sales_order", salesOrderId ?? "", {
    enabled: isEdit,
  })

  // Hydrate edit mode from the server: one line per distinct type, with
  // `others` split by label so two different custom types stay separate rows.
  // Guarded by a ref rather than keyed on `existing.data` identity so a
  // background refetch can't clobber a line the user is mid-way through
  // adding.
  const hydratedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!isEdit || !existing.data) return
    if (hydratedFor.current === salesOrderId) return
    hydratedFor.current = salesOrderId ?? null

    const groups = new Map<string, SoAttachmentLine>()
    for (const a of existing.data) {
      const type = a.document_type as SoAttachmentType
      const label = a.document_label ?? ""
      const key = `${type}::${label}`
      const line = groups.get(key)
      if (line) {
        line.uploaded.push(a)
        continue
      }
      groups.set(key, {
        tempKey: nextKey(),
        documentType: type,
        otherLabel: label,
        files: [],
        uploaded: [a],
      })
    }
    // An SO with nothing attached hydrates to zero groups — fall back to the
    // same blank line create mode opens with, so the section is never a dead
    // end the user has to click "Add attachment" to escape.
    const hydrated = Array.from(groups.values())
    setLines(hydrated.length > 0 ? hydrated : [emptyAttachmentLine()])
  }, [isEdit, existing.data, salesOrderId])

  const totalCount = useMemo(
    () =>
      lines.reduce((sum, l) => sum + l.files.length + l.uploaded.length, 0),
    [lines],
  )

  /**
   * Types already claimed by a line, so the picker can grey them out.
   *
   * A line holds MANY files, so a second line of the same type is never
   * needed — the user should add their files to the existing row. `others` is
   * exempt: it's the free-text slot, and two `others` rows with different
   * names are distinct types (that's exactly how hydration splits them).
   */
  const takenTypes = useMemo(
    () =>
      new Set(
        lines
          .map((l) => l.documentType)
          .filter(
            (t): t is SoAttachmentType =>
              t !== null && t !== SO_ATTACHMENT_OTHERS,
          ),
      ),
    [lines],
  )

  /** Add a blank line. Its type is the user's to choose — see `documentType`. */
  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyAttachmentLine()])
  }, [])

  const updateLine = useCallback(
    (tempKey: string, patch: Partial<SoAttachmentLine>) => {
      setLines((prev) =>
        prev.map((l) => (l.tempKey === tempKey ? { ...l, ...patch } : l)),
      )
      setErrors((prev) => {
        if (!prev.lines[tempKey]) return prev
        const { [tempKey]: _dropped, ...rest } = prev.lines
        return { ...prev, lines: rest }
      })
    },
    [],
  )

  const removeLine = useCallback(
    async (tempKey: string) => {
      const line = lines.find((l) => l.tempKey === tempKey)
      // In edit mode the line's server rows must go too, or removing the row
      // would only hide files that are still attached to the SO.
      if (isEdit && line && line.uploaded.length > 0) {
        setIsUploading(true)
        try {
          for (const a of line.uploaded) await deleteAttachmentApi(a.id)
        } finally {
          setIsUploading(false)
          void existing.refetch()
        }
      }
      setLines((prev) => prev.filter((l) => l.tempKey !== tempKey))
    },
    [isEdit, lines, existing],
  )

  /** Remove one already-uploaded file (edit mode) or one staged File. */
  const removeFile = useCallback(
    async (tempKey: string, target: File | Attachment) => {
      if ("id" in target) {
        setIsUploading(true)
        try {
          await deleteAttachmentApi(target.id)
          setLines((prev) =>
            prev.map((l) =>
              l.tempKey === tempKey
                ? { ...l, uploaded: l.uploaded.filter((u) => u.id !== target.id) }
                : l,
            ),
          )
        } finally {
          setIsUploading(false)
          void existing.refetch()
        }
        return
      }
      setLines((prev) =>
        prev.map((l) =>
          l.tempKey === tempKey
            ? { ...l, files: l.files.filter((f) => f !== target) }
            : l,
        ),
      )
    },
    [existing],
  )

  /**
   * Accept newly picked files for a line.
   *
   * Edit mode uploads them straight away (the SO exists, so there's nothing to
   * stage against) and folds the resulting rows into `uploaded`. Create mode
   * just holds them.
   */
  const addFiles = useCallback(
    async (tempKey: string, picked: File[]) => {
      if (picked.length === 0) return
      const line = lines.find((l) => l.tempKey === tempKey)
      if (!line) return

      // Reject oversize here rather than via FileUpload's `maxSize`, which
      // filters them out silently — a file vanishing with no explanation
      // reads as a broken picker.
      const oversize = picked.find((f) => f.size > SO_ATTACHMENT_MAX_BYTES)
      if (oversize) {
        setErrors((prev) => ({
          ...prev,
          lines: {
            ...prev.lines,
            [tempKey]: S.errors.fileTooLarge(oversize.name),
          },
        }))
        return
      }

      if (!isEdit || !salesOrderId) {
        setLines((prev) =>
          prev.map((l) =>
            l.tempKey === tempKey ? { ...l, files: [...l.files, ...picked] } : l,
          ),
        )
        return
      }

      // Edit mode POSTs immediately, and `document_type` is required — so an
      // untyped line has nothing to upload against. Create mode stages happily
      // without one; `validate` is what holds the line to a type before save.
      const documentType = line.documentType
      if (!documentType) {
        setErrors((prev) => ({
          ...prev,
          lines: { ...prev.lines, [tempKey]: S.errors.typeRequired },
        }))
        return
      }

      const label = line.otherLabel.trim()
      if (documentType === SO_ATTACHMENT_OTHERS && !label) {
        setErrors((prev) => ({
          ...prev,
          lines: { ...prev.lines, [tempKey]: S.errors.labelRequired },
        }))
        return
      }

      setIsUploading(true)
      try {
        for (const file of picked) {
          const created = await uploadAttachmentApi({
            file,
            entity_type: "crm_sales_order",
            entity_id: salesOrderId,
            document_type: documentType,
            ...(documentType === SO_ATTACHMENT_OTHERS
              ? { document_label: label }
              : {}),
          })
          setLines((prev) =>
            prev.map((l) =>
              l.tempKey === tempKey
                ? { ...l, uploaded: [...l.uploaded, created] }
                : l,
            ),
          )
        }
      } finally {
        setIsUploading(false)
        void existing.refetch()
      }
    },
    [isEdit, salesOrderId, lines, existing],
  )

  /**
   * Validate the section. Lines with no files are ignored rather than flagged
   * — an empty row is a user who clicked "Add" and changed their mind, not an
   * error to block a save on. Returns true when the section is submittable.
   */
  const validate = useCallback((): boolean => {
    const lineErrors: Record<string, string> = {}
    let section: string | undefined

    // Duplicate detection. The FIRST line to claim a key keeps it; every later
    // one is flagged, so the error lands on the row the user just added rather
    // than on the one they filled in earlier. `others` is keyed by its
    // (case-insensitive) name — two `others` rows sharing a name would merge
    // into one on reload, since hydration groups by `type::label`.
    const seenKeys = new Set<string>()

    for (const line of lines) {
      const count = line.files.length + line.uploaded.length
      if (count === 0) continue
      // Files with no type: the one case a blank default line can produce, and
      // the SO can't be created with it — `document_type` is required server-side.
      const documentType = line.documentType
      if (!documentType) {
        lineErrors[line.tempKey] = S.errors.typeRequired
        continue
      }
      const isOthers = documentType === SO_ATTACHMENT_OTHERS
      const label = line.otherLabel.trim()
      if (isOthers && !label) {
        lineErrors[line.tempKey] = S.errors.labelRequired
        continue
      }
      if (label.length > SO_ATTACHMENT_LABEL_MAX_LEN) {
        lineErrors[line.tempKey] = S.errors.labelTooLong
        continue
      }
      const key = isOthers
        ? `${SO_ATTACHMENT_OTHERS}::${label.toLowerCase()}`
        : documentType
      if (seenKeys.has(key)) {
        lineErrors[line.tempKey] = isOthers
          ? S.errors.duplicateOtherLabel(label)
          : S.errors.duplicateType(SO_ATTACHMENT_LABELS[documentType])
        continue
      }
      seenKeys.add(key)
      const oversize = line.files.find((f) => f.size > SO_ATTACHMENT_MAX_BYTES)
      if (oversize) lineErrors[line.tempKey] = S.errors.fileTooLarge(oversize.name)
    }

    if (totalCount > SO_ATTACHMENT_MAX_COUNT) section = S.errors.tooManyFiles

    setErrors({ lines: lineErrors, section })
    return Object.keys(lineErrors).length === 0 && !section
  }, [lines, totalCount])

  /**
   * Flatten the staged lines into the (metadata, file) list `createSalesOrder`
   * turns into multipart parts. Empty in edit mode — those files are already
   * on the server.
   */
  const buildUploads = useCallback((): SalesOrderAttachmentUpload[] => {
    if (isEdit) return []
    return lines.flatMap((line) => {
      // Untyped lines carry no files past `validate`, so this only skips the
      // blank opening line — and keeps `document_type` non-null for the wire.
      const documentType = line.documentType
      if (!documentType) return []
      return line.files.map((file) => ({
        document_type: documentType,
        document_label:
          documentType === SO_ATTACHMENT_OTHERS ? line.otherLabel.trim() : null,
        file,
      }))
    })
  }, [isEdit, lines])

  /** Back to the opening state — one blank line, not an empty section. */
  const reset = useCallback(() => {
    setLines([emptyAttachmentLine()])
    setErrors({ lines: {} })
  }, [])

  return {
    lines,
    errors,
    isEdit,
    isUploading,
    isLoading: isEdit && existing.isLoading,
    isError: isEdit && existing.isError,
    totalCount,
    takenTypes,
    addLine,
    updateLine,
    removeLine,
    addFiles,
    removeFile,
    validate,
    buildUploads,
    reset,
  }
}

export type SoAttachmentLinesController = ReturnType<typeof useSoAttachmentLines>
