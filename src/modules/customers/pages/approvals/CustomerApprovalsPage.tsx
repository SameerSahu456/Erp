import { CustomerApprovalsBody } from "../../components/approvals/CustomerApprovalsBody"
import { useCustomerApprovals } from "../../hooks/approvals/useCustomerApprovals"

function CustomerApprovalsPage() {
  const f = useCustomerApprovals()
  return <CustomerApprovalsBody f={f} />
}

export default CustomerApprovalsPage
