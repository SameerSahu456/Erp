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
}

function DetailTabs({ tabs, defaultTab, className }: DetailTabsProps) {
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
            {tab.label}
            {tab.count != null && (
              <span style={{
                marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 20, height: 20, borderRadius: 10, background: '#EEF0F3',
                fontSize: 11, fontWeight: 600, color: '#667085', padding: '0 5px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs[activeIndex] && tabs[activeIndex].content}
    </div>
  )
}

export { DetailTabs, type DetailTabsProps, type DetailTab }
