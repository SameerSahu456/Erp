export {
  useVariant,
  useVariantClassificationsByIds,
  useVariantsByIds,
  useVariantsWithBomByIds,
  useVariantsListInfinite,
  type VariantClassification,
} from "./hooks/variants/useVariants";
export {
  useStockItemsPage,
  useStockItemsByIds,
  useStockItemsInfinite,
  // WMS's device detail reads a unit's components through this (the module
  // boundary rule: cross-module imports go via the index barrel only).
  useStockItemComponents,
} from "./hooks/stock/useStock";
export type { StockItemComponent, StockItemComponentsView } from "./api";
export { usePart, usePartsByIds, usePartsInfinite } from "./hooks/parts/useParts";
// A server-searched picker over every active variant. WMS stocks a held
// rental box as one; `PARTS_NEW_PATH` is where to make the part first.
export { useKitVariantOptions as useVariantSearchOptions } from "./hooks/parts/usePartKit";
export { PARTS_NEW_PATH } from "./components/parts/parts-list.columns";
export { useOEMOptions, useOEMsByIds } from "./hooks/oems/useOEMs";
export {
  useCategory,
  useCategoriesByIds,
  useCategoryOptions,
  useAllCategories,
  useAllCategoriesShort,
} from "./hooks/categories/useCategories";
export { useEligiblePMs } from "./hooks/pm-assignments/useEligiblePMs";

export { categoryLabel } from "./lib/category-label";
export { partOptionDescription } from "./lib/part-description";
export { CHECKLIST_QC_TYPE_CODES, isQcChecklistType } from "./lib/checklist-types";
// WMS device timelines name an adjustment's reason with the same labels.
export { STOCK_ADJUSTMENT_REASON_LABEL } from "./lib/stock-adjustment-labels";
export { CategoryMultiSelect } from "./components/categories/CategoryMultiSelect";
export { CategoryOptionsCombobox } from "./components/categories/CategoryOptionsCombobox";
export { OEMOptionsCombobox } from "./components/oems/OEMOptionsCombobox";

export { imsCan, imsPermissions } from "./permissions";
export { imsKeys } from "./hooks/keys";
// Checklist templates — WMS's checklist-template screens edit IMS-owned
// templates and reuse IMS's editor/preview; consumed only via this barrel (§7).
export {
  useChecklistsList,
  useChecklist,
  useChecklistTypes,
  useCreateChecklist,
  useUpdateChecklist,
} from "./hooks/checklists/useChecklists";
export { ChecklistItemsEditor } from "./components/checklists/ChecklistItemsEditor";
export { ChecklistActiveSwitch } from "./components/checklists/ChecklistActiveSwitch";
export { ChecklistPreviewDialog } from "./components/checklists/ChecklistPreviewDialog";
export { ChecklistPreviewList } from "./components/checklists/ChecklistPreviewList";
export type { ChecklistFormShape } from "./components/checklists/checklist-items-editor-helpers";
export {
  createChecklistSchema,
  updateChecklistSchema,
  normalizeChecklistItem,
  generateChecklistKey,
} from "./schemas";
export type { CreateChecklistInput, ChecklistItemInput } from "./schemas";

export { fetchVariantsListPage, fetchAllCategoriesShort, fetchCategory } from "./api";

export type {
  ChecklistItem,
  ChecklistTemplate,
  ChecklistTemplateUpdate,
  Part,
  PartVariant,
  VariantListItem,
  VariantsListPage,
  VariantsListParams,
  StockItemListRow,
  Category,
  CategoryShort,
  OEM,
  EligiblePMsRequest,
  EligiblePMsResponse,
  EligiblePMEntry,
  EligiblePMPermission,
  PrimaryPM,
} from "./api";

export { ImsRoutes } from "./routes";
