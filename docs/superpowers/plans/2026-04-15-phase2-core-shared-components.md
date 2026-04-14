# Phase 2: Core Shared Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core reusable components that modules will depend on: StatusBadge, DataCard, StatsRow, EmptyState, AvatarGroup, Timeline, ConfirmDialog, FileUpload, TagInput, MultiSelect, MultiSelectSearch, BusinessMetricsTable, WorkflowStepper, MultiStepWizard, KanbanBoard.

**Architecture:** All components live in `src/components/common/`. Each is a self-contained directory with index.tsx. Components use Shadcn primitives and comprint design tokens.

**Tech Stack:** React 19, TypeScript, Shadcn UI, Tailwind CSS, @dnd-kit (for Kanban), Lucide React

---

## Task 1: StatusBadge, DataCard, StatsRow, EmptyState, AvatarGroup

Small display components — batch together.

**Files:**
- Create: `src/components/common/StatusBadge.tsx`
- Create: `src/components/common/DataCard.tsx`
- Create: `src/components/common/StatsRow.tsx`
- Create: `src/components/common/EmptyState.tsx`
- Create: `src/components/common/AvatarGroup.tsx`

### StatusBadge
Predefined status variants with consistent styling.

```typescript
import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'red-cell'

interface StatusBadgeProps {
  variant: StatusVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'text-status-success-text bg-status-success-bg',
  warning: 'text-status-warning-text bg-status-warning-bg',
  error: 'text-status-error-text bg-status-error-bg',
  info: 'text-status-info-text bg-status-info-bg',
  neutral: 'text-muted-foreground bg-muted',
  'red-cell': 'text-status-error-text bg-status-error-bg',
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantStyles[variant], className)}>
      {children}
    </span>
  )
}
```

### DataCard
Metric display card for dashboards.

```typescript
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DataCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; isPositive: boolean }
  onClick?: () => void
  className?: string
}

export function DataCard({ label, value, icon: Icon, trend, onClick, className }: DataCardProps) {
  return (
    <Card className={cn('cursor-default transition-shadow hover:shadow-md', onClick && 'cursor-pointer', className)} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold font-sans">{value}</p>
          {trend && (
            <span className={cn('flex items-center text-xs font-medium', trend.isPositive ? 'text-status-success-text' : 'text-status-error-text')}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trend.value}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### StatsRow
Horizontal row of DataCards.

```typescript
import { DataCard } from './DataCard'
import type { LucideIcon } from 'lucide-react'

interface Stat {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; isPositive: boolean }
  onClick?: () => void
}

interface StatsRowProps {
  stats: Stat[]
  className?: string
}

export function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((stat, i) => (
        <DataCard key={i} {...stat} />
      ))}
    </div>
  )
}
```
(Import cn from @/lib/utils)

### EmptyState
Consistent empty state pattern.

```typescript
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold font-sans mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  )
}
```

### AvatarGroup
Stacked avatars with overflow.

```typescript
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AvatarUser {
  name: string
  avatar?: string
}

interface AvatarGroupProps {
  users: AvatarUser[]
  max?: number
  className?: string
}

