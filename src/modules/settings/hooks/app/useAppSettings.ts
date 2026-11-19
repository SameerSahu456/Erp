import { useState } from 'react'
import { toast } from 'sonner'

import { useTheme } from '@/contexts/use-theme'

export function useAppSettings() {
  // ITASM is the only theme (per design.md §7); UI exposes color mode only.
  const { colorMode, setColorMode } = useTheme()

  const [sidebarDefault, setSidebarDefault] = useState('expanded')
  const [itemsPerPage, setItemsPerPage] = useState('10')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [currency, setCurrency] = useState('INR')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [notifCRM, setNotifCRM] = useState(true)
  const [notifWMS, setNotifWMS] = useState(true)
  const [notifProcurement, setNotifProcurement] = useState(true)
  const [notifInvoices, setNotifInvoices] = useState(false)
  const [digestFrequency, setDigestFrequency] = useState('daily')

  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  const handleExportData = () => {
    toast.info('Exporting all data...')
  }

  const handleDeleteAccount = () => {
    toast.error('Account deletion is not available in demo mode')
  }


  return {
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
  }
}

export type AppSettingsController = ReturnType<typeof useAppSettings>
