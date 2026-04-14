import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { FloatingQueryButton } from './FloatingQueryButton'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </div>
      <FloatingQueryButton />
    </div>
  )
}
