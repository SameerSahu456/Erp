import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'
import { useFormErrors } from '@/hooks/use-form-errors'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useResetUserPassword } from '@modules/users'
import { PasswordInput } from './PasswordInput'
import { RESET_PASSWORD_STRINGS as S } from './reset-password.strings'

const MIN_PASSWORD_LENGTH = 8

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

/**
 * Superadmin-only password reset. The acting admin types a new password; the
 * backend rotates the hash and bumps `password_changed_at`, which invalidates
 * every existing session for the target user (forces re-login). Visibility is
 * gated by `usePermission().isSuperuser` at the call site (UserManagementPage),
 * mirroring the backend's superuser-only gate on POST /users/{id}/reset-password.
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ResetPasswordDialogProps) {
  const resetMutation = useResetUserPassword(userId)
  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // The parent (UserManagementPage) conditionally mounts this dialog per target,
  // so local state starts blank on every open — no reset-on-close effect needed.
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  async function handleSubmit() {
    const e: Record<string, string> = {}
    if (!password) {
      e.password = S.validation.passwordRequired
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      e.password = S.validation.passwordTooShort(MIN_PASSWORD_LENGTH)
    }
    if (!e.password && confirm !== password) {
      e.confirm = S.validation.passwordsMismatch
    }
    if (Object.keys(e).length > 0) {
      setErrors(e)
      toast.error(S.toast.fixHighlighted)
      return
    }
    clearAll()

    try {
      await resetMutation.mutateAsync({ new_password: password })
      onOpenChange(false)
    } catch {
      // useResetUserPassword already toasts the error.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{S.dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Typography asChild variant="caption" tone="muted">
            <p>
              {S.descriptionBefore}<span className="font-medium">{userName}</span>{S.descriptionAfter}
            </p>
          </Typography>
          <div className="space-y-1.5">
            <Label htmlFor="reset-pwd">{S.newPasswordLabel}</Label>
            <PasswordInput
              id="reset-pwd"
              placeholder={S.newPasswordPlaceholder}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearError('password')
              }}
              aria-invalid={Boolean(errors.password)}
            />
            <FieldError message={errors.password} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-pwd-confirm">{S.confirmPasswordLabel}</Label>
            <PasswordInput
              id="reset-pwd-confirm"
              placeholder={S.confirmPasswordPlaceholder}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                clearError('confirm')
              }}
              aria-invalid={Boolean(errors.confirm)}
            />
            <FieldError message={errors.confirm} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resetMutation.isPending}
          >
            {S.cancelButton}
          </Button>
          <Button onClick={handleSubmit} disabled={resetMutation.isPending}>
            {resetMutation.isPending ? S.resetPendingButton : S.resetButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
