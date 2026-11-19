import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface DetailTab {
  id: string
  label: string
  count?: number
  content: React.ReactNode
  /** Skip the outer content card for this tab — the tab draws its own cards
   *  (e.g. a filter sidebar card beside a table card). */
  bare?: boolean
}

interface DetailTabsProps {
  tabs: DetailTab[]
  defaultTab?: string
  className?: string
  /** When true, renders the active tab content inside a white card. */
  cardContent?: boolean
  /** Override classes on the content wrapper. */
  contentClassName?: string
  /**
   * Query-string key used to persist the active tab in the URL.
   * Defaults to `tab`. Override only if a page hosts two independent
   * DetailTabs and they need separate keys.
   */
  paramKey?: string
  /**
   * Summary sidebar shown beside the content of `asideTabId` only. The tab bar
   * stays full-width above both columns; every other tab gets the full width.
   */
  aside?: React.ReactNode
  /** Tab that shows `aside`. Defaults to the first tab. */
  asideTabId?: string
}

// The active tab is mirrored to the URL (`?tab=<id>`) so deep links can
// land on a specific tab — notification clicks rely on this to send a
// user straight to Comments / Tasks / etc. on the parent entity.
function DetailTabs({
  tabs,
  defaultTab,
  className,
  cardContent = false,
  contentClassName,
  paramKey = 'tab',
  aside,
  asideTabId,
}: DetailTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  if (tabs.length === 0) return null

  const fallbackId = defaultTab && tabs.some((t) => t.id === defaultTab)
    ? defaultTab
    : tabs[0]!.id
  const requestedId = searchParams.get(paramKey)
  const activeId = requestedId && tabs.some((t) => t.id === requestedId)
    ? requestedId
    : fallbackId
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]!

  const selectTab = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        // Default tab is the implicit state — keep the URL clean.
        if (id === fallbackId) next.delete(paramKey)
        else next.set(paramKey, id)
        return next
      },
      { replace: true },
    )
  }

  const showAside = aside != null && activeId === (asideTabId ?? tabs[0]!.id)

  const body = (
    <div
      className={cn(
        cardContent && !activeTab.bare
          ? 'mt-4 rounded-xl border bg-card p-5 shadow-sm'
          : activeTab.bare
            ? 'mt-4'
            : 'pt-6',
        contentClassName,
      )}
    >
      {activeTab.content}
    </div>
  )

  return (
    <div className={cn(className)}>
      <div className="cpt-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn('cpt-tab', activeId === tab.id && 'active')}
            onClick={() => selectTab(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span
                className={cn(
                  'cpt-tab-count',
                  activeId === tab.id && 'active'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {showAside ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">{body}</div>
          <div className="mt-4 space-y-4">{aside}</div>
        </div>
      ) : (
        body
      )}
    </div>
  )
}

export { DetailTabs, type DetailTabsProps, type DetailTab }
