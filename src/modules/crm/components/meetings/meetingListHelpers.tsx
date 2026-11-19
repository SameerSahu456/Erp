import { MapPin, Phone, Users, Video } from "lucide-react"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { MeetingStatus, MeetingType } from "../../api"

// Backend `start_time` / `end_time` arrive as HH:MM:SS — trim to HH:MM.
export const hhmm = (t: string) => t.slice(0, 5)

export function getStatusVariant(status: MeetingStatus): StatusBadgeVariant {
  switch (status) {
    case "Scheduled": return "info"
    case "Completed": return "success"
    case "Cancelled": return "error"
  }
}

export function getTypeIcon(type: MeetingType) {
  switch (type) {
    case "Video Call": return <Video className="size-4 text-blue-500" />
    case "Phone Call": return <Phone className="size-4 text-green-500" />
    case "In Person": return <Users className="size-4 text-purple-500" />
    case "Site Visit": return <MapPin className="size-4 text-orange-500" />
  }
}
