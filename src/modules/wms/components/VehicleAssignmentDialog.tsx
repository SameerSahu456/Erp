import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Truck, Package, Building2, UserCheck } from 'lucide-react'
import type { CourierPartner } from '../types'
import { mockCourierPartners } from '../data/courier-partners'

export interface VehicleAssignment {
  courierPartnerId: string
  courierPartnerName: string
  type: CourierPartner['type']
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  trackingNumber?: string
  lrNumber?: string
  pickupDate?: string
}

interface VehicleAssignmentDialogProps {
  outwardNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (assignment: VehicleAssignment) => void
}

const TYPE_ICON: Record<CourierPartner['type'], React.ReactNode> = {
  'Own Vehicle': <Truck className="size-4" />,
  Courier: <Package className="size-4" />,
  Transporter: <Building2 className="size-4" />,
  'Customer Pickup': <UserCheck className="size-4" />,
}

const TYPE_VARIANT: Record<CourierPartner['type'], 'info' | 'warning' | 'success' | 'neutral'> = {
  'Own Vehicle': 'info',
  Courier: 'warning',
  Transporter: 'success',
  'Customer Pickup': 'neutral',
}

export function VehicleAssignmentDialog({
  outwardNumber,
  open,
  onOpenChange,
  onAssign,
}: VehicleAssignmentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPartner, setSelectedPartner] = useState<CourierPartner | null>(null)

  // Form fields
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [lrNumber, setLrNumber] = useState('')
  const [pickupDate, setPickupDate] = useState('')

  const resetForm = () => {
    setStep(1)
    setSelectedPartner(null)
    setVehicleNumber('')
    setDriverName('')
    setDriverPhone('')
    setTrackingNumber('')
    setLrNumber('')
    setPickupDate('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const handleSelectPartner = (partner: CourierPartner) => {
    setSelectedPartner(partner)
    setStep(2)
  }

  const handleAssign = () => {
    if (!selectedPartner) return

    const assignment: VehicleAssignment = {
      courierPartnerId: selectedPartner.id,
      courierPartnerName: selectedPartner.name,
      type: selectedPartner.type,
    }

    if (selectedPartner.type === 'Own Vehicle') {
      assignment.vehicleNumber = vehicleNumber
      assignment.driverName = driverName
      assignment.driverPhone = driverPhone
    } else if (selectedPartner.type === 'Courier') {
      assignment.trackingNumber = trackingNumber
      assignment.pickupDate = pickupDate
    } else if (selectedPartner.type === 'Transporter') {
      assignment.vehicleNumber = vehicleNumber
      assignment.lrNumber = lrNumber
      assignment.driverName = driverName
      assignment.driverPhone = driverPhone
    } else if (selectedPartner.type === 'Customer Pickup') {
      assignment.pickupDate = pickupDate
      assignment.driverName = driverName // contact person at pickup
    }

    onAssign(assignment)
    handleOpenChange(false)
  }

  const renderPartnerSelection = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {mockCourierPartners.map((partner) => (
        <Card
          key={partner.id}
          className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/50"
          onClick={() => handleSelectPartner(partner)}
        >
          <CardContent className="flex items-start gap-3 py-3">
            <span className="mt-0.5 text-muted-foreground">{TYPE_ICON[partner.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{partner.name}</p>
              <StatusBadge variant={TYPE_VARIANT[partner.type]} className="mt-1">
                {partner.type}
              </StatusBadge>
              <p className="mt-1 text-xs text-muted-foreground">
                {partner.contactPerson} | {partner.phone}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderDetailsForm = () => {
    if (!selectedPartner) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          {TYPE_ICON[selectedPartner.type]}
          <div>
            <p className="text-sm font-medium">{selectedPartner.name}</p>
            <StatusBadge variant={TYPE_VARIANT[selectedPartner.type]}>
              {selectedPartner.type}
            </StatusBadge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedPartner.type === 'Own Vehicle' && (
            <>
              <div className="space-y-2">
                <Label>Vehicle Number *</Label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="MH-12-AB-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Name *</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver name"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone *</Label>
                <Input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
            </>
          )}

          {selectedPartner.type === 'Courier' && (
            <>
              <div className="space-y-2">
                <Label>AWB / Tracking Number *</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="AWB number"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Pickup Date</Label>
                <Input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedPartner.type === 'Transporter' && (
            <>
              <div className="space-y-2">
                <Label>Vehicle Number *</Label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="MH-12-AB-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>LR Number</Label>
                <Input
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  placeholder="LR number"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Name *</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver name"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone *</Label>
                <Input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
            </>
          )}

          {selectedPartner.type === 'Customer Pickup' && (
            <>
              <div className="space-y-2">
                <Label>Pickup Date *</Label>
                <Input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person at Pickup</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Person name"
                />
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Vehicle / Courier</DialogTitle>
          <DialogDescription>
            {outwardNumber} &mdash;{' '}
            {step === 1 ? 'Select a courier partner' : 'Fill in transport details'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? renderPartnerSelection() : renderDetailsForm()}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleAssign}>Assign</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
