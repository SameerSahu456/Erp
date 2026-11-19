import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface CommercialTermsValue {
  paymentTerms: string
  warranty: string
  delivery: string
  notes: string
}

interface CommercialTermsSectionProps {
  value: CommercialTermsValue
  onFieldChange: (field: keyof CommercialTermsValue, value: string) => void
  /** "labeled" = Label + Textarea (form pages); "card" = Card + heading (wizard). */
  variant?: "labeled" | "card"
  disabled?: boolean
}

// The Payment / Warranty / Delivery / Notes commercial-terms grid shared by the
// sales-order form and the closed-won wizard. Field labels + placeholders live
// here so the two call sites can't drift apart.
const FIELDS: Array<{
  key: keyof CommercialTermsValue
  label: string
  placeholder: string
}> = [
  { key: "paymentTerms", label: "Payment Terms", placeholder: "e.g. Net 30, 50% advance" },
  { key: "warranty", label: "Warranty", placeholder: "e.g. 12 months, parts & labor" },
  { key: "delivery", label: "Delivery", placeholder: "e.g. 2-3 weeks, FOB Bangalore" },
  { key: "notes", label: "Notes", placeholder: "Anything else the customer should know." },
]

export function CommercialTermsSection({
  value,
  onFieldChange,
  variant = "labeled",
  disabled = false,
}: CommercialTermsSectionProps) {
  if (variant === "card") {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {FIELDS.map((field) => (
          <Card key={field.key}>
            <CardContent className="p-4">
              <h4 className="mb-2 text-[12.5px] font-semibold">{field.label}</h4>
              <Textarea
                value={value[field.key]}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                disabled={disabled}
                className="resize-none text-[12px]"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`commercial-terms-${field.key}`}>{field.label}</Label>
          <Textarea
            id={`commercial-terms-${field.key}`}
            rows={4}
            placeholder={field.placeholder}
            value={value[field.key]}
            disabled={disabled}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}
