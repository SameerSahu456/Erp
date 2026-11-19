import { lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary";
import { RouteGuard } from "@shared/rbac";
import { EmptyState } from "@/components/common/feedback/EmptyState";

import { RENTALS_COMMON_STRINGS as C } from "./components/shared/common.strings";

import { rentalsCan } from "./permissions";

// Every page here is API-backed. The module used to carry eight further
// routes — dashboard, orders, assets, support, partners, billing,
// analytics and a second device-tracking page — reading fabricated arrays
// out of `./data/`. They are gone, not disabled, because:
//
//   * none of them was in the sidebar, so nothing linked to them;
//   * three duplicated a live page that already exists (`orders` and the
//     old tracking page, and `billing` against `invoices`);
//   * their fixtures had drifted from their own interfaces and were 14 of
//     the frontend's 55 type errors — a mock that no longer typechecks has
//     stopped being an example of anything;
//   * `data/contracts.ts` modelled a `RentalContract` entity the backend
//     does not have. The real shape is a `RentalAgreement` hanging off a
//     sales order, so the fixture taught the wrong domain model to anyone
//     reading it to learn the module.
//
// Rebuild any of them against the real API when it is wanted; the git
// history has the layouts.
const RentalSalesOrdersPage = lazy(
  () => import("./pages/agreements/RentalSalesOrdersPage"),
);
const RentalAccountsPage = lazy(
  () => import("./pages/accounts/RentalAccountsPage"),
);
// The sales order's rental billing terms, as a full form page. Lives in
// rentals (it is a rentals contract) but is reached mainly from the CRM
// sales-order detail page's Billings card.
const RentalAgreementDetailPage = lazy(
  () => import("./pages/agreements/RentalAgreementDetailPage"),
);
const RentalAgreementConfigurePage = lazy(
  () => import("./pages/agreements/RentalAgreementConfigurePage"),
);
const RentalDeviceTrackingPage = lazy(
  () => import("./pages/devices/RentalDeviceTrackingPage"),
);
const RentalDeviceDetailPage = lazy(
  () => import("./pages/devices/RentalDeviceDetailPage"),
);
const RentalInvoicesPage = lazy(
  () => import("./pages/invoices/RentalInvoicesPage"),
);
const NewRentalInvoicePage = lazy(
  () => import("./pages/invoices/NewRentalInvoicePage"),
);
const RentalInvoiceDetailPage = lazy(
  () => import("./pages/invoices/RentalInvoiceDetailPage"),
);
const RentalConfigurationPage = lazy(
  () => import("./pages/configuration/RentalConfigurationPage"),
);
// Return by count (§7): serial swaps and the credit they can leave due.
const SwapsPage = lazy(() => import("./pages/swaps/SwapsPage"));
const SwapFormPage = lazy(() => import("./pages/swaps/SwapFormPage"));
const SwapDetailPage = lazy(() => import("./pages/swaps/SwapDetailPage"));
// Every rental approval queue (§3; terminations / invoice deletions 2026-11-14).
const ApprovalsPage = lazy(() => import("./pages/approvals/ApprovalsPage"));
const BillingAdjustmentsPage = lazy(() => import("./pages/billing-adjustments/BillingAdjustmentsPage"));
const BillingAdjustmentDetailPage = lazy(
  () => import("./pages/billing-adjustments/BillingAdjustmentDetailPage"),
);
const CreditNoteDetailPage = lazy(() => import("./pages/credit-notes/CreditNoteDetailPage"));

/** `/rentals/sales-orders/:id` -> `/rentals/agreements/:id`.
 *
 *  One canonical detail URL, reached from two prefixes. `replace` so the
 *  alias does not sit in history and send Back to a redirect loop.
 */
function RentalAgreementDetailRedirect() {
  const { salesOrderId } = useParams();
  return <Navigate to={`/rentals/agreements/${salesOrderId}`} replace />;
}

export function RentalsRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="Rentals" />}>
      {/* The whole section needs a rentals read code — the same bundle the
          sidebar group is gated on — so a typed URL shows No Access instead
          of a page whose every query is refused. */}
      <RouteGuard required={[...rentalsCan.view]}>
      <Routes>
        {/* `agreements` IS the rental sales-order list — one row per
            agreement, with its rental status, units out and billing
            progress. `sales-orders` stays as an alias so existing links
            and bookmarks keep working. */}
        <Route path="agreements" element={<RentalSalesOrdersPage />} />
        <Route
          path="agreements/:salesOrderId/configure"
          element={
            <RouteGuard required={[...rentalsCan.configure]}>
              <RentalAgreementConfigurePage />
            </RouteGuard>
          }
        />
        {/* The agreement page IS the sales-order page in rentals clothing:
            it reads the CRM order as well as the agreement. That read takes
            `rentals:agreement_view` for rental orders, so the page needs no
            CRM sales-order code (2026-11-16). */}
        <Route
          path="agreements/:salesOrderId"
          element={
            <RouteGuard required={[...rentalsCan.viewAgreement]}>
              <RentalAgreementDetailPage />
            </RouteGuard>
          }
        />
        <Route path="sales-orders" element={<RentalSalesOrdersPage />} />
        <Route
          path="sales-orders/:salesOrderId/configure"
          element={
            <RouteGuard required={[...rentalsCan.configure]}>
              <RentalAgreementConfigurePage />
            </RouteGuard>
          }
        />
        {/* The guessable URL. `sales-orders/:id/configure` existed but
            `sales-orders/:id` did not, so trimming the `/configure` off a
            link — or typing the prefix the nav used to advertise — fell
            through to no match. Redirects rather than rendering a second
            copy, so there is still ONE canonical detail URL.

            LAST among the `sales-orders` routes on purpose: a bare
            `:salesOrderId` segment would otherwise also match
            `sales-orders/new`-style paths before the literal ones are
            tried. */}
        <Route
          path="sales-orders/:salesOrderId"
          element={<RentalAgreementDetailRedirect />}
        />
        <Route path="accounts" element={<RentalAccountsPage />} />
        <Route path="tracking" element={<RentalDeviceTrackingPage />} />
        <Route path="tracking/:deviceId" element={<RentalDeviceDetailPage />} />
        <Route path="invoices" element={<RentalInvoicesPage />} />
        <Route
          path="invoices/new"
          element={
            <RouteGuard required={[...rentalsCan.createInvoice]}>
              <NewRentalInvoicePage />
            </RouteGuard>
          }
        />
        <Route
          path="invoices/:invoiceId"
          element={<RentalInvoiceDetailPage />}
        />
        <Route path="configuration" element={<RentalConfigurationPage />} />
        <Route path="swaps" element={<SwapsPage />} />
        <Route
          path="swaps/new"
          element={
            <RouteGuard required={[...rentalsCan.returnUnits]}>
              <SwapFormPage />
            </RouteGuard>
          }
        />
        <Route path="swaps/:id" element={<SwapDetailPage />} />
        {/* Early-exit and PO approvals share one page (`?type=`); the PO
            queue is offered only to its deciders. The old URLs redirect. */}
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="waivers" element={<Navigate to="/rentals/approvals" replace />} />
        <Route path="po-approvals" element={<Navigate to="/rentals/approvals?type=po" replace />} />
        <Route path="billing-adjustments" element={<BillingAdjustmentsPage />} />
        <Route path="billing-adjustments/:id" element={<BillingAdjustmentDetailPage />} />
        {/* Every credit note opens here — listed on the Adjustments page. */}
        <Route path="credit-notes/:id" element={<CreditNoteDetailPage />} />
        {/* Unknown /rentals/* paths render a not-found state, never a blank page. */}
        <Route
          path="*"
          element={<EmptyState title={C.pageNotFoundTitle} description={C.pageNotFoundBody} />}
        />
      </Routes>
      </RouteGuard>
    </ErrorBoundary>
  );
}
