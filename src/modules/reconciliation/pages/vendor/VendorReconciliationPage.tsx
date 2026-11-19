import { VendorReconciliationBody } from "../../components/vendor/VendorReconciliationBody"
import { useVendorReconciliation } from "../../hooks/vendor/useVendorReconciliation"

function VendorReconciliationPage() {
  const f = useVendorReconciliation()
  return <VendorReconciliationBody f={f} />
}

export default VendorReconciliationPage
