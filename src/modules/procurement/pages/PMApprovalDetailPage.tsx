import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ALL_PMS,
  PM_CATEGORIES,
  MIApprovalCard,
  SOApprovalCard,
  PRApprovalCard,
  POApprovalCard,
  actOnMIResponse,
  actOnSO,
  actOnPRCategory,
  actOnPO,
  useMIs,
  useSOs,
  usePRs,
  usePOs,
} from '../pm-approvals-shared'

type EntityType = 'mi' | 'so' | 'pr' | 'po'

const TYPE_LABEL: Record<EntityType, string> = {
  mi: 'Material Inquiry',
  so: 'Sales Order',
  pr: 'Purchase Request',
  po: 'Purchase Order',
}

function PMApprovalDetailPage() {
  const { type: rawType, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const [currentPM, setCurrentPM] = useState<string>(ALL_PMS[0]!)
  const myCategories = PM_CATEGORIES[currentPM] ?? []

  const mis = useMIs()
  const sos = useSOs()
  const prs = usePRs()
  const pos = usePOs()

  const type = rawType as EntityType | undefined
  if (!type || !id || !TYPE_LABEL[type]) return <NotFound />

  const pmInitials = currentPM
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/procurement/pm-approvals')}
          >
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to list
          </Button>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {TYPE_LABEL[type]} · Approval
            </p>
            <h1 className="cpt-page-title">{id}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card/80 p-2 pr-3 shadow-sm">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
            {pmInitials}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Acting as
            </p>
            <Select
              value={currentPM}
              onValueChange={(v: string | null) => v && setCurrentPM(v)}
            >
              <SelectTrigger className="h-6 w-40 border-none bg-transparent px-0 text-xs font-semibold shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PMS.map((pm) => (
                  <SelectItem key={pm} value={pm}>
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      {pm}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Entity-specific card */}
      {type === 'mi' &&
        (() => {
          const mi = mis.find((m) => m.id === id)
          if (!mi) return <NotFound />
          return (
            <MIApprovalCard
              mi={mi}
              myCategories={myCategories}
              onRespond={(miId, rId, action, notes) =>
                actOnMIResponse(miId, rId, action, currentPM, notes)
              }
            />
          )
        })()}

      {type === 'so' &&
        (() => {
          const so = sos.find((s) => s.id === id)
          if (!so) return <NotFound />
          return (
            <SOApprovalCard
              so={so}
              myCategories={myCategories}
              onApprove={(soId, action, notes) =>
                actOnSO(soId, action, currentPM, notes)
              }
            />
          )
        })()}

      {type === 'pr' &&
        (() => {
          const pr = prs.find((p) => p.id === id)
          if (!pr) return <NotFound />
          const approvals = pr.categoryApprovals.filter(
            (a) => a.productManager === currentPM,
          )
          if (approvals.length === 0) {
            return (
              <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                No categories assigned to {currentPM} on this PR.
              </div>
            )
          }
          const myCats = approvals.map((a) => a.category)
          const myItems = pr.items.filter((i) => myCats.includes(i.category))
          return (
            <PRApprovalCard
              pr={pr}
              approvals={approvals}
              myItems={myItems}
              onApprove={(prId, category, action, remarks) =>
                actOnPRCategory(prId, category, currentPM, action, remarks)
              }
            />
          )
        })()}

      {type === 'po' &&
        (() => {
          const po = pos.find((p) => p.id === id)
          if (!po) return <NotFound />
          return (
            <POApprovalCard
              po={po}
              myCategories={myCategories}
              onApprove={(poId, action, notes) =>
                actOnPO(poId, action, currentPM, notes)
              }
            />
          )
        })()}
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Record not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The item you were looking for could not be located.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/procurement/pm-approvals')}
        >
          Back to PM Approvals
        </Button>
      </div>
    </div>
  )
}

export { PMApprovalDetailPage }
export default PMApprovalDetailPage
