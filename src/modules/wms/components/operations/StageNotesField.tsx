import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface StageNotesFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

/** The free-text notes field at the foot of every stage-complete dialog. */
export function StageNotesField({ id, label, placeholder, value, onChange }: StageNotesFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
