import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollPosition } from '@/hooks/use-scroll-position'
import { cn } from '@/lib/utils'

export function FloatingQueryButton() {
  const isVisible = useScrollPosition()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-[60] h-12 w-12 rounded-full shadow-lg',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <ArrowUp className="h-5 w-5" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  )
}
