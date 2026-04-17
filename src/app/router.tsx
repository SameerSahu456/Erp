import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from '@/modules/dashboard/DashboardPage'

const CrmDashboard = lazy(() => import('@/modules/crm/pages/CrmDashboard'))
const LeadsPage = lazy(() => import('@/modules/crm/pages/LeadsPage'))
const DealsPage = lazy(() => import('@/modules/crm/pages/DealsPage'))
const AccountsPage = lazy(() => import('@/modules/crm/pages/AccountsPage'))
const ContactsPage = lazy(() => import('@/modules/crm/pages/ContactsPage'))
const SalesOrdersPage = lazy(() => import('@/modules/crm/pages/SalesOrdersPage'))
const QuotesPage = lazy(() => import('@/modules/crm/pages/QuotesPage'))
const InvoicesPage = lazy(() => import('@/modules/crm/pages/InvoicesPage'))
const NotificationCenter = lazy(() => import('@/modules/crm/pages/NotificationCenter'))

const LeadDetailPage = lazy(() => import('@/modules/crm/pages/LeadDetailPage'))
const LeadFormPage = lazy(() => import('@/modules/crm/pages/LeadFormPage'))
const AccountDetailPage = lazy(() => import('@/modules/crm/pages/AccountDetailPage'))
const AccountFormPage = lazy(() => import('@/modules/crm/pages/AccountFormPage'))
const DealDetailPage = lazy(() => import('@/modules/crm/pages/DealDetailPage'))
const DealFormPage = lazy(() => import('@/modules/crm/pages/DealFormPage'))
const ContactDetailPage = lazy(() => import('@/modules/crm/pages/ContactDetailPage'))
const ContactFormPage = lazy(() => import('@/modules/crm/pages/ContactFormPage'))
const QuoteFormPage = lazy(() => import('@/modules/crm/pages/QuoteFormPage'))
const SalesOrderFormPage = lazy(() => import('@/modules/crm/pages/SalesOrderFormPage'))
const InvoiceFormPage = lazy(() => import('@/modules/crm/pages/InvoiceFormPage'))
const PurchaseRequestsPage = lazy(() => import('@/modules/crm/pages/PurchaseRequestsPage'))
const PurchaseRequestFormPage = lazy(() => import('@/modules/crm/pages/PurchaseRequestFormPage'))
const MaterialInquiriesPage = lazy(() => import('@/modules/crm/pages/MaterialInquiriesPage'))
const MaterialInquiryDetailPage = lazy(() => import('@/modules/crm/pages/MaterialInquiryDetailPage'))
const MaterialInquiryFormPage = lazy(() => import('@/modules/crm/pages/MaterialInquiryFormPage'))
const DemoRequestsPage = lazy(() => import('@/modules/crm/pages/DemoRequestsPage'))
const DemoRequestDetailPage = lazy(() => import('@/modules/crm/pages/DemoRequestDetailPage'))
const SalesOrderDetailPage = lazy(() => import('@/modules/crm/pages/SalesOrderDetailPage'))
const PMApprovalsPage = lazy(() => import('@/modules/crm/pages/PMApprovalsPage'))
const QuoteBuilderPage = lazy(() => import('@/modules/crm/pages/QuoteBuilderPage'))

// WMS pages
const WmsDashboard = lazy(() => import('@/modules/wms/pages/WmsDashboard'))
const InwardPage = lazy(() => import('@/modules/wms/pages/InwardPage'))
const InwardFormPage = lazy(() => import('@/modules/wms/pages/InwardFormPage'))
const BatchDevicesPage = lazy(() => import('@/modules/wms/pages/BatchDevicesPage'))
const InspectionPage = lazy(() => import('@/modules/wms/pages/InspectionPage'))
const RepairPage = lazy(() => import('@/modules/wms/pages/RepairPage'))
const PaintPage = lazy(() => import('@/modules/wms/pages/PaintPage'))
const QCPage = lazy(() => import('@/modules/wms/pages/QCPage'))
const OutwardQCPage = lazy(() => import('@/modules/wms/pages/OutwardQCPage'))
const InventoryPage = lazy(() => import('@/modules/wms/pages/InventoryPage'))
const OutwardPage = lazy(() => import('@/modules/wms/pages/OutwardPage'))
const OutwardFormPage = lazy(() => import('@/modules/wms/pages/OutwardFormPage'))
const OutwardDetailPage = lazy(() => import('@/modules/wms/pages/OutwardDetailPage'))
const DispatchPage = lazy(() => import('@/modules/wms/pages/DispatchPage'))

