import { Typography } from "@/components/ui/typography";

export function QuickStat({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <Typography asChild variant="helper">
        <div className="flex items-center gap-2">
          {icon}
          {label}
        </div>
      </Typography>
      <Typography
        asChild
        variant="stat-value"
        tone="inherit"
        className={["mt-1 tabular-nums", valueClassName ?? ""].join(" ")}
      >
        <p>{value}</p>
      </Typography>
    </div>
  );
}
