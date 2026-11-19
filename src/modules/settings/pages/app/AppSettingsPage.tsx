import { AppSettingsBody } from "../../components/app/AppSettingsBody"
import { useAppSettings } from "../../hooks/app/useAppSettings"

function AppSettingsPage() {
  const f = useAppSettings()
  return <AppSettingsBody f={f} />
}

export default AppSettingsPage
