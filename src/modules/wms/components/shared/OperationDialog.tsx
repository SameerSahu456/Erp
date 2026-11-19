// OperationDialog was promoted to a shared location so procurement (vendor / PO
// dialogs) can reuse the same sticky-shell modal without crossing the WMS module
// boundary. This re-export keeps the existing WMS import paths working.
export {
  OperationDialog,
  type OperationDialogProps,
} from '@/components/common/dialogs/OperationDialog'
