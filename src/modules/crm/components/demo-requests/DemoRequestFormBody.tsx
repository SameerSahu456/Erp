import type { DemoRequestFormController } from "../../hooks/demo-requests/useDemoRequestForm"
import { DemoCustomerCard } from "./DemoCustomerCard"
import { DemoItemsCard } from "./DemoItemsCard"
import { DemoLogisticsCard } from "./DemoLogisticsCard"

export function DemoRequestFormBody({ form }: { form: DemoRequestFormController }) {
  return (
    <form
      id="demo-request-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
    >
      {/* Customer */}
      <DemoCustomerCard form={form} />

      {/* Items */}
      <DemoItemsCard
        value={form.lines}
        onChange={(next) => {
          form.setLines(next)
          if (next.length > 0) form.clearError("items")
        }}
        error={form.errors.items}
      />

      {/* Logistics */}
      <DemoLogisticsCard form={form} />
    </form>
  )
}
