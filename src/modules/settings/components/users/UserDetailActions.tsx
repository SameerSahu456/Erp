import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Ban, CheckCircle2, KeyRound, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { usePermission } from "@/shared/rbac/usePermission"
import {
  getUserDisplayName,
  useDeleteUser,
  useToggleUserActive,
  type UserDetail,
} from "@modules/users"

import { usersListHref } from "../../hooks/users/usersListHref"
import { ResetPasswordDialog } from "../ResetPasswordDialog"
import { UserFormDialog } from "./UserFormDialog"
import { USERS_STRINGS as S } from "./users.strings"

interface UserDetailActionsProps {
  user: UserDetail
}

/**
 * The same row actions the Users list offers (edit, activate / deactivate,
 * reset password, delete), available on the detail page so an admin never has
 * to go back to the list. The activity log is not here — the detail page already
 * renders that timeline inline.
 *
 * Edit / activate / reset reuse the list's own dialog + mutation hooks. The
 * hooks write the saved record straight into the detail cache, so the page
 * refreshes itself after every action. Delete is destructive: it sits in the
 * `⋯` menu behind a `ConfirmDialog`, and on success returns to the list with
 * its remembered page / filters.
 */
export function UserDetailActions({ user }: UserDetailActionsProps) {
  const navigate = useNavigate()
  const { isSuperuser } = usePermission()
  const toggleActive = useToggleUserActive()
  const deleteUser = useDeleteUser()

  const [editOpen, setEditOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const name = getUserDisplayName(user)
  const toggleLabel = user.is_active ? S.actions.deactivateUser : S.actions.activateUser
  const ToggleIcon = user.is_active ? Ban : CheckCircle2

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="size-3.5" data-icon="inline-start" />
        {S.actions.editUser}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={toggleActive.isPending}
        onClick={() => toggleActive.mutate({ id: user.id, is_active: !user.is_active })}
      >
        <ToggleIcon className="size-3.5" data-icon="inline-start" />
        {toggleLabel}
      </Button>
      {/* Mirrors the backend's superuser-only gate on reset-password: hidden,
          not disabled, for everyone else. */}
      {isSuperuser && (
        <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
          <KeyRound className="size-3.5" data-icon="inline-start" />
          {S.actions.resetPassword}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon-sm" aria-label={S.actions.moreActions} />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            {S.actions.deleteUser}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserFormDialog open={editOpen} onOpenChange={setEditOpen} user={user} />

      {resetOpen && (
        <ResetPasswordDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          userId={user.id}
          userName={name}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="destructive"
        title={S.actions.deleteConfirmTitle(name)}
        description={S.actions.deleteConfirmDescription}
        confirmLabel={S.actions.deleteConfirmButton}
        cancelLabel={S.actions.deleteCancelButton}
        onConfirm={() =>
          deleteUser.mutate(user.id, {
            onSuccess: () => navigate(usersListHref(), { replace: true }),
          })
        }
      />
    </div>
  )
}
