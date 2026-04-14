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

const ChecklistTemplatesPage = lazy(() => import('@/modules/wms/pages/ChecklistTemplatesPage'))
const ChecklistTemplateFormPage = lazy(() => import('@/modules/wms/pages/ChecklistTemplateFormPage'))
const WarehouseLocationsPage = lazy(() => import('@/modules/wms/pages/WarehouseLocationsPage'))

// IMS pages
const ImsDashboard = lazy(() => import('@/modules/ims/pages/ImsDashboard'))
const CategoriesPage = lazy(() => import('@/modules/ims/pages/CategoriesPage'))
const StockItemsPage = lazy(() => import('@/modules/ims/pages/StockItemsPage'))
const StockItemDetailPage = lazy(() => import('@/modules/ims/pages/StockItemDetailPage'))
const ImsReportsPage = lazy(() => import('@/modules/ims/pages/ImsReportsPage'))

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
      { path: '/wms/checklists', element: <LazyRoute><ChecklistTemplatesPage /></LazyRoute> },
      { path: '/wms/checklists/new', element: <LazyRoute><ChecklistTemplateFormPage /></LazyRoute> },
      { path: '/wms/checklists/:id/edit', element: <LazyRoute><ChecklistTemplateFormPage /></LazyRoute> },
      { path: '/wms/locations', element: <LazyRoute><WarehouseLocationsPage /></LazyRoute> },

      // IMS routes
      { path: '/ims', element: <LazyRoute><ImsDashboard /></LazyRoute> },
      { path: '/ims/categories', element: <LazyRoute><CategoriesPage /></LazyRoute> },
      { path: '/ims/stock-items', element: <LazyRoute><StockItemsPage /></LazyRoute> },
      { path: '/ims/stock-items/:id', element: <LazyRoute><StockItemDetailPage /></LazyRoute> },
      { path: '/ims/reports', element: <LazyRoute><ImsReportsPage /></LazyRoute> },
    ],
  },
])
