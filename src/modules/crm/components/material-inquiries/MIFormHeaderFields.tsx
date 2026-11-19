import { AsyncSelect } from "@/components/ui/async-select"
import { FieldError } from "@/components/common/forms/FieldError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { isDecimalInput } from "@/modules/crm/lib/validation"
import { getUserDisplayName } from "@modules/users"

import type { MaterialInquiryFormController } from "../../hooks/material-inquiries/useMaterialInquiryForm"
import {
  useAssigneePickerOptions,
  useDealPickerOptions,
  useLeadPickerOptions,
} from "../../hooks/material-inquiries/useMaterialInquiryForm"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function MIFormHeaderFields({ form }: { form: MaterialInquiryFormController }) {
  const {
    linkedType, switchLinkedType, canEditHeader, linkedLocked,
    selectedLead, setSelectedLead, selectedDeal, setSelectedDeal,
    clientBudget, setClientBudget,
    clientTimeline, setClientTimeline,
    assignedTo, setAssignedTo,
    description, setDescription,
    leadId, dealId,
    errors, clearError,
  } = form

  return (
    <>
      {/* Linked entity. An MI links to a Lead OR a Deal — never both. */}
      <div className="space-y-2">
        <Label className="font-ui">{S.form.linkedToLabel}</Label>
        <div
          role="radiogroup"
          aria-label={S.form.linkedToRadioGroupLabel}
          className="inline-flex rounded-md border bg-muted/30 p-0.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={linkedType === "lead"}
            disabled={!canEditHeader || linkedLocked}
            onClick={() => switchLinkedType("lead")}
            className={
              "rounded-sm px-3 py-1 text-xs font-medium transition-colors " +
              (linkedType === "lead"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {S.form.lead}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={linkedType === "deal"}
            disabled={!canEditHeader || linkedLocked}
            onClick={() => switchLinkedType("deal")}
            className={
              "rounded-sm px-3 py-1 text-xs font-medium transition-colors " +
              (linkedType === "deal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {S.form.deal}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {linkedType === "lead" ? (
          // Distinct `key` per linked type: the Lead and Deal pickers sit in
          // the same JSX slot, so without a key React reuses one <AsyncSelect>
          // fiber across the toggle and the previous (Lead) infinite-query
          // observer keeps running — the Deal tab then paginates /crm/leads and
          // shows no deals. Distinct keys force unmount→remount so each picker
          // gets its own observer bound to the correct endpoint.
          <div key="mi-linked-lead" className="space-y-1.5">
            <Label className="font-ui" htmlFor="mi-lead">
              {S.form.leadFieldLabel} <span className="text-destructive">*</span>
            </Label>
            <AsyncSelect
              id="mi-lead"
              value={selectedLead}
              onValueChange={(next) => {
                setSelectedLead(next)
                clearError("leadId")
              }}
              useOptions={useLeadPickerOptions}
              toLabel={(l) =>
                `${l.lead_code}${l.company_name ? ` · ${l.company_name}` : ""}`
              }
              placeholder={S.form.leadPlaceholder}
              searchPlaceholder={S.form.leadSearchPlaceholder}
              disabled={!canEditHeader || linkedLocked}
              loadOnOpen
            />
            <FieldError id="mi-lead-error" message={errors.leadId} />
          </div>
        ) : (
          <div key="mi-linked-deal" className="space-y-1.5">
            <Label className="font-ui" htmlFor="mi-deal">
              {S.form.dealFieldLabel} <span className="text-destructive">*</span>
            </Label>
            <AsyncSelect
              id="mi-deal"
              value={selectedDeal}
              onValueChange={(next) => {
                setSelectedDeal(next)
                clearError("dealId")
              }}
              useOptions={useDealPickerOptions}
              toLabel={(d) =>
                d.account_name
                  ? `${d.deal_number} · ${d.account_name}`
                  : d.deal_number
              }
              placeholder={S.form.dealPlaceholder}
              searchPlaceholder={S.form.dealSearchPlaceholder}
              disabled={!canEditHeader || linkedLocked}
              loadOnOpen
            />
            <FieldError id="mi-deal-error" message={errors.dealId} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="font-ui">{S.form.clientBudgetLabel}</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={clientBudget}
            onChange={(e) => {
              const v = e.target.value
              if (!isDecimalInput(v)) return
              setClientBudget(v)
              clearError("clientBudget")
            }}
            placeholder={S.form.clientBudgetPlaceholder}
            disabled={!canEditHeader}
            aria-invalid={Boolean(errors.clientBudget)}
            aria-describedby={errors.clientBudget ? "mi-client-budget-error" : undefined}
          />
          <FieldError id="mi-client-budget-error" message={errors.clientBudget} />
        </div>
        <div className="space-y-1.5">
          <Label className="font-ui">{S.form.clientTimelineLabel}</Label>
          <Input
            value={clientTimeline}
            onChange={(e) => setClientTimeline(e.target.value)}
            placeholder={S.form.clientTimelinePlaceholder}
            disabled={!canEditHeader}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-ui" htmlFor="mi-assigned-to">
            {S.form.assignedToLabel}
          </Label>
          {/* API-backed user picker per §16.11 — debounced infinite scroll
              over /users, gated on popover-open. */}
          <AsyncSelect
            id="mi-assigned-to"
            value={assignedTo}
            onValueChange={setAssignedTo}
            useOptions={useAssigneePickerOptions}
            toLabel={getUserDisplayName}
            placeholder={S.form.assignedToPlaceholder}
            searchPlaceholder={S.form.assignedToSearchPlaceholder}
            disabled={!canEditHeader}
            loadOnOpen
          />
        </div>
      </div>
      {!leadId && !dealId && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {S.form.pickLinked(linkedType)}
        </p>
      )}

      <div className="space-y-1.5">
        <Label className="font-ui">{S.form.descriptionLabel}</Label>
        <RichTextEditor
          value={description}
          onChange={(html) => {
            setDescription(html)
            clearError("description")
          }}
          placeholder={S.form.descriptionPlaceholder}
          disabled={!canEditHeader}
        />
        <FieldError id="mi-description-error" message={errors.description} />
        <p className="text-xs text-muted-foreground">
          {S.form.descriptionHelper}
        </p>
      </div>
    </>
  )
}
