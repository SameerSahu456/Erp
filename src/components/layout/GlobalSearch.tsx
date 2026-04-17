import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  label: string
  href: string
  module: string
}

const MOCK_SEARCH_ITEMS: SearchResult[] = [
  { id: '1', label: 'CRM Dashboard', href: '/crm', module: 'CRM' },
  { id: '2', label: 'Leads', href: '/crm/leads', module: 'CRM' },
  { id: '3', label: 'Deals', href: '/crm/deals', module: 'CRM' },
  { id: '4', label: 'Accounts', href: '/crm/accounts', module: 'CRM' },
  { id: '5', label: 'WMS Dashboard', href: '/wms', module: 'Warehouse' },
  { id: '6', label: 'Inspection', href: '/wms/inspection', module: 'Warehouse' },
  { id: '7', label: 'Inventory', href: '/ims/inventory', module: 'Inventory' },
  { id: '8', label: 'Stock Items', href: '/ims/stock-items', module: 'Inventory' },
  { id: '9', label: 'Purchase Requests', href: '/procurement/pr', module: 'Procurement' },
  { id: '10', label: 'Invoices', href: '/invoices', module: 'Invoices' },
  { id: '11', label: 'Ledger', href: '/accounting/ledger', module: 'Accounting' },
  { id: '12', label: 'Vendors', href: '/vendors', module: 'Vendors' },
  { id: '13', label: 'Customers', href: '/customers', module: 'Customers' },
  { id: '14', label: 'Rental Contracts', href: '/rentals/contracts', module: 'Rentals' },
  { id: '15', label: 'Reports', href: '/reports', module: 'Reports' },
  { id: '16', label: 'User Management', href: '/settings/users', module: 'Settings' },
]

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  const groups = MOCK_SEARCH_ITEMS.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.module]) acc[item.module] = []
    acc[item.module]!.push(item)
    return acc
  }, {})

  return (
    <>
      <Button variant="outline" className="h-9 w-9 md:w-60 md:justify-start md:px-3 gap-2 text-muted-foreground border-border/50 bg-muted/30 hover:bg-accent/50" onClick={() => setOpen(true)}>
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline text-[13px]">Search...</span>
        <kbd className="hidden md:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded-md border border-border/50 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search modules, pages, entities..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groups).map(([module, items]) => (
            <CommandGroup key={module} heading={module}>
              {items.map((item) => (
                <CommandItem key={item.id} onSelect={() => handleSelect(item.href)}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
