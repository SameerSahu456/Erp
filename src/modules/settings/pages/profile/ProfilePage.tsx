import { ProfileBody } from "../../components/profile/ProfileBody"
import { useProfile } from "../../hooks/profile/useProfile"

function ProfilePage() {
  const f = useProfile()
  return <ProfileBody f={f} />
}

export default ProfilePage