const ChecklistTemplatesPage = lazy(() => import('@/modules/wms/pages/ChecklistTemplatesPage'))
const ChecklistTemplateFormPage = lazy(() => import('@/modules/wms/pages/ChecklistTemplateFormPage'))
const WarehouseLocationsPage = lazy(() => import('@/modules/wms/pages/WarehouseLocationsPage'))
const BOMListPage = lazy(() => import('@/modules/wms/pages/BOMListPage'))
const BOMDetailPage = lazy(() => import('@/modules/wms/pages/BOMDetailPage'))
const RelatedPartsPage = lazy(() => import('@/modules/wms/pages/RelatedPartsPage'))
const WorkOrderListPage = lazy(() => import('@/modules/wms/pages/WorkOrderListPage'))
const WorkOrderDetailPage = lazy(() => import('@/modules/wms/pages/WorkOrderDetailPage'))

// Procurement pages
const ProcurementDashboard = lazy(() => import('@/modules/procurement/pages/ProcurementDashboard'))
const ProcPurchaseRequestsPage = lazy(() => import('@/modules/procurement/pages/PurchaseRequestsPage'))
const PRFormPage = lazy(() => import('@/modules/procurement/pages/PRFormPage'))
const PRDetailPage = lazy(() => import('@/modules/procurement/pages/PRDetailPage'))
const PurchaseOrdersPage = lazy(() => import('@/modules/procurement/pages/PurchaseOrdersPage'))
const POFormPage = lazy(() => import('@/modules/procurement/pages/POFormPage'))
const PODetailPage = lazy(() => import('@/modules/procurement/pages/PODetailPage'))
const VendorsPage = lazy(() => import('@/modules/procurement/pages/VendorsPage'))
const VendorDetailPage = lazy(() => import('@/modules/procurement/pages/VendorDetailPage'))
const GRNMatchingPage = lazy(() => import('@/modules/procurement/pages/GRNMatchingPage'))

// Invoice pages
const InvoiceDashboard = lazy(() => import('@/modules/invoices/pages/InvoiceDashboard'))
const SalesInvoicesPage = lazy(() => import('@/modules/invoices/pages/SalesInvoicesPage'))
const SalesInvoiceFormPage = lazy(() => import('@/modules/invoices/pages/SalesInvoiceFormPage'))
const SalesInvoiceDetailPage = lazy(() => import('@/modules/invoices/pages/SalesInvoiceDetailPage'))
const PurchaseInvoicesPage = lazy(() => import('@/modules/invoices/pages/PurchaseInvoicesPage'))
const CreditNotesPage = lazy(() => import('@/modules/invoices/pages/CreditNotesPage'))

// Accounting pages
const AccountingDashboard = lazy(() => import('@/modules/accounting/pages/AccountingDashboard'))
const LedgerPage = lazy(() => import('@/modules/accounting/pages/LedgerPage'))
const PaymentsPage = lazy(() => import('@/modules/accounting/pages/PaymentsPage'))
const AccountingReportsPage = lazy(() => import('@/modules/accounting/pages/AccountingReportsPage'))

// Reconciliation pages
const BankReconciliationPage = lazy(() => import('@/modules/reconciliation/pages/BankReconciliationPage'))
const VendorReconciliationPage = lazy(() => import('@/modules/reconciliation/pages/VendorReconciliationPage'))
const InventoryReconciliationPage = lazy(() => import('@/modules/reconciliation/pages/InventoryReconciliationPage'))
const InterModuleReconciliationPage = lazy(() => import('@/modules/reconciliation/pages/InterModuleReconciliationPage'))

// Reports pages
const ReportBuilderPage = lazy(() => import('@/modules/reports/pages/ReportBuilderPage'))

