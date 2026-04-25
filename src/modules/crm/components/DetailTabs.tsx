import { useState } from 'react'
import { cn } from '@/lib/utils'

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
  /** When true, renders the active tab content inside a white card. */
  cardContent?: boolean
  /** Override classes on the content wrapper. */
  contentClassName?: string
}

function DetailTabs({
  tabs,
  defaultTab,
  className,
  cardContent = false,
  contentClassName,
}: DetailTabsProps) {
  const defaultIndex = defaultTab
    ? Math.max(0, tabs.findIndex((t) => t.id === defaultTab))
    : 0

  const [activeIndex, setActiveIndex] = useState(defaultIndex)

  if (tabs.length === 0) return null

  return (
    <div className={cn(className)}>
      <div className="cpt-tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            className={cn('cpt-tab', activeIndex === index && 'active')}
            onClick={() => setActiveIndex(index)}
          >
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span
                className={cn(
                  'cpt-tab-count',
                  activeIndex === index && 'active'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs[activeIndex] && (
        <div
          className={cn(
            cardContent
              ? 'mt-4 rounded-xl border bg-card p-5 shadow-sm'
              : 'pt-6',
            contentClassName,
          )}
        >
          {tabs[activeIndex].content}
        </div>
      )}
    </div>
  )
}

export { DetailTabs, type DetailTabsProps, type DetailTab }
