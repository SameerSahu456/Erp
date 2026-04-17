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
        'fixed bottom-6 right-6 z-[60] h-11 w-11 rounded-full',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'shadow-lg shadow-primary/20',
        'transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
      )}
    >
      <ArrowUp className="h-4.5 w-4.5" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  )
}
