import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'


import { mockCustomerRegistrations } from '@/modules/customers/data/customers'




export function useCustomerApprovals() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = usePersistedState<string>('customers-approvals:status', 'all')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectCustomerId, setRejectCustomerId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveCustomerId, setApproveCustomerId] = useState<string | null>(null)

  const pendingCustomers = mockCustomerRegistrations.filter((c) => {
    const isPending = ['KYC Pending', 'Onboarding'].includes(c.status)
    if (!isPending) return false
    if (statusFilter === 'all') return true
    return c.status === statusFilter
  })

  function handleApprove(customerId: string) {
    setApproveCustomerId(customerId)
    setApproveDialogOpen(true)
  }

  function handleReject(customerId: string) {
    setRejectCustomerId(customerId)
    setRejectReason('')
    setRejectDialogOpen(true)
  }


  return {
    navigate,
    statusFilter,
    setStatusFilter,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectCustomerId,
    setRejectCustomerId,
    rejectReason,
    setRejectReason,
    approveDialogOpen,
    setApproveDialogOpen,
    approveCustomerId,
    setApproveCustomerId,
    pendingCustomers,
    handleApprove,
    handleReject,
  }
}

export type CustomerApprovalsController = ReturnType<typeof useCustomerApprovals>
