import { useEffect, useRef, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { usePermission } from "@shared/rbac"
import {
  entityPath,
  entityPermissionForPath,
  type EntityKind,
} from "@shared/lib/entityRoutes"
import { ENTITY_REF_STRINGS as S } from "./entity-ref.strings"

// Delay before a single click acts, so a double click (copy) can pre-empt the
// navigation. Long enough to catch the second click, short enough not to feel
// laggy on a plain click.
const SINGLE_CLICK_DELAY_MS = 200

interface EntityRefProps {
  /** The kind of record this identifier belongs to (drives the detail route
   *  AND the access check). Omit when passing an explicit `href`. */
  kind?: EntityKind
  /** The record's id — the route is built from this, NOT from the label. */
  id?: string | null | undefined
  /** An explicit detail route, for callers that already hold one (e.g. a table
   *  row's href). Takes precedence over `kind` + `id`. */
  href?: string
  /** Override the RBAC codes gating navigation (OR-bundle). Defaults to the
   *  kind's registered permission; useful with `href` where there's no kind. */
  permission?: string | readonly string[]
  /** The exact text copied; defaults to the rendered label. */
  value?: string
  /** Without access to the target, a click shows this error toast (default:
   *  a generic no-permission message) and never navigates. */
  noAccessMessage?: string
  /** What renders; defaults to `value`. */
  children?: ReactNode
  className?: string
}

/** Where the identifier points, whether that is the current page, and whether
 *  the user may open it. */
function useEntityTarget(
  kind: EntityKind | undefined,
  id: string | null | undefined,
  href: string | undefined,
  permission: string | readonly string[] | undefined,
) {
  const { pathname } = useLocation()
  const { can } = usePermission()
  const path = href ?? (kind ? entityPath(kind, id) : null)
  // Self-reference: already on this record's page. `startsWith` so a nested tab
  // (`/wms/devices/<id>/...`) still counts as "here".
  const isSelf =
    path != null && (pathname === path || pathname.startsWith(`${path}/`))
  // The target route's access requirement: an explicit override, else the
  // permission registered for the resolved path (covers both kind- and
  // href-mode). null = not statically gated → navigable.
  const required = permission ?? (path ? entityPermissionForPath(path) : null)
  return { path, isSelf, mayOpen: required == null || can(required) }
}

/**
 * A record identifier (WA / dispatch / MI number, barcode, id …) shown anywhere
 * in the app.
 *
 *  - If the current user can open the target record: **single click** opens its
 *    detail page, **double click** copies the value.
 *  - If the user LACKS access to that page: a single click shows a
 *    no-permission toast and stays put — a user is never redirected to a page
 *    they'd be denied. Double click still copies.
 *
 * Two more guards: it renders plain inert text when the kind isn't routable /
 * the id is missing, and when the current page already IS this record's detail
 * page (clicking your own number must not fire a redundant navigation).
 */
export function EntityRef({
  kind,
  id,
  href,
  permission,
  value,
  noAccessMessage,
  children,
  className,
}: EntityRefProps) {
  const navigate = useNavigate()
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const { path, isSelf, mayOpen } = useEntityTarget(kind, id, href, permission)

  const label = children ?? value
  const copyValue =
    value ?? (typeof children === "string" ? children : (id ?? ""))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue)
      toast.success(S.copied)
    } catch {
      toast.error(S.copyFailed)
    }
  }

  // Not routable, or already on this record's page → plain inert text.
  if (!path || isSelf) {
    return <span className={className}>{label}</span>
  }

  // No access → a single click explains (toast) instead of navigating, and it
  // isn't styled as a link (nothing to open).
  const onSingleClick = mayOpen
    ? () => navigate(path)
    : () => toast.error(noAccessMessage ?? S.noAccess)

  return (
    <button
      type="button"
      title={mayOpen ? S.hint : S.noAccessHint}
      onClick={(e) => {
        // Clicking the identifier is its own action, never the surrounding
        // row's (an EntityRef often sits inside a clickable table row).
        e.stopPropagation()
        // Defer the single-click action so a double click can cancel it and copy instead.
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(onSingleClick, SINGLE_CLICK_DELAY_MS)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        window.clearTimeout(timer.current)
        void copy()
      }}
      className={cn(
        "max-w-full cursor-pointer text-left transition-colors",
        mayOpen ? "text-primary hover:underline" : "hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  )
}
