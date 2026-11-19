import { useState } from "react"
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"

import { usePermission } from "@shared/rbac"

import { useUpdateVendor } from "../../hooks/vendors/useVendors"
import { procurementCan } from "../../permissions"
import type { Vendor, VendorContact, VendorContactInput } from "../../api"
import type { ContactFormInput } from "../../schemas"
import { VENDORS_STRINGS } from "./vendors.strings"
import { VendorContactDialog } from "./VendorContactDialog"

const S = VENDORS_STRINGS.detail.contacts

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// The backend replaces the whole contact set on PATCH, so every op sends the
// full list rebuilt from the current contacts (as write-shape inputs).
function toInput(c: VendorContact): VendorContactInput {
  return { name: c.name, email: c.email ?? null, phone: c.phone ?? null }
}

export function VendorContactsCard({ vendor }: { vendor: Vendor }) {
  const contacts = vendor.contacts ?? []
  const update = useUpdateVendor(vendor.id)
  // Contacts are patched via PATCH /vendors/{id}, so add / edit / remove all
  // share the same `writeVendor` gate as the rest of the vendor edits.
  const { can } = usePermission()
  const canWrite = can(procurementCan.writeVendor)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VendorContact | null>(null)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(c: VendorContact) {
    setEditing(c)
    setDialogOpen(true)
  }

  async function handleSubmit(values: ContactFormInput) {
    const next: VendorContactInput = {
      name: values.name,
      email: values.email ?? null,
      phone: values.phone ?? null,
    }
    const list = editing
      ? contacts.map((c) => (c.id === editing.id ? next : toInput(c)))
      : [...contacts.map(toInput), next]
    await update.mutateAsync({ contacts: list })
  }

  function handleRemove(c: VendorContact) {
    void update.mutateAsync({
      contacts: contacts.filter((x) => x.id !== c.id).map(toInput),
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{S.cardTitle}</CardTitle>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={openAdd} disabled={update.isPending}>
            <Plus className="size-3.5" data-icon="inline-start" />
            {S.addContact}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <Typography variant="body" tone="muted">
            {S.empty}
          </Typography>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)] transition-colors hover:border-primary/25"
              >
                <div className="flex items-start gap-3">
                  <Typography variant="body" tone="primary" asChild>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold ring-2 ring-card">
                      {initials(c.name)}
                    </div>
                  </Typography>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Typography variant="body-strong" truncate asChild>
                      <p className="pr-14">{c.name}</p>
                    </Typography>
                    {c.email && (
                      <Typography variant="helper" tone="primary" asChild>
                        <a
                          href={`mailto:${c.email}`}
                          className="mt-1.5 flex min-w-0 items-center gap-1.5 underline-offset-4 hover:underline"
                        >
                          <Mail className="size-3 shrink-0" />
                          <span className="min-w-0 truncate">{c.email}</span>
                        </a>
                      </Typography>
                    )}
                    {c.phone && (
                      <Typography variant="helper" tone="muted" asChild>
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      </Typography>
                    )}
                  </div>
                </div>

                {/* Hover actions — edit + remove. Rendered only when the user
                    can write the vendor; contacts share the vendor PATCH gate. */}
                {canWrite && (
                  <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={S.edit}
                      onClick={() => openEdit(c)}
                      disabled={update.isPending}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <ConfirmDialog
                      title={S.removeTitle}
                      description={S.removeDescription(c.name)}
                      confirmLabel={S.removeConfirm}
                      variant="destructive"
                      onConfirm={() => handleRemove(c)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={S.remove}
                          disabled={update.isPending}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <VendorContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
        onSubmit={handleSubmit}
        saving={update.isPending}
      />
    </Card>
  )
}
