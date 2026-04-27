import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { User, Building2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { FormPageShell } from '@/components/page'
import { contacts } from '../data/contacts'
import { accounts } from '../data/accounts'

const DEPARTMENTS = [
  'Executive', 'Technology', 'Engineering', 'IT', 'Procurement',
  'Finance', 'Sales', 'Marketing', 'Operations', 'Infrastructure',
  'Network Engineering', 'HR', 'Legal', 'Other',
] as const

function ContactFormPage() {
  const { id: contactId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingContact = contactId ? contacts.find((c) => c.id === contactId) : undefined
  const isEdit = !!existingContact

  const [name, setName] = useState(existingContact?.name ?? '')
  const [email, setEmail] = useState(existingContact?.email ?? '')
  const [phone, setPhone] = useState(existingContact?.phone ?? '')
  const [accountId, setAccountId] = useState(existingContact?.accountId ?? '')
  const [designation, setDesignation] = useState(existingContact?.designation ?? '')
  const [department, setDepartment] = useState(existingContact?.department ?? '')
  const [preferredContact, setPreferredContact] = useState(existingContact?.preferredContact ? 'yes' : 'no')
  const [notes, setNotes] = useState('')

  const backHref = isEdit ? `/crm/contacts/${contactId}` : '/crm/contacts'
  const goBack = useNavigateBack(backHref)

  function handleSave() {
    if (!name.trim() || !email.trim()) return

    toast.success('Contact saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    goBack()
  }

  const canSave = Boolean(name.trim() && email.trim())

  return (
    <FormPageShell
      title={isEdit ? `Edit Contact: ${existingContact.name}` : 'Create Contact'}
      subtitle={isEdit ? 'Update contact details and assignments.' : 'Add a new contact to an account.'}
      breadcrumbs={
        isEdit
          ? [
              { label: 'CRM' },
              { label: 'Contacts', href: '/crm/contacts' },
              { label: existingContact.name, href: `/crm/contacts/${contactId}` },
              { label: 'Edit' },
            ]
          : [
              { label: 'CRM' },
              { label: 'Contacts', href: '/crm/contacts' },
              { label: 'New Contact' },
            ]
      }
      backHref={backHref}
      onSave={handleSave}
      onCancel={handleCancel}
      canSave={canSave}
      saveLabel={isEdit ? 'Save Changes' : 'Create Contact'}
      footerLeft={!canSave ? <span className="text-destructive/80">Name and email are required.</span> : undefined}
    >
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Contact Details' : 'New Contact Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
            {/* Left column — Contact Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/70 pb-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="size-3.5" strokeWidth={2} />
                </span>
                <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-foreground">
                  Contact Details
                </h3>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-name" className="font-ui">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-name"
                  placeholder="Contact name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="font-ui">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-phone" className="font-ui">Phone</Label>
                <Input
                  id="contact-phone"
                  placeholder="+91 98XXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-designation" className="font-ui">Designation</Label>
                <Input
                  id="contact-designation"
                  placeholder="e.g. CTO, VP Engineering"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
            </div>

            {/* Right column — Organization */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/70 pb-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Building2 className="size-3.5" strokeWidth={2} />
                </span>
                <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-foreground">
                  Organization
                </h3>
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Account</Label>
                <Select value={accountId} onValueChange={(val) => { if (val) setAccountId(val) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Preferred Contact</Label>
                <Select value={preferredContact} onValueChange={setPreferredContact}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Only one preferred contact per account. Setting this will remove preferred from other contacts.
                </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="contact-notes" className="sr-only">Notes</Label>
            <Textarea
              id="contact-notes"
              placeholder="Add any notes about this contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </FormPageShell>
  )
}

export { ContactFormPage }

export default ContactFormPage
