import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-shells'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { OverflowPillList } from '@/components/common/display/OverflowPillList'
import { formatIST } from '@shared/lib/date'
import type { ProfileController } from "../../hooks/profile/useProfile"
import { PROFILE_STRINGS as S } from './profile.strings'

export function ProfileBody({ f }: { f: ProfileController }) {
  const {
    user,
    displayName,
    roleLabels,
    name,
    email,
    phone,
    department,
    lastLoginAt,
    initials,
  } = f

  return (
    <div className="space-y-6">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Personal Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{S.personalInfo.sectionTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                  {/* Avatar upload — not wired to a backend endpoint yet.
                  <button
                    onClick={() => toast.info('Avatar upload coming soon')}
                    className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <Camera className="size-3.5" />
                  </button>
                  */}
                </div>
                <div>
                  <p className="font-medium">{displayName}</p>
                  <Typography tone="muted">{user.email}</Typography>
                </div>
              </div>

              {/* Form fields — read-only until a self-service profile-update
                  endpoint exists on the backend. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{S.personalInfo.nameLabel}</Label>
                  <Input id="name" value={name} disabled readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{S.personalInfo.emailLabel}</Label>
                  <Input id="email" type="email" value={email} disabled readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{S.personalInfo.phoneLabel}</Label>
                  <Input id="phone" value={phone ?? ''} disabled readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">{S.personalInfo.departmentLabel}</Label>
                  <Input
                    id="department"
                    value={department ?? ''}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{S.personalInfo.roleLabel}</Label>
                  <div className="flex min-h-8 items-center">
                    <OverflowPillList
                      items={roleLabels}
                      getItemLabel={(role) => role}
                      hoverTitle={S.personalInfo.roleLabel}
                    />
                  </div>
                </div>
              </div>

              {/* Bio — no backend column exists on the user model.
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
              */}

              <Button disabled>{S.personalInfo.saveChanges}</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>{S.accountInfo.sectionTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Typography asChild variant="helper"><p>{S.accountInfo.roleLabel}</p></Typography>
                <div className="mt-1">
                  <OverflowPillList
                    items={roleLabels}
                    getItemLabel={(role) => role}
                    hoverTitle={S.accountInfo.roleLabel}
                  />
                </div>
              </div>
              {/* Member since — GET /auth/me does not return a created_at field.
              <div>
                <Typography asChild variant="helper"><p>Member since</p></Typography>
                <Typography variant="body-strong">January 15, 2024</Typography>
              </div>
              */}
              <div>
                <Typography asChild variant="helper"><p>{S.accountInfo.lastLoginLabel}</p></Typography>
                <Typography variant="body-strong">{formatIST(lastLoginAt)}</Typography>
              </div>
            </CardContent>
          </Card>

          {/* Preferences — no backend source for notification settings yet.
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notifications</Label>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(val) => setNotificationsEnabled(val as boolean)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email Digest</Label>
                <Select value={emailDigest} onValueChange={(v) => setEmailDigest(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          */}
        </div>
      </div>
    </div>
  )
}