// Settings pages
const ProfilePage = lazy(() => import('@/modules/settings/pages/ProfilePage'))
const UserManagementPage = lazy(() => import('@/modules/settings/pages/UserManagementPage'))
const RolesPermissionsPage = lazy(() => import('@/modules/settings/pages/RolesPermissionsPage'))
const AppSettingsPage = lazy(() => import('@/modules/settings/pages/AppSettingsPage'))

// Vendor pages
const VendorListPage = lazy(() => import('@/modules/vendors/pages/VendorListPage'))
const VendorFormPage = lazy(() => import('@/modules/vendors/pages/VendorFormPage'))
const VendorOnboardDetailPage = lazy(() => import('@/modules/vendors/pages/VendorDetailPage'))
const VendorApprovalsPage = lazy(() => import('@/modules/vendors/pages/VendorApprovalsPage'))

// Customer pages
const CustomerListPage = lazy(() => import('@/modules/customers/pages/CustomerListPage'))
const CustomerFormPage = lazy(() => import('@/modules/customers/pages/CustomerFormPage'))
const CustomerDetailPage = lazy(() => import('@/modules/customers/pages/CustomerDetailPage'))
const CustomerApprovalsPage = lazy(() => import('@/modules/customers/pages/CustomerApprovalsPage'))

// Rental pages
const RentalDashboard = lazy(() => import('@/modules/rentals/pages/RentalDashboard'))
const RentalContractsPage = lazy(() => import('@/modules/rentals/pages/RentalContractsPage'))
const RentalContractFormPage = lazy(() => import('@/modules/rentals/pages/RentalContractFormPage'))
const RentalContractDetailPage = lazy(() => import('@/modules/rentals/pages/RentalContractDetailPage'))
const DeviceTrackingPage = lazy(() => import('@/modules/rentals/pages/DeviceTrackingPage'))
const RentalReturnsPage = lazy(() => import('@/modules/rentals/pages/RentalReturnsPage'))

// Design System page
const DesignSystemPage = lazy(() => import('@/modules/design-system/DesignSystemPage'))

