import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { ErrorBoundary, ModuleErrorState } from "@shared/errors/ErrorBoundary"
import { RouteGuard } from "@shared/rbac"
import { crmCan, crmCanAll, crmPermissions } from "@modules/crm"

import { CRM_ACCESS_STRINGS } from "./constants/crm-access"

const CrmDashboard = lazy(() => import("./pages/dashboard/CrmDashboard"))
const CrmInsightDetailPage = lazy(() => import("./pages/dashboard/CrmInsightDetailPage"))
const CrmRecordsPage = lazy(() => import("./pages/dashboard/CrmRecordsPage"))
const CrmTileDrilldownPage = lazy(() => import("./pages/dashboard/CrmTileDrilldownPage"))
const LeadsPage = lazy(() => import("./pages/leads/LeadsPage"))
const DeficienciesPage = lazy(() => import("./pages/deficiencies/DeficienciesPage"))
const DeficiencyDetailPage = lazy(() => import("./pages/deficiencies/DeficiencyDetailPage"))
const LeadDetailPage = lazy(() => import("./pages/leads/LeadDetailPage"))
const LeadFormPage = lazy(() => import("./pages/leads/LeadFormPage"))
const RejectedLeadsPage = lazy(() => import("./pages/leads/RejectedLeadsPage"))
const ClosedWonPage = lazy(() => import("./pages/close-won/ClosedWonPage"))
const DealsPage = lazy(() => import("./pages/deals/DealsPage"))
const DealDetailPage = lazy(() => import("./pages/deals/DealDetailPage"))
const DealFormPage = lazy(() => import("./pages/deals/DealFormPage"))
const AccountsPage = lazy(() => import("./pages/accounts/AccountsPage"))
const AccountDetailPage = lazy(() => import("./pages/accounts/AccountDetailPage"))
const AccountFormPage = lazy(() => import("./pages/accounts/AccountFormPage"))
const ContactsPage = lazy(() => import("./pages/contacts/ContactsPage"))
const ContactDetailPage = lazy(() => import("./pages/contacts/ContactDetailPage"))
const ContactFormPage = lazy(() => import("./pages/contacts/ContactFormPage"))
const QuotesPage = lazy(() => import("./pages/quotes/QuotesPage"))
const QuoteFormPage = lazy(() => import("./pages/quotes/QuoteFormPage"))
const QuoteBuilderPage = lazy(() => import("./pages/quotes/QuoteBuilderPage"))
const SalesOrdersPage = lazy(() => import("./pages/sales-orders/SalesOrdersPage"))
const SalesOrderDetailPage = lazy(() => import("./pages/sales-orders/SalesOrderDetailPage"))
const SalesOrderFormPage = lazy(() => import("./pages/sales-orders/SalesOrderFormPage"))
const SalesOrderAmendPage = lazy(() => import("./pages/sales-orders/SalesOrderAmendPage"))
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage"))
const InvoiceFormPage = lazy(() => import("./pages/invoices/InvoiceFormPage"))
const PurchaseRequestsPage = lazy(() => import("./pages/purchase-requests/PurchaseRequestsPage"))
const PurchaseRequestFormPage = lazy(
  () => import("./pages/purchase-requests/PurchaseRequestFormPage"),
)
const MaterialInquiriesPage = lazy(() => import("./pages/material-inquiries/MaterialInquiriesPage"))
const MaterialInquiryDetailPage = lazy(
  () => import("./pages/material-inquiries/MaterialInquiryDetailPage"),
)
const MaterialInquiryFormPage = lazy(
  () => import("./pages/material-inquiries/MaterialInquiryFormPage"),
)
const MaterialInquiryResponseDetailPage = lazy(
  () => import("./pages/material-inquiries/MaterialInquiryResponseDetailPage"),
)
const DemoRequestsPage = lazy(() => import("./pages/demo-requests/DemoRequestsPage"))
const DemoRequestDetailPage = lazy(
  () => import("./pages/demo-requests/DemoRequestDetailPage"),
)
const DemoRequestFormPage = lazy(() => import("./pages/demo-requests/DemoRequestFormPage"))
const TasksPage = lazy(() => import("./pages/tasks/TasksPage"))
const MeetingsPage = lazy(() => import("./pages/meetings/MeetingsPage"))
const CalendarPage = lazy(() => import("./pages/calendar/CalendarPage"))
const SaleTargetsPage = lazy(
  () => import("./pages/user-targets/SaleTargetsPage"),
)
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"))

