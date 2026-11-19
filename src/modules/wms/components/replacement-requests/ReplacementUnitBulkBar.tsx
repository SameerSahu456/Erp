import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"

import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import {
  DECISIONS,
  DECISION_LABEL,
  decisionPatch,
  type Decision,
} from "./replacement-unit-table-helpers"

const T = S.form.units.table

/** Bulk-set Send back + Issue reason on all ticked units; substitute + rate stay per row. */
export function ReplacementUnitBulkBar({
  pickedKeys,
  bulkReason,
  onBulkReasonChange,
  onPatchMany,
}: {
  pickedKeys: string[]
  bulkReason: string
  onBulkReasonChange: (next: string) => void
  onPatchMany: (driIds: string[], patch: Partial<ReplacementUnitSelection>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <Typography variant="caption" className="font-medium text-primary">
        {T.bulk.title(pickedKeys.length)}
      </Typography>
      <Select
        value={null}
        onValueChange={(v) =>
          v && onPatchMany(pickedKeys, decisionPatch(v as Decision))
        }
      >
        <SelectTrigger
          size="sm"
          className="w-44 bg-card"
          clearable={false}
          aria-label={T.bulk.decisionPlaceholder}
        >
          <SelectValue placeholder={T.bulk.decisionPlaceholder}>
            {T.bulk.decisionPlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DECISIONS.map((d) => (
            <SelectItem key={d} value={d}>
              {DECISION_LABEL[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
        <Input
          value={bulkReason}
          onChange={(e) => onBulkReasonChange(e.target.value)}
          placeholder={T.bulk.reasonPlaceholder}
          aria-label={T.bulk.reasonPlaceholder}
          className="h-8 min-w-0 flex-1 bg-card"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!bulkReason.trim()}
          onClick={() => {
            onPatchMany(pickedKeys, { issueReason: bulkReason.trim() })
            onBulkReasonChange("")
          }}
        >
          {T.bulk.apply}
        </Button>
      </div>
    </div>
  )
}
