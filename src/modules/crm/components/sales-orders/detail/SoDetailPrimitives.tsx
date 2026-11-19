import type React from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatINR } from "@/lib/currency"

import type { AccountAddressWire } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function SectionCard({
  title,
  icon,
  padded = true,
  children,
}: {
  title: string
  icon?: React.ReactNode
  padded?: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className={padded ? "p-5" : "p-0"}>
        <div
          className={
            padded
              ? "mb-3 flex items-center gap-2"
              : "flex items-center gap-2 border-b border-border px-5 py-3"
          }
        >
          {icon}
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        </div>
        <div className={padded ? "" : "px-5 py-4"}>{children}</div>
      </CardContent>
    </Card>
  )
}

export function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    // ``min-w-0`` is load-bearing: this div is a grid item in the two-column
    // ``dl`` above, and a grid item defaults to ``min-width: auto`` — it refuses
    // to shrink below its content's min-content width. A long unbroken value
    // (e.g. a contact with two comma-joined email addresses) therefore spilled
    // out of its track and overlapped the neighbouring row.
    <div className="flex min-w-0 items-start gap-3 py-2">
      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </dt>
        {/* ``break-words`` lets an unbroken run (email address, URL) wrap
            instead of forcing the row wider than its column. */}
        <dd className="mt-0.5 break-words text-[13.5px] text-foreground">{children}</dd>
      </div>
    </div>
  )
}

export function AddressBlock({
  address,
  loading,
  // Kept for callers; never shown — a raw id means nothing to a reader.
  fallbackId: _fallbackId,
}: {
  address: AccountAddressWire | undefined
  loading: boolean
  fallbackId: string
}) {
  if (loading && !address) {
    return <p className="text-sm text-muted-foreground">{S.detail.address.loading}</p>
  }
  if (!address) {
    return (
      <p className="text-sm text-muted-foreground">
        {S.detail.address.notFound}
      </p>
    )
  }
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {address.label && (
          <span className="font-semibold text-foreground">{address.label}</span>
        )}
        {address.is_default && (
          <Badge variant="secondary" className="text-[10px]">
            {S.detail.address.default}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
      </p>
      <p className="text-muted-foreground">
        {address.city}, {address.state} — {address.pincode}
      </p>
    </div>
  )
}

export function LinkedDocCard({
  label,
  value,
  href,
  icon,
}: {
  label: string
  value: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/25"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13.5px] font-semibold text-foreground">
          {value}
        </p>
      </div>
    </Link>
  )
}

export function TotalsRow({
  label,
  value,
  muted,
  strong,
}: {
  label: string
  value: number
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "text-base font-semibold" : ""} ${
          muted ? "text-muted-foreground" : ""
        }`}
      >
        {formatINR(value)}
      </dd>
    </div>
  )
}
