import { useState, type FormEvent } from "react"
import { ScanLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"

import { RENTAL_SCAN_STRINGS as S } from "./rental-scan.strings"
import type { RentalScanState } from "./useRentalScan"

type Props = Pick<RentalScanState, "addScan" | "scanning" | "scanError" | "clearScanError">

/** One box at a time: a scanner types the serial and sends Enter. The field
 *  clears and keeps focus after each accepted scan so the next box can go. */
export function RentalScanInput({ addScan, scanning, scanError, clearScanError }: Props) {
  const [value, setValue] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (await addScan(value)) setValue("")
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2">
      <Label htmlFor="rental-scan-input">{S.input.label}</Label>
      <div className="flex min-w-0 gap-2">
        <Input
          id="rental-scan-input"
          autoFocus
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (scanError) clearScanError()
          }}
          placeholder={S.input.placeholder}
          aria-invalid={!!scanError}
          className="min-w-0 flex-1 font-mono"
        />
        <Button type="submit" disabled={!value.trim() || scanning} className="shrink-0">
          <ScanLine className="size-4" data-icon="inline-start" />
          {S.input.add}
        </Button>
      </div>
      <FieldError message={scanError ?? undefined} />
    </form>
  )
}
