import type { Meta, StoryObj } from '@storybook/react-vite'

import { ELLIPSIS, paginationWindow } from '@/shared/lib/pagination-window'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination'

const meta = {
  title: 'Navigation/Pagination',
  component: Pagination,
  tags: ['autodocs'],
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

// Static representative example — mirrors crm/.../TasksPage.tsx footer.
export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}

// Renders the shared `paginationWindow` sequence through the primitives — the
// same wiring CrmListPaginationFooter / TablePagination use in the app.
function WindowedPager({ current, totalPages }: { current: number; totalPages: number }) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        {paginationWindow(current, totalPages).map((p, idx) =>
          p === ELLIPSIS ? (
            <PaginationItem key={`gap-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href="#" isActive={p === current}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

// Long range (30 pages) on an early page → 1 2 3 4 5 … 30.
export const LongRangeEarly: Story = {
  render: () => <WindowedPager current={1} totalPages={30} />,
}

// Long range (30 pages) on a middle page → 1 … 6 7 8 9 10 … 30 (centered window).
export const LongRangeMiddle: Story = {
  render: () => <WindowedPager current={8} totalPages={30} />,
}

// Long range (30 pages) on a late page → 1 … 26 27 28 29 30.
export const LongRangeLate: Story = {
  render: () => <WindowedPager current={30} totalPages={30} />,
}
