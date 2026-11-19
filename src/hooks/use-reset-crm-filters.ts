import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

import { clearPersistedState } from "./use-persisted-state"

// CRM list-page filter state (search, status/stage/priority filters, sort,
// pagination, active tab) is persisted to sessionStorage via
// `usePersistedState` / `CrmDataTable`'s `persistKey`, so it survives
// list → detail → back WITHIN a section. It should NOT, however, bleed
// across sections: filtering Leads, opening Deals, then returning to Leads
// must show a clean Leads list.
//
// This maps each CRM section (keyed by its `/crm/<segment>` route segment)
// to the sessionStorage key PREFIXES that hold its persisted state — both
// the page-level `usePersistedState` keys and the `CrmDataTable` keys
// (`bmt:<persistKey>:…`). When the user moves to a different section — or
// leaves CRM entirely — the section they left is wiped.
//
// Adding a new CRM list page? Add its route segment + key prefixes here.
const CRM_SECTION_KEY_PREFIXES: Record<string, string[]> = {
  leads: ["leads:", "bmt:crm-leads:"],
  "rejected-leads": ["bmt:crm-rejected-leads:"],
  deals: ["deals:", "bmt:crm-deals:"],
  accounts: ["accounts:", "bmt:crm-accounts:"],
  contacts: ["contacts:", "bmt:crm-contacts:"],
  "material-inquiries": ["material-inquiries:", "bmt:material-inquiries-v2:"],
  "demo-requests": ["bmt:crm-demo-requests-server-v1:"],
  invoices: ["bmt:crm-invoices:"],
  "purchase-requests": ["bmt:crm-purchase-requests:"],
  "sales-orders": ["sales-orders:", "bmt:crm-sales-orders:"],
  tasks: ["crm-tasks:"],
  meetings: ["crm-meetings:"],
}

// Every CRM filter prefix, flattened — the wipe set when leaving CRM.
const ALL_CRM_KEY_PREFIXES = Object.values(CRM_SECTION_KEY_PREFIXES).flat()

// Remove every sessionStorage key that starts with one of `prefixes`.
// Keys are collected first, then removed, so we never mutate the store
// mid-iteration.
function clearByPrefixes(prefixes: string[]): void {
  if (prefixes.length === 0) return
  const doomed: string[] = []
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && prefixes.some((p) => key.startsWith(p))) doomed.push(key)
    }
  } catch {
    return // storage unavailable — nothing to do
  }
  doomed.forEach(clearPersistedState)
}

// Derive the CRM section from a pathname:
//   `/crm/leads` → "leads", `/crm/leads/123/edit` → "leads",
//   `/ims/parts` → null (not a CRM route).
function crmSectionOf(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean)
  if (segs[0] !== "crm") return null
  return segs[1] ?? null
}

/**
 * Resets each CRM section's persisted list-page filters when the user
 * navigates away from that section. Mounted once in `AppShell`.
 *
 * Within a section (list ↔ detail ↔ form share the `/crm/<segment>` root)
 * filters are preserved; crossing into another section — or leaving CRM —
 * wipes the section left behind so it opens fresh next time.
 */
export function useResetCrmFiltersOnSectionChange(): void {
  const { pathname } = useLocation()
  const section = crmSectionOf(pathname)
  // `undefined` = not yet initialised; `null` = a non-CRM route.
  const prevSection = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    // First run just records where we landed — nothing to reset yet.
    if (prevSection.current === undefined) {
      prevSection.current = section
      return
    }
    if (prevSection.current === section) return
    prevSection.current = section

    // Wipe every CRM section except the one now active. This covers both
    // section → section moves and leaving CRM (section === null → keep
    // nothing → wipe everything).
    const keep = section ? (CRM_SECTION_KEY_PREFIXES[section] ?? []) : []
    clearByPrefixes(ALL_CRM_KEY_PREFIXES.filter((p) => !keep.includes(p)))
  }, [section])
}
