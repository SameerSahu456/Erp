import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

import { LEADS_STRINGS as S } from "./leads.strings"

interface LeadDetailMessageProps {
  title: string
  message: string
  showBack?: boolean
}

// Centered fallback block for the lead detail page (not-found / loading /
// error). `showBack` renders the "Back to Leads" link.
export function LeadDetailMessage({ title, message, showBack = false }: LeadDetailMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      {showBack && (
        <Button variant="outline" render={<Link to="/crm/leads" />}>
          {S.detail.back}
        </Button>
      )}
    </div>
  )
}