// IMS pages
const ImsDashboard = lazy(() => import('@/modules/ims/pages/ImsDashboard'))
const CategoriesPage = lazy(() => import('@/modules/ims/pages/CategoriesPage'))
const CategoryFormPage = lazy(() => import('@/modules/ims/pages/CategoryFormPage'))
const StockItemsPage = lazy(() => import('@/modules/ims/pages/StockItemsPage'))
const StockItemDetailPage = lazy(() => import('@/modules/ims/pages/StockItemDetailPage'))
const ImsReportsPage = lazy(() => import('@/modules/ims/pages/ImsReportsPage'))
const SkuHistoryPage = lazy(() => import('@/modules/ims/pages/SkuHistoryPage'))
const PartsPage = lazy(() => import('@/modules/ims/pages/PartsPage'))
const PartDetailPage = lazy(() => import('@/modules/ims/pages/PartDetailPage'))
const PartFormPage = lazy(() => import('@/modules/ims/pages/PartFormPage'))

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/crm', element: <LazyRoute><CrmDashboard /></LazyRoute> },
      { path: '/crm/leads', element: <LazyRoute><LeadsPage /></LazyRoute> },
      { path: '/crm/leads/new', element: <LazyRoute><LeadFormPage /></LazyRoute> },
      { path: '/crm/leads/:id/edit', element: <LazyRoute><LeadFormPage /></LazyRoute> },
      { path: '/crm/leads/:id', element: <LazyRoute><LeadDetailPage /></LazyRoute> },
      { path: '/crm/deals', element: <LazyRoute><DealsPage /></LazyRoute> },
      { path: '/crm/deals/new', element: <LazyRoute><DealFormPage /></LazyRoute> },
      { path: '/crm/deals/:id/edit', element: <LazyRoute><DealFormPage /></LazyRoute> },
      { path: '/crm/deals/:id', element: <LazyRoute><DealDetailPage /></LazyRoute> },
      { path: '/crm/accounts', element: <LazyRoute><AccountsPage /></LazyRoute> },
      { path: '/crm/accounts/new', element: <LazyRoute><AccountFormPage /></LazyRoute> },
      { path: '/crm/accounts/:id/edit', element: <LazyRoute><AccountFormPage /></LazyRoute> },
      { path: '/crm/accounts/:id', element: <LazyRoute><AccountDetailPage /></LazyRoute> },
      { path: '/crm/contacts', element: <LazyRoute><ContactsPage /></LazyRoute> },
      { path: '/crm/contacts/new', element: <LazyRoute><ContactFormPage /></LazyRoute> },
      { path: '/crm/contacts/:id/edit', element: <LazyRoute><ContactFormPage /></LazyRoute> },
      { path: '/crm/contacts/:id', element: <LazyRoute><ContactDetailPage /></LazyRoute> },
      { path: '/crm/sales-orders', element: <LazyRoute><SalesOrdersPage /></LazyRoute> },
      { path: '/crm/sales-orders/new', element: <LazyRoute><SalesOrderFormPage /></LazyRoute> },
      { path: '/crm/sales-orders/:id/edit', element: <LazyRoute><SalesOrderFormPage /></LazyRoute> },
      { path: '/crm/quotes', element: <LazyRoute><QuotesPage /></LazyRoute> },
      { path: '/crm/quotes/new', element: <LazyRoute><QuoteFormPage /></LazyRoute> },
      { path: '/crm/quotes/:id/edit', element: <LazyRoute><QuoteFormPage /></LazyRoute> },
      { path: '/crm/quote-builder', element: <LazyRoute><QuoteBuilderPage /></LazyRoute> },
      { path: '/crm/invoices', element: <LazyRoute><InvoicesPage /></LazyRoute> },
      { path: '/crm/invoices/new', element: <LazyRoute><InvoiceFormPage /></LazyRoute> },
      { path: '/crm/invoices/:id/edit', element: <LazyRoute><InvoiceFormPage /></LazyRoute> },
      { path: '/crm/purchase-requests', element: <LazyRoute><PurchaseRequestsPage /></LazyRoute> },
      { path: '/crm/purchase-requests/new', element: <LazyRoute><PurchaseRequestFormPage /></LazyRoute> },
      { path: '/crm/purchase-requests/:id/edit', element: <LazyRoute><PurchaseRequestFormPage /></LazyRoute> },
      { path: '/crm/material-inquiries', element: <LazyRoute><MaterialInquiriesPage /></LazyRoute> },
      { path: '/crm/material-inquiries/new', element: <LazyRoute><MaterialInquiryFormPage /></LazyRoute> },
      { path: '/crm/material-inquiries/:id', element: <LazyRoute><MaterialInquiryDetailPage /></LazyRoute> },
      { path: '/crm/material-inquiries/:id/edit', element: <LazyRoute><MaterialInquiryFormPage /></LazyRoute> },
      { path: '/crm/demo-requests', element: <LazyRoute><DemoRequestsPage /></LazyRoute> },
      { path: '/crm/demo-requests/:id', element: <LazyRoute><DemoRequestDetailPage /></LazyRoute> },
      { path: '/crm/sales-orders/:id', element: <LazyRoute><SalesOrderDetailPage /></LazyRoute> },
      { path: '/crm/pm-approvals', element: <LazyRoute><PMApprovalsPage /></LazyRoute> },
      { path: '/crm/notifications', element: <LazyRoute><NotificationCenter /></LazyRoute> },

      // WMS routes
      { path: '/wms', element: <LazyRoute><WmsDashboard /></LazyRoute> },
      { path: '/wms/inward', element: <LazyRoute><InwardPage /></LazyRoute> },
      { path: '/wms/inward/new', element: <LazyRoute><InwardFormPage /></LazyRoute> },
      { path: '/wms/inward/:id/devices', element: <LazyRoute><BatchDevicesPage /></LazyRoute> },
      { path: '/wms/inspection', element: <LazyRoute><InspectionPage /></LazyRoute> },
      { path: '/wms/repair', element: <LazyRoute><RepairPage /></LazyRoute> },
      { path: '/wms/paint', element: <LazyRoute><PaintPage /></LazyRoute> },
      { path: '/wms/qc', element: <LazyRoute><QCPage /></LazyRoute> },
      { path: '/wms/outward-qc', element: <LazyRoute><OutwardQCPage /></LazyRoute> },
      { path: '/wms/inventory', element: <LazyRoute><InventoryPage /></LazyRoute> },
      { path: '/wms/outward', element: <LazyRoute><OutwardPage /></LazyRoute> },
      { path: '/wms/outward/new', element: <LazyRoute><OutwardFormPage /></LazyRoute> },
      { path: '/wms/outward/:id', element: <LazyRoute><OutwardDetailPage /></LazyRoute> },
      { path: '/wms/dispatch', element: <LazyRoute><DispatchPage /></LazyRoute> },
      { path: '/wms/checklists', element: <LazyRoute><ChecklistTemplatesPage /></LazyRoute> },
      { path: '/wms/checklists/new', element: <LazyRoute><ChecklistTemplateFormPage /></LazyRoute> },
      { path: '/wms/checklists/:id/edit', element: <LazyRoute><ChecklistTemplateFormPage /></LazyRoute> },
      { path: '/wms/locations', element: <LazyRoute><WarehouseLocationsPage /></LazyRoute> },
      { path: '/wms/bom', element: <LazyRoute><BOMListPage /></LazyRoute> },
      { path: '/wms/bom/:id', element: <LazyRoute><BOMDetailPage /></LazyRoute> },
      { path: '/wms/related-parts', element: <LazyRoute><RelatedPartsPage /></LazyRoute> },
      { path: '/wms/work-orders', element: <LazyRoute><WorkOrderListPage /></LazyRoute> },
      { path: '/wms/work-orders/:id', element: <LazyRoute><WorkOrderDetailPage /></LazyRoute> },

      // IMS routes
      { path: '/ims', element: <LazyRoute><ImsDashboard /></LazyRoute> },
      { path: '/ims/inventory', element: <LazyRoute><StockItemsPage /></LazyRoute> },
      { path: '/ims/categories', element: <LazyRoute><CategoriesPage /></LazyRoute> },
      { path: '/ims/categories/new', element: <LazyRoute><CategoryFormPage /></LazyRoute> },
      { path: '/ims/categories/:id/edit', element: <LazyRoute><CategoryFormPage /></LazyRoute> },
      { path: '/ims/parts', element: <LazyRoute><PartsPage /></LazyRoute> },
      { path: '/ims/parts/new', element: <LazyRoute><PartFormPage /></LazyRoute> },
      { path: '/ims/parts/:id', element: <LazyRoute><PartDetailPage /></LazyRoute> },
      { path: '/ims/parts/:id/edit', element: <LazyRoute><PartFormPage /></LazyRoute> },
      { path: '/ims/stock-items', element: <LazyRoute><StockItemsPage /></LazyRoute> },
      { path: '/ims/stock-items/:id', element: <LazyRoute><StockItemDetailPage /></LazyRoute> },
      { path: '/ims/stock-items/:id/sku/:sku', element: <LazyRoute><SkuHistoryPage /></LazyRoute> },
      { path: '/ims/reports', element: <LazyRoute><ImsReportsPage /></LazyRoute> },

      // Procurement routes
      { path: '/procurement', element: <LazyRoute><ProcurementDashboard /></LazyRoute> },
      { path: '/procurement/pr', element: <LazyRoute><ProcPurchaseRequestsPage /></LazyRoute> },
      { path: '/procurement/pr/new', element: <LazyRoute><PRFormPage /></LazyRoute> },
      { path: '/procurement/pr/:id', element: <LazyRoute><PRDetailPage /></LazyRoute> },
      { path: '/procurement/po', element: <LazyRoute><PurchaseOrdersPage /></LazyRoute> },
      { path: '/procurement/po/new', element: <LazyRoute><POFormPage /></LazyRoute> },
      { path: '/procurement/po/:id', element: <LazyRoute><PODetailPage /></LazyRoute> },
      { path: '/procurement/vendors', element: <LazyRoute><VendorsPage /></LazyRoute> },
      { path: '/procurement/vendors/:id', element: <LazyRoute><VendorDetailPage /></LazyRoute> },
      { path: '/procurement/grn-matching', element: <LazyRoute><GRNMatchingPage /></LazyRoute> },

      // Invoice routes
      { path: '/invoices', element: <LazyRoute><InvoiceDashboard /></LazyRoute> },
      { path: '/invoices/sales', element: <LazyRoute><SalesInvoicesPage /></LazyRoute> },
      { path: '/invoices/sales/new', element: <LazyRoute><SalesInvoiceFormPage /></LazyRoute> },
      { path: '/invoices/sales/:id', element: <LazyRoute><SalesInvoiceDetailPage /></LazyRoute> },
      { path: '/invoices/purchase', element: <LazyRoute><PurchaseInvoicesPage /></LazyRoute> },
      { path: '/invoices/credit-notes', element: <LazyRoute><CreditNotesPage /></LazyRoute> },

      // Accounting routes
      { path: '/accounting', element: <LazyRoute><AccountingDashboard /></LazyRoute> },
      { path: '/accounting/ledger', element: <LazyRoute><LedgerPage /></LazyRoute> },
      { path: '/accounting/payments', element: <LazyRoute><PaymentsPage /></LazyRoute> },
      { path: '/accounting/reports', element: <LazyRoute><AccountingReportsPage /></LazyRoute> },

      // Reconciliation routes
      { path: '/reconciliation/bank', element: <LazyRoute><BankReconciliationPage /></LazyRoute> },
      { path: '/reconciliation/vendor', element: <LazyRoute><VendorReconciliationPage /></LazyRoute> },
      { path: '/reconciliation/inventory', element: <LazyRoute><InventoryReconciliationPage /></LazyRoute> },
      { path: '/reconciliation/inter-module', element: <LazyRoute><InterModuleReconciliationPage /></LazyRoute> },

      // Vendor routes
      { path: '/vendors', element: <LazyRoute><VendorListPage /></LazyRoute> },
      { path: '/vendors/new', element: <LazyRoute><VendorFormPage /></LazyRoute> },
      { path: '/vendors/approvals', element: <LazyRoute><VendorApprovalsPage /></LazyRoute> },
      { path: '/vendors/:id/edit', element: <LazyRoute><VendorFormPage /></LazyRoute> },
      { path: '/vendors/:id', element: <LazyRoute><VendorOnboardDetailPage /></LazyRoute> },

      // Customer routes
      { path: '/customers', element: <LazyRoute><CustomerListPage /></LazyRoute> },
      { path: '/customers/new', element: <LazyRoute><CustomerFormPage /></LazyRoute> },
      { path: '/customers/approvals', element: <LazyRoute><CustomerApprovalsPage /></LazyRoute> },
      { path: '/customers/:id/edit', element: <LazyRoute><CustomerFormPage /></LazyRoute> },
      { path: '/customers/:id', element: <LazyRoute><CustomerDetailPage /></LazyRoute> },

      // Rental routes
      { path: '/rentals', element: <LazyRoute><RentalDashboard /></LazyRoute> },
      { path: '/rentals/contracts', element: <LazyRoute><RentalContractsPage /></LazyRoute> },
      { path: '/rentals/contracts/new', element: <LazyRoute><RentalContractFormPage /></LazyRoute> },
      { path: '/rentals/contracts/:id/edit', element: <LazyRoute><RentalContractFormPage /></LazyRoute> },
      { path: '/rentals/contracts/:id', element: <LazyRoute><RentalContractDetailPage /></LazyRoute> },
      { path: '/rentals/tracking', element: <LazyRoute><DeviceTrackingPage /></LazyRoute> },
      { path: '/rentals/returns', element: <LazyRoute><RentalReturnsPage /></LazyRoute> },

      // Design System route
      { path: '/design-system', element: <LazyRoute><DesignSystemPage /></LazyRoute> },

      // Reports routes
      { path: '/reports', element: <LazyRoute><ReportBuilderPage /></LazyRoute> },

      // Settings routes
      { path: '/settings/profile', element: <LazyRoute><ProfilePage /></LazyRoute> },
      { path: '/settings/users', element: <LazyRoute><UserManagementPage /></LazyRoute> },
      { path: '/settings/roles', element: <LazyRoute><RolesPermissionsPage /></LazyRoute> },
      { path: '/settings/app', element: <LazyRoute><AppSettingsPage /></LazyRoute> },
    ],
  },
])
