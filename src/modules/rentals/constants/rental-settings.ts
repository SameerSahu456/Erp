/** The rental settings the audit trail records, by their API key. */
export type RentalSettingKey =
  | "billing_enabled"
  | "billing_hour"
  | "billing_minute"
  | "early_exit_pct_default"
  | "return_line_auto_close_days"
  | "foreign_device_max_days"
  | "adjustment_reminder_days"
  | "default_billing_grace_days"
  | "default_return_grace_days"
  | "require_signed_document_for_active"
  | "enabled"
  | "subject"
  | "body"
  | "billing_emails"
  | "rental_sales_emails";

/** Human names for the audited setting keys (§16.12). */
export const RENTAL_SETTING_LABELS: Record<RentalSettingKey, string> = {
  billing_enabled: "Daily billing run",
  billing_hour: "Billing run hour",
  billing_minute: "Billing run minute",
  early_exit_pct_default: "Early-exit charge %",
  return_line_auto_close_days: "Return line auto-close days",
  foreign_device_max_days: "Foreign device max days",
  adjustment_reminder_days: "Adjustment reminder days",
  default_billing_grace_days: "Default billing grace days",
  default_return_grace_days: "Default return grace days",
  require_signed_document_for_active: "Require signed document for approval",
  enabled: "PO renewal email",
  subject: "PO renewal email subject",
  body: "PO renewal email body",
  billing_emails: "PO renewal billing mailboxes",
  rental_sales_emails: "PO renewal rental-sales mailboxes",
};

/** The label for an audited key; a key added server-side later shows raw. */
export function rentalSettingLabel(key: string): string {
  return key in RENTAL_SETTING_LABELS ? RENTAL_SETTING_LABELS[key as RentalSettingKey] : key;
}
