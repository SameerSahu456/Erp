import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { DateFilterPreset } from "../../utils/dashboard/dashboard-filters"
import type { CrmDashboardController } from "../../hooks/dashboard/useCrmDashboard"
import { DASHBOARD_STRINGS } from "./dashboard.strings"

export function DashboardFilters({ dash }: { dash: CrmDashboardController }) {
  return (
    <>
      <Select
        value={dash.preset}
        onValueChange={(v) => dash.setPreset(v as DateFilterPreset)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">{DASHBOARD_STRINGS.filters.presets.today}</SelectItem>
          <SelectItem value="monthly">{DASHBOARD_STRINGS.filters.presets.monthly}</SelectItem>
          <SelectItem value="quarterly">{DASHBOARD_STRINGS.filters.presets.quarterly}</SelectItem>
          <SelectItem value="yearly">{DASHBOARD_STRINGS.filters.presets.yearly}</SelectItem>
          <SelectItem value="custom">{DASHBOARD_STRINGS.filters.presets.custom}</SelectItem>
        </SelectContent>
      </Select>

      {dash.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dash.customFrom}
            onChange={(e) => dash.setCustomFrom(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground text-sm">{DASHBOARD_STRINGS.filters.rangeSeparator}</span>
          <Input
            type="date"
            value={dash.customTo}
            onChange={(e) => dash.setCustomTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
      )}

      {dash.isSuperadmin && (
        <Select value={dash.selectedUser} onValueChange={(v) => dash.setSelectedUser(v ?? "__all__")}>
          <SelectTrigger
            className="w-[180px]"
            clearable={dash.selectedUser !== "__all__"}
            onClear={() => dash.setSelectedUser("__all__")}
          >
            <SelectValue>
              {dash.selectedUser === "__all__"
                ? DASHBOARD_STRINGS.filters.allUsers
                : dash.selectedUser}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{DASHBOARD_STRINGS.filters.allUsers}</SelectItem>
            {dash.mockUsers.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )
}
