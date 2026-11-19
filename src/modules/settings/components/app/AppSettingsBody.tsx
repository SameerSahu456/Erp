import { Sun, Moon, Monitor } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/page-shells'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'
import type { AppSettingsController } from "../../hooks/app/useAppSettings"
import { APP_SETTINGS_STRINGS as S } from './app-settings.strings'

export function AppSettingsBody({ f }: { f: AppSettingsController }) {
  const {
    colorMode,
    setColorMode,
    sidebarDefault,
    setSidebarDefault,
    itemsPerPage,
    setItemsPerPage,
    dateFormat,
    setDateFormat,
    currency,
    setCurrency,
    emailNotifications,
    setEmailNotifications,
    pushNotifications,
    setPushNotifications,
    notifCRM,
    setNotifCRM,
    notifWMS,
    setNotifWMS,
    notifProcurement,
    setNotifProcurement,
    notifInvoices,
    setNotifInvoices,
    digestFrequency,
    setDigestFrequency,
    handleSave,
    handleExportData,
    handleDeleteAccount,
  } = f

  return (
    <div className="space-y-6">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
      />

      {/* Section 1: Appearance — color mode only (design.md §7: no theme picker) */}
      <Card>
        <CardHeader>
          <CardTitle>{S.appearance.sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color mode toggle */}
          <div className="space-y-1.5">
            <Label>{S.appearance.colorModeLabel}</Label>
            <div className="flex items-center gap-1 rounded-lg border p-0.5 w-fit">
              <Button
                variant={colorMode === 'light' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setColorMode('light')}
              >
                <Sun className="mr-1.5 size-4" />
                {S.appearance.lightMode}
              </Button>
              <Button
                variant={colorMode === 'dark' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setColorMode('dark')}
              >
                <Moon className="mr-1.5 size-4" />
                {S.appearance.darkMode}
              </Button>
              <Button
                variant={colorMode === 'system' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setColorMode('system')}
              >
                <Monitor className="mr-1.5 size-4" />
                {S.appearance.systemMode}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Display */}
      <Card>
        <CardHeader>
          <CardTitle>{S.display.sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{S.display.sidebarDefaultLabel}</Label>
              <Select value={sidebarDefault} onValueChange={(v) => setSidebarDefault(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expanded">{S.display.sidebarExpanded}</SelectItem>
                  <SelectItem value="collapsed">{S.display.sidebarCollapsed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{S.display.itemsPerPageLabel}</Label>
              <Select value={itemsPerPage} onValueChange={(v) => setItemsPerPage(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{S.display.dateFormatLabel}</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">{S.display.dateFormatDDMMYYYY}</SelectItem>
                  <SelectItem value="MM/DD/YYYY">{S.display.dateFormatMMDDYYYY}</SelectItem>
                  <SelectItem value="YYYY-MM-DD">{S.display.dateFormatYYYYMMDD}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{S.display.currencyLabel}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{S.display.languageLabel}</Label>
              <Select value="en" disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={S.display.languagePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{S.display.languageEnglish}</SelectItem>
                </SelectContent>
              </Select>
              <Typography asChild variant="helper"><p>{S.display.moreLanguagesSoon}</p></Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>{S.notifications.sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>{S.notifications.emailNotificationsLabel}</Label>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(v) => setEmailNotifications(v as boolean)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>{S.notifications.pushNotificationsLabel}</Label>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(v) => setPushNotifications(v as boolean)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{S.notifications.notificationTypesLabel}</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notifCRM} onCheckedChange={(v) => setNotifCRM(v as boolean)} />
                {S.notifications.crmLabel}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={notifWMS} onCheckedChange={(v) => setNotifWMS(v as boolean)} />
                {S.notifications.wmsLabel}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={notifProcurement}
                  onCheckedChange={(v) => setNotifProcurement(v as boolean)}
                />
                {S.notifications.procurementLabel}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={notifInvoices}
                  onCheckedChange={(v) => setNotifInvoices(v as boolean)}
                />
                {S.notifications.invoicesLabel}
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{S.notifications.digestFrequencyLabel}</Label>
            <Select value={digestFrequency} onValueChange={(v) => setDigestFrequency(v as string)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{S.notifications.digestDaily}</SelectItem>
                <SelectItem value="weekly">{S.notifications.digestWeekly}</SelectItem>
                <SelectItem value="none">{S.notifications.digestNone}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>{S.dataPrivacy.sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Typography variant="body-strong">{S.dataPrivacy.exportTitle}</Typography>
              <Typography asChild variant="helper"><p>
                {S.dataPrivacy.exportDescription}
              </p></Typography>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              {S.dataPrivacy.exportButton}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
            <div>
              <Typography variant="body-strong" tone="danger">{S.dataPrivacy.deleteTitle}</Typography>
              <Typography asChild variant="helper"><p>
                {S.dataPrivacy.deleteDescription}
              </p></Typography>
            </div>
            <ConfirmDialog
              title={S.dataPrivacy.deleteDialogTitle}
              description={S.dataPrivacy.deleteDialogDescription}
              confirmLabel={S.dataPrivacy.deleteConfirmLabel}
              variant="destructive"
              onConfirm={handleDeleteAccount}
              trigger={
                <Button variant="destructive" size="sm">
                  {S.dataPrivacy.deleteButton}
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          {S.saveButton}
        </Button>
      </div>
    </div>
  )
}
