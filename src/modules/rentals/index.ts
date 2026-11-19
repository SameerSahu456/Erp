// The rentals module's PUBLIC CONTRACT. Per CLAUDE.md §7, other modules
// import from `@modules/rentals` and never reach into
// `@modules/rentals/components/...` — anything they need is named here.
//
// This file used to export only the routes and the permission helpers,
// so CRM imported five rentals internals by deep path. That is what made
// renaming one rentals component break CRM's build: a module-private file
// had become someone else's dependency without either side saying so.

export { RentalsRoutes } from "./routes";
export { rentalsActionPermissions, rentalsCan, rentalsPermissions } from "./permissions";

// A rental-unit picker other modules mount in their own AsyncSelect.
export {
  useRentalDeviceOptions,
  type RentalDeviceOption,
} from "./hooks/devices/useRentalDeviceOptions";
// Each order line's unit states, for CRM's line-item breakdown.
export {
  useRentalLineUnitStatuses,
  type RentalLineUnitStatus,
} from "./hooks/devices/useRentalLineUnitStatuses";

// ── Cards CRM embeds in its own pages ─────────────────────────────
// A rental's billing terms belong to rentals, but the page a user reads
// them on is CRM's sales-order / account detail. These are the seams,
// and they are deliberately few.
export { RentalSalesOrderBillingsCard } from "./components/agreements/RentalSalesOrderBillingsCard";
export { RentalSalesOrderInvoicesCard } from "./components/invoices/RentalSalesOrderInvoicesCard";
export { AccountBillingsTab } from "./components/accounts/AccountBillingsTab";
// One rental order's agreement state, compact enough for a CRM list row.
// CRM places it; rentals decides what the state IS and where it links.
export {
  BlankAgreementCells,
  RENTAL_AGREEMENT_CELL_COUNT,
  RentalAgreementCells,
} from "./components/agreements/RentalAgreementCells";
export { RENTAL_ACCOUNT_TAB_LABEL } from "./components/accounts/account-tab-label";
// A unit's status badge and the pages a unit / an order live on, for a
// module that shows one (WMS inward exceptions).
export { deviceStatusBadge } from "./constants/billing";
export type { DeviceDisplayStatus } from "./api/devices";
export { rentalSalesOrderPath, rentalUnitPath } from "./lib/paths";
export { rentalKeys } from "./hooks/shared/keys";
