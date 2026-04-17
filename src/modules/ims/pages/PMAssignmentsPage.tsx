import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { mockPMAssignments, type PMAssignment } from '../data/pm-assignments'
import { mockCategories } from '../data/categories'
import { mockOEMs } from '../data/oems'

const MOCK_PMS = [
  { id: 'user-001', name: 'Rahul Mehta', email: 'rahul@comprinttech.com' },
  { id: 'user-002', name: 'Sarah Khan', email: 'sarah@comprinttech.com' },
  { id: 'user-003', name: 'Mike Patel', email: 'mike@comprinttech.com' },
  { id: 'user-004', name: 'Vikram Singh', email: 'vikram@comprinttech.com' },
  { id: 'user-005', name: 'Priya Deshmukh', email: 'priya@comprinttech.com' },
  { id: 'user-006', name: 'Priya Sharma', email: 'priyasharma@comprinttech.com' },
]

// Only L1 categories (top-level)
const l1Categories = mockCategories.filter((c) => !('parentId' in c) || !c.parentId)

export default function PMAssignmentsPage() {
  const [assignments, setAssignments] = useState<PMAssignment[]>([...mockPMAssignments])

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [oemFilter, setOemFilter] = useState('all')
  const [pmFilter, setPmFilter] = useState('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formCategoryId, setFormCategoryId] = useState('__none__')
  const [formSubcategoryId, setFormSubcategoryId] = useState('__all__')
  const [formOemId, setFormOemId] = useState('__all__')
  const [formVariant, setFormVariant] = useState('__all__')
  const [formPmId, setFormPmId] = useState('__none__')

  // Derived: subcategories of selected category
  const availableSubcategories = useMemo(() => {
    if (!formCategoryId || formCategoryId === '__none__') return []
    const cat = l1Categories.find((c) => c.id === formCategoryId)
    return cat?.subcategories ?? []
  }, [formCategoryId])

  // Filter unique values for filter dropdowns
  const uniqueCategories = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.categoryName))).sort(),
    [assignments]
  )
  const uniqueOems = useMemo(
    () =>
      Array.from(new Set(assignments.filter((a) => a.oemName).map((a) => a.oemName!))).sort(),
    [assignments]
  )
  const uniquePms = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.pmName))).sort(),
    [assignments]
  )

  // Filtered & sorted assignments
  const filtered = useMemo(() => {
    return [...assignments]
      .filter((a) => {
        if (categoryFilter !== 'all' && a.categoryName !== categoryFilter) return false
        if (oemFilter !== 'all' && a.oemName !== oemFilter) return false
        if (pmFilter !== 'all' && a.pmName !== pmFilter) return false
        return true
      })
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
  }, [assignments, categoryFilter, oemFilter, pmFilter])

  const resetForm = () => {
    setFormCategoryId('__none__')
    setFormSubcategoryId('__all__')
    setFormOemId('__all__')
    setFormVariant('__all__')
    setFormPmId('__none__')
    setEditingId(null)
  }

  const openAddDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (assignment: PMAssignment) => {
    setEditingId(assignment.id)
    setFormCategoryId(assignment.categoryId)
    setFormSubcategoryId(assignment.subcategoryId ?? '__all__')
    setFormOemId(assignment.oemId ?? '__all__')
    setFormVariant(assignment.variant ?? '__all__')
    setFormPmId(assignment.pmId)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!formCategoryId || formCategoryId === '__none__') {
      toast.error('Category is required')
      return
    }
    if (!formPmId || formPmId === '__none__') {
      toast.error('PM is required')
      return
    }

    const category = l1Categories.find((c) => c.id === formCategoryId)
    const subcategory =
      formSubcategoryId !== '__all__'
        ? availableSubcategories.find((s) => s.id === formSubcategoryId)
        : undefined
    const oem =
      formOemId !== '__all__' ? mockOEMs.find((o) => o.id === formOemId) : undefined
    const pm = MOCK_PMS.find((p) => p.id === formPmId)
    const variant =
      formVariant !== '__all__' ? (formVariant as PMAssignment['variant']) : null

    if (!category || !pm) return

    const now = new Date().toISOString()

    if (editingId) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? {
                ...a,
                categoryId: formCategoryId,
                categoryName: category.name,
                subcategoryId: subcategory?.id ?? null,
                subcategoryName: subcategory?.name ?? null,
                oemId: oem?.id ?? null,
                oemName: oem?.name ?? null,
                variant,
                pmId: pm.id,
                pmName: pm.name,
                pmEmail: pm.email,
                updatedAt: now,
              }
            : a
        )
      )
      toast.success('Assignment updated successfully')
    } else {
      const newAssignment: PMAssignment = {
        id: `pma-${Date.now()}`,
        categoryId: formCategoryId,
        categoryName: category.name,
        subcategoryId: subcategory?.id ?? null,
        subcategoryName: subcategory?.name ?? null,
        oemId: oem?.id ?? null,
        oemName: oem?.name ?? null,
        variant,
        pmId: pm.id,
        pmName: pm.name,
        pmEmail: pm.email,
        createdAt: now,
        updatedAt: now,
      }
      setAssignments((prev) => [...prev, newAssignment])
      toast.success('Assignment created successfully')
    }

    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = (assignment: PMAssignment) => {
    if (
      !window.confirm(
        `Delete assignment for ${assignment.pmName} in ${assignment.categoryName}?`
      )
    )
      return

    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id))
    toast.success('Assignment deleted successfully')
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    setDialogOpen(open)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          PM Assignments
        </h1>
        <Button onClick={openAddDialog}>
          <Plus className="mr-1.5 size-4" />
          Add Assignment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={oemFilter} onValueChange={(v) => setOemFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="OEM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All OEMs</SelectItem>
            {uniqueOems.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pmFilter} onValueChange={(v) => setPmFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMs</SelectItem>
            {uniquePms.map((pm) => (
              <SelectItem key={pm} value={pm}>
                {pm}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Subcategory</th>
              <th className="px-4 py-3 text-left font-medium">OEM</th>
              <th className="px-4 py-3 text-left font-medium">Variant</th>
              <th className="px-4 py-3 text-left font-medium">Assigned PM</th>
              <th className="px-4 py-3 text-left font-medium">PM Email</th>
              <th className="px-4 py-3 text-left font-medium">Last Updated</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{a.categoryName}</td>
                <td className="px-4 py-3">
                  {a.subcategoryName ?? (
                    <span className="text-muted-foreground">All</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.oemName ?? (
                    <span className="text-muted-foreground">All</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.variant ? (
                    <span className="capitalize">{a.variant}</span>
                  ) : (
                    <span className="text-muted-foreground">All</span>
                  )}
                </td>
                <td className="px-4 py-3">{a.pmName}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.pmEmail}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(a.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(a)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(a)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No assignments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Assignment' : 'Add Assignment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={formCategoryId}
                onValueChange={(v) => {
                  setFormCategoryId(v as string)
                  setFormSubcategoryId('__all__')
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {l1Categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div className="space-y-1.5">
              <Label>Subcategory</Label>
              <Select
                value={formSubcategoryId}
                onValueChange={(v) => setFormSubcategoryId(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Subcategories</SelectItem>
                  {availableSubcategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* OEM */}
            <div className="space-y-1.5">
              <Label>OEM</Label>
              <Select value={formOemId} onValueChange={(v) => setFormOemId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All OEMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All OEMs</SelectItem>
                  {mockOEMs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variant */}
            <div className="space-y-1.5">
              <Label>Variant</Label>
              <Select value={formVariant} onValueChange={(v) => setFormVariant(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Variants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Variants</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PM */}
            <div className="space-y-1.5">
              <Label>Product Manager *</Label>
              <Select value={formPmId} onValueChange={(v) => setFormPmId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select PM" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PMS.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
