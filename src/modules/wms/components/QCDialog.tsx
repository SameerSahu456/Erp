import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check, X, Minus, ChevronDown, ChevronRight, Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

import {
  INSPECTION_CHECKLIST_ITEMS,
  type Device,
  type InspectionResult,
} from '../types'

type ChecklistState = Record<string, { result: InspectionResult; notes: string }>

const CHECKLIST_GROUPS = INSPECTION_CHECKLIST_ITEMS.reduce<
  Record<string, (typeof INSPECTION_CHECKLIST_ITEMS)[number][]>
>((acc, item) => {
  const group = item.group
  if (!acc[group]) acc[group] = []
  acc[group].push(item)
  return acc
}, {})

const GROUP_ORDER = ['Panels', 'Display', 'Input', 'Audio', 'Power', 'Hardware', 'Ports']
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

export interface QCDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: Device | null
  onSubmit?: (result: {
    result: 'PASSED' | 'FAILED'
    grade?: 'A' | 'B'
    notes: string
    checklist: ChecklistState
    attachments: File[]
  }) => void
}

export function QCDialog({ open, onOpenChange, device, onSubmit }: QCDialogProps) {
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [qcResult, setQcResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [grade, setGrade] = useState<'A' | 'B' | ''>('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])

  useEffect(() => {
    if (open) {
      setChecklist({})
      setCollapsedGroups({})
      setQcResult(null)
      setGrade('')
      setAdditionalNotes('')
      setAttachments([])
    }
  }, [open, device?.id])

  const checkedCount = Object.keys(checklist).length
  const passCount = Object.values(checklist).filter((i) => i.result === 'PASS').length
  const failCount = Object.values(checklist).filter((i) => i.result === 'FAIL').length
  const naCount = Object.values(checklist).filter((i) => i.result === 'NOT_APPLICABLE').length

  const handleChecklistChange = (itemId: string, result: InspectionResult) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { result, notes: prev[itemId]?.notes ?? '' },
    }))
  }

  const handleChecklistNotes = (itemId: string, notes: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], result: prev[itemId]?.result ?? 'FAIL', notes },
    }))
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const handleAttachmentUpload = (files: FileList | null) => {
    if (!files) return
    const valid: File[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" exceeds 5 MB limit.`)
        continue
      }
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext ?? '')) {
        toast.error(`"${file.name}" is not a supported file type (jpg, png, pdf only).`)
        continue
      }
      valid.push(file)
    }
    setAttachments((prev) => [...prev, ...valid])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (checkedCount < INSPECTION_CHECKLIST_ITEMS.length) {
      toast.error('Please complete all checklist items.')
      return
    }
    if (!qcResult) {
      toast.error('Please select a QC result (Pass/Fail).')
      return
    }
    if (qcResult === 'PASSED' && !grade) {
      toast.error('Please select a grade.')
      return
    }

    onSubmit?.({
      result: qcResult,
      grade: grade ? (grade as 'A' | 'B') : undefined,
      notes: additionalNotes,
      checklist,
      attachments,
    })

    toast.success(
      qcResult === 'PASSED'
        ? `Inward QC passed for ${device?.barcode} - Grade ${grade} (${grade === 'A' ? 'Excellent' : 'Good'}) — ready for rack assignment`
        : `Inward QC failed for ${device?.barcode} - sent back to repair`,
    )
    onOpenChange(false)
  }

  const dialogTitle = `Inward QC: ${device?.barcode ?? ''}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">{dialogTitle}</DialogTitle>
            {device && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
                <span>
                  <span className="font-medium text-foreground">Model:</span> {device.model}
                </span>
                <span>
                  <span className="font-medium text-foreground">Brand:</span> {device.brand}
                </span>
                <span>
                  <span className="font-medium text-foreground">Serial:</span> {device.serialNumber}
                </span>
                {device.biosNo && (
                  <span>
                    <span className="font-medium text-foreground">BIOS:</span> {device.biosNo}
                  </span>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex-1">
              <Progress
                value={
                  INSPECTION_CHECKLIST_ITEMS.length > 0
                    ? Math.round((checkedCount / INSPECTION_CHECKLIST_ITEMS.length) * 100)
                    : 0
                }
              >
                <ProgressLabel className="sr-only">Progress</ProgressLabel>
                <ProgressValue className="sr-only" />
              </Progress>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <span className="font-medium">
                {checkedCount}/{INSPECTION_CHECKLIST_ITEMS.length}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                {passCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-destructive" />
                {failCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-muted-foreground" />
                {naCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {GROUP_ORDER.map((group) => {
            const items = CHECKLIST_GROUPS[group]
            if (!items) return null
            const isCollapsed = collapsedGroups[group] ?? false
            const groupChecked = items.filter((i) => checklist[i.id]).length
            const groupPassed = items.filter((i) => checklist[i.id]?.result === 'PASS').length
            const groupFailed = items.filter((i) => checklist[i.id]?.result === 'FAIL').length
            return (
              <Collapsible key={group} open={!isCollapsed}>
                <CollapsibleTrigger
                  className="flex w-full items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => toggleGroup(group)}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-semibold">{group}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {groupPassed > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {groupPassed} pass
                      </span>
                    )}
                    {groupFailed > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                        {groupFailed} fail
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {groupChecked}/{items.length}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1.5 pt-2">
                    {items.map((item) => {
                      const state = checklist[item.id]
                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border transition-colors ${
                            state?.result === 'PASS'
                              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
                              : state?.result === 'FAIL'
                                ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'
                                : 'bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <p className="text-sm font-medium min-w-0 flex-1">{item.label}</p>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                size="xs"
                                variant="outline"
                                className={
                                  state?.result === 'PASS'
                                    ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                                    : 'border-muted-foreground/20 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-950'
                                }
                                onClick={() => handleChecklistChange(item.id, 'PASS')}
                              >
                                <Check className="size-3.5" /> Pass
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                className={
                                  state?.result === 'FAIL'
                                    ? 'border-destructive bg-destructive text-white hover:bg-destructive/90'
                                    : 'border-muted-foreground/20 text-[#f1416c] hover:border-[#f1416c]/60 hover:bg-[#fff5f8] dark:text-[#f1416c] dark:hover:bg-red-950'
                                }
                                onClick={() => handleChecklistChange(item.id, 'FAIL')}
                              >
                                <X className="size-3.5" /> Fail
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                className={
                                  state?.result === 'NOT_APPLICABLE'
                                    ? 'border-muted-foreground/50 bg-muted text-muted-foreground'
                                    : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted'
                                }
                                onClick={() => handleChecklistChange(item.id, 'NOT_APPLICABLE')}
                              >
                                <Minus className="size-3.5" /> N/A
                              </Button>
                            </div>
                          </div>
                          {state?.result === 'FAIL' && (
                            <div className="border-t px-3 py-2">
                              <Input
                                placeholder="Describe the issue..."
                                value={state.notes}
                                onChange={(e) => handleChecklistNotes(item.id, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}

          <div className="space-y-3 rounded-lg border p-4">
            <Label className="text-sm font-semibold">QC Result</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={qcResult === 'PASSED' ? 'default' : 'outline'}
                className={qcResult === 'PASSED' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                onClick={() => setQcResult('PASSED')}
              >
                <Check className="size-4" /> Pass
              </Button>
              <Button
                size="sm"
                variant={qcResult === 'FAILED' ? 'default' : 'outline'}
                className={qcResult === 'FAILED' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
                onClick={() => {
                  setQcResult('FAILED')
                  setGrade('')
                }}
              >
                <X className="size-4" /> Fail
              </Button>
            </div>
          </div>

          {qcResult === 'PASSED' && (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4">
              <Label className="text-sm font-semibold">Grade</Label>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant={grade === 'A' ? 'default' : 'outline'}
                  className={grade === 'A' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                  onClick={() => setGrade('A')}
                >
                  Grade A - Excellent
                </Button>
                <Button
                  size="sm"
                  variant={grade === 'B' ? 'default' : 'outline'}
                  className={grade === 'B' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  onClick={() => setGrade('B')}
                >
                  Grade B - Good
                </Button>
              </div>
            </div>
          )}

          {qcResult === 'FAILED' && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Device will be sent back to repair. Current inward QC fail count:{' '}
                <span className="font-bold">{device?.qcFailCount ?? 0}</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="qc-notes">Additional Notes</Label>
            <Textarea
              id="qc-notes"
              placeholder="Additional observations, comments..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Attachments</Label>
            <p className="text-xs text-muted-foreground">JPG, PNG, or PDF files (max 5 MB each)</p>
            <div className="space-y-1.5">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    className="text-destructive hover:text-destructive/80 shrink-0"
                    onClick={() => removeAttachment(idx)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAttachmentUpload(e.target.files)}
                />
                <Paperclip className="size-3.5" />
                Add Attachment
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit QC Result</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QCDialog
