import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { STOCK_EXPORT_TYPES } from "../../lib/export-labels";
import {
  NEW_EXPORT_DEFAULTS,
  newExportSchema,
  toExportRequest,
  type NewExportValues,
} from "../../lib/new-export-form";
import { useRequestExport } from "./useRequestExport";

/** "New export" dialog state; submits through the same request hook as the
 *  page Export menus. Closing (or a successful submit) resets the form. */
export function useNewExportForm(onOpenChange: (open: boolean) => void) {
  const form = useForm<NewExportValues>({
    resolver: zodResolver(newExportSchema),
    defaultValues: NEW_EXPORT_DEFAULTS,
    mode: "onBlur",
  });
  const request = useRequestExport();
  const exportType = useWatch({ control: form.control, name: "exportType" });

  const setOpen = (open: boolean) => {
    form.reset(NEW_EXPORT_DEFAULTS);
    onOpenChange(open);
  };

  const submit = form.handleSubmit((values) =>
    request.mutate(toExportRequest(values), { onSuccess: () => setOpen(false) }),
  );

  return {
    form,
    isStock: STOCK_EXPORT_TYPES.includes(exportType),
    setOpen,
    submit,
    pending: request.isPending,
  };
}
