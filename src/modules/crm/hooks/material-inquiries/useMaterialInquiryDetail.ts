import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useAllCategories } from "@modules/ims"

import {
  useCloseMaterialInquiry,
  useDeleteMaterialInquiry,
  useMaterialInquiry,
  useSubmitMaterialInquiry,
} from "./useMaterialInquiries"

// Container logic for the Material Inquiry detail page: the inquiry query,
// category-name resolution, status-derived action gating, and submit/close/
// delete mutations.
export function useMaterialInquiryDetail() {
  const { id: miId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: mi, isLoading, isError, error } = useMaterialInquiry(miId)

  // Resolve `category_id` on each inquiry item to a human-readable name.
  // Single fetch shared across all rows — cached by the QueryClient.
  const { data: allCategories } = useAllCategories()
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of allCategories ?? []) m.set(c.id, c.name)
    return m
  }, [allCategories])

  const submitMut = useSubmitMaterialInquiry(miId ?? "")
  const closeMut = useCloseMaterialInquiry(miId ?? "")
  const deleteMut = useDeleteMaterialInquiry()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canEdit = mi?.status === "draft"
  const canSubmit =
    mi?.status === "draft" && mi.items.length > 0 && (!!mi.lead_id || !!mi.deal_id)
  const canClose = !!mi && mi.status !== "draft" && mi.status !== "closed"

  function handleDelete() {
    if (!mi) return
    deleteMut.mutate(mi.id, {
      onSuccess: () => navigate("/crm/material-inquiries"),
    })
  }

  return {
    mi,
    isLoading,
    isError,
    error,
    categoryNameById,
    submitMut,
    closeMut,
    deleteMut,
    deleteOpen,
    setDeleteOpen,
    canEdit,
    canSubmit,
    canClose,
    handleDelete,
  }
}
