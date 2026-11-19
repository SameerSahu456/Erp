import { Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { DemoRequestFormController } from "../../hooks/demo-requests/useDemoRequestForm"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { DemoLeadContactShipping } from "./DemoLeadContactShipping"
import { DemoNonLeadContactShipping } from "./DemoNonLeadContactShipping"
import { DemoSourcePicker } from "./DemoSourcePicker"

export function DemoCustomerCard({ form }: { form: DemoRequestFormController }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" strokeWidth={2} />
          </span>
          <div>
            <CardTitle>{S.form.customer.title}</CardTitle>
            <CardDescription>
              {S.form.customer.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DemoSourcePicker form={form} />
          {form.sourceType !== "lead" ? (
            <DemoNonLeadContactShipping form={form} />
          ) : (
            <DemoLeadContactShipping form={form} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
