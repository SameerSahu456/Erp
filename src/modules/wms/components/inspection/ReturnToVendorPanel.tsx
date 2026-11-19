import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { INSPECTION_STRINGS } from './inspection.strings'

interface Props {
  visible: boolean
  onReturn: () => void
}

export function ReturnToVendorPanel({ visible, onReturn }: Props) {
  if (!visible) return null

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <Label>{INSPECTION_STRINGS.returnToVendor.label}</Label>
      <Typography variant="helper" tone="muted" asChild>
        <p>{INSPECTION_STRINGS.returnToVendor.description}</p>
      </Typography>
      <div>
        <Button type="button" size="sm" variant="outline" onClick={onReturn}>
          {INSPECTION_STRINGS.returnToVendor.button}
        </Button>
      </div>
    </div>
  )
}
