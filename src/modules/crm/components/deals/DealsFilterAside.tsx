import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"

import { ValueRangeInput } from "@/components/common/pickers/ValueRangeInput"

import { CategoryFilterSelect, OemFilterSelect } from "../shared/CategoryOemFilterSelects"
import { EnumMultiSelect } from "../shared/EnumMultiSelect"
import { PmFilterSelect } from "../shared/PmFilterSelect"
import { CHANNEL_TYPES, CHANNEL_TYPE_LABELS } from "../../constants/channel-types"
import { CrmFilterAside, CrmFilterAsideClearAll } from "../shared/CrmFilterAside"
import { LEAD_SOURCES } from "../leads/leadForm.constants"
import { DEAL_STAGE_LIST, type DealPriority } from "../../api"
import { dealStageLabel } from "../../constants/deal-stages"
import type { useDealsBoard } from "../../hooks/deals/useDealsBoard"
import { DEALS_STRINGS } from "./deals.strings"

// Backend priority value → display copy (bucket 1). Mirrors the value/label
// split the Select needs: `value={p}` stays the wire value, the rendered text
// routes through DEALS_STRINGS so copy lives in one place.
const PRIORITY_LABELS: Record<DealPriority, string> = {
  High: DEALS_STRINGS.filters.priorityHigh,
  Medium: DEALS_STRINGS.filters.priorityMedium,
  Low: DEALS_STRINGS.filters.priorityLow,
}

// Wire-value list for the priority filter. Backend enum values (not display
// copy) — hoisted out of the JSX so the literal-string lint doesn't flag the
// discriminator strings; the rendered text routes through PRIORITY_LABELS.
const PRIORITY_VALUES = ["High", "Medium", "Low"] satisfies DealPriority[]

