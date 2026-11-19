/** Stage filter: shows labels, sends raw enum values (§18 / §7.2). */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface WorkAssignmentStageFilterProps {
  value: string | undefined
  onChange: (next: string) => void
  stageValues: string[]
  stageLabel: (key: string) => string
}

export function WorkAssignmentStageFilter({
  value: v,
  onChange,
  stageValues,
  stageLabel,
}: WorkAssignmentStageFilterProps) {
  const hasValue = v != null && v !== '__all__' && v !== ''
  return (
    <Select value={v ?? '__all__'} onValueChange={(next) => onChange(next ?? '__all__')}>
      <SelectTrigger
        className="w-[160px]"
        clearable={hasValue}
        onClear={() => onChange('__all__')}
      >
        <SelectValue>{hasValue ? stageLabel(v) : S.list.stageFilterAll}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{S.list.stageFilterAll}</SelectItem>
        {stageValues.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {stageLabel(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
