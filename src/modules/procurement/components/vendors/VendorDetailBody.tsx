import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Pencil, Power, Trash2, Mail, Phone, User, Hash, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailPageShell } from "@/components/page-shells"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { formatIST } from "@shared/lib/date"

import { usePermission } from "@shared/rbac"

import { useDeleteVendor, useUpdateVendor, useVendor } from "../../hooks/vendors/useVendors"
import { procurementCan } from "../../permissions"
import { VendorFormDialog } from "../../components/vendors/VendorFormDialog"
import { VendorContactsCard } from "./VendorContactsCard"
import { DetailField } from "./DetailField"
import { VENDOR_STATUS_LABELS, VENDOR_STATUS_VARIANT } from "../../constants/vendor-status"
import { VENDORS_STRINGS } from "./vendors.strings"

export function VendorDetailBody() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { can } = usePermission()
  const canWrite = can(procurementCan.writeVendor)
  const canDelete = can(procurementCan.deleteVendor)

  const { data: vendor, isLoading, isError, error } = useVendor(id)
  const deleteMut = useDeleteVendor()
  const updateMut = useUpdateVendor(vendor?.id ?? "")

  if (isLoading) {
    return (
      <DetailPageShell
        title={VENDORS_STRINGS.detail.loadingTitle}
        backHref="/procurement/vendors"
      >
        <Skeleton className="h-96 w-full rounded-xl" />
      </DetailPageShell>
    )
  }

  // A load failure (incl. a 403 permission boundary) routes through the shared
  // error slot, which keeps the backend message but styles it. A null vendor
  // with no error falls through to the same slot via the fallback copy.
  if (isError || !vendor) {
    return (
      <DetailPageShell
        title={VENDORS_STRINGS.detail.notFoundTitle}
        backHref="/procurement/vendors"
      >
        <LoadErrorState error={error} fallback={VENDORS_STRINGS.detail.loadError} />
      </DetailPageShell>
    )
  }

  function handleDelete() {
    if (!vendor) return
    deleteMut.mutate(vendor.id, {
      onSuccess: () => navigate("/procurement/vendors"),
    })
  }

  const isActive = vendor.status === "active"
  function toggleStatus() {
    updateMut.mutate({ status: isActive ? "inactive" : "active" })
  }

  // Action visibility mirrors the backend gate on each endpoint:
  //   Activate/Deactivate + Edit  → PATCH /vendors/{id}   → writeVendor
  //   Delete                      → DELETE /vendors/{id}  → deleteVendor
  const actions = (
    <div className="flex items-center gap-2">
      {canWrite && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleStatus}
          disabled={updateMut.isPending}
          className={isActive ? undefined : "text-success hover:text-success"}
        >
          <Power className="mr-1 size-4" />
          {isActive
            ? VENDORS_STRINGS.detail.deactivateButton
            : VENDORS_STRINGS.detail.activateButton}
        </Button>
      )}
      {canWrite && (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1 size-4" />
          {VENDORS_STRINGS.detail.editButton}
        </Button>
      )}
      {canDelete && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={VENDORS_STRINGS.detail.delete.title}
          description={VENDORS_STRINGS.detail.delete.description(vendor.name)}
          confirmLabel={deleteMut.isPending ? VENDORS_STRINGS.detail.delete.confirmingLabel : VENDORS_STRINGS.detail.delete.confirmLabel}
          variant="destructive"
          onConfirm={handleDelete}
          trigger={
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1 size-4" />
              {VENDORS_STRINGS.detail.deleteButton}
            </Button>
          }
        />
      )}
    </div>
  )

  return (
    <DetailPageShell
      title={vendor.name}
      subtitle={vendor.code}
      status={{
        label: VENDOR_STATUS_LABELS[vendor.status],
        variant: VENDOR_STATUS_VARIANT[vendor.status],
      }}
      backHref="/procurement/vendors"
      actions={actions}
      sidePanel={
        <div className="space-y-4">
          {/* Status is shown at the top (the header status pill), so it's not
              repeated here — only the audit metadata lives in the side panel. */}
          <Card size="sm">
            <CardHeader>
              <Typography variant="body" asChild>
                <CardTitle>{VENDORS_STRINGS.detail.sidePanel.auditTitle}</CardTitle>
              </Typography>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-0.5">
                <Typography variant="caption" tone="muted" className="uppercase tracking-[0.06em]">
                  {VENDORS_STRINGS.detail.sidePanel.created}
                </Typography>
                <Typography variant="helper" numeric asChild>
                  <div>{formatIST(vendor.created_at)}</div>
                </Typography>
              </div>
              <div className="space-y-0.5">
                <Typography variant="caption" tone="muted" className="uppercase tracking-[0.06em]">
                  {VENDORS_STRINGS.detail.sidePanel.lastUpdated}
                </Typography>
                <Typography variant="helper" numeric asChild>
                  <div>{formatIST(vendor.updated_at)}</div>
                </Typography>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{VENDORS_STRINGS.detail.contact.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField icon={User} label={VENDORS_STRINGS.detail.contact.nameLabel} value={vendor.contact_name} />
              <DetailField
                icon={Mail}
                label={VENDORS_STRINGS.detail.contact.emailLabel}
                value={
                  vendor.contact_email ? (
                    <a
                      href={`mailto:${vendor.contact_email}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {vendor.contact_email}
                    </a>
                  ) : null
                }
              />
              <DetailField icon={Phone} label={VENDORS_STRINGS.detail.contact.phoneLabel} value={vendor.contact_phone} />
              <DetailField
                icon={Hash}
                label={VENDORS_STRINGS.detail.contact.gstLabel}
                value={vendor.gst_number}
                mono
              />
              <DetailField
                icon={MapPin}
                label={VENDORS_STRINGS.detail.contact.addressLabel}
                value={
                  [vendor.line1, vendor.line2, vendor.city, vendor.state, vendor.pincode]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
            </dl>
          </CardContent>
        </Card>

        <VendorContactsCard vendor={vendor} />

        <Card>
          <CardHeader>
            <CardTitle>{VENDORS_STRINGS.detail.notes.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {vendor.notes ? (
              <ExpandableClampText text={vendor.notes} lines={3} variant="body" />
            ) : (
              <Typography variant="body" tone="muted">{VENDORS_STRINGS.detail.notes.empty}</Typography>
            )}
          </CardContent>
        </Card>
      </div>

      <VendorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vendor={vendor}
      />
    </DetailPageShell>
  )
}