// erp-demo style: static aside that lives next to the content. The Created
// Date range filter maps to the list endpoint's `date_from`/`date_to` params
// (IST calendar days, inclusive). The legacy `datePreset` select remains
// UI-only and is intentionally not rendered.
export function DealsFilterAside({ board }: { board: ReturnType<typeof useDealsBoard> }) {
  const {
    filtersOpen,
    setFiltersOpen,
    selectedStage,
    handleStageChange,
    selectedPriority,
    handlePriorityChange,
    selectedSource,
    handleSourceChange,
    selectedPm,
    handlePmChange,
    selectedCategories,
    handleCategoriesChange,
    selectedOems,
    handleOemsChange,
    selectedChannelTypes,
    handleChannelTypesChange,
    onlyUnassigned,
    handleOnlyUnassignedChange,
    onlyMentioned,
    handleOnlyMentionedChange,
    quoteValue,
    handleQuoteValueChange,
    dealValue,
    handleDealValueChange,
    activeFilterCount,
    resetFilters,
  } = board

  return (
    <CrmFilterAside
      open={filtersOpen}
      activeFilterCount={activeFilterCount}
      onClose={() => setFiltersOpen(false)}
    >
        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.dealValue}</label>
          </Typography>
          <ValueRangeInput
            value={dealValue}
            onChange={handleDealValueChange}
            minPlaceholder={DEALS_STRINGS.filters.dealValueMin}
            maxPlaceholder={DEALS_STRINGS.filters.dealValueMax}
            prefix={DEALS_STRINGS.filters.dealValuePrefix}
            decimals={2}
            maxDigits={14}
            ariaLabel={DEALS_STRINGS.filters.dealValue}
            invalidRangeMessage={DEALS_STRINGS.filters.dealValueRangeError}
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.quoteValue}</label>
          </Typography>
          <ValueRangeInput
            value={quoteValue}
            onChange={handleQuoteValueChange}
            minPlaceholder={DEALS_STRINGS.filters.quoteValueMin}
            maxPlaceholder={DEALS_STRINGS.filters.quoteValueMax}
            prefix={DEALS_STRINGS.filters.quoteValuePrefix}
            decimals={2}
            maxDigits={14}
            ariaLabel={DEALS_STRINGS.filters.quoteValue}
            invalidRangeMessage={DEALS_STRINGS.filters.quoteValueRangeError}
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.productManager}</label>
          </Typography>
          <PmFilterSelect
            value={selectedPm}
            onChange={handlePmChange}
            label={DEALS_STRINGS.filters.productManager}
            placeholder={DEALS_STRINGS.filters.allProductManagers}
            searchPlaceholder={DEALS_STRINGS.filters.searchProductManager}
            className="w-full"
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.category}</label>
          </Typography>
          <CategoryFilterSelect
            value={selectedCategories}
            onChange={handleCategoriesChange}
            label={DEALS_STRINGS.filters.category}
            placeholder={DEALS_STRINGS.filters.allCategories}
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.oem}</label>
          </Typography>
          <OemFilterSelect
            value={selectedOems}
            onChange={handleOemsChange}
            label={DEALS_STRINGS.filters.oem}
            placeholder={DEALS_STRINGS.filters.allOems}
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.channelType}</label>
          </Typography>
          <EnumMultiSelect
            label={DEALS_STRINGS.filters.channelType}
            value={selectedChannelTypes}
            options={CHANNEL_TYPES.map((c) => ({ value: c, label: CHANNEL_TYPE_LABELS[c] }))}
            onChange={handleChannelTypesChange}
            className="w-full"
          />
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.stage}</label>
          </Typography>
          <Select value={selectedStage} onValueChange={(v) => v && handleStageChange(v)}>
            <SelectTrigger
              className="w-full"
              clearable={selectedStage !== "__all__"}
              onClear={() => handleStageChange("__all__")}
            >
              <SelectValue placeholder={DEALS_STRINGS.filters.allStages}>
                {selectedStage === "__all__" ? DEALS_STRINGS.filters.allStages : dealStageLabel(selectedStage)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{DEALS_STRINGS.filters.allStages}</SelectItem>
              {DEAL_STAGE_LIST.map((s) => (
                <SelectItem key={s} value={s}>
                  {dealStageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.priority}</label>
          </Typography>
          <Select
            value={selectedPriority}
            onValueChange={(v) => v && handlePriorityChange(v)}
          >
            <SelectTrigger
              className="w-full"
              clearable={selectedPriority !== "__all__"}
              onClear={() => handlePriorityChange("__all__")}
            >
              <SelectValue placeholder={DEALS_STRINGS.filters.allPriority}>
                {selectedPriority === "__all__" ? DEALS_STRINGS.filters.allPriority : PRIORITY_LABELS[selectedPriority as DealPriority] ?? selectedPriority}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{DEALS_STRINGS.filters.allPriority}</SelectItem>
              {PRIORITY_VALUES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{DEALS_STRINGS.filters.source}</label>
          </Typography>
          <Select value={selectedSource} onValueChange={(v) => v && handleSourceChange(v)}>
            <SelectTrigger
              className="w-full"
              clearable={selectedSource !== "__all__"}
              onClear={() => handleSourceChange("__all__")}
            >
              <SelectValue>
                {selectedSource === "__all__" ? DEALS_STRINGS.filters.allSources : selectedSource}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{DEALS_STRINGS.filters.allSources}</SelectItem>
              {LEAD_SOURCES.map((src) => (
                <SelectItem key={src} value={src}>
                  {src}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <Checkbox
              checked={onlyUnassigned}
              onCheckedChange={(checked) => handleOnlyUnassignedChange(checked === true)}
            />
            <Typography variant="body">{DEALS_STRINGS.filters.unassignedOnly}</Typography>
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2">
            <Checkbox
              checked={onlyMentioned}
              onCheckedChange={(checked) => handleOnlyMentionedChange(checked === true)}
            />
            <Typography variant="body">{DEALS_STRINGS.filters.mentionedOnly}</Typography>
          </label>
        </div>

        {/* Clear all moved to the main filters toolbar (CrmListToolbar).
        {activeFilterCount > 0 && (
          <CrmFilterAsideClearAll onClick={resetFilters}>{DEALS_STRINGS.filters.clearAll}</CrmFilterAsideClearAll>
        )}
        */}
    </CrmFilterAside>
  )
}
