/** Line status filter: shows labels, sends raw values (§18). */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { WorkAssignmentLineState } from '../../api/work-assignments'
import { WORK_ASSIGNMENT_LINE_STATE_LABEL } from '../../constants/work-assignment-status'

import { WORK_ASSIGNMENT_LINE_STATE_OPTIONS } from './work-assignment-line.columns'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface WorkAssignmentLineStateFilterProps {
  value: string | undefined
  onChange: (next: string) => void
}

export function WorkAssignmentLineStateFilter({
  value: v,
  onChange,
}: WorkAssignmentLineStateFilterProps) {
  const hasValue = v != null && v !== '__all__' && v !== ''
  return (
    <Select value={v ?? '__all__'} onValueChange={(next) => onChange(next ?? '__all__')}>
      <SelectTrigger
        className="w-[160px]"
        clearable={hasValue}
        onClear={() => onChange('__all__')}
      >
        <SelectValue>
          {hasValue
            ? WORK_ASSIGNMENT_LINE_STATE_LABEL[v as WorkAssignmentLineState] ?? v
            : S.detail.statusFilterAll}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{S.detail.statusFilterAll}</SelectItem>
        {WORK_ASSIGNMENT_LINE_STATE_OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {WORK_ASSIGNMENT_LINE_STATE_LABEL[opt]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
