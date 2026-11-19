import { Link } from "react-router-dom"
import { Pencil, Send, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import type { useMaterialInquiryDetail } from "../../hooks/material-inquiries/useMaterialInquiryDetail"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type Detail = ReturnType<typeof useMaterialInquiryDetail>
type MI = NonNullable<Detail["mi"]>

export function MIDetailHeaderActions({ mi, detail }: { mi: MI; detail: Detail }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {detail.canEdit && (
        <PermissionGuard required={[...crmCan.writeMi]}>
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/crm/material-inquiries/${mi.id}/edit`} />}
          >
            <Pencil className="size-3.5" data-icon="inline-start" />
            {S.detail.actions.edit}
          </Button>
        </PermissionGuard>
      )}
      {detail.canSubmit && (
        <PermissionGuard required={[...crmCan.writeMi]}>
          <Button
            size="sm"
            onClick={() => detail.submitMut.mutate()}
            disabled={detail.submitMut.isPending}
          >
            <Send className="size-3.5" data-icon="inline-start" />
            {detail.submitMut.isPending
              ? S.detail.actions.submitting
              : S.detail.actions.submit}
          </Button>
        </PermissionGuard>
      )}
      {detail.canClose && (
        <PermissionGuard required={[...crmCan.writeMi]}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => detail.closeMut.mutate()}
            disabled={detail.closeMut.isPending}
          >
            {detail.closeMut.isPending
              ? S.detail.actions.closing
              : S.detail.actions.close}
          </Button>
        </PermissionGuard>
      )}
      <PermissionGuard required={[...crmCan.deleteMi]}>
        <ConfirmDialog
          open={detail.deleteOpen}
          onOpenChange={detail.setDeleteOpen}
          title={S.detail.actions.deleteTitle}
          description={S.detail.actions.deleteDescription(mi.enquiry_number)}
          confirmLabel={
            detail.deleteMut.isPending
              ? S.detail.actions.deleting
              : S.detail.actions.delete
          }
          variant="destructive"
          onConfirm={detail.handleDelete}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" data-icon="inline-start" />
              {S.detail.actions.delete}
            </Button>
          }
        />
      </PermissionGuard>
    </div>
  )
}
