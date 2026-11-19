import { SalesInvoiceFormBody } from "../../components/sales/SalesInvoiceFormBody"
import { useSalesInvoiceForm } from "../../hooks/sales/useSalesInvoiceForm"

function SalesInvoiceFormPage() {
  const f = useSalesInvoiceForm()
  return <SalesInvoiceFormBody f={f} />
}

export default SalesInvoiceFormPage
