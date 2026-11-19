import { AsyncSelect, makeStaticAsyncOptions } from "@/components/ui/async-select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"

import { LEAD_STAGES } from "@/modules/crm/types"
import {
  ValueRangeInput,
  type ValueRange,
} from "@/components/common/pickers/ValueRangeInput"

import { CategoryFilterSelect, OemFilterSelect } from "../shared/CategoryOemFilterSelects"
import { CrmFilterAsideClearAll } from "../shared/CrmFilterAside"
import { EnumMultiSelect } from "../shared/EnumMultiSelect"
import { PmFilterSelect } from "../shared/PmFilterSelect"
import { CHANNEL_TYPES, CHANNEL_TYPE_LABELS } from "../../constants/channel-types"
import { leadStageLabel } from "../../constants/lead-stages"
import { LEADS_STRINGS as S } from "./leads.strings"
import {
  LEAD_SOURCES,
  leadSourceSearchText,
  sourceLabel,
  toLeadSourceOption,
} from "./leadForm.constants"

const useLeadSourceOptions = makeStaticAsyncOptions(
  LEAD_SOURCES.map(toLeadSourceOption),
  leadSourceSearchText,
)

export interface LeadsFilterPanelProps {
  selectedStage: string
  onStageChange: (next: string) => void
  selectedPriority: string
  onPriorityChange: (next: string) => void
  selectedSource: string
  onSourceChange: (next: string) => void
  selectedPm: string[]
  onPmChange: (next: string[]) => void
  selectedCategories: string[]
  onCategoriesChange: (next: string[]) => void
  selectedOems: string[]
  onOemsChange: (next: string[]) => void
  selectedChannelTypes: string[]
  onChannelTypesChange: (next: string[]) => void
  onlyUnassigned?: boolean
  onOnlyUnassignedChange?: (next: boolean) => void
  onlyMentioned?: boolean
  onOnlyMentionedChange?: (next: boolean) => void
  quoteValue: ValueRange | undefined
  onQuoteValueChange: (next: ValueRange | undefined) => void
  dealValue: ValueRange | undefined
  onDealValueChange: (next: ValueRange | undefined) => void
  activeFilterCount: number
  onClose?: () => void
  onResetAll: () => void
}

// Side filter panel for the Leads list page. Pure presentational — the parent
// owns the persisted state and decides what "active" means.
export function LeadsFilterPanel({
  selectedStage,
  onStageChange,
  selectedPriority,
  onPriorityChange,
  selectedSource,
  onSourceChange,
  selectedPm,
  onPmChange,
  selectedCategories,
  onCategoriesChange,
  selectedOems,
  onOemsChange,
  selectedChannelTypes,
  onChannelTypesChange,
  onlyUnassigned = false,
  onOnlyUnassignedChange = () => {},
  onlyMentioned = false,
  onOnlyMentionedChange = () => {},
  quoteValue,
  onQuoteValueChange,
  dealValue,
  onDealValueChange,
  activeFilterCount,
  onResetAll,
}: LeadsFilterPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.dealValue}</label>
        </Typography>
        <ValueRangeInput
          value={dealValue}
          onChange={onDealValueChange}
          minPlaceholder={S.filters.dealValueMin}
          maxPlaceholder={S.filters.dealValueMax}
          prefix={S.filters.dealValuePrefix}
          decimals={2}
          maxDigits={14}
          ariaLabel={S.filters.dealValue}
          invalidRangeMessage={S.filters.dealValueRangeError}
        />
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.quoteValue}</label>
        </Typography>
        <ValueRangeInput
          value={quoteValue}
          onChange={onQuoteValueChange}
          minPlaceholder={S.filters.quoteValueMin}
          maxPlaceholder={S.filters.quoteValueMax}
          prefix={S.filters.quoteValuePrefix}
          decimals={2}
          maxDigits={14}
          ariaLabel={S.filters.quoteValue}
          invalidRangeMessage={S.filters.quoteValueRangeError}
        />
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.productManager}</label>
        </Typography>
        <PmFilterSelect
          value={selectedPm}
          onChange={onPmChange}
          label={S.filters.productManager}
          placeholder={S.filters.allProductManagers}
          searchPlaceholder={S.filters.searchProductManager}
          className="w-full"
        />
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.category}</label>
        </Typography>
        <CategoryFilterSelect
          value={selectedCategories}
          onChange={onCategoriesChange}
          label={S.filters.category}
          placeholder={S.filters.allCategories}
        />
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.oem}</label>
        </Typography>
        <OemFilterSelect
          value={selectedOems}
          onChange={onOemsChange}
          label={S.filters.oem}
          placeholder={S.filters.allOems}
        />
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.channelType}</label>
        </Typography>
        <EnumMultiSelect
          label={S.filters.channelType}
          value={selectedChannelTypes}
          options={CHANNEL_TYPES.map((c) => ({ value: c, label: CHANNEL_TYPE_LABELS[c] }))}
          onChange={onChannelTypesChange}
          className="w-full"
        />
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.stage}</label>
        </Typography>
        <Select value={selectedStage} onValueChange={(value) => value && onStageChange(value)}>
          <SelectTrigger className="w-full" clearable={false}>
            <SelectValue>
              {selectedStage === "__all__" ? S.filters.allStages : leadStageLabel(selectedStage)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{S.filters.allStages}</SelectItem>
            {LEAD_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {leadStageLabel(stage)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.priority}</label>
        </Typography>
        <Select
          value={selectedPriority}
          onValueChange={(value) => value && onPriorityChange(value)}
        >
          <SelectTrigger
            className="w-full"
            clearable={selectedPriority !== "__all__"}
            onClear={() => onPriorityChange("__all__")}
          >
            <SelectValue>
              {selectedPriority === "__all__" ? S.filters.allPriority : selectedPriority}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{S.filters.allPriority}</SelectItem>
            <SelectItem value="High">{S.filters.priorityHigh}</SelectItem>
            <SelectItem value="Medium">{S.filters.priorityMedium}</SelectItem>
            <SelectItem value="Low">{S.filters.priorityLow}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Typography variant="body-strong" className="mb-1.5 block" asChild>
          <label>{S.filters.source}</label>
        </Typography>
        <AsyncSelect
          value={
            selectedSource === "__all__"
              ? null
              : { id: selectedSource, label: sourceLabel(selectedSource) }
          }
          onValueChange={(option) => onSourceChange(option?.id ?? "__all__")}
          useOptions={useLeadSourceOptions}
          toLabel={(option) => option.name}
          placeholder={S.filters.allSources}
          allOption={S.filters.allSources}
          searchPlaceholder={S.filters.searchSource}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer select-none items-center gap-2">
          <Checkbox
            checked={onlyUnassigned}
            onCheckedChange={(checked) => onOnlyUnassignedChange(checked === true)}
          />
          <Typography variant="body">{S.filters.unassignedOnly}</Typography>
        </label>
        <label className="flex cursor-pointer select-none items-center gap-2">
          <Checkbox
            checked={onlyMentioned}
            onCheckedChange={(checked) => onOnlyMentionedChange(checked === true)}
          />
          <Typography variant="body">{S.filters.mentionedOnly}</Typography>
        </label>
      </div>

      {/* Clear all moved to the main filters toolbar (CrmListToolbar).
      {activeFilterCount > 0 && (
        <CrmFilterAsideClearAll onClick={onResetAll}>{S.filters.clearAll}</CrmFilterAsideClearAll>
      )}
      */}
    </div>
  )
}
