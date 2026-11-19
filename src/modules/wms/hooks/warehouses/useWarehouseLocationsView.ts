import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { usePermission } from "@shared/rbac";
import { asUuid } from "@shared/lib/validation";
import { useAllCategoriesShort, type CategoryShort } from "@modules/ims";

import { wmsPermissions } from "../../permissions";
import { useWarehouse } from "./useWarehouses";
import { useStorageSummary } from "./useWarehouseLocations";

export const WAREHOUSE_TEAM_TAB = "team";

/** Eligible category names in stored order. A picked parent brings every sub-category
 *  under it (the backend's stock scope covers them too); a picked sub-category comes
 *  alone. A still-loading or deleted category is skipped rather than shown as an id. */
function eligibleCategoryNames(
  ids: readonly string[],
  categories: readonly CategoryShort[],
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    names.push(category.name);
    categories.filter((c) => c.parent_id === id).forEach((child) => add(child.id));
  };
  ids.forEach(add);
  return names;
}

/** State + data owner for a warehouse's detail page (§17). */
export function useWarehouseLocationsView() {
  // §11.1 — the route `:id` is untrusted; malformed → "" keeps every query
  // disabled and the not-found guard renders (never a 422).
  const { id: rawId = "" } = useParams();
  const id = asUuid(rawId) ?? "";
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // FE mirrors BE: warehouse edit = WAREHOUSE_MANAGE; adding racks/bins =
  // LOCATION_MANAGE; the Team page = TEAM_READ. Engineers browse only.
  const { can } = usePermission();
  const perms = {
    canEditWarehouse: can(wmsPermissions.WAREHOUSE_MANAGE),
    canManageLocations: can(wmsPermissions.LOCATION_MANAGE),
    canSeeTeam: can(wmsPermissions.TEAM_READ),
    canManageTeam: can(wmsPermissions.TEAM_MANAGE),
  };
  // DetailTabs keeps the open tab in `?tab=`; the header swaps its buttons on the Team tab.
  const onTeamTab = perms.canSeeTeam && searchParams.get("tab") === WAREHOUSE_TEAM_TAB;

  const warehouseQ = useWarehouse(id);
  // Eligible categories are stored as ids; resolve via the slim id→name feed.
  const categoriesShortQ = useAllCategoriesShort();
  const summaryQ = useStorageSummary(id);

  const eligibleCategories = useMemo(
    () => eligibleCategoryNames(warehouseQ.data?.category_ids ?? [], categoriesShortQ.data ?? []),
    [categoriesShortQ.data, warehouseQ.data],
  );

  return {
    warehouseQ,
    summaryQ,
    eligibleCategories,
    ...perms,
    onTeamTab,
    addLocationOpen,
    setAddLocationOpen,
    addMemberOpen,
    setAddMemberOpen,
  };
}
