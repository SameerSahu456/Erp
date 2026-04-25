import { useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'
import {
  ChevronRight,
  FolderOpen,
  Folder,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PageHeader } from '@/components/page'
import { cn } from '@/lib/utils'
import type { IMSCategory } from '../types'
import { mockCategories } from '../data/categories'

function collectAllIds(cats: IMSCategory[]): string[] {
  const ids: string[] = []
  const walk = (cat: IMSCategory) => {
    ids.push(cat.id)
    cat.subcategories?.forEach(walk)
  }
  cats.forEach(walk)
  return ids
}

function countDescendants(category: IMSCategory): number {
  let total = category.subcategories?.length ?? 0
  if (category.subcategories) {
    for (const sub of category.subcategories) {
      total += countDescendants(sub)
    }
  }
  return total
}

function filterTree(categories: IMSCategory[], query: string): IMSCategory[] {
  if (!query.trim()) return categories
  const q = query.toLowerCase()
  const walk = (cat: IMSCategory): IMSCategory | null => {
    const selfMatch = cat.name.toLowerCase().includes(q)
    const filteredSubs = cat.subcategories
      ?.map(walk)
      .filter((c): c is IMSCategory => c !== null)
    if (selfMatch || (filteredSubs && filteredSubs.length > 0)) {
      return { ...cat, subcategories: filteredSubs }
    }
    return null
  }
  return categories.map(walk).filter((c): c is IMSCategory => c !== null)
}

interface CategoryNodeProps {
  category: IMSCategory
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
}

function CategoryNode({ category, depth, expanded, onToggle }: CategoryNodeProps) {
  const hasSubs = (category.subcategories?.length ?? 0) > 0
  const isOpen = expanded.has(category.id)
  const subCount = category.subcategories?.length ?? 0
  const navigate = useNavigate()

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/ims/categories/${category.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(`/ims/categories/${category.id}`)
          }
        }}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
          'hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !category.isActive && 'opacity-50',
        )}
        style={{ marginLeft: depth * 24 }}
      >
        {/* Chevron */}
        {hasSubs ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(category.id)
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <ChevronRight
              className={cn(
                'size-4 transition-transform duration-200',
                isOpen && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        {/* Folder icon */}
        {hasSubs ? (
          <FolderOpen className="size-[18px] shrink-0 text-indigo-500/80" />
        ) : (
          <Folder className="size-[18px] shrink-0 text-muted-foreground/60" />
        )}

        {/* Name */}
        <span
          className={cn(
            'truncate',
            depth === 0 ? 'text-[15px] font-semibold' : 'text-sm font-medium',
          )}
        >
          {category.name}
        </span>

        {/* Counts — quiet, inline */}
        <span className="ml-2 flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground">
          {hasSubs && (
            <span>
              {subCount} {subCount === 1 ? 'subcategory' : 'subcategories'}
            </span>
          )}
          <span className="font-medium text-foreground/70">
            {category.partCount} {category.partCount === 1 ? 'part' : 'parts'}
          </span>
        </span>

        {!category.isActive && (
          <StatusBadge variant="neutral">Inactive</StatusBadge>
        )}

        {/* Push actions to the right */}
        <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Link
            to={`/ims/categories/${category.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            title="Edit"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-3.5" />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toast.success(`Category "${category.name}" deleted`)
            }}
            title="Delete"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {hasSubs && isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {category.subcategories!.map((sub) => (
            <CategoryNode
              key={sub.id}
              category={sub}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const [search, setSearch] = usePersistedState('ims-categories:search', '')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const allIds = useMemo(() => collectAllIds(mockCategories), [])
  const filtered = useMemo(() => filterTree(mockCategories, search), [search])

  const searchActive = search.trim().length > 0
  const effectiveExpanded = useMemo(() => {
    if (searchActive) return new Set(allIds)
    return expanded
  }, [searchActive, expanded, allIds])

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const summary = useMemo(() => {
    const rootCount = mockCategories.length
    let subCount = 0
    let partCount = 0
    for (const cat of mockCategories) {
      subCount += countDescendants(cat)
      partCount += cat.partCount
    }
    return { rootCount, subCount, partCount }
  }, [])

  const allExpanded = expanded.size === allIds.length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Categories"
        subtitle={`${summary.rootCount} categories · ${summary.subCount} subcategories · ${summary.partCount.toLocaleString('en-IN')} parts`}
        breadcrumbs={[{ label: 'IMS' }, { label: 'Categories' }]}
        actions={
          <Button render={<Link to="/ims/categories/new" />}>
            <Plus className="mr-1.5 size-4" />
            New Category
          </Button>
        }
      />

      {/* Search + simple toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="h-12 pl-12 pr-10 text-base"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={searchActive}
          onClick={() =>
            setExpanded(allExpanded ? new Set() : new Set(allIds))
          }
          className="text-muted-foreground"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      {/* Tree */}
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Search className="size-5 text-muted-foreground/60" />
            <p className="text-sm font-medium">No categories found</p>
            <p className="text-xs text-muted-foreground">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((cat) => (
              <CategoryNode
                key={cat.id}
                category={cat}
                depth={0}
                expanded={effectiveExpanded}
                onToggle={toggleExpanded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
