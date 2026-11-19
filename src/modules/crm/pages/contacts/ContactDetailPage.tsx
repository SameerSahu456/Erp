import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { type StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { TimestampFooter } from "@/components/common/display/TimestampFooter"
import { EntityHeader } from "@/components/page-shells/EntityHeader"
import { DetailTabs } from "@/components/page-shells/DetailTabs"

// import { ActivityFeed } from "../../components/shared/ActivityFeed"
import { NotesSection } from "../../components/shared/NotesSection"
import { ContactDetailHeaderActions } from "../../components/contacts/ContactDetailHeaderActions"
import { ContactLinkedAccountsCard } from "../../components/contacts/ContactLinkedAccountsCard"
import { ContactOverviewTab } from "../../components/contacts/ContactOverviewTab"
import { DeleteContactDialog } from "../../components/contacts/DeleteContactDialog"
import { useContactDetail } from "../../hooks/contacts/useContactDetail"
import { CONTACTS_STRINGS } from "../../components/contacts/contacts.strings"
import { CONTACT_STATUS_LABELS } from "../../constants/contact-status"
import type { ContactStatus } from "../../api"

function statusVariant(status: ContactStatus): StatusBadgeVariant {
  return status === "Active" ? "success" : "error"
}

function ContactDetailPage() {
  const board = useContactDetail()
  const contact = board.contact

  if (board.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {CONTACTS_STRINGS.detail.loading}
      </div>
    )
  }

  if (board.isError || !contact) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Typography variant="section-title">{CONTACTS_STRINGS.detail.notFoundTitle}</Typography>
        <Typography variant="body" tone="muted">
          {board.error instanceof Error
            ? board.error.message
            : CONTACTS_STRINGS.detail.notFoundDescription}
        </Typography>
        <Button variant="outline" render={<Link to="/crm/contacts" />}>
          {CONTACTS_STRINGS.detail.back}
        </Button>
      </div>
    )
  }

  const tabs = [
    {
      id: "overview",
      label: CONTACTS_STRINGS.detail.tabs.overview,
      content: (
        <ContactOverviewTab
          contact={contact}
          primaryAccount={board.primaryAccount}
          lastContactIso={board.lastContactIso}
        />
      ),
    },
    // {
    //   id: "activities",
    //   label: CONTACTS_STRINGS.detail.tabs.activities,
    //   content: <ActivityFeed entityType="contact" entityId={contact.id} />,
    // },
    /* Meetings tab — hidden for now (placeholder only). Re-enable when the
       contact meetings feature ships.
    {
      id: "meetings",
      label: CONTACTS_STRINGS.detail.tabs.meetings,
      content: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
            <Typography variant="body" tone="muted">
              {CONTACTS_STRINGS.detail.meetingsPlaceholder}
            </Typography>
          </div>
        </div>
      ),
    },
    */
    {
      id: "notes",
      label: CONTACTS_STRINGS.detail.tabs.notes,
      content: <NotesSection entityType="contact" entityId={contact.id} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        sticky
        title={contact.name}
        // Only surface status when it's not Active — a quiet inline
        // warning for Inactive contacts without cluttering the header.
        status={
          contact.status !== "Active"
            ? {
                label: contact.status,
                variant: statusVariant(contact.status),
              }
            : undefined
        }
        backHref="/crm/contacts"
        actions={
          <ContactDetailHeaderActions
            contact={contact}
            onDeleteClick={() => board.setDeleteDialogOpen(true)}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — tabs + content */}
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="overview" />
        </div>

        {/* Right — Linked Accounts. `lg:mt-14` drops the card below the
         *  tabs row so it aligns with the tab body. */}
        <div className="space-y-4 lg:mt-14">
          <ContactLinkedAccountsCard linkedAccounts={board.linkedAccounts} />
        </div>
      </div>

      <DeleteContactDialog
        open={board.deleteDialogOpen}
        onOpenChange={board.setDeleteDialogOpen}
        contactName={contact.name}
        onDelete={board.handleDelete}
        isPending={board.isDeleting}
      />

      <TimestampFooter
        createdAt={contact.created_at}
        updatedAt={contact.updated_at}
      />
    </div>
  )
}

export default ContactDetailPage
