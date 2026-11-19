import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Single source of truth for every typographic rule in the app.
 * Change a variant here → it propagates everywhere it's used.
 *
 * - Pick a `variant` by semantic role, not by scale.
 * - Use `tone` for colour. Don't sprinkle `text-muted-foreground` in className.
 * - Use `asChild` to wrap a `<Link>` / `<button>` / etc. while keeping the styles.
 * - Reach for `className` only for true one-offs (margin/width tweaks).
 */
const typographyVariants = cva("", {
  variants: {
    variant: {
      "page-title":
        "font-display text-[22px] font-[650] leading-tight tracking-[-0.02em]",
      "page-subtitle":
        "text-[13.5px] leading-relaxed",
      "section-title":
        "font-display text-xl font-semibold tracking-tight",
      "subsection-title":
        "font-display text-lg font-semibold tracking-tight",
      "card-title":
        "text-[13px] font-semibold leading-snug",
      "stat-value":
        "text-xl font-semibold leading-tight tracking-tight",
      "card-meta":
        "text-[11.5px] leading-snug",
      body:
        "text-sm leading-normal",
      "body-strong":
        "text-sm font-medium leading-normal",
      "body-sm":
        "text-[13px] leading-snug",
      "body-lg":
        "text-base leading-normal",
      helper:
        "text-xs leading-tight",
      caption:
        "text-[11px] leading-tight",
      badge:
        "text-[10px] font-medium uppercase tracking-wide leading-none",
      micro:
        "text-[10px] leading-tight",
      mono:
        "font-mono text-[13px] leading-snug",

      // ── Dashboard roles (erp-demo scale) ──────────────────────────────
      // One variant per role so every widget renders the same role the same
      // way. The 11px roles are written as 0.6875rem ON PURPOSE: comprint.css
      // has a legacy `[data-module] .text-[11px].uppercase` rule (still used
      // by the sidebar and several forms) that would force weight 600 /
      // 0.085em onto them. Same size, different class, rule doesn't match.
      // Plan: comprint-erp-docs/modules/crm/dashboard/DASHBOARD_TYPOGRAPHY_PLAN.md
      eyebrow:
        "text-[0.6875rem] font-[650] uppercase tracking-[0.08em] leading-tight",
      "kpi-label":
        "text-[0.6875rem] font-semibold uppercase tracking-[0.08em] leading-[1.4]",
      "kpi-value":
        "text-2xl font-[650] leading-[1.15] tracking-[-0.025em] tabular-nums",
      "kpi-value-sm":
        "text-lg font-semibold leading-[1.4] tabular-nums",
      // Dense tile pair — for KPI tiles packed 3-4 across inside ONE widget
      // (Sales Team roll-ups), where the 11px label truncates and an 18px
      // figure overpowers the table under it. erp-demo's "mini-metric" chip.
      "kpi-label-sm":
        "text-[10px] font-medium uppercase tracking-[0.05em] leading-[1.4]",
      "kpi-value-xs":
        "text-[15px] font-medium leading-snug tabular-nums",
      "table-header":
        "text-[0.6875rem] font-medium uppercase tracking-[0.06em] leading-tight",
      "table-cell":
        "text-[13px] leading-[1.45]",
      // The two dashboard-table roles every widget shares — change them here
      // and every dashboard table follows:
      //   table-name   → the row's label (rep, account, category, period).
      //                  Regular weight in the softer `label` tone: you scan
      //                  by it, you don't read it as data.
      //   table-figure → the row's KEY figure (revenue, value closed, totals).
      //                  Medium weight, full foreground — the darkest thing on
      //                  the row. Secondary figures stay plain `table-cell`.
      "table-name":
        "text-[13px] leading-[1.45]",
      "table-figure":
        "text-[13px] font-medium leading-[1.45] tabular-nums",
      "table-secondary":
        "text-xs leading-[1.33]",
      "widget-subtitle":
        "text-[12.5px] leading-snug",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      label: "text-label-foreground",
      primary: "text-primary",
      success: "text-success",
      danger: "text-destructive",
      warning: "text-warning",
      info: "text-info",
      inherit: "",
    },
    align: {
      start: "text-start",
      center: "text-center",
      end: "text-end",
    },
    truncate: {
      true: "block truncate",
      false: "",
    },
    numeric: {
      true: "tabular-nums",
      false: "",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
    truncate: false,
    numeric: false,
  },
})

/** Default HTML element per variant. Override with `asChild` + a custom child. */
const VARIANT_TAG: Record<NonNullable<TypographyVariant>, keyof React.JSX.IntrinsicElements> = {
  "page-title": "h1",
  "page-subtitle": "p",
  "section-title": "h2",
  "subsection-title": "h3",
  "card-title": "h4",
  "stat-value": "p",
  "card-meta": "p",
  body: "p",
  "body-strong": "p",
  "body-sm": "p",
  "body-lg": "p",
  helper: "span",
  caption: "span",
  badge: "span",
  micro: "span",
  mono: "span",
  eyebrow: "h2",
  "kpi-label": "span",
  "kpi-value": "p",
  "kpi-value-sm": "p",
  "kpi-label-sm": "span",
  "kpi-value-xs": "p",
  "table-header": "span",
  "table-cell": "span",
  "table-name": "span",
  "table-figure": "span",
  "table-secondary": "span",
  "widget-subtitle": "p",
}

/** Variants whose tone defaults to something other than `default`. */
const DEFAULT_TONE: Partial<Record<TypographyVariant, TypographyTone>> = {
  "page-subtitle": "muted",
  "card-meta": "muted",
  helper: "muted",
  caption: "muted",
  "table-secondary": "muted",
  "widget-subtitle": "muted",
  // Headers and KPI labels sit between body text and muted — see the
  // `--label-foreground` token in themes.css.
  "kpi-label": "label",
  "kpi-label-sm": "label",
  "table-header": "label",
  "table-name": "label",
}

type TypographyVariant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>
type TypographyTone = NonNullable<VariantProps<typeof typographyVariants>["tone"]>

type TypographyOwnProps = {
  variant?: TypographyVariant
  tone?: TypographyTone
  align?: "start" | "center" | "end"
  truncate?: boolean
  numeric?: boolean
  /**
   * When true, Typography renders nothing of its own — it clones the single
   * React child, merging classes and forwarded props onto it. Use this to
   * wrap a `<Link>`, `<button>`, or any element with Typography styles while
   * preserving its native semantics.
   */
  asChild?: boolean
  className?: string
  children?: React.ReactNode
}

type TypographyProps = TypographyOwnProps &
  Omit<React.HTMLAttributes<HTMLElement>, keyof TypographyOwnProps>

function Typography({
  variant = "body",
  tone,
  align,
  truncate = false,
  numeric = false,
  asChild = false,
  className,
  children,
  ...rest
}: TypographyProps) {
  const resolvedTone: TypographyTone =
    tone ?? DEFAULT_TONE[variant] ?? "default"

  const classes = cn(
    typographyVariants({
      variant,
      tone: resolvedTone,
      align,
      truncate,
      numeric,
    }),
    className
  )

  // Lightweight Slot: clone the single ELEMENT child, merging className + props.
  // No @radix-ui/react-slot dep — keeps the bundle slim. If `asChild` is set but
  // the child isn't a single valid element (e.g. a plain string), fall through
  // to normal rendering instead of throwing `React.Children.only(...)`.
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string
    }>
    return React.cloneElement(child, {
      ...rest,
      ...(child.props ?? {}),
      className: cn(classes, child.props?.className),
    } as React.HTMLAttributes<HTMLElement> & { className?: string })
  }

  const Tag = VARIANT_TAG[variant]
  return React.createElement(
    Tag,
    { "data-slot": "typography", className: classes, ...rest },
    children
  )
}

export {
  Typography,
  typographyVariants,
  type TypographyProps,
  type TypographyVariant,
  type TypographyTone,
}
