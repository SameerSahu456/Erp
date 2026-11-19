import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StageCompleteFooterProps {
  cancelLabel: string
  submitLabel: string
  /** Optional leading icon on the submit button (after the spinner). */
  submitIcon?: ReactNode
  onCancel: () => void
  onSubmit: () => void
  disabled: boolean
  pending: boolean
  /** The single unmet condition keeping Complete disabled — surfaced in a
   *  tooltip so the operator knows exactly what's missing (§0.9/§9). */
  blockReason: string | null
}

/** Cancel + submit footer with a why-disabled tooltip, shared by the stage-
 *  complete dialogs and the rack-assign dialog. */
export function StageCompleteFooter({
  cancelLabel,
  submitLabel,
  submitIcon,
  onCancel,
  onSubmit,
  disabled,
  pending,
  blockReason,
}: StageCompleteFooterProps) {
  return (
    <>
      <Button variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button onClick={onSubmit} disabled={disabled}>
              {pending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
              {submitIcon}
              {submitLabel}
            </Button>
          </TooltipTrigger>
          {blockReason && !pending && <TooltipContent>{blockReason}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </>
  )
}
