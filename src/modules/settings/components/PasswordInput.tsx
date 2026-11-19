import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { RESET_PASSWORD_STRINGS as S } from './reset-password.strings'

// Password field with a show / hide toggle (the same eye pattern as the login
// form). Visibility is local to each field, so "New" and "Confirm" can be
// revealed independently. The toggle is a real <button> (keyboard-reachable,
// `aria-pressed`) and `type="button"` so it never submits the form.
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-10', className)} />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        disabled={props.disabled}
        aria-label={visible ? S.hidePassword : S.showPassword}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
