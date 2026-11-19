import { useEffect, useState, type ReactNode } from "react";
import { UI } from "@/shared/constants"
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchResult {
  id: string;
  label: string;
  href: string;
  module: string;
}

const MOCK_SEARCH_ITEMS: SearchResult[] = [
  { id: "1", label: "Dashboard", href: "/", module: "Home" },
  { id: "2", label: "Parts", href: "/ims/parts", module: "Inventory" },
  { id: "3", label: "Categories", href: "/ims/categories", module: "Inventory" },
  { id: "4", label: "OEMs", href: "/ims/oems", module: "Inventory" },
  { id: "5", label: "Stock Items", href: "/ims/stock-items", module: "Inventory" },
  { id: "6", label: "PM Assignments", href: "/ims/pm-assignments", module: "Inventory" },
  { id: "8", label: "Leads", href: "/crm/leads", module: "CRM" },
  { id: "9", label: "Deals", href: "/crm/deals", module: "CRM" },
  { id: "10", label: "Accounts", href: "/crm/accounts", module: "CRM" },
  { id: "11", label: "Quotes", href: "/crm/quotes", module: "CRM" },
  { id: "12", label: "Sales Orders", href: "/crm/sales-orders", module: "CRM" },
  { id: "13", label: "WMS Dashboard", href: "/wms", module: "Warehouse" },
  { id: "14", label: "Inspection", href: "/wms/inspection", module: "Warehouse" },
  { id: "15", label: "Devices", href: "/wms/devices", module: "Warehouse" },
  { id: "16", label: "Purchase Requests", href: "/procurement/pr", module: "Procurement" },
  { id: "17", label: "Purchase Orders", href: "/procurement/po", module: "Procurement" },
  { id: "18", label: "Vendors", href: "/procurement/vendors", module: "Procurement" },
  { id: "19", label: "Reports", href: "/reports", module: "Reports" },
  { id: "20", label: "User Management", href: "/settings/users", module: "Settings" },
];

/**
 * Headless dialog + ⌘K shortcut. Mount once per page; provide your own trigger via children.
 * Children receives an `open` callback they can attach to whatever trigger element they want.
 */
export function GlobalSearchProvider({
  children,
}: {
  children: (api: { open: () => void }) => ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  const groups = MOCK_SEARCH_ITEMS.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.module]) acc[item.module] = [];
    acc[item.module]!.push(item);
    return acc;
  }, {});

  return (
    <>
      {children({ open: () => setIsOpen(true) })}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder="Search modules, pages, entities..." maxLength={UI.FILTER_SEARCH_MAX_LENGTH} />
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
  );
}

/**
 * Compact search button with ⌘K kbd hint. Suitable for mobile or anywhere a compact trigger is needed.
 * For the prominent inline desktop bar, use the inline trigger inside Header directly.
 */
export function GlobalSearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-white/5"
      onClick={onOpen}
      aria-label="Open search"
    >
      <Search className="h-4 w-4" />
    </Button>
  );
}
