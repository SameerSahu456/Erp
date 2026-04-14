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
      { path: '/crm/deals', element: <LazyRoute><DealsPage /></LazyRoute> },
      { path: '/crm/accounts', element: <LazyRoute><AccountsPage /></LazyRoute> },
      { path: '/crm/contacts', element: <LazyRoute><ContactsPage /></LazyRoute> },
      { path: '/crm/sales-orders', element: <LazyRoute><SalesOrdersPage /></LazyRoute> },
      { path: '/crm/quotes', element: <LazyRoute><QuotesPage /></LazyRoute> },
      { path: '/crm/invoices', element: <LazyRoute><InvoicesPage /></LazyRoute> },
      { path: '/crm/notifications', element: <LazyRoute><NotificationCenter /></LazyRoute> },
    ],
  },
])
