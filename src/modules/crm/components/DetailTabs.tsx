import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface DetailTab {
  id: string
  label: string
  count?: number
  content: React.ReactNode
}

interface DetailTabsProps {
  tabs: DetailTab[]
  defaultTab?: string
  className?: string
}

function DetailTabs({ tabs, defaultTab, className }: DetailTabsProps) {
  const defaultIndex = defaultTab
    ? Math.max(0, tabs.findIndex((t) => t.id === defaultTab))
    : 0

  if (tabs.length === 0) return null

  return (
    <Tabs defaultValue={defaultIndex} className={cn(className)}>
      <div className="sticky top-0 z-10 bg-background pb-4">
        <TabsList variant="line">
          {tabs.map((tab, index) => (
            <TabsTrigger key={tab.id} value={index}>
              {tab.label}
              {tab.count != null && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab, index) => (
        <TabsContent key={tab.id} value={index}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export { DetailTabs, type DetailTabsProps, type DetailTab }