// Resources without their own per-resource code stay on the broad day-1
// `crm:read` / `crm:manage` codes per spec §"Resources not touched".
const CRM_READ_BROAD = [crmPermissions.READ]
const CRM_MANAGE_BROAD = [crmPermissions.MANAGE]

export function CrmRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="CRM" />}>
      <Routes>
        {/* The dashboard and its drill-through pages are gated on ANY CRM
            permission — the same bundle the sidebar's CRM group uses. Without
            it a user with no CRM rights (engineer, store) could open /crm by
            typing the address and read the board. The server still answers
            these requests for them until it gets its own gate. */}
        <Route
          index
          element={
            <RouteGuard
              required={[...crmCan.anyCrm]}
              deniedMessage={CRM_ACCESS_STRINGS.deniedDescription}
            >
              <CrmDashboard />
            </RouteGuard>
          }
        />

        {/* ── Dashboard insight drill-through ───────────────────── */}
        {/* Declared ABOVE `insights/:metric` for the reader. React Router ranks
            the static `records` segment over the dynamic `:metric` regardless,
            so `insights/records/x` can never be swallowed by the metric route. */}
        <Route
          path="insights/records/:tile"
          element={
            <RouteGuard
              required={[...crmCan.anyCrm]}
              deniedMessage={CRM_ACCESS_STRINGS.deniedDescription}
            >
              <CrmRecordsPage />
            </RouteGuard>
          }
        />
        {/* The KPI-tile drill-down — the account breakdown behind a Total
            Revenue / Peak tile. Static `tile` segment, so it cannot be
            swallowed by `insights/:metric` below. */}
        <Route
          path="insights/tile/:reportType/:slot"
          element={
            <RouteGuard
              required={[...crmCan.anyCrm]}
              deniedMessage={CRM_ACCESS_STRINGS.deniedDescription}
            >
              <CrmTileDrilldownPage />
            </RouteGuard>
          }
        />
        <Route
          path="insights/:metric"
          element={
            <RouteGuard
              required={[...crmCan.anyCrm]}
              deniedMessage={CRM_ACCESS_STRINGS.deniedDescription}
            >
              <CrmInsightDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Lead ──────────────────────────────────────────────── */}
        <Route
          path="leads"
          element={
            <RouteGuard required={[...crmCan.readLead]}>
              <LeadsPage />
            </RouteGuard>
          }
        />
        <Route
          path="leads/new"
          element={
            <RouteGuard required={[...crmCan.writeLead]}>
              <LeadFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="leads/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeLead]}>
              <LeadFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="leads/:id/close-won"
          element={
            // Wizard chains Lead → Account → Quote → SO. User needs read
            // on the picker resources and write on the destination SO
            // (per spec §"Resolved Decisions" #2). See `crmCanAll.closeWonLead`.
            <RouteGuard requiredAll={crmCanAll.closeWonLead}>
              <ClosedWonPage />
            </RouteGuard>
          }
        />
        <Route
          path="leads/:id"
          element={
            <RouteGuard required={[...crmCan.readLead]}>
              <LeadDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="rejected-leads"
          element={
            <RouteGuard required={[...crmCan.readLead]}>
              <RejectedLeadsPage />
            </RouteGuard>
          }
        />

        {/* ── Deal ──────────────────────────────────────────────── */}
        <Route
          path="deals"
          element={
            <RouteGuard required={[...crmCan.readDeal]}>
              <DealsPage />
            </RouteGuard>
          }
        />
        <Route
          path="deals/new"
          element={
            <RouteGuard required={[...crmCan.writeDeal]}>
              <DealFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="deals/:id/view"
          element={
            <RouteGuard required={[...crmCan.readDeal]}>
              <DealFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="deals/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeDeal]}>
              <DealFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="deals/:id/close-won"
          element={
            <RouteGuard requiredAll={crmCanAll.closeWonDeal}>
              <ClosedWonPage />
            </RouteGuard>
          }
        />
        <Route
          path="deals/:id"
          element={
            <RouteGuard required={[...crmCan.readDeal]}>
              <DealDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Account ───────────────────────────────────────────── */}
        <Route
          path="accounts"
          element={
            <RouteGuard required={[...crmCan.readAccount]}>
              <AccountsPage />
            </RouteGuard>
          }
        />
        <Route
          path="accounts/new"
          element={
            <RouteGuard required={[...crmCan.writeAccount]}>
              <AccountFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="accounts/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeAccount]}>
              <AccountFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="accounts/:id"
          element={
            <RouteGuard required={[...crmCan.readAccount]}>
              <AccountDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Contact ───────────────────────────────────────────── */}
        <Route
          path="contacts"
          element={
            <RouteGuard required={[...crmCan.readContact]}>
              <ContactsPage />
            </RouteGuard>
          }
        />
        <Route
          path="contacts/new"
          element={
            <RouteGuard required={[...crmCan.writeContact]}>
              <ContactFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="contacts/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeContact]}>
              <ContactFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="contacts/:id"
          element={
            <RouteGuard required={[...crmCan.readContact]}>
              <ContactDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Quote ─────────────────────────────────────────────── */}
        <Route
          path="quotes"
          element={
            <RouteGuard required={[...crmCan.readQuote]}>
              <QuotesPage />
            </RouteGuard>
          }
        />
        <Route
          path="quotes/new"
          element={
            <RouteGuard required={[...crmCan.writeQuote]}>
              <QuoteFormPage />
            </RouteGuard>
          }
        />
        {/* `/quotes/:id` = read-only view (post-create landing).
            `/quotes/:id/edit` = editable form. Backend allows mutations on
            Draft only; the editable route still loads on other statuses but
            its Save will fail with `QUOTE_INVALID_STATE`. */}
        <Route
          path="quotes/:id"
          element={
            <RouteGuard required={[...crmCan.readQuote]}>
              <QuoteFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="quotes/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeQuote]}>
              <QuoteFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="quote-builder"
          element={
            <RouteGuard required={[...crmCan.writeQuote]}>
              <QuoteBuilderPage />
            </RouteGuard>
          }
        />

        {/* ── Recovery queue (rental return deficiencies, §9.4) ─── */}
        <Route
          path="deficiencies"
          element={
            <RouteGuard required={[...crmCan.readDeficiency]}>
              <DeficienciesPage />
            </RouteGuard>
          }
        />
        <Route
          path="deficiencies/:id"
          element={
            <RouteGuard required={[...crmCan.readDeficiency]}>
              <DeficiencyDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Sales Order ───────────────────────────────────────── */}
        <Route
          path="sales-orders"
          element={
            <RouteGuard required={[...crmCan.readSo]}>
              <SalesOrdersPage />
            </RouteGuard>
          }
        />
        <Route
          path="sales-orders/new"
          element={
            <RouteGuard required={[...crmCan.writeSo]}>
              <SalesOrderFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="sales-orders/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeSo]}>
              <SalesOrderFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="sales-orders/:id/amend"
          element={
            <RouteGuard required={[...crmCan.writeSo]}>
              <SalesOrderAmendPage />
            </RouteGuard>
          }
        />
        <Route
          path="sales-orders/:id"
          element={
            <RouteGuard required={[...crmCan.readSo]}>
              <SalesOrderDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Invoice (broad codes — spec §"Resources not touched") ── */}
        <Route
          path="invoices"
          element={
            <RouteGuard required={CRM_READ_BROAD}>
              <InvoicesPage />
            </RouteGuard>
          }
        />
        <Route
          path="invoices/new"
          element={
            <RouteGuard required={CRM_MANAGE_BROAD}>
              <InvoiceFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="invoices/:id/edit"
          element={
            <RouteGuard required={CRM_MANAGE_BROAD}>
              <InvoiceFormPage />
            </RouteGuard>
          }
        />

        {/* ── Purchase Request (codes deferred per spec) ────────── */}
        <Route
          path="purchase-requests"
          element={
            <RouteGuard required={CRM_READ_BROAD}>
              <PurchaseRequestsPage />
            </RouteGuard>
          }
        />
        <Route
          path="purchase-requests/new"
          element={
            <RouteGuard required={CRM_MANAGE_BROAD}>
              <PurchaseRequestFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="purchase-requests/:id/edit"
          element={
            <RouteGuard required={CRM_MANAGE_BROAD}>
              <PurchaseRequestFormPage />
            </RouteGuard>
          }
        />

        {/* ── Material Inquiry ──────────────────────────────────── */}
        <Route
          path="material-inquiries"
          element={
            <RouteGuard required={[...crmCan.readMi]}>
              <MaterialInquiriesPage />
            </RouteGuard>
          }
        />
        <Route
          path="material-inquiries/new"
          element={
            <RouteGuard required={[...crmCan.writeMi]}>
              <MaterialInquiryFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="material-inquiries/:id/edit"
          element={
            <RouteGuard required={[...crmCan.writeMi]}>
              <MaterialInquiryFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="material-inquiries/:id/responses/:responseId"
          element={
            <RouteGuard required={[...crmCan.readMi]}>
              <MaterialInquiryResponseDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="material-inquiries/:id"
          element={
            <RouteGuard required={[...crmCan.readMi]}>
              <MaterialInquiryDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Demo Request ──────────────────────────────────────── */}
        <Route
          path="demo-requests"
          element={
            <RouteGuard required={[...crmCan.readDr]}>
              <DemoRequestsPage />
            </RouteGuard>
          }
        />
        <Route
          path="demo-requests/new"
          element={
            <RouteGuard required={[...crmCan.writeDr]}>
              <DemoRequestFormPage />
            </RouteGuard>
          }
        />
        <Route
          path="demo-requests/:id/close-won"
          element={
            // Demo close-won has no Quote step — DR is itself an alternate
            // to Quote → SO. See `crmCanAll.closeWonDr`.
            <RouteGuard requiredAll={crmCanAll.closeWonDr}>
              <ClosedWonPage />
            </RouteGuard>
          }
        />
        <Route
          path="demo-requests/:id"
          element={
            <RouteGuard required={[...crmCan.readDr]}>
              <DemoRequestDetailPage />
            </RouteGuard>
          }
        />

        {/* ── Task (per-resource — crm:read OR crm:task_read) ───── */}
        <Route
          path="tasks"
          element={
            <RouteGuard required={[...crmCan.readTask]}>
              <TasksPage />
            </RouteGuard>
          }
        />
        {/* ── Activity (broad — spec §"Resources not touched") ──── */}
        <Route
          path="meetings"
          element={
            <RouteGuard required={[...crmCan.readMeeting]}>
              <MeetingsPage />
            </RouteGuard>
          }
        />
        <Route
          path="calendar"
          element={
            <RouteGuard required={CRM_READ_BROAD}>
              <CalendarPage />
            </RouteGuard>
          }
        />
        {/* ── Sale Targets (crm:user_target gate; admin override + hierarchy
             scope + approval routing live in the service). ───────────── */}
        <Route
          path="sale-targets"
          element={
            <RouteGuard required={[crmPermissions.USER_TARGET]}>
              <SaleTargetsPage />
            </RouteGuard>
          }
        />
        <Route path="notifications" element={<NotificationCenter />} />
      </Routes>
    </ErrorBoundary>
  )
}