export function AvatarGroup({ users, max = 4, className }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const remaining = users.length - max

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn('flex -space-x-2', className)}>
        {visible.map((user, i) => {
          const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{user.name}</TooltipContent>
            </Tooltip>
          )
        })}
        {remaining > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-background">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  +{remaining}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{users.slice(max).map(u => u.name).join(', ')}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
```

- [ ] Create all 5 files
- [ ] Verify build passes
- [ ] Commit: `feat: add StatusBadge, DataCard, StatsRow, EmptyState, AvatarGroup components`

---

## Task 2: Timeline, ConfirmDialog, FileUpload

**Files:**
- Create: `src/components/common/Timeline.tsx`
- Create: `src/components/common/ConfirmDialog.tsx`
- Create: `src/components/common/FileUpload.tsx`

### Timeline
Vertical activity log.

- Each entry: icon (LucideIcon), title, description, timestamp, user name
- Vertical line connecting entries
- Most recent at top

### ConfirmDialog
Standardized destructive action confirmation.

- Wraps Shadcn AlertDialog
- Props: title, description, confirmLabel, variant ('default' | 'destructive'), onConfirm, trigger (ReactNode)
- Shows cancel + confirm buttons

### FileUpload
Drag-and-drop file upload area.

- Native drag events (no external lib)
- Accepts file type filter, max size, multiple
- Shows file list with remove button
- Drag-over visual feedback
- Preview for images (thumbnail)

- [ ] Create all 3 files
- [ ] Verify build passes
- [ ] Commit: `feat: add Timeline, ConfirmDialog, FileUpload components`

---

## Task 3: TagInput, MultiSelect, MultiSelectSearch

**Files:**
- Create: `src/components/common/TagInput.tsx`
- Create: `src/components/common/MultiSelect.tsx`
- Create: `src/components/common/MultiSelectSearch.tsx`

### TagInput
- Input field with chips/tags
- Type + Enter to add tag
- Click X to remove
- Backspace removes last tag
- Optional suggestions dropdown

### MultiSelect
- Shadcn Popover + Command based
- Checkbox list of options
- Selected items shown as chips in trigger
- Select All / Clear All
- Grouped options support
- Max selection limit

### MultiSelectSearch (Select2-style)
- Async search with debounced API calls
- Type to search, results appear in dropdown
- Selected items as chips in input
- Keyboard navigation (arrows, enter, backspace)
- Optional "Create new" at bottom
- Props: onSearch (async), value, onChange, placeholder, allowCreate, debounceMs, renderOption

- [ ] Create all 3 files
- [ ] Verify build passes
- [ ] Commit: `feat: add TagInput, MultiSelect, MultiSelectSearch components`

---

## Task 4: BusinessMetricsTable

**Files:**
- Create: `src/components/common/BusinessMetricsTable.tsx`

### BusinessMetricsTable
Configurable tabbed table — the workhorse data display component.

- Shadcn Tabs + Table composition
- Props: tabs (TabConfig[]), cellFormatter (optional)
- Each tab: id, label, columns (ColumnDef[]), data
- Sticky header row within scrollable container
- Horizontal scroll for wide datasets
- Red cell logic via cellFormatter function
- Sortable columns (click header to sort)
- Pagination (page size selector + prev/next)

```typescript
interface ColumnDef {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface TabConfig {
  id: string
  label: string
  columns: ColumnDef[]
  data: Record<string, unknown>[]
}

interface BusinessMetricsTableProps {
  tabs: TabConfig[]
  cellFormatter?: (value: unknown, key: string, row: Record<string, unknown>) => { className?: string; display?: string }
  pageSize?: number
  className?: string
}
```

- [ ] Create file with full implementation
- [ ] Verify build passes
- [ ] Commit: `feat: add BusinessMetricsTable with configurable tabs, sorting, and pagination`

---

## Task 5: WorkflowStepper

**Files:**
- Create: `src/components/common/WorkflowStepper.tsx`

### WorkflowStepper
Visual horizontal stepper for workflows.

- Props: steps (StepConfig[]), currentStep, onStepClick
- Each step: id, label, icon (LucideIcon), status ('completed' | 'active' | 'pending' | 'failed')
- Visual: circles connected by lines, colored by status
- Completed = primary bg + check icon
- Active = primary ring + pulse
- Pending = muted bg
- Failed = destructive bg + X icon
- Clickable steps fire onStepClick
- Responsive: horizontal on desktop (md+), vertical on mobile

- [ ] Create file
- [ ] Verify build passes
- [ ] Commit: `feat: add WorkflowStepper component with step states and responsive layout`

---

## Task 6: MultiStepWizard

**Files:**
- Create: `src/components/common/MultiStepWizard.tsx`

### MultiStepWizard
Generic multi-step form wizard.

- Props: steps (WizardStep[]), onComplete, className
- Each step: id, label, component (React.ComponentType<{onNext, onPrev}>), validate? (() => boolean), optional?
- Visual progress bar at top showing step numbers + labels
- Current step highlighted
- Navigation: Next / Previous / Skip (if optional)
- Final step shows summary before submit
- Renders step.component with onNext/onPrev callbacks

- [ ] Create file
- [ ] Verify build passes
- [ ] Commit: `feat: add MultiStepWizard component with progress bar and step validation`

---

## Task 7: KanbanBoard

**Files:**
- Install: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Create: `src/components/common/KanbanBoard.tsx`

### KanbanBoard
Generic drag-and-drop Kanban board using @dnd-kit.

- Generic `<KanbanBoard<T>>` component
- Props: columns (KanbanColumnConfig[]), items (Record<columnId, T[]>), renderCard, onMoveAcross, onReorder
- Drag within column (reorder) and across columns (move)
- DragOverlay for live preview
- Column headers with count badge
- Scrollable columns
- Shimmer loading state

```typescript
interface KanbanColumnConfig {
  id: string
  label: string
  color?: string
}

interface KanbanBoardProps<T> {
  columns: KanbanColumnConfig[]
  items: Record<string, T[]>
  renderCard: (item: T) => React.ReactNode
  getItemId: (item: T) => string
  onMoveAcross?: (itemId: string, fromColumn: string, toColumn: string) => void
  onReorder?: (columnId: string, orderedIds: string[]) => void
  className?: string
}
```

- [ ] Install @dnd-kit packages
- [ ] Create file
- [ ] Verify build passes
- [ ] Commit: `feat: add KanbanBoard component with drag-and-drop via @dnd-kit`

---

## Task 8: Update DashboardPage to showcase components

**Files:**
- Modify: `src/modules/dashboard/DashboardPage.tsx`

Update the dashboard to demonstrate the new components:
- StatsRow with sample KPIs
- StatusBadge examples
- AvatarGroup example
- EmptyState example
- Timeline with mock entries
- Small BusinessMetricsTable demo

This serves as a visual verification page.

- [ ] Update DashboardPage
- [ ] Verify in browser
- [ ] Commit: `feat: update dashboard to showcase core components`
