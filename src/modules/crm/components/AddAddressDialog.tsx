import { useState } from 'react'
import { Plus, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { AccountAddress } from '../types'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AddAddressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (address: AccountAddress) => void
  /** Account addresses to pick from (deal mode) */
  accountAddresses?: AccountAddress[]
  /** Already-added address IDs so we can grey them out */
  existingIds?: string[]
  /** Pre-select address type when opening */
  defaultType?: 'Billing' | 'Shipping'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AddAddressDialog({
  open,
  onOpenChange,
  onAdd,
  accountAddresses,
  existingIds = [],
  defaultType,
}: AddAddressDialogProps) {
  const hasAccountAddresses = accountAddresses && accountAddresses.length > 0
  const [mode, setMode] = useState<'pick' | 'manual'>(hasAccountAddresses ? 'pick' : 'manual')

  // Manual form state
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'Billing' | 'Shipping'>(defaultType ?? 'Billing')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  function resetForm() {
    setLabel('')
    setType(defaultType ?? 'Billing')
    setLine1('')
    setLine2('')
    setCity('')
    setState('')
    setPincode('')
    setIsDefault(false)
    setMode(hasAccountAddresses ? 'pick' : 'manual')
  }

  function handleManualSubmit() {
    if (!label.trim() || !line1.trim() || !city.trim() || !state.trim() || !pincode.trim()) return
    onAdd({
      id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: label.trim(),
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault,
    })
    resetForm()
    onOpenChange(false)
  }

  function handlePick(addr: AccountAddress) {
    onAdd({ ...addr })
    resetForm()
    onOpenChange(false)
  }

  const canSubmit = label.trim() && line1.trim() && city.trim() && state.trim() && pincode.trim()

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            Add Address
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle (only if account addresses available) */}
        {hasAccountAddresses && (
          <div className="flex rounded-lg border p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setMode('pick')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'pick'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Building2 className="size-3.5" />
              From Account
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'manual'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Plus className="size-3.5" />
              New Address
            </button>
          </div>
        )}

        {/* Pick from account */}
        {mode === 'pick' && hasAccountAddresses && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {accountAddresses.map((addr) => {
              const alreadyAdded = existingIds.includes(addr.id)
              return (
                <button
                  key={addr.id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handlePick(addr)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    alreadyAdded
                      ? 'opacity-50 cursor-not-allowed bg-muted/30'
                      : 'hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{addr.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {addr.type}
                    </Badge>
                    {addr.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                    {alreadyAdded && (
                      <Badge variant="secondary" className="text-[10px] ml-auto">
                        Already added
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{addr.line1}</p>
                  {addr.line2 && (
                    <p className="text-xs text-muted-foreground">{addr.line2}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {addr.city}, {addr.state} &mdash; {addr.pincode}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* Manual entry form */}
        {mode === 'manual' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Label *</Label>
                <Input
                  placeholder="e.g. HQ Billing, Pune DC"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'Billing' | 'Shipping')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Shipping">Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address Line 1 *</Label>
              <Input
                placeholder="Street address, building, floor"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address Line 2</Label>
              <Input
                placeholder="Area, landmark (optional)"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City *</Label>
                <Input
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State *</Label>
                <Input
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pincode *</Label>
                <Input
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="addr-default"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
              />
              <Label htmlFor="addr-default" className="text-xs cursor-pointer">
                Set as default address
              </Label>
            </div>
          </div>
        )}

        {mode === 'manual' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} disabled={!canSubmit}>
              <Plus className="size-3.5 mr-1.5" />
              Add Address
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
