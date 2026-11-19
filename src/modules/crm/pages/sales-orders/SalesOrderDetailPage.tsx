import { SalesOrderDetailView } from "../../components/sales-orders/detail/SalesOrderDetailView"

// The whole layout — header, sections, cards, tabs and the permission gates
// on each tab's list query — lives in `SalesOrderDetailView`, so that the
// rentals agreement page can render the SAME order the same way with its
// own header actions and tabs. This route adds nothing to it.
function SalesOrderDetailPage() {
  return <SalesOrderDetailView />
}

export default SalesOrderDetailPage
