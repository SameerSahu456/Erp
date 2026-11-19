import { useRef } from "react"
import { FileText, Paperclip, Plus, Trash2, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { cn } from "@/lib/utils"

import type { SoAttachmentLinesController } from "../../../hooks/sales-orders/useSoAttachmentLines"
import {
  SO_ATTACHMENT_ALLOWED_MIMES,
  SO_ATTACHMENT_LABELS,
  SO_ATTACHMENT_LABEL_MAX_LEN,
  SO_ATTACHMENT_OTHERS,
  SO_ATTACHMENT_TYPES,
  type SoAttachmentType,
} from "../../../constants/so-attachments"
import { SoSectionHeader } from "./SoSectionHeader"
import { SO_ATTACHMENT_STRINGS as S } from "./so-attachments.strings"

const ACCEPT = SO_ATTACHMENT_ALLOWED_MIMES.join(",")

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Compact file picker sized to sit inline next to a Select.
 *
 * Deliberately not `FileUpload` — that's a drop-zone panel tall enough to
 * break the one-line row, and it prints the raw MIME allow-list as its hint.
 */
function FilePickerButton({
  onPick,
  disabled,
}: {
  onPick: (files: File[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          if (picked.length) onPick(picked)
          // Reset so picking the same file twice still fires onChange.
          e.target.value = ""
        }}
      />
      <Button
        type="button"
        variant="outline"
        // h-10 matches SelectTrigger's default height — without it the button
        // is shorter, and `items-end` on the row drags its label out of line
        // with "Type".
        className="h-10 w-full justify-start font-normal"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{S.section.choose}</span>
      </Button>
    </>
  )
}

/** One staged or already-uploaded file. */
function FileChip({
  name,
  size,
  onRemove,
  disabled,
  className,
}: {
  name: string
  size?: number
  onRemove: () => void
  disabled?: boolean
  /** Grid placement from the caller — the chip owns its looks, the list owns
   *  which column it lands in. */
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5",
        className,
      )}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      {/* min-w-0 is what makes `truncate` work in a flex row (§8.7) — without
          it the chip grows to the filename's width and blows the row out. */}
      <Typography
        variant="helper"
        truncate
        className="min-w-0 flex-1"
        title={name}
      >
        {name}
      </Typography>
      {size != null && (
        <Typography variant="caption" tone="muted" className="shrink-0">
          {formatBytes(size)}
        </Typography>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5 shrink-0"
        aria-label={S.section.removeFile}
        disabled={disabled}
        onClick={onRemove}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

/**
 * Repeatable attachment lines. Each line is a single row — type on the left,
 * file picker on the right, matching the Account/Contact field row above it —
 * with a free-text name field appearing inline when the type is "Others".
 * Picked files list underneath their own row.
 *
 * All state lives in `useSoAttachmentLines`; this only renders it.
 */
export function SoAttachmentsSection({
  controller,
  readOnly,
}: {
  controller: SoAttachmentLinesController
  readOnly?: boolean
}) {
  const {
    lines,
    errors,
    isUploading,
    takenTypes,
    addLine,
    updateLine,
    removeLine,
    addFiles,
    removeFile,
  } = controller

  const disabled = readOnly || isUploading

  return (
    <div className="space-y-4">
      <SoSectionHeader
        icon={<Paperclip className="size-4" />}
        tint="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        title={S.section.title}
        subtitle={S.section.subtitle}
      />

      {lines.length === 0 && (
        <Typography variant="helper" tone="muted">
          {S.section.empty}
        </Typography>
      )}

      <div className="space-y-4">
        {lines.map((line) => {
          const isOthers = line.documentType === SO_ATTACHMENT_OTHERS
          const files = [...line.uploaded, ...line.files]
          return (
            <div key={line.tempKey} className="space-y-2">
              {/* One row, equal columns: type + files split 50/50, becoming
                  three thirds once "Others" adds its name field. The remove
                  button sits outside the grid so it can't skew those columns.
                  `items-end` lines the controls up along their baseline while
                  the labels sit above. */}
              {/* items-start + the trash's own top offset keeps it level with
                  the controls, not with the labels above them. */}
              <div className="flex items-start gap-3">
                {/* 12-col grid: type 6 + files 6, becoming type 3 + name 3 +
                    files 6 for "Others". Files stays 6 either way, so the
                    picker keeps one width and lines up down the column no
                    matter which types are chosen.

                    items-start (not items-end): bottom-aligning made every
                    label sit at a different height the moment two controls
                    differed in height. Top-aligned, the labels always share a
                    line, and the controls line up because each is h-10. */}
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start">
                  <div
                    className={cn(
                      "min-w-0 space-y-1.5",
                      isOthers ? "sm:col-span-3" : "sm:col-span-6",
                    )}
                  >
                    <Label htmlFor={`att-type-${line.tempKey}`}>
                      {S.section.typeLabel}
                    </Label>
                    <Select
                      value={line.documentType}
                      disabled={disabled}
                      onValueChange={(v) => {
                        // Base UI types the value as nullable, but `clearable`
                        // is off so it can never arrive null — ignore anything
                        // falsy rather than writing it into the line.
                        if (!v) return
                        updateLine(line.tempKey, {
                          documentType: v as SoAttachmentType,
                          // Drop a stale name when moving off Others so it
                          // can't resurface if the user switches back.
                          ...(v === SO_ATTACHMENT_OTHERS
                            ? {}
                            : { otherLabel: "" }),
                        })
                      }}
                    >
                      {/* clearable={false}: the × would re-open the "no type"
                          state the user just left, and Remove already drops the
                          whole line. */}
                      <SelectTrigger
                        id={`att-type-${line.tempKey}`}
                        className="w-full"
                        clearable={false}
                      >
                        {/* Base UI renders the raw value ("po_upload") unless
                            given a mapper — show the human label instead, and
                            the placeholder while the line is still untyped. */}
                        <SelectValue>
                          {(v: SoAttachmentType | null) =>
                            v ? (
                              SO_ATTACHMENT_LABELS[v]
                            ) : (
                              <span className="text-muted-foreground">
                                {S.section.typePlaceholder}
                              </span>
                            )
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SO_ATTACHMENT_TYPES.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            // A type another line already claims is greyed out:
                            // one line holds many files, so a second row of the
                            // same type is never the right move — add the files
                            // to the existing row. Never disable this line's OWN
                            // current type (it'd grey out the selected value),
                            // and never `others` (free-text, repeatable by name).
                            disabled={
                              t !== line.documentType &&
                              t !== SO_ATTACHMENT_OTHERS &&
                              takenTypes.has(t)
                            }
                          >
                            {SO_ATTACHMENT_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isOthers && (
                    <div className="min-w-0 space-y-1.5 sm:col-span-3">
                      <Label htmlFor={`att-label-${line.tempKey}`}>
                        {S.section.otherLabelField}
                      </Label>
                      <Input
                        id={`att-label-${line.tempKey}`}
                        value={line.otherLabel}
                        maxLength={SO_ATTACHMENT_LABEL_MAX_LEN}
                        placeholder={S.section.otherLabelPlaceholder}
                        disabled={disabled}
                        onChange={(e) =>
                          updateLine(line.tempKey, {
                            otherLabel: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1.5 sm:col-span-6">
                    <Label>{S.section.filesLabel}</Label>
                    <FilePickerButton
                      disabled={disabled}
                      onPick={(picked) => void addFiles(line.tempKey, picked)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={S.section.removeLine}
                  // mt-[26px] ≈ the label line (h-5) + its 1.5 gap, dropping
                  // the trash onto the control row instead of the label row.
                  className="mt-[26px] shrink-0 text-muted-foreground"
                  disabled={disabled}
                  onClick={() => void removeLine(line.tempKey)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {files.length > 0 && (
                // The chip list mirrors the control row above it EXACTLY: same
                // `flex items-start gap-3` frame, same 12-col grid, same `gap-4`
                // column gutter, and a spacer standing in for the remove button.
                //
                // On its own full-width `sm:grid-cols-2` grid the chips were
                // measured against a different box than the controls — they ran
                // under the trash button (which sits outside the control grid)
                // and split on a `gap-1.5` gutter instead of `gap-4`. Both
                // columns of chips ended up wider than the Select and the file
                // picker they belong to, so no chip edge lined up with the
                // control above it. Reusing the same frame is what keeps them
                // aligned; a hand-tuned width here would drift the next time the
                // row changes.
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-12">
                    {line.uploaded.map((a) => (
                      <FileChip
                        key={a.id}
                        name={a.document_name}
                        size={a.size_bytes}
                        disabled={disabled}
                        className="min-w-0 sm:col-span-6"
                        onRemove={() => void removeFile(line.tempKey, a)}
                      />
                    ))}
                    {line.files.map((f, i) => (
                      <FileChip
                        key={`${f.name}-${i}`}
                        name={f.name}
                        size={f.size}
                        disabled={disabled}
                        className="min-w-0 sm:col-span-6"
                        onRemove={() => void removeFile(line.tempKey, f)}
                      />
                    ))}
                  </div>
                  {/* Stands in for the remove button so the chips stop where the
                      controls stop. w-[34px] === Button size="icon"
                      (`size-[34px]`, button.tsx) — keep the two in step. */}
                  <div aria-hidden className="w-[34px] shrink-0" />
                </div>
              )}

              <FieldError
                id={`att-error-${line.tempKey}`}
                message={errors.lines[line.tempKey]}
              />
            </div>
          )
        })}
      </div>

      <FieldError id="so-attachments-error" message={errors.section} />

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={addLine}
        >
          <Plus className="mr-1.5 size-3.5" />
          {isUploading ? S.section.uploading : S.section.addLine}
        </Button>
        <Typography variant="caption" tone="muted">
          {S.section.hint}
        </Typography>
      </div>
    </div>
  )
}
