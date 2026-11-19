import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CopyableText } from '@/components/common/display/CopyableText'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { Typography } from '@/components/ui/typography'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { PAGE_SHELLS_STRINGS } from './page-shells.strings'
import { useOpticalLeftInset } from './useOpticalLeftInset'

interface EntityHeaderProps {
  title: string
  /** Render the title as a click-to-copy record number (plain text; copies on
   *  click with a "Copied" toast). For headers whose title IS the number. */
  titleCopyable?: boolean
  /** Text, or a node when part of it links somewhere (e.g. the parent part). */
  subtitle?: React.ReactNode
  /** Record number / code (e.g. a lead code or deal number) shown as a muted
   *  line right under the title row — also on sticky headers, where the
   *  subtitle is hidden. */
  reference?: string
  status?: { label: string; variant: StatusBadgeVariant }
  badges?: React.ReactNode
  /** Single owner (backward compat) */
  owner?: { name: string; role?: string }
  /** Multiple owners — shown as overlapping avatar group */
  owners?: { name: string; role?: string }[]
  backHref: string
  /** When provided, the back button calls this instead of the default
   *  history-back / `backHref` fallback. Lets a create flow force an exact
   *  destination (e.g. returning to a list after a conversion wizard). */
  onBack?: () => void
  actions?: React.ReactNode
  /**
   * When true, the header pins to the viewport top (just below the global Header)
   * with a horizontal bleed to the page edges, backdrop blur, and lift shadow.
   * Use on long detail pages where the actions bar should remain reachable.
   */
  sticky?: boolean
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  'bg-rose-500/10 text-rose-700 dark:text-rose-400',
]

function EntityHeader({
  title,
  titleCopyable = false,
  subtitle,
  reference,
  status,
  badges,
  owner,
  owners,
  backHref,
  onBack,
  actions,
  sticky = false,
  className,
}: EntityHeaderProps) {
  const ownerList = owners ?? (owner ? [owner] : [])
  const goBack = useNavigateBack(backHref)
  const isAllCaps = /[A-Z]/.test(title) && title === title.toUpperCase()
  // Remove the built-in left space of the first letter (title + record number) so
  // both lines start on the same visible edge — see useOpticalLeftInset.
  const titleInsetRef = useOpticalLeftInset<HTMLHeadingElement>(title)
  const referenceInsetRef = useOpticalLeftInset<HTMLDivElement>(
    reference || (typeof subtitle === "string" ? subtitle : undefined),
    1,
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        sticky
          ? 'sticky top-14 z-30 -mx-5 border-b border-border bg-card/90 px-5 py-3.5 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04),0_4px_16px_-6px_rgb(var(--shadow-rgb)/0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/75 lg:-mx-7 lg:px-7'
          : 'mb-1',
        className
      )}
    >
      <div className="flex min-w-0 flex-col">
        {/* Back button + title row — vertically centered with each other */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack ?? goBack}
            aria-label={PAGE_SHELLS_STRINGS.entityHeader.goBackAriaLabel}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)] transition-all hover:-translate-y-px hover:border-primary/25 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {/* A long title (e.g. a 100-char part name) ellipsizes on one line
                and reveals in full in a styled, wrapping tooltip on hover —
                never the raw browser `title=` tooltip (§10c). */}
            <TooltipProvider delay={120}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <h1
                      ref={titleInsetRef}
                      className={cn(
                        'min-w-0 cursor-default truncate font-[650] leading-tight text-foreground',
                        // Tight negative tracking suits mixed case but cramps ALL-CAPS
                        // titles (lead / deal / account names are upper-cased), so caps
                        // titles keep the font's natural spacing. `!` is needed: the
                        // global `[data-module] h1 { letter-spacing }` rule outranks a
                        // plain utility class.
                        isAllCaps ? 'tracking-normal!' : 'tracking-[-0.02em]',
                        sticky ? 'text-[18px]' : 'text-[22px]'
                      )}
                    >
                      {titleCopyable ? (
                        <CopyableText
                          value={title}
                          nativeTitle={false}
                          className="block w-full cursor-pointer truncate"
                        >
                          {title}
                        </CopyableText>
                      ) : (
                        title
                      )}
                    </h1>
                  }
                />
                <TooltipContent className="max-w-[360px] whitespace-normal break-words text-left leading-relaxed [&]:items-start">
                  {title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {status && (
              <span className="flex shrink-0">
                <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
              </span>
            )}
            {badges}
          </div>
        </div>
        {/* Record number — plain, quiet text tucked under the title (no box). On
            sticky headers it is the only secondary line; otherwise it leads
            the subtitle line below. */}
        {reference && sticky && (
          <div className="-mt-0.5 pl-11">
            <div ref={referenceInsetRef} className="w-fit">
              <Typography variant="body-strong" tone="muted" className="tabular-nums tracking-normal" asChild>
                <CopyableText value={reference}>{reference}</CopyableText>
              </Typography>
            </div>
          </div>
        )}
        {/* Subtitle + owners — indented to sit under the title, past the
            back button (size-8 32px + gap-3 12px = pl-11). */}
        {!sticky && (reference || subtitle || ownerList.length > 0) && (
          <div className="pl-11">
            {(reference || subtitle) && (
              <div ref={referenceInsetRef} className="w-fit">
                <Typography variant="page-subtitle" className="tabular-nums">
                  {reference && <CopyableText value={reference}>{reference}</CopyableText>}
                  {reference && subtitle && ' · '}
                  {subtitle}
                </Typography>
              </div>
            )}
            {ownerList.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex items-center -space-x-1.5">
                  {ownerList.map((o, i) => (
                    <div
                      key={o.name}
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full border-2 border-background text-[9px] font-semibold',
                        AVATAR_COLORS[i % AVATAR_COLORS.length]
                      )}
                      style={{ zIndex: ownerList.length - i }}
                      title={o.name}
                    >
                      {getInitials(o.name)}
                    </div>
                  ))}
                </div>
                {ownerList.length === 1 ? (
                  <span className="text-[13px] text-foreground">
                    {ownerList[0].name}
                    {ownerList[0].role && (
                      <span className="ml-1.5 text-[11.5px] text-muted-foreground">
                        · {ownerList[0].role}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">
                    {PAGE_SHELLS_STRINGS.entityHeader.ownersCount(ownerList.length)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}

export { EntityHeader, type EntityHeaderProps }
