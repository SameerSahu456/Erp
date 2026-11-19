import { useMemo, useState } from 'react'
import { ChevronRight, Search, SearchX, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'

import { ALL_REPORTS, REPORT_CATEGORIES } from '../data/report-catalog'
import type { ReportCategory } from '../types'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

interface ReportNavProps {
  categories: ReportCategory[]
  selectedId: string
  /** Business area of the selected report — that group is always open. */
  selectedCategoryId: string
  onSelect: (id: string) => void
  query: string
  onQueryChange: (q: string) => void
}

/** Left-hand catalogue. Business areas are an accordion: only the area that
 *  holds the open report starts expanded, so the list reads as eight short
 *  headings instead of eighty links. Searching opens every matching area. On
 *  narrow screens it collapses to a single dropdown so the report body gets
 *  the full width. */
export function ReportNav({
  categories,
  selectedId,
  selectedCategoryId,
  onSelect,
  query,
  onQueryChange,
}: ReportNavProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([selectedCategoryId]))
  const searching = query.trim().length > 0

  // When the open report moves to another area (deep link, Back button), make
  // sure that area is expanded — adjusted during render, keyed on the id.
  const [seenCategory, setSeenCategory] = useState(selectedCategoryId)
  if (seenCategory !== selectedCategoryId) {
    setSeenCategory(selectedCategoryId)
    if (!expanded.has(selectedCategoryId)) {
      setExpanded(new Set(expanded).add(selectedCategoryId))
    }
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const mobileOptions = useMemo(
    () =>
      REPORT_CATEGORIES.flatMap((c) =>
        c.reports.map((r) => ({ value: r.id, label: r.label, group: c.label })),
      ),
    [],
  )

  const selectedLabel = useMemo(
    () => mobileOptions.find((o) => o.value === selectedId)?.label ?? '',
    [mobileOptions, selectedId],
  )

  const matchCount = categories.reduce((n, c) => n + c.reports.length, 0)

  return (
    <>
      {/* Mobile: single dropdown */}
      <div className="space-y-1.5 lg:hidden print:hidden">
        <Label htmlFor="report-picker">{S.nav.mobileLabel}</Label>
        <Select value={selectedId} onValueChange={(v) => typeof v === 'string' && onSelect(v)}>
          <SelectTrigger id="report-picker" className="w-full">
            <SelectValue>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {mobileOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.group} · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: searchable accordion in its own panel */}
      <nav
        aria-label={S.nav.title}
        className="hidden max-h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.05)] lg:flex print:hidden"
      >
        <div className="space-y-3 border-b border-border p-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <Typography variant="card-title">{S.nav.title}</Typography>
            <Typography variant="caption" numeric>
              {searching ? S.nav.matchCount(matchCount) : S.nav.reportCount(ALL_REPORTS.length)}
            </Typography>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={S.nav.searchPlaceholder}
              className="px-8"
              aria-label={S.nav.searchPlaceholder}
            />
            {searching && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label={S.nav.clearSearch}
                className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-4" />
            </span>
            <Typography variant="body-strong">{S.nav.noResultsTitle}</Typography>
            <Typography variant="helper" tone="muted">
              {S.nav.noResultsDescription}
            </Typography>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {categories.map((cat) => {
              const isOpen = searching || expanded.has(cat.id)
              const isCurrent = cat.id === selectedCategoryId
              const Icon = cat.icon
              return (
                <div key={cat.id}>
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    aria-expanded={isOpen}
                    title={`${cat.description} (${S.nav.reportCount(cat.reports.length)})`}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        'inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-card',
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <Typography asChild variant="card-title" className="min-w-0 flex-1">
                      <span>{cat.label}</span>
                    </Typography>
                    <ChevronRight
                      className={cn(
                        'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-90',
                      )}
                    />
                  </button>

                  {isOpen && (
                    <ul className="mt-0.5 mb-1.5 ml-[21px] space-y-px border-l border-border pl-2.5">
                      {cat.reports.map((r) => {
                        const active = r.id === selectedId
                        return (
                          <li key={r.id} className="relative">
                            {active && (
                              <span
                                className="absolute top-1.5 bottom-1.5 -left-[11.5px] w-0.5 rounded-full bg-primary"
                                aria-hidden="true"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => onSelect(r.id)}
                              title={r.description}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'flex w-full items-center rounded-md px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                active
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              <Typography
                                asChild
                                variant={active ? 'body-strong' : 'body'}
                                tone="inherit"
                                truncate
                                className="min-w-0 flex-1"
                              >
                                <span>{r.label}</span>
                              </Typography>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </nav>
    </>
  )
}
