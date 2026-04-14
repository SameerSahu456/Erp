import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EntityHeader } from '../components/EntityHeader'
import { contacts } from '../data/contacts'
import { accounts } from '../data/accounts'

function ContactFormPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()

  const existingContact = contactId ? contacts.find((c) => c.id === contactId) : undefined
  const isEdit = !!existingContact

  const [name, setName] = useState(existingContact?.name ?? '')
  const [email, setEmail] = useState(existingContact?.email ?? '')
  const [phone, setPhone] = useState(existingContact?.phone ?? '')
  const [accountId, setAccountId] = useState(existingContact?.accountId ?? '')
  const [title, setTitle] = useState(existingContact?.title ?? '')
  const [notes, setNotes] = useState('')

  const backHref = isEdit ? `/crm/contacts/${contactId}` : '/crm/contacts'

  function handleSave() {
    if (!name.trim() || !email.trim()) return

    toast.success('Contact saved successfully')
    navigate(backHref)
  }

  function handleCancel() {
    navigate(backHref)
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={isEdit ? `Edit Contact: ${existingContact.name}` : 'Create Contact'}
        backHref={backHref}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Contact Details' : 'New Contact Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
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
            </div>

            {/* Right column */}
            <div className="space-y-4">
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
                <Label htmlFor="contact-title" className="font-ui">Title / Designation</Label>
                <Input
                  id="contact-title"
                  placeholder="e.g. Marketing Manager"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Full width notes */}
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="contact-notes" className="font-ui">Notes</Label>
            <Textarea
              id="contact-notes"
              placeholder="Add any notes about this contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !email.trim()}>
            {isEdit ? 'Save Changes' : 'Create Contact'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { ContactFormPage }
