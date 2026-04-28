import * as React from "react"

import { cn } from "@/lib/utils"

// ── Premium chart colour palette ──────────────────────────────────────────
// Each accent has a 3-stop gradient (light → mid → deep) plus a solid mid
// tone, keeping bar/pie/line visuals on the same colour language as the
// dashboard StatsRow + WorkflowStepper accents.

export type ChartAccent =
  | "primary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "violet"
  | "teal"
  | "rose"
  | "pink"
  | "cyan"
  | "emerald"
  | "amber"
  | "sky"
  | "indigo"
  | "orange"
  | "slate"

interface AccentColor {
  from: string
  via: string
  to: string
  solid: string
}

export const CHART_COLORS: Record<ChartAccent, AccentColor> = {
  primary: { from: "#64748b", via: "#334155", to: "#0f172a", solid: "#1e293b" },
  success: { from: "#6ee7b7", via: "#34d399", to: "#047857", solid: "#10b981" },
  info: { from: "#7dd3fc", via: "#3b82f6", to: "#1d4ed8", solid: "#0ea5e9" },
  warning: { from: "#fde68a", via: "#fbbf24", to: "#d97706", solid: "#f59e0b" },
  danger: { from: "#fda4af", via: "#fb7185", to: "#be123c", solid: "#ef4444" },
  violet: { from: "#c4b5fd", via: "#8b5cf6", to: "#6d28d9", solid: "#8b5cf6" },
  teal: { from: "#5eead4", via: "#14b8a6", to: "#0f766e", solid: "#14b8a6" },
  rose: { from: "#fda4af", via: "#f43f5e", to: "#9f1239", solid: "#f43f5e" },
  pink: { from: "#f9a8d4", via: "#ec4899", to: "#9d174d", solid: "#ec4899" },
  cyan: { from: "#67e8f9", via: "#06b6d4", to: "#0e7490", solid: "#06b6d4" },
  emerald: { from: "#6ee7b7", via: "#10b981", to: "#047857", solid: "#10b981" },
  amber: { from: "#fde68a", via: "#f59e0b", to: "#b45309", solid: "#f59e0b" },
  sky: { from: "#7dd3fc", via: "#0ea5e9", to: "#0369a1", solid: "#0ea5e9" },
  indigo: { from: "#a5b4fc", via: "#6366f1", to: "#4338ca", solid: "#6366f1" },
  orange: { from: "#fdba74", via: "#f97316", to: "#c2410c", solid: "#f97316" },
  slate: { from: "#cbd5e1", via: "#94a3b8", to: "#475569", solid: "#94a3b8" },
}

// Default rotation palette for series without an explicit accent.
export const CHART_PALETTE_KEYS: ChartAccent[] = [
  "info",
  "violet",
  "emerald",
  "amber",
  "rose",
  "teal",
  "indigo",
  "pink",
  "orange",
  "cyan",
]

export const CHART_PALETTE = CHART_PALETTE_KEYS.map((k) => CHART_COLORS[k].solid)

// Map common legacy hex values → accent key, so existing dashboards keep
// working when we swap their flat fills for gradients.
export const HEX_TO_ACCENT: Record<string, ChartAccent> = {
  // slate / neutral
  "#94a3b8": "slate",
  "#64748b": "slate",
  // indigo / blue
  "#6366f1": "indigo",
  "#3b82f6": "info",
  "#0ea5e9": "sky",
  // amber / warning
  "#f59e0b": "amber",
  "#eab308": "amber",
  "#fbbf24": "warning",
  // red / rose
  "#ef4444": "danger",
  "#f43f5e": "rose",
  // green / emerald
  "#22c55e": "emerald",
  "#10b981": "emerald",
  // violet
  "#8b5cf6": "violet",
  "#a78bfa": "violet",
  "#6938ef": "violet",
  // teal / cyan
  "#14b8a6": "teal",
  "#06b6d4": "cyan",
  // pink
  "#ec4899": "pink",
}

export function hexToAccent(hex: string, fallback: ChartAccent = "slate"): ChartAccent {
  return HEX_TO_ACCENT[hex.toLowerCase()] ?? fallback
}

// ── Gradient ID helpers ───────────────────────────────────────────────────

const PREFIX_V = "cpt-grad-v" // vertical: top → bottom (column bars)
const PREFIX_H = "cpt-grad-h" // horizontal: left → right (row bars + line strokes)
const PREFIX_R = "cpt-grad-r" // radial: center → edge (pie slices)

export const verticalGradId = (accent: ChartAccent) => `${PREFIX_V}-${accent}`
export const horizontalGradId = (accent: ChartAccent) => `${PREFIX_H}-${accent}`
export const radialGradId = (accent: ChartAccent) => `${PREFIX_R}-${accent}`

export const verticalFill = (accent: ChartAccent) => `url(#${verticalGradId(accent)})`
export const horizontalFill = (accent: ChartAccent) =>
  `url(#${horizontalGradId(accent)})`
export const radialFill = (accent: ChartAccent) => `url(#${radialGradId(accent)})`

