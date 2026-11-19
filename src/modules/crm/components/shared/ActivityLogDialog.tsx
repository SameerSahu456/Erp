import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'

import {
  ACTIVITY_LOG_TYPES,
  ACTIVITY_OUTCOMES,
  type ActivityDirection,
  type ActivityLogType,
  type LogActivityInput,
} from '../../api'
import { DIRECTION_TYPES, TYPE_LABEL, humanize } from './activityFeedConfig'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

interface ActivityLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onSubmit: (payload: LogActivityInput) => void
}

// "Log Activity" dialog — owns its own form state. The parent supplies the
// mutation (`onSubmit`) and controls `open` (so it can close on success).
export function ActivityLogDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: ActivityLogDialogProps) {
  const [type, setType] = useState<ActivityLogType>('call')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [outcome, setOutcome] = useState<string>('')
  const [direction, setDirection] = useState<ActivityDirection | ''>('')

  // Reset the form whenever the dialog closes so the next open starts blank.
  useEffect(() => {
    if (!open) {
      setType('call')
      setTitle('')
      setDescription('')
      setOutcome('')
      setDirection('')
    }
  }, [open])

  function handleTypeChange(value: ActivityLogType) {
    setType(value)
    setOutcome('')
    if (!DIRECTION_TYPES.has(value)) setDirection('')
  }

  function handleSave() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const trimmedDescription = description.trim()
    onSubmit({
      activity_type: type,
      title: trimmedTitle,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      ...(outcome ? { outcome } : {}),
      ...(direction ? { direction } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-3.5" data-icon="inline-start" />
        {CRM_SHARED_STRINGS.activityLogDialog.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{CRM_SHARED_STRINGS.activityLogDialog.title}</DialogTitle>
          <DialogDescription>
            {CRM_SHARED_STRINGS.activityLogDialog.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Typography variant="body-strong" asChild>
              <label>{CRM_SHARED_STRINGS.activityLogDialog.typeLabel}</label>
            </Typography>
            <Select value={type} onValueChange={(val) => handleTypeChange(val as ActivityLogType)}>
              {/* Type is required (defaults to 'call'); never show the clear × —
                  clearing it to null crashes the ACTIVITY_OUTCOMES[type] lookups below. */}
              <SelectTrigger className="w-full" clearable={false}>
                {/* Base UI's SelectValue renders the raw value by default, so
                    map it back to the human label shown in the list. */}
                <SelectValue>
                  {(val) => (val ? TYPE_LABEL[val as ActivityLogType] : null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LOG_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Typography variant="body-strong" asChild>
              <label>{CRM_SHARED_STRINGS.activityLogDialog.titleLabel}</label>
            </Typography>
            <Input
              placeholder={CRM_SHARED_STRINGS.activityLogDialog.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Typography variant="body-strong" asChild>
              <label>{CRM_SHARED_STRINGS.activityLogDialog.descriptionLabel}</label>
            </Typography>
            <Textarea
              placeholder={CRM_SHARED_STRINGS.activityLogDialog.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {ACTIVITY_OUTCOMES[type].length > 0 && (
            <div className="space-y-1.5">
              <Typography variant="body-strong" asChild>
                <label>{CRM_SHARED_STRINGS.activityLogDialog.outcomeLabel}</label>
              </Typography>
              <Select value={outcome} onValueChange={(val) => setOutcome(val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={CRM_SHARED_STRINGS.activityLogDialog.outcomePlaceholder}
                  >
                    {(val) => (val ? humanize(val as string) : null)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OUTCOMES[type].map((o) => (
                    <SelectItem key={o} value={o}>
                      {humanize(o)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {DIRECTION_TYPES.has(type) && (
            <div className="space-y-1.5">
              <Typography variant="body-strong" asChild>
                <label>{CRM_SHARED_STRINGS.activityLogDialog.directionLabel}</label>
              </Typography>
              <Select
                value={direction}
                onValueChange={(val) => setDirection((val as ActivityDirection | null) ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={CRM_SHARED_STRINGS.activityLogDialog.directionPlaceholder}
                  >
                    {(val) =>
                      val === 'inbound'
                        ? CRM_SHARED_STRINGS.activityLogDialog.directionInbound
                        : val === 'outbound'
                          ? CRM_SHARED_STRINGS.activityLogDialog.directionOutbound
                          : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">
                    {CRM_SHARED_STRINGS.activityLogDialog.directionInbound}
                  </SelectItem>
                  <SelectItem value="outbound">
                    {CRM_SHARED_STRINGS.activityLogDialog.directionOutbound}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {CRM_SHARED_STRINGS.activityLogDialog.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isPending}>
            {isPending
              ? CRM_SHARED_STRINGS.activityLogDialog.saving
              : CRM_SHARED_STRINGS.activityLogDialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
