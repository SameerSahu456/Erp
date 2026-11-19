import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { QC_GRADE_OPTIONS } from '../../hooks/qc/useQcComplete'
import { QC_STRINGS } from './qc.strings'

const S = QC_STRINGS.completeDialog

interface QcGradeFieldProps {
  value: string
  onChange: (grade: string) => void
}

/** The pass-tier grade picker on the Complete-QC form (required on a pass). */
export function QcGradeField({ value, onChange }: QcGradeFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="qc-complete-grade" required>
        {S.gradeLabel}
      </Label>
      <Select value={value} onValueChange={(val) => onChange(val ?? '')}>
        {/* Required on a pass — flag the empty state so it reads as the one
            field still holding the operator up (§3/§9). */}
        <SelectTrigger id="qc-complete-grade" aria-invalid={!value} className="w-full">
          {/* Show "Grade A", not the raw "A" value (PAGE-UI §7.2). */}
          <SelectValue placeholder={S.gradePlaceholder}>
            {value ? S.gradeOption(value) : S.gradePlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {QC_GRADE_OPTIONS.map((g) => (
            <SelectItem key={g} value={g}>
              {S.gradeOption(g)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
