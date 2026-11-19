import { Controller } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { DatePicker } from "@/components/common/pickers/DatePicker"

import type { ReplacementRequestFormState } from "../../hooks/replacement-requests/useReplacementRequestForm"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { SectionCard } from "../shared/section-primitives"
import { IssueEngineerField, IssuePriorityField } from "./ReplacementIssueFields"

/** 4 — Issue details */
export function ReplacementIssueStep({
  form,
}: {
  form: ReplacementRequestFormState
}) {
  const { control, errors } = form
  const today = new Date().toISOString().slice(0, 10)
  return (
    <SectionCard
      step={4}
      title={S.form.issue.title}
      description={S.form.issue.sectionDescription}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reason" required>
            {S.form.issue.reasonLabel}
          </Label>
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <Input
                id="reason"
                placeholder={S.form.issue.reasonPlaceholder}
                {...field}
              />
            )}
          />
          <FieldError message={errors.reason?.message} />
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="ticket">
            {S.form.issue.ticketLabel}{" "}
            <Typography variant="helper" asChild>
              <span>{S.form.issue.ticketOptional}</span>
            </Typography>
          </Label>
          <Controller
            control={control}
            name="externalTicketNo"
            render={({ field }) => (
              <Input
                id="ticket"
                placeholder={S.form.issue.ticketPlaceholder}
                // Cap at the backend column limit so a long paste can't 500.
                maxLength={100}
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="issue-date">{S.form.issue.issueDateLabel}</Label>
          <Controller
            control={control}
            name="issueDate"
            // The shared picker: the native date input's calendar did not
            // open here (same fix as the rental return's expected arrival).
            render={({ field }) => (
              <DatePicker
                id="issue-date"
                max={today}
                value={field.value ?? ""}
                onChange={field.onChange}
                aria-invalid={Boolean(errors.issueDate)}
              />
            )}
          />
          <Typography variant="helper">{S.form.issue.issueDateHint}</Typography>
          <FieldError message={errors.issueDate?.message} />
        </div>

        <IssueEngineerField form={form} />

        <IssuePriorityField form={form} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          {S.form.issue.descriptionLabel}{" "}
          <Typography variant="helper" asChild>
            <span>{S.form.issue.descriptionOptional}</span>
          </Typography>
        </Label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Textarea
              id="description"
              placeholder={S.form.issue.descriptionPlaceholder}
              {...field}
              value={field.value ?? ""}
            />
          )}
        />
      </div>
    </SectionCard>
  )
}