// ── <ChartDefs /> — drop inside any chart to enable premium fills ──────────

interface ChartDefsProps {
  /** Limit the gradient set; defaults to every accent. */
  accents?: ChartAccent[]
  /** Whether to register the soft drop-shadow filter (id: "cpt-chart-shadow"). */
  shadow?: boolean
}

export function ChartDefs({ accents, shadow = true }: ChartDefsProps) {
  const list = accents ?? (Object.keys(CHART_COLORS) as ChartAccent[])
  return (
    <defs>
      {list.map((key) => {
        const c = CHART_COLORS[key]
        return (
          <React.Fragment key={key}>
            {/* Vertical (column bars: bright on top → deep at base) */}
            <linearGradient id={verticalGradId(key)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.from} stopOpacity={0.95} />
              <stop offset="60%" stopColor={c.via} stopOpacity={1} />
              <stop offset="100%" stopColor={c.to} stopOpacity={1} />
            </linearGradient>
            {/* Horizontal (row bars + line strokes: deep at start → bright at end) */}
            <linearGradient id={horizontalGradId(key)} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={c.to} stopOpacity={1} />
              <stop offset="50%" stopColor={c.via} stopOpacity={1} />
              <stop offset="100%" stopColor={c.from} stopOpacity={0.95} />
            </linearGradient>
            {/* Radial (pie slices: bright at outer edge → deep at center) */}
            <radialGradient
              id={radialGradId(key)}
              cx="50%"
              cy="50%"
              r="65%"
              fx="50%"
              fy="40%"
            >
              <stop offset="0%" stopColor={c.from} stopOpacity={1} />
              <stop offset="60%" stopColor={c.via} stopOpacity={1} />
              <stop offset="100%" stopColor={c.to} stopOpacity={0.95} />
            </radialGradient>
          </React.Fragment>
        )
      })}
      {shadow && (
        <filter
          id="cpt-chart-shadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
          <feOffset dx="0" dy="1.5" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
    </defs>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string | number
  value?: string | number | (string | number)[]
  color?: string
  payload?: { fill?: string; stroke?: string; [k: string]: unknown }
}

/** Resolve a Recharts fill/stroke reference into a swatch-able solid colour. */
function resolveSwatchColor(c?: string): string {
  if (!c) return "currentColor"
  // url(#cpt-grad-{v|h|r}-{accent}) → CHART_COLORS[accent].solid
  const m = c.match(/cpt-grad-[vhr]-(\w+)\)/)
  if (m) {
    const accent = m[1] as ChartAccent
    return CHART_COLORS[accent]?.solid ?? "currentColor"
  }
  return c
}

interface PremiumTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string | number
  formatter?: (
    value: number | string,
    name: string,
    item: TooltipPayloadItem,
  ) => [string | number, string] | string | number
  labelFormatter?: (label: string | number) => string
}

export function PremiumTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: PremiumTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-lg shadow-foreground/5 backdrop-blur-md">
      {label != null && label !== "" && (
        <p className="mb-1.5 font-semibold text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const name = String(item.name ?? "")
          const rawValue = Array.isArray(item.value)
            ? item.value.join(", ")
            : (item.value ?? "")
          const formatted = formatter
            ? formatter(rawValue as number | string, name, item)
            : rawValue
          const [displayValue, displayName] = Array.isArray(formatted)
            ? formatted
            : [formatted, name]
          const dotColor = resolveSwatchColor(
            item.color ?? item.payload?.stroke ?? item.payload?.fill,
          )
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block size-2 shrink-0 rounded-full ring-2 ring-popover"
                style={{ background: dotColor as string }}
              />
              {displayName && (
                <span className="text-muted-foreground">{displayName}:</span>
              )}
              <span className="font-semibold tabular-nums text-foreground">
                {String(displayValue)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Static style/prop presets (for charts that pass plain objects) ────────

export const PREMIUM_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border) / 0.6)",
  borderRadius: 10,
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 10px 30px -12px rgb(15 23 42 / 0.22)",
  backdropFilter: "blur(8px)",
}

export const PREMIUM_TOOLTIP_CURSOR_BAR = {
  fill: "hsl(var(--foreground) / 0.04)",
}

export const PREMIUM_TOOLTIP_CURSOR_LINE = {
  stroke: "hsl(var(--foreground) / 0.18)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
}

interface PremiumChartCardProps {
  title?: React.ReactNode
  className?: string
  children: React.ReactNode
  /** Decorative ambient blob colours (defaults to violet + sky). */
  glowAccents?: [ChartAccent, ChartAccent]
}

export function PremiumChartCard({
  title,
  className,
  children,
  glowAccents = ["violet", "sky"],
}: PremiumChartCardProps) {
  const a = CHART_COLORS[glowAccents[0]].via
  const b = CHART_COLORS[glowAccents[1]].via
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-[0.08] blur-3xl"
        style={{ background: a }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full opacity-[0.08] blur-3xl"
        style={{ background: b }}
        aria-hidden
      />
      {title && (
        <div className="relative px-5 pt-5 text-sm font-semibold text-foreground">
          {title}
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
