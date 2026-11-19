import { Eye } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ViewOnlyBannerProps {
  title: string
  description: string
}

// Shown on a Lead / Deal detail page when the viewer reaches the record only
// because they were @mentioned on it (backend `access_level: "view"`). Copy
// comes from the entity's strings file.
export function ViewOnlyBanner({ title, description }: ViewOnlyBannerProps) {
  return (
    <Alert role="status">
      <Eye aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
}
