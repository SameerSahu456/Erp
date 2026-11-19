import { useState } from "react"
import { Controller } from "react-hook-form"

import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import { useUserOptions, type UserListItem } from "@modules/users"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"

import {
  REPLACEMENT_PRIORITY_LABEL,
  type ReplacementPriority,
} from "../../constants/replacement-request-status"
import type { ReplacementRequestFormState } from "../../hooks/replacement-requests/useReplacementRequestForm"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { PRIORITIES } from "./replacement-request-form-helpers"

// AsyncSelect calls `useOptions` as a hook, so it needs a named hook.
function useEngineerOptions(search: string, opts?: { enabled?: boolean }) {
  return useUserOptions(search, { is_active: true }, opts)
}

function userLabel(user: UserListItem): string {
  return `${user.first_name} ${user.last_name ?? ""}`.trim() || user.email
}

/** Optional engineer picker; keeps the picked option locally for its label. */
export function IssueEngineerField({
  form,
}: {
  form: ReplacementRequestFormState
}) {
  const { control } = form
  const [engineer, setEngineer] = useState<AsyncSelectOption | null>(null)
  return (
    <div className="min-w-0 space-y-2">
      <Label>
        {S.form.issue.engineerLabel}{" "}
        <Typography variant="helper" asChild>
          <span>{S.form.issue.engineerOptional}</span>
        </Typography>
      </Label>
      <Controller
        control={control}
        name="engineerId"
        render={({ field }) => (
          <AsyncSelect<UserListItem>
            value={engineer}
            onValueChange={(next) => {
              setEngineer(next)
              field.onChange(next?.id)
            }}
            useOptions={useEngineerOptions}
            toLabel={userLabel}
            placeholder={S.form.issue.engineerPlaceholder}
            searchPlaceholder={S.form.issue.engineerSearch}
            searchable
            clearable
          />
        )}
      />
    </div>
  )
}

export function IssuePriorityField({
  form,
}: {
  form: ReplacementRequestFormState
}) {
  const { control, errors } = form
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor="priority" required>
        {S.form.issue.priorityLabel}
      </Label>
      {/* A fixed enum is a Select, not tiles (§3.2); starts unset so the pick is deliberate. */}
      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <Select
            value={field.value ?? ""}
            onValueChange={(v) => field.onChange(v as ReplacementPriority)}
          >
            <SelectTrigger id="priority" clearable={false} className="w-full">
              <SelectValue placeholder={S.form.issue.priorityPlaceholder}>
                {field.value ? (
                  REPLACEMENT_PRIORITY_LABEL[field.value]
                ) : (
                  <span className="text-muted-foreground">
                    {S.form.issue.priorityPlaceholder}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {REPLACEMENT_PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError message={errors.priority?.message} />
    </div>
  )
}
