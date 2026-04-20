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
        <main className="flex-1 min-w-0 p-5 lg:p-7 animate-fade-in">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingQueryButton />
    </div>
  )
}
