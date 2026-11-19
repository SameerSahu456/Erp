import { BankReconciliationBody } from "../../components/bank/BankReconciliationBody"
import { useBankReconciliation } from "../../hooks/bank/useBankReconciliation"

function BankReconciliationPage() {
  const f = useBankReconciliation()
  return <BankReconciliationBody f={f} />
}

export default BankReconciliationPage
