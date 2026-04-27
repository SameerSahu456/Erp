import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { FloatingQueryButton } from './FloatingQueryButton'

export function AppShell() {
  const { pathname } = useLocation()
  const segs = pathname.split('/').filter(Boolean)
  const moduleSlug = segs[0] || 'home'
  const last = segs[segs.length - 1]
  // /crm/leads -> list, /crm/leads/new -> form, /crm/leads/:id -> detail,
  // /crm/leads/:id/edit -> form, /crm/leads/:id/close-won -> detail-action
  let pageType: 'list' | 'form' | 'detail' = 'list'
  if (segs.length >= 3) {
    if (last === 'new' || last === 'edit') pageType = 'form'
    else pageType = 'detail'
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main
          data-module={moduleSlug}
          data-page-type={pageType}
          className="flex-1 min-w-0 p-5 lg:p-7 animate-fade-in"
        >
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingQueryButton />
    </div>
  )
}
