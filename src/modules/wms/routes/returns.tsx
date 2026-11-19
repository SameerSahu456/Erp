import { Route } from "react-router-dom"

import { procurementCan } from "@modules/procurement"
import { crmPermissions } from "@modules/crm"
import { rentalsCan, rentalsPermissions } from "@modules/rentals"
import { RouteGuard } from "@shared/rbac"

import { wmsCan } from "../permissions"
import {
  PurchaseReturnDetailPage,
  PurchaseReturnFormPage,
  PurchaseReturnsPage,
  RentalReturnRequestDetailPage,
  RentalReturnRequestFormPage,
  RentalReturnRequestsPage,
  ReplacementRequestDetailPage,
  ReplacementRequestFormPage,
  ReplacementRequestsPage,
  SalesReturnRequestDetailPage,
  SalesReturnRequestFormPage,
  SalesReturnRequestsPage,
} from "./lazy-pages"

/** Customer replacements, sales returns and vendor (purchase) returns. */
export function returnRoutes() {
  return (
    <>
      {/* Wired to the live CRM replacement API — real permission gate,
          no longer the superuser-only mock wrapper. */}
      <Route
        path="replacements"
        element={
          <RouteGuard
            required={[crmPermissions.READ, ...wmsCan.returnsView, ...rentalsCan.replacementView]}
          >
            <ReplacementRequestsPage />
          </RouteGuard>
        }
      />
      {/* Sales Return Requests — the customer-return authorization a
          sale_return GRN is received against. */}
      <Route
        path="sales-returns"
        element={
          <RouteGuard required={[crmPermissions.READ, ...wmsCan.returnsView]}>
            <SalesReturnRequestsPage />
          </RouteGuard>
        }
      />
      <Route
        path="sales-returns/new"
        element={
          <RouteGuard required={[crmPermissions.MANAGE, ...wmsCan.returnsManage]}>
            <SalesReturnRequestFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="sales-returns/:id"
        element={
          <RouteGuard required={[crmPermissions.READ, ...wmsCan.returnsView]}>
            <SalesReturnRequestDetailPage />
          </RouteGuard>
        }
      />
      {/* Rental Return Requests — returns the rental DEVICE as well as the
          request's lines. */}
      <Route
        path="rental-returns"
        element={
          // `rentals:return` carries the READS too — the register and a
          // request's detail are how an operator finds and follows the
          // return they raised. The matching API guards accept the same
          // pair, so the page and its data agree.
          <RouteGuard
            required={[crmPermissions.READ, rentalsPermissions.RETURN]}
          >
            <RentalReturnRequestsPage />
          </RouteGuard>
        }
      />
      <Route
        path="rental-returns/new"
        element={
          // OR-bundle: `crm:manage` keeps every existing caller working,
          // `rentals:return` lets a rentals operator raise a return
          // without also holding authority over leads, accounts, deals
          // and quotes. The API guards accept the same pair.
          <RouteGuard
            // Not wms:outward_manage, though the create endpoint accepts it:
            // the form's customer picker reads CRM accounts, which the
            // warehouse cannot. The warehouse receives an unannounced
            // return through Inward instead.
            required={[crmPermissions.MANAGE, rentalsPermissions.RETURN]}
          >
            <RentalReturnRequestFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="rental-returns/:id"
        element={
          <RouteGuard
            required={[crmPermissions.READ, rentalsPermissions.RETURN]}
          >
            <RentalReturnRequestDetailPage />
          </RouteGuard>
        }
      />
      <Route
        path="replacements/new"
        element={
          // Exactly the create endpoint's gate: crm:manage | outward_manage
          // | rentals:replace (rental orders only).
          <RouteGuard
            required={[
              crmPermissions.MANAGE,
              ...wmsCan.outwardManage,
              ...rentalsCan.raiseReplacement,
            ]}
          >
            <ReplacementRequestFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="replacements/:id"
        element={
          <RouteGuard
            required={[crmPermissions.READ, ...wmsCan.returnsView, ...rentalsCan.replacementView]}
          >
            <ReplacementRequestDetailPage />
          </RouteGuard>
        }
      />
      <Route
        path="purchase-returns"
        element={
          <RouteGuard required={[...procurementCan.returnView]}>
            <PurchaseReturnsPage />
          </RouteGuard>
        }
      />
      <Route
        path="purchase-returns/new"
        element={
          <RouteGuard required={[...procurementCan.returnWrite]}>
            <PurchaseReturnFormPage />
          </RouteGuard>
        }
      />
      <Route
        path="purchase-returns/:id"
        element={
          <RouteGuard required={[...procurementCan.returnView]}>
            <PurchaseReturnDetailPage />
          </RouteGuard>
        }
      />
    </>
  )
}
