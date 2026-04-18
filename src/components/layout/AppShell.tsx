import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { FloatingQueryButton } from './FloatingQueryButton'
import { Button } from '@/components/ui/button'

const ROOT_PATHS = ['/', '/dashboard']

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const showBack = !ROOT_PATHS.includes(pathname)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6 lg:p-8 animate-fade-in">
          <div className="max-w-[1400px] mx-auto">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="mb-4 -ml-1 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingQueryButton />
    </div>
  )
}
